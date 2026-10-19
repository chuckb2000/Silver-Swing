// The course list (courses/index.json, written by the pipeline) and loading
// one course's files on demand. Only one course is in memory at a time:
// switching unloads the previous course's textures and data first.

import Phaser from 'phaser';
import { app } from '../app';
import { buildRuntime, CourseJson, CourseRuntime, decodeHeights, decodeSurface, HeightMeta } from './course';
import type { TreeArrays } from '../systems/physics/obstacles';
import { treeSheet } from './registry';
import { canDecodePng, decodePng } from './png';

export type { CourseInfo } from './registry';
export { initialCourseId, treeSheet } from './registry';
import type { CourseInfo } from './registry';

let loadedTheme: string | null = null;

/** Run the scene's loader for the files queued by `queue`; resolves when they are all done. */
function runLoader(scene: Phaser.Scene, queue: (l: Phaser.Loader.LoaderPlugin) => void): Promise<string[]> {
  return new Promise((resolve) => {
    const failed: string[] = [];
    const l = scene.load;
    const onError = (f: Phaser.Loader.File) => failed.push(f.key);
    l.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    queue(l);
    l.once(Phaser.Loader.Events.COMPLETE, () => {
      l.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      resolve(failed);
    });
    l.start();
  });
}

/**
 * The exact pixel values of a data image (surface ids, packed heights). They
 * are decoded from the PNG bytes: reading them back from a canvas is not exact
 * in Safari 26, Brave or Firefox with resistFingerprinting (see png.ts). The
 * canvas is only a fallback for browsers without DecompressionStream.
 */
async function imageData(url: string): Promise<{ data: Uint8Array | Uint8ClampedArray; w: number; h: number; channels: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  if (canDecodePng()) {
    const img = await decodePng(await res.arrayBuffer());
    return { data: img.data, w: img.width, h: img.height, channels: img.channels };
  }
  console.warn('no DecompressionStream: reading course data through a canvas');
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' } as CanvasRenderingContext2DSettings)!;
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  bmp.close();
  return { data: d, w: c.width, h: c.height, channels: 4 };
}

/** The course list. Missing or broken list: an empty list (the caller reports it). */
export async function loadRegistry(): Promise<CourseInfo[]> {
  try {
    const res = await fetch('courses/index.json');
    if (!res.ok) return [];
    const j = (await res.json()) as { courses?: CourseInfo[] };
    return Array.isArray(j.courses) ? j.courses : [];
  } catch {
    return [];
  }
}

/** Forget the current course's textures and data (call only when no scene is drawing it). */
export function unloadCourse(scene: Phaser.Scene) {
  const tm = scene.textures;
  for (const key of tm.getTextureKeys()) {
    if (key.startsWith('chunk_') || key.startsWith('mini_') || key.startsWith('green_') || key === 'overview') tm.remove(key);
  }
  for (const k of ['course', 'treeData', 'heightMeta']) scene.cache.json.remove(k);
  app.course = null;
}

/** Load a course by id and make it the current one (app.course). */
export async function loadCourse(scene: Phaser.Scene, id: string): Promise<CourseRuntime> {
  unloadCourse(scene);
  const base = `courses/${id}/`;
  const failed = await runLoader(scene, (l) => {
    l.json('course', `${base}course.json`);
    l.json('treeData', `${base}trees.json`);
    l.json('heightMeta', `${base}height.json`);
  });
  if (failed.length) throw new Error(`course ${id}: could not load ${failed.join(', ')}`);
  const json = scene.cache.json.get('course') as CourseJson;
  const hmeta = scene.cache.json.get('heightMeta') as HeightMeta;
  const trees = scene.cache.json.get('treeData') as TreeArrays;
  const theme = json.theme || 'pnw';
  const wantTrees = loadedTheme !== theme;
  if (wantTrees) {
    if (scene.textures.exists('trees')) scene.textures.remove('trees');
    scene.cache.json.remove('treesMeta');
  }
  const failed2 = await runLoader(scene, (l) => {
    for (let j = 0; j < json.terrain.rows; j++) {
      for (let i = 0; i < json.terrain.cols; i++) {
        l.image(`chunk_${i}_${j}`, base + json.terrain.pattern.replace('{i}', String(i)).replace('{j}', String(j)));
      }
    }
    l.image('overview', base + json.maps.overview);
    for (const m of json.maps.holes) l.image(`mini_${m.hole}`, base + m.file);
    if (trees.c.includes(2) && !scene.textures.exists('blossom')) l.atlas('blossom', 'sprites/blossom.png', 'sprites/blossom.json'); // flowering trees
    if (trees.c.includes(3) && !scene.textures.exists('shrubs')) l.atlas('shrubs', 'sprites/shrubs.png', 'sprites/shrubs.json'); // flowering shrubs
    if (wantTrees) {
      const sheet = treeSheet(theme);
      l.atlas('trees', `${sheet}.png`, `${sheet}.json`);
      l.json('treesMeta', `${sheet}_meta.json`);
    }
  });
  if (wantTrees && (failed2.includes('trees') || failed2.includes('treesMeta')) && theme !== 'pnw') {
    // a theme without its own trees yet: use the original set
    console.warn(`no tree sprites for theme "${theme}", using pnw`);
    if (scene.textures.exists('trees')) scene.textures.remove('trees');
    scene.cache.json.remove('treesMeta');
    await runLoader(scene, (l) => {
      l.atlas('trees', 'sprites/trees.png', 'sprites/trees.json');
      l.json('treesMeta', 'sprites/trees_meta.json');
    });
  }
  loadedTheme = theme;
  const [h, s] = await Promise.all([imageData(base + json.height.file), imageData(base + json.surface.file)]);
  const heights = decodeHeights(h.data, hmeta, h.channels);
  // sanity check the exact decode against samples written by the pipeline
  for (const [i, j, z] of hmeta.samples) {
    const got = heights[j * hmeta.cols + i];
    if (Math.abs(got - z) > 0.01) console.warn(`height decode mismatch at ${i},${j}: ${got} vs ${z}`);
  }
  const surface = decodeSurface(s.data, s.w, s.h, s.channels);
  const known = new Set(Object.values(json.surface.ids));
  const bad = surface.find((v) => !known.has(v));
  if (bad !== undefined) console.warn(`surface map has an unknown id ${bad}: the course data did not decode exactly`);
  app.course = buildRuntime(json, heights, hmeta, surface, trees, base);
  return app.course;
}

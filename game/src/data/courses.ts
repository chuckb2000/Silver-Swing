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

/** Progress of a course load: the fraction done (0..1); called whenever anything arrives. */
export type LoadProgress = (fraction: number) => void;

/** Run the scene's loader for the files queued by `queue`; resolves when they are all done. */
function runLoader(scene: Phaser.Scene, queue: (l: Phaser.Loader.LoaderPlugin) => void, onFile?: () => void): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const failed: string[] = [];
    const l = scene.load;
    const onError = (f: Phaser.Loader.File) => failed.push(f.key);
    const onDone = () => onFile?.();
    // the scene stopping mid-load resets its loader, which would never finish: fail instead of hanging
    const onShutdown = () => {
      l.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      l.off(Phaser.Loader.Events.FILE_COMPLETE, onDone);
      reject(new Error('the screen closed while the course was loading'));
    };
    l.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    l.on(Phaser.Loader.Events.FILE_COMPLETE, onDone);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    queue(l);
    l.once(Phaser.Loader.Events.COMPLETE, () => {
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      l.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      l.off(Phaser.Loader.Events.FILE_COMPLETE, onDone);
      resolve(failed);
    });
    l.start();
  });
}

/**
 * Download a file in full, with a few tries. A try is given up when no bytes
 * have arrived for `idleMs` (a slow but moving download is never cut off);
 * `onBytes` hears every chunk, so the course screen can show progress on the
 * large data images (up to ~5 MB) and its stall watchdog stays quiet.
 */
async function fetchBytes(url: string, onBytes?: (got: number, total: number) => void, tries = 3, idleMs = 20_000): Promise<ArrayBuffer> {
  let last: unknown = null;
  for (let k = 0; k < tries; k++) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (!ctl) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => ctl.abort(), idleMs);
    };
    arm();
    try {
      const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
      if (!res.ok) {
        last = new Error(`${url}: ${res.status}`);
        if (res.status >= 400 && res.status < 500) break;
        continue;
      }
      const total = Number(res.headers.get('content-length')) || 0;
      const reader = res.body && typeof res.body.getReader === 'function' ? res.body.getReader() : null;
      if (!reader) {
        const buf = await res.arrayBuffer();
        onBytes?.(buf.byteLength, buf.byteLength);
        return buf;
      }
      const parts: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.byteLength;
        arm();
        onBytes?.(got, total);
      }
      const out = new Uint8Array(got);
      let o = 0;
      for (const part of parts) { out.set(part, o); o += part.byteLength; }
      return out.buffer;
    } catch (e) {
      last = e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw last instanceof Error ? last : new Error(`${url}: failed`);
}

/** Each course load gets a number; a load overtaken by a newer one stops quietly. */
let loadSeq = 0;
export class LoadSuperseded extends Error {}

/**
 * The exact pixel values of a data image (surface ids, packed heights). They
 * are decoded from the PNG bytes: reading them back from a canvas is not exact
 * in Safari 26, Brave or Firefox with resistFingerprinting (see png.ts). The
 * canvas is only a fallback for browsers without DecompressionStream.
 */
async function imageData(url: string, onBytes?: (got: number, total: number) => void): Promise<{ data: Uint8Array | Uint8ClampedArray; w: number; h: number; channels: number }> {
  const buf = await fetchBytes(url, onBytes);
  if (canDecodePng()) {
    const img = await decodePng(buf);
    return { data: img.data, w: img.width, h: img.height, channels: img.channels };
  }
  console.warn('no DecompressionStream: reading course data through a canvas');
  const blob = new Blob([buf], { type: 'image/png' });
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

/**
 * Load a course by id and make it the current one (app.course). `progress`
 * hears how far it has got (the course screen shows it, and offers a reload
 * if it stops moving).
 */
export async function loadCourse(scene: Phaser.Scene, id: string, progress?: LoadProgress): Promise<CourseRuntime> {
  const my = ++loadSeq;
  const alive = () => { if (my !== loadSeq) throw new LoadSuperseded(`course ${id}: load overtaken`); };
  unloadCourse(scene);
  const base = `courses/${id}/`;
  // progress: 3 small files, then the art (counted once its list is known), then the two data images
  let done = 0, total = 6;
  const tick = (n = 1) => { done += n; progress?.(Math.min(0.99, done / Math.max(1, total))); };
  progress?.(0);
  const failed = await runLoader(scene, (l) => {
    l.json('course', `${base}course.json`);
    l.json('treeData', `${base}trees.json`);
    l.json('heightMeta', `${base}height.json`);
  }, () => tick());
  alive();
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
  total = 3 + json.terrain.rows * json.terrain.cols + 1 + json.maps.holes.length + 4 + 2;
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
  }, () => tick());
  alive();
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
  alive();
  loadedTheme = theme;
  // the two data images: progress by bytes (height.png is up to ~5 MB)
  const part = [0, 0];
  const bytes = (i: number) => (got: number, all: number) => {
    part[i] = all > 0 ? Math.min(0.95, got / all) : 0.5;
    progress?.(Math.min(0.99, (done + part[0] + part[1]) / Math.max(1, total)));
  };
  const image = (i: number, file: string) => imageData(base + file, bytes(i)).then((v) => { part[i] = 0; tick(); return v; });
  const [h, s] = await Promise.all([image(0, json.height.file), image(1, json.surface.file)]);
  alive();
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
  progress?.(1);
  return app.course;
}

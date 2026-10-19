// Boot: load sprites, font and the course, decode the terrain data.

import Phaser from 'phaser';
import { app, COURSE_ID } from '../app';
import { applyScale, uiCamera } from '../scale';
import { buildRuntime, CourseJson, decodeHeights, decodeSurface, HeightMeta } from '../data/course';
import { loadSettings } from '../save/store';
import { calibrateAll } from '../systems/physics/calibrate';
import type { TreeArrays } from '../systems/physics/obstacles';

async function imageData(url: string): Promise<{ data: Uint8ClampedArray; w: number; h: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' } as CanvasRenderingContext2DSettings)!;
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  bmp.close();
  return { data: d, w: c.width, h: c.height };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    uiCamera(this.cameras.main);
    const W = app.view.w, H = app.view.h;
    const bar = this.add.graphics();
    const label = this.add.text(W / 2, H / 2 - 14, 'loading', { fontFamily: 'monospace', fontSize: '8px', color: '#dfe6e9' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => {
      bar.clear();
      bar.fillStyle(0x23303a, 1).fillRect(W / 2 - 60, H / 2, 120, 6);
      bar.fillStyle(0xe8681e, 1).fillRect(W / 2 - 59, H / 2 + 1, Math.round(118 * p), 4);
    });
    this.load.on('complete', () => { label.destroy(); bar.destroy(); });
    const base = `courses/${COURSE_ID}/`;
    this.load.atlas('ui', 'sprites/sprites.png', 'sprites/sprites.json');
    this.load.atlas('trees', 'sprites/trees.png', 'sprites/trees.json');
    this.load.json('treesMeta', 'sprites/trees_meta.json');
    this.load.bitmapFont('px', 'sprites/pxfont.png', 'sprites/pxfont.xml');
    this.load.json('course', `${base}course.json`);
    this.load.json('treeData', `${base}trees.json`);
    this.load.json('heightMeta', `${base}height.json`);
    this.load.once('filecomplete-json-course', (_k: string, _t: string, json: CourseJson) => {
      for (let j = 0; j < json.terrain.rows; j++) {
        for (let i = 0; i < json.terrain.cols; i++) {
          this.load.image(`chunk_${i}_${j}`, base + json.terrain.pattern.replace('{i}', String(i)).replace('{j}', String(j)));
        }
      }
      this.load.image('overview', base + json.maps.overview);
      for (const m of json.maps.holes) this.load.image(`mini_${m.hole}`, base + m.file);
    });
  }

  async create() {
    const json = this.cache.json.get('course') as CourseJson;
    const hmeta = this.cache.json.get('heightMeta') as HeightMeta;
    const trees = this.cache.json.get('treeData') as TreeArrays;
    const base = `courses/${COURSE_ID}/`;
    try {
      const [h, s, settings] = await Promise.all([
        imageData(base + json.height.file),
        imageData(base + json.surface.file),
        loadSettings(),
      ]);
      app.settings = settings;
      applyScale(this.game); // the saved pixel-size setting
      const heights = decodeHeights(h.data, hmeta);
      // sanity check the exact decode against samples written by the pipeline
      for (const [i, j, z] of hmeta.samples) {
        const got = heights[j * hmeta.cols + i];
        if (Math.abs(got - z) > 0.01) console.warn(`height decode mismatch at ${i},${j}: ${got} vs ${z}`);
      }
      const surface = decodeSurface(s.data, s.w, s.h);
      app.course = buildRuntime(json, heights, hmeta, surface, trees, base);
      app.calibration = calibrateAll();
      (window as unknown as { __golf: unknown }).__golf = app;
      this.scene.start('title');
    } catch (e) {
      console.error(e);
      this.add.text(10, 10, `failed to load course: ${(e as Error).message}`, { fontFamily: 'monospace', fontSize: '8px', color: '#ff8080', wordWrap: { width: app.view.w - 20 } });
    }
  }
}

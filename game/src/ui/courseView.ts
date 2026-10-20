// Renders the baked terrain (water is part of it, still) and the depth-sorted
// tree sprites. Trees are created per spatial cell as the camera moves
// (thousands exist).

import Phaser from 'phaser';
import { app, HEIGHT_PX, PX_PER_M } from '../app';
import type { CourseRuntime } from '../data/course';
import { shrubKey } from './shrubs';

interface TreeInfo { key: string; sheet: string; px: number; py: number; w: number; h: number }

export const DEPTH = {
  terrain: -100000,
  water: -99990,
  ground: -99980,      // cup, relief areas, slope arrows
  shadow: -99970,      // ball shadow
  overlay: 900000,     // aim line, markers
  flight: 800000,      // ball in the air
};

export class CourseView {
  readonly scene: Phaser.Scene;
  readonly course: CourseRuntime;
  private cell = 48; // metres
  private cols: number;
  private rows: number;
  private cellTrees: number[][];
  private active = new Map<number, Phaser.GameObjects.Image[]>();
  private infos: TreeInfo[] = [];
  private faded = new Set<Phaser.GameObjects.Image>();
  private treesVisible = true;

  constructor(scene: Phaser.Scene, course: CourseRuntime) {
    this.scene = scene;
    this.course = course;
    const j = course.json;
    for (let r = 0; r < j.terrain.rows; r++) {
      for (let c = 0; c < j.terrain.cols; c++) {
        scene.add.image(c * j.terrain.chunk, r * j.terrain.chunk, `chunk_${c}_${r}`).setOrigin(0, 0).setDepth(DEPTH.terrain);
      }
    }
    const meta = scene.cache.json.get('treesMeta') as { widths: number[]; heights: number[] };
    const tex = scene.textures.get('trees');
    const bloom = scene.textures.exists('blossom') ? scene.textures.get('blossom') : null;
    const shrubs = scene.textures.exists('shrubs') ? scene.textures.get('shrubs') : null;
    const trees = course.obstacles.trees;
    this.cols = Math.ceil(j.world.width / this.cell);
    this.rows = Math.ceil(j.world.height / this.cell);
    this.cellTrees = Array.from({ length: this.cols * this.rows }, () => []);
    const qw = (v: number) => meta.widths.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    const qh = (v: number) => meta.heights.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    for (const t of trees) {
      const type = t.conifer ? 'c' : 'd';
      let w = qw(Math.max(10, Math.min(42, t.r * 2 * PX_PER_M)));
      let h = qh(Math.max(14, Math.min(86, t.h * HEIGHT_PX)));
      if (type === 'c') {
        while (h < 1.15 * w && h < meta.heights[meta.heights.length - 1]) h = meta.heights[meta.heights.indexOf(h) + 1];
        while (h < 1.15 * w) w = meta.widths[Math.max(0, meta.widths.indexOf(w) - 1)];
      } else {
        while (h < 0.9 * w && meta.heights.indexOf(h) < meta.heights.length - 1) h = meta.heights[meta.heights.indexOf(h) + 1];
        while (h > 2.6 * w + 6 && meta.heights.indexOf(h) > 0) h = meta.heights[meta.heights.indexOf(h) - 1];
      }
      let key = `${type}_${w}_${h}_${t.i % 3}`;
      let sheet = 'trees';
      const sk = t.kind === 3 ? shrubKey(t.i, t.r, t.h) : '';
      if (sk && shrubs?.has(sk)) { // flowering shrub: its own small size grid
        key = sk; sheet = 'shrubs';
        const [, sw, sh] = sk.split('_').map(Number);
        w = sw; h = sh;
      } else if (t.kind === 2 && bloom?.has(`b_${w}_${h}_${t.i % 3}`)) { key = `b_${w}_${h}_${t.i % 3}`; sheet = 'blossom'; } // flowering: same size grid as deciduous
      else if (!tex.has(key)) key = type === 'c' ? 'c_22_44_0' : 'd_22_32_0';
      const px = Math.round(t.x * PX_PER_M), py = Math.round((j.world.height - t.y) * PX_PER_M);
      this.infos.push({ key, sheet, px, py, w: w + 2, h });
      const c = Math.min(this.cols - 1, Math.floor(t.x / this.cell)), r = Math.min(this.rows - 1, Math.floor(t.y / this.cell));
      this.cellTrees[r * this.cols + c].push(this.infos.length - 1);
    }
  }

  /** Show or hide the course's tree sprites (the putting view has its own). */
  setTreesVisible(on: boolean) {
    if (on === this.treesVisible) return;
    this.treesVisible = on;
    for (const imgs of this.active.values()) for (const im of imgs) im.setVisible(on);
  }

  /** Activate tree cells around the camera; call every frame. */
  update(cam: Phaser.Cameras.Scene2D.Camera, _dt: number) {
    if (!this.treesVisible) return;
    const H = this.course.json.world.height;
    const v = cam.worldView;
    const margin = 90; // px: tall trees south of the view still poke in
    const x0 = (v.x - 40) / PX_PER_M, x1 = (v.right + 40) / PX_PER_M;
    const y1 = H - (v.y - 40) / PX_PER_M, y0 = H - (v.bottom + margin) / PX_PER_M;
    const c0 = Math.max(0, Math.floor(x0 / this.cell)), c1 = Math.min(this.cols - 1, Math.floor(x1 / this.cell));
    const r0 = Math.max(0, Math.floor(y0 / this.cell)), r1 = Math.min(this.rows - 1, Math.floor(y1 / this.cell));
    const want = new Set<number>();
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) want.add(r * this.cols + c);
    for (const [k, imgs] of this.active) {
      if (!want.has(k)) {
        for (const im of imgs) { this.faded.delete(im); im.destroy(); }
        this.active.delete(k);
      }
    }
    for (const k of want) {
      if (this.active.has(k)) continue;
      const imgs = this.cellTrees[k].map((i) => {
        const t = this.infos[i];
        return this.scene.add.image(t.px, t.py + 1, t.sheet, t.key).setOrigin(0.5, 1).setDepth(t.py);
      });
      this.active.set(k, imgs);
    }
  }

  /** Fade trees drawn in front of any of the given world-pixel points. */
  fadeOccluders(points: { x: number; y: number; depth: number }[]) {
    const now = new Set<Phaser.GameObjects.Image>();
    if (points.length && this.treesVisible) {
      for (const imgs of this.active.values()) {
        for (const im of imgs) {
          const w = im.width, h = im.height;
          for (const p of points) {
            if (im.depth > p.depth && p.x > im.x - w / 2 + 1 && p.x < im.x + w / 2 - 1 && p.y > im.y - h + 1 && p.y < im.y - 2) {
              now.add(im);
              break;
            }
          }
        }
      }
    }
    for (const im of this.faded) if (!now.has(im)) im.setAlpha(1);
    for (const im of now) im.setAlpha(0.42);
    this.faded = now;
  }

  get treeCount(): number {
    let n = 0;
    for (const v of this.active.values()) n += v.length;
    return n;
  }
}

export function worldPx(x: number, y: number) {
  const H = app.course!.json.world.height;
  return { x: x * PX_PER_M, y: (H - y) * PX_PER_M };
}

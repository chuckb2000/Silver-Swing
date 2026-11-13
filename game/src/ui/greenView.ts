// Putting views: high-resolution art of the current green and its
// surroundings (from the pipeline) drawn over the course at the same world
// position. Each green has up to three layers: "far" (6 px/m) for long putts,
// "near" (12 px/m) for medium ones and "close" (24 px/m) for short ones, where
// the cup and ball are drawn at about their real size. The camera zooms in by
// ppm / PX_PER_M so the art's pixels are the same size on screen as the rest
// of the art, and the trees around the green are their own sprites.

import Phaser from 'phaser';
import { PX_PER_M } from '../app';
import type { CourseRuntime, GreenLayerJson } from '../data/course';
import type { Rect } from './cameraRig';
import { DEPTH } from './courseView';
import { dressGreenView } from './holidayArt';

export type GreenLayer = 'far' | 'near' | 'close';
export const GREEN_LAYERS: GreenLayer[] = ['far', 'near', 'close'];

interface TreePlace { f: string; x: number; y: number }

interface Shown {
  img: Phaser.GameObjects.Image;
  trees: Phaser.GameObjects.Image[];
}

export class GreenView {
  readonly scene: Phaser.Scene;
  readonly course: CourseRuntime;
  private built = new Map<string, Shown>(); // `${hole}:${layer}` -> objects
  private current: string | null = null;
  private faded = new Set<Phaser.GameObjects.Image>();
  private loading = new Map<number, Promise<boolean>>();

  constructor(scene: Phaser.Scene, course: CourseRuntime) {
    this.scene = scene;
    this.course = course;
  }

  def(hole: number, layer: GreenLayer): GreenLayerJson | null {
    const v = this.course.json.greenViews?.find((g) => g.hole === hole);
    return v ? v[layer] ?? null : null;
  }

  /** Camera level (zoom multiple) that shows a layer pixel for pixel. */
  level(hole: number, layer: GreenLayer): number {
    const d = this.def(hole, layer);
    return d ? Math.round(d.ppm / PX_PER_M) : 2;
  }

  private key(hole: number, layer: GreenLayer, what: 'art' | 'trees') {
    return `green_${hole}_${layer}_${what}`;
  }

  /** Layers this hole has art for. */
  layers(hole: number): GreenLayer[] {
    return GREEN_LAYERS.filter((l) => this.def(hole, l));
  }

  isReady(hole: number): boolean {
    const ls = this.layers(hole);
    return ls.length > 0 && ls.every((l) =>
      this.scene.textures.exists(this.key(hole, l, 'art')) && this.scene.textures.exists(this.key(hole, l, 'trees')));
  }

  /** Start loading both layers for a hole (no-op when loaded or missing). Resolves true when usable. */
  prepare(hole: number): Promise<boolean> {
    if (!this.def(hole, 'far')) return Promise.resolve(false);
    if (this.isReady(hole)) return Promise.resolve(true);
    const pending = this.loading.get(hole);
    if (pending) return pending;
    const base = this.course.baseUrl;
    const p = new Promise<boolean>((resolve) => {
      const load = this.scene.load;
      for (const l of this.layers(hole)) {
        const d = this.def(hole, l)!;
        load.image(this.key(hole, l, 'art'), base + d.file);
        load.atlas(this.key(hole, l, 'trees'), base + d.treesImage, base + d.trees);
      }
      load.once(Phaser.Loader.Events.COMPLETE, () => {
        // a holiday's trees and ground in the putting views too (ui/holidayArt.ts)
        for (const l of this.layers(hole)) dressGreenView(this.scene, this.course, this.key(hole, l, 'art'), this.key(hole, l, 'trees'), this.def(hole, l)!);
        resolve(this.isReady(hole));
      });
      load.start();
    });
    this.loading.set(hole, p);
    return p;
  }

  /** World-pixel rectangle covered by a layer's art. */
  rect(hole: number, layer: GreenLayer): Rect | null {
    const d = this.def(hole, layer);
    if (!d) return null;
    const H = this.course.json.world.height;
    return { x: d.x0 * PX_PER_M, y: (H - d.y1) * PX_PER_M, w: d.w * PX_PER_M, h: d.h * PX_PER_M };
  }

  /** Is a point (world metres) inside a layer's art, at least `margin` metres from its edge? */
  contains(hole: number, layer: GreenLayer, x: number, y: number, margin = 8): boolean {
    const d = this.def(hole, layer);
    if (!d) return false;
    return x > d.x0 + margin && x < d.x0 + d.w - margin && y < d.y1 - margin && y > d.y1 - d.h + margin;
  }

  private build(hole: number, layer: GreenLayer): Shown {
    const k = `${hole}:${layer}`;
    const have = this.built.get(k);
    if (have) return have;
    const d = this.def(hole, layer)!;
    const s = PX_PER_M / d.ppm;
    const r = this.rect(hole, layer)!;
    const img = this.scene.add.image(r.x, r.y, this.key(hole, layer, 'art')).setOrigin(0, 0).setScale(s)
      .setDepth(DEPTH.terrain + 5 + GREEN_LAYERS.indexOf(layer)).setVisible(false);
    const tkey = this.key(hole, layer, 'trees');
    const places = ((this.scene.textures.get(tkey).customData as { trees?: TreePlace[] }).trees ?? []);
    const H = this.course.json.world.height;
    const trees = places.map((t) => {
      // trunk base on the art's pixel grid
      const px = (Math.round(t.x * d.ppm) / d.ppm) * PX_PER_M;
      const py = (Math.round((H - t.y) * d.ppm) / d.ppm) * PX_PER_M;
      return this.scene.add.image(px, py, tkey, t.f).setOrigin(0.5, 1).setScale(s).setDepth(py).setVisible(false);
    });
    const out = { img, trees };
    this.built.set(k, out);
    return out;
  }

  /** Show one layer (hiding any other). Returns false when its art is not loaded yet. */
  show(hole: number, layer: GreenLayer): boolean {
    if (!this.isReady(hole)) return false;
    const k = `${hole}:${layer}`;
    if (this.current !== k) {
      this.hide();
      const sh = this.build(hole, layer);
      sh.img.setVisible(true);
      for (const t of sh.trees) t.setVisible(true).setAlpha(1);
      this.current = k;
    }
    return true;
  }

  hide() {
    if (this.current) {
      const sh = this.built.get(this.current);
      if (sh) { sh.img.setVisible(false); for (const t of sh.trees) t.setVisible(false); }
    }
    this.current = null;
    this.faded.clear();
  }

  get visible(): boolean {
    return this.current !== null;
  }

  get layer(): GreenLayer | null {
    return this.current ? (this.current.split(':')[1] as GreenLayer) : null;
  }

  /** Drop the objects and textures of other holes (keeps GPU memory small). */
  forget(keepHole: number) {
    for (const [k, sh] of this.built) {
      if (Number(k.split(':')[0]) === keepHole) continue;
      if (this.current === k) this.hide();
      sh.img.destroy();
      for (const t of sh.trees) t.destroy();
      this.built.delete(k);
    }
    for (const g of this.course.json.greenViews ?? []) {
      if (g.hole === keepHole) continue;
      for (const l of GREEN_LAYERS) {
        for (const w of ['art', 'trees'] as const) {
          const key = this.key(g.hole, l, w);
          if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        }
      }
      this.loading.delete(g.hole);
    }
  }

  /** Fade trees drawn in front of any of the given world-pixel points. */
  fadeOccluders(points: { x: number; y: number; depth: number }[]) {
    const sh = this.current ? this.built.get(this.current) : null;
    const now = new Set<Phaser.GameObjects.Image>();
    if (sh) {
      for (const im of sh.trees) {
        const w = im.displayWidth, h = im.displayHeight;
        for (const p of points) {
          if (im.depth > p.depth && p.x > im.x - w / 2 && p.x < im.x + w / 2 && p.y > im.y - h && p.y < im.y - 0.5) {
            now.add(im);
            break;
          }
        }
      }
    }
    for (const im of this.faded) if (!now.has(im)) im.setAlpha(1);
    for (const im of now) im.setAlpha(0.4);
    this.faded = now;
  }
}

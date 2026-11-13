// Holiday dress for the course art (developer, 2026-11-13). The game's own pictures are changed
// once as they load, so every view that draws them shows the holiday with no change of its own:
//
//   thanksgiving  the broadleaf trees turn orange, red and yellow (conifers stay green), and their
//                 leaves lie on the rough under them
//   christmas     snow on the tops of the trees, baubles in them and a star on every conifer, and
//                 snow lying in patches on the rough (the fairways and greens are clear)
//
// The holiday's hats, flags and decorations are their own sprite sheet (assets-src/holiday.py);
// the falling snow and leaves are HolidayFxScene.

import Phaser from 'phaser';
import { app, PX_PER_M } from '../app';
import type { CourseRuntime, GreenLayerJson } from '../data/course';
import { bayer4, hash01, Holiday, patchNoise } from '../systems/game/holiday';
import { SURF } from '../systems/physics/surfaces';

export const holiday = (): Holiday | null => app.holiday;

/** The texture a golfer, flag or portrait frame comes from: the holiday's sheet when it has one. */
export function charTex(scene: Phaser.Scene, frame: string): string {
  if (!app.holiday || !scene.textures.exists('holiday')) return 'ui';
  return scene.textures.get('holiday').has(frame) ? 'holiday' : 'ui';
}

interface FrameBox { name: string; x: number; y: number; w: number; h: number }

/**
 * Copy a texture to a canvas, let `pixels` change it (and `draw` paint on it), then put it back under
 * the same key with the same frames. Done once per texture per holiday (marked in its customData).
 */
function restyle(scene: Phaser.Scene, key: string, pixels: ((d: Uint8ClampedArray, W: number, H: number, frames: FrameBox[]) => void) | null,
  draw?: (ctx: CanvasRenderingContext2D) => void): boolean {
  const tm = scene.textures;
  if (!tm.exists(key)) return false;
  const tex = tm.get(key);
  const mark = (tex.customData ?? {}) as Record<string, unknown>;
  if (mark.holiday === app.holiday) return false;
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const W = src.width, H = src.height;
  if (!W || !H) return false;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(src, 0, 0);
  const frames = tex.getFrameNames().map((name) => {
    const f = tex.get(name);
    return { name, x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight, pivot: f.customPivot ? [f.pivotX, f.pivotY] : null, data: f.customData };
  });
  if (pixels) {
    const img = ctx.getImageData(0, 0, W, H);
    pixels(img.data, W, H, frames);
    ctx.putImageData(img, 0, 0);
  }
  draw?.(ctx);
  tm.remove(key);
  const nt = tm.addCanvas(key, cv);
  if (!nt) return false;
  for (const fr of frames) {
    const nf = nt.add(fr.name, 0, fr.x, fr.y, fr.w, fr.h);
    if (!nf) continue;
    if (fr.pivot) { nf.customPivot = true; nf.pivotX = fr.pivot[0]; nf.pivotY = fr.pivot[1]; }
    nf.customData = fr.data;
  }
  nt.customData = { ...mark, holiday: app.holiday };
  return true;
}

// ------------------------------------------------------------------------ trees

const lum = (r: number, g: number, b: number) => 0.3 * r + 0.59 * g + 0.11 * b;
/** A leafy pixel: opaque, not the dark outline, greener than it is red (the trunks are brown). */
const leafy = (d: Uint8ClampedArray, i: number) => d[i + 3] > 200 && lum(d[i], d[i + 1], d[i + 2]) > 38 && d[i + 1] >= d[i] - 6;

// autumn ramps, darkest (the outline side) to lightest (the upper-left highlight)
const AUTUMN: [number, number, number][][] = [
  [[96, 40, 14], [176, 76, 24], [222, 118, 36], [246, 170, 70]],   // orange
  [[88, 22, 18], [150, 34, 24], [198, 58, 34], [232, 108, 58]],    // red
  [[110, 82, 18], [168, 124, 26], [216, 172, 44], [244, 214, 102]], // yellow
];
const ORNAMENT: [number, number, number][] = [[226, 52, 52], [255, 212, 74], [74, 158, 255], [250, 250, 250], [236, 84, 200]];

/**
 * Dress a tree sheet. `ratio` is its texels per course texel (1 for the course's own sprites, 3, 6 or 12
 * for the putting views'), so baubles, stars and snow keep about the same size in the world.
 */
export function dressTrees(scene: Phaser.Scene, key: string, ratio = 1) {
  const h = app.holiday;
  if (!h) return;
  restyle(scene, key, (d, W, _H, frames) => {
    if (h === 'thanksgiving') autumn(d, W, frames);
    else christmasTrees(d, W, frames, ratio);
  });
}

function autumn(d: Uint8ClampedArray, W: number, frames: FrameBox[]) {
  // the broadleaf frames' greens, darkest to lightest, map onto four tones of the frame's colour
  const broad = frames.filter((f) => f.name.startsWith('d_') || f.name.startsWith('b_'));
  const tones = new Map<number, number>();
  for (const f of broad) {
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
      const i = (y * W + x) * 4;
      if (leafy(d, i)) tones.set((d[i] << 16) | (d[i + 1] << 8) | d[i + 2], lum(d[i], d[i + 1], d[i + 2]));
    }
  }
  const sorted = [...tones.entries()].sort((a, b) => a[1] - b[1]);
  const rank = new Map<number, number>();
  sorted.forEach(([c], k) => rank.set(c, Math.min(3, Math.floor((k / Math.max(1, sorted.length)) * 4))));
  for (const f of broad) {
    const v = Number(f.name.slice(-1)) || 0; // the sheet's three variants of each size: orange, red, yellow
    const ramp = AUTUMN[v % 3];
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
      const i = (y * W + x) * 4;
      if (!leafy(d, i)) {
        // the dark outline goes from green-black to brown-black
        if (d[i + 3] > 200 && d[i + 1] > d[i] + 4) { d[i] = Math.min(255, d[i + 1] + 8); d[i + 1] = Math.round(d[i + 1] * 0.7); }
        continue;
      }
      const c = ramp[rank.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) ?? 2];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
  }
}

function christmasTrees(d: Uint8ClampedArray, W: number, frames: FrameBox[], ratio: number) {
  const snowDepth = Math.max(1, Math.round(ratio * 0.7));
  const size = ratio < 2 ? 1 : ratio < 5 ? 2 : ratio < 9 ? 3 : 5;
  const gap = ratio < 2 ? 4 : Math.round(4 * Math.sqrt(ratio) * 1.15);
  for (const f of frames) {
    const kind = f.name[0];
    if (kind !== 'c' && kind !== 'd' && kind !== 'b') continue;
    const seed = hashName(f.name);
    const at = (x: number, y: number) => ((f.y + y) * W + f.x + x) * 4;
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < f.w && y < f.h;
    const leaf = (x: number, y: number) => inside(x, y) && leafy(d, at(x, y));
    // snow on the upper edges of the crown: lighter on the sunny (left) side
    const snow = new Uint8Array(f.w * f.h);
    for (let x = 0; x < f.w; x++) {
      let fromTop = 0;
      for (let y = 0; y < f.h; y++) {
        const i = at(x, y);
        if (d[i + 3] < 128) { fromTop = 0; continue; }
        if (!leafy(d, i)) { if (fromTop === 0) continue; }
        if (fromTop < snowDepth && leafy(d, i)) {
          const shade = x > f.w * 0.62 ? [206, 218, 232] : [242, 247, 252];
          d[i] = shade[0]; d[i + 1] = shade[1]; d[i + 2] = shade[2];
          snow[y * f.w + x] = 1;
        }
        fromTop++;
      }
    }
    // baubles on a jittered grid, on leafy ground only
    let k = 0;
    for (let gy = 1 + Math.floor(gap / 2); gy < f.h - 1; gy += gap) {
      for (let gx = 1; gx < f.w - 1; gx += gap) {
        k++;
        const jx = gx + Math.floor(hash01(seed, k, 1) * gap), jy = gy + Math.floor(hash01(seed, k, 2) * (gap - 1));
        if (hash01(seed, k, 3) < 0.25) continue; // not every spot
        let ok = true;
        for (let yy = -1; yy <= size && ok; yy++) for (let xx = -1; xx <= size && ok; xx++) {
          if (!leaf(jx + xx, jy + yy) || snow[(jy + yy) * f.w + jx + xx]) ok = false;
        }
        if (!ok) continue;
        const col = ORNAMENT[Math.floor(hash01(seed, k, 4) * ORNAMENT.length)];
        for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
          if (size >= 3 && (xx === 0 || xx === size - 1) && (yy === 0 || yy === size - 1)) continue; // round
          const i = at(jx + xx, jy + yy);
          const hi = size >= 2 && xx <= Math.floor((size - 1) / 3) && yy <= Math.floor((size - 1) / 3);
          const lo = size >= 3 && (xx >= size - 2 && yy >= size - 2);
          const m = hi ? 1.35 : lo ? 0.7 : 1;
          d[i] = Math.min(255, col[0] * m); d[i + 1] = Math.min(255, col[1] * m); d[i + 2] = Math.min(255, col[2] * m);
        }
      }
    }
    // a star on the tip of most conifers
    if (kind === 'c' && !f.name.endsWith('_2')) { // two conifers in three (the sheet's variants)
      let top = -1, sx = 0, n = 0;
      for (let y = 0; y < f.h && top < 0; y++) {
        for (let x = 0; x < f.w; x++) if (d[at(x, y) + 3] > 128) { sx += x; n++; }
        if (n) top = y;
      }
      if (top >= 0) {
        const cx = Math.round(sx / n), arm = Math.max(1, Math.round(ratio * 0.9)), cy = top + arm;
        const put = (x: number, y: number, c: [number, number, number]) => {
          if (!inside(x, y)) return;
          const i = at(x, y);
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        };
        for (let t = -arm; t <= arm; t++) { put(cx + t, cy, [255, 214, 58]); put(cx, cy + t, [255, 214, 58]); }
        if (arm >= 3) for (let t = -Math.floor(arm / 2); t <= Math.floor(arm / 2); t++) { put(cx + t, cy + t, [255, 196, 40]); put(cx + t, cy - t, [255, 196, 40]); }
        put(cx, cy, [255, 255, 236]);
      }
    }
  }
}

function hashName(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

// ------------------------------------------------------------------------ ground

/** Where the snow starts (patchNoise): about two fifths of the rough is under snow. */
const SNOW_EDGE = 0.5;
const SNOWY = new Set<number>([SURF.rough, SURF.woods, SURF.ob, SURF.obWoods, SURF.range]);
const LEAFY_GROUND = new Set<number>([SURF.rough, SURF.woods, SURF.ob, SURF.obWoods, SURF.fringe, SURF.fairway, SURF.range]);
const LEAF_COLS = ['#e8701e', '#b84c10', '#c8321e', '#8e1e12', '#e8b42a', '#b88618'];

/** Where a picture of the ground lies: its top-left corner in world metres and its texels per metre. */
interface GroundBox { x0: number; y1: number; ppm: number }

function dressGround(scene: Phaser.Scene, key: string, box: GroundBox, course: CourseRuntime) {
  const h = app.holiday;
  if (!h) return;
  const t = course.terrain;
  if (h === 'christmas') {
    restyle(scene, key, (d, W, H) => {
      for (let py = 0; py < H; py++) {
        const y = box.y1 - (py + 0.5) / box.ppm;
        for (let px = 0; px < W; px++) {
          const x = box.x0 + (px + 0.5) / box.ppm;
          if (!SNOWY.has(t.surface(x, y))) continue;
          const i0 = (py * W + px) * 4;
          // only on grass (the baked roofs, roads and paths that overlap the rough stay as they are)
          if (d[i0 + 1] < d[i0] || d[i0 + 1] < d[i0 + 2]) continue;
          const n = patchNoise(x, y);
          if (n < SNOW_EDGE) continue;
          // the patch edges are dithered over about a metre, so they stay pixel art at any scale
          if (n < SNOW_EDGE + 0.035 && (n - SNOW_EDGE) / 0.035 < bayer4(px, py)) continue;
          const i = (py * W + px) * 4;
          // the ground's own light and shade show through (its hillshade, texture and the trees' shadows)
          const l = lum(d[i], d[i + 1], d[i + 2]);
          const k = Math.max(0.72, Math.min(1.04, 0.9 + ((l - 88) / 88) * 0.28));
          d[i] = Math.min(255, 236 * k); d[i + 1] = Math.min(255, 242 * k); d[i + 2] = Math.min(255, 250 * k);
        }
      }
    });
    return;
  }
  // thanksgiving: leaves on the ground under the broadleaf trees (on grass, not on a baked roof or path)
  const s = Math.max(1, Math.round(0.28 * box.ppm));
  const cols = LEAF_COLS.map((c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  restyle(scene, key, (d, W, H) => {
    const x1 = box.x0 + W / box.ppm, y0 = box.y1 - H / box.ppm;
    for (const tr of course.obstacles.trees) {
      if (tr.conifer || tr.kind === 3) continue;
      const R = tr.r * 1.25 + 1;
      if (tr.x < box.x0 - R || tr.x > x1 + R || tr.y < y0 - R || tr.y > box.y1 + R) continue;
      const n = Math.min(36, Math.round(tr.r * tr.r * 1.1 + 3));
      for (let k = 0; k < n; k++) {
        const a = hash01(tr.i, k, 21) * Math.PI * 2;
        const rr = R * Math.sqrt(hash01(tr.i, k, 22));
        const x = tr.x + Math.cos(a) * rr, y = tr.y + Math.sin(a) * rr * 0.8 - tr.r * 0.15;
        const sf = t.surface(x, y);
        if (!LEAFY_GROUND.has(sf)) continue;
        if (sf === SURF.fairway && hash01(tr.i, k, 23) < 0.6) continue; // the fairways are mostly blown clear
        const px = Math.floor((x - box.x0) * box.ppm), py = Math.floor((box.y1 - y) * box.ppm);
        if (px < 0 || py < 0 || px + s > W || py + s > H) continue;
        const c0 = (py * W + px) * 4;
        if (d[c0 + 1] < d[c0] || d[c0 + 1] < d[c0 + 2]) continue;
        const c = cols[Math.floor(hash01(tr.i, k, 24) * cols.length)];
        for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
          if (s >= 3 && (xx === 0 || xx === s - 1) && (yy === 0 || yy === s - 1)) continue; // a rounded leaf
          const i = ((py + yy) * W + px + xx) * 4;
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
        }
      }
    }
  });
}

/** The holiday's things beside the tee box (metres: to the left of the line of play, and ahead). */
export function holidayTeeDecor(): { frame: string; side: number; ahead: number }[] {
  // either side of the tee box, clear of the golfer (a sprite about 9 m across) and the markers
  if (app.holiday === 'thanksgiving') {
    return [{ frame: 'hay', side: 12, ahead: -3 }, { frame: 'pumpkin_1', side: 10.5, ahead: -4.6 }, { frame: 'pumpkin_0', side: 13.8, ahead: -4.8 },
      { frame: 'corn', side: 14.5, ahead: -1.4 }, { frame: 'pumpkin_0', side: -11, ahead: -3.6 }, { frame: 'corn', side: -12.6, ahead: -2.2 }];
  }
  if (app.holiday === 'christmas') {
    return [{ frame: 'present_0', side: 11.5, ahead: -3.4 }, { frame: 'present_1', side: 13.2, ahead: -4.8 }, { frame: 'present_2', side: -11.5, ahead: -3.6 }];
  }
  return [];
}

/** Dress a course as it loads: its tree sheets and its terrain. */
export function dressCourse(scene: Phaser.Scene, course: CourseRuntime) {
  if (!app.holiday) return;
  for (const k of ['trees', 'blossom']) dressTrees(scene, k, 1);
  const j = course.json;
  const chunkM = j.terrain.chunk / PX_PER_M;
  for (let r = 0; r < j.terrain.rows; r++) {
    for (let c = 0; c < j.terrain.cols; c++) {
      dressGround(scene, `chunk_${c}_${r}`, { x0: c * chunkM, y1: j.world.height - r * chunkM, ppm: PX_PER_M }, course);
    }
  }
}

/** Dress one putting view's art and trees as they load. */
export function dressGreenView(scene: Phaser.Scene, course: CourseRuntime, artKey: string, treesKey: string, d: GreenLayerJson) {
  if (!app.holiday) return;
  dressTrees(scene, treesKey, d.ppm / PX_PER_M);
  dressGround(scene, artKey, { x0: d.x0, y1: d.y1, ppm: d.ppm }, course);
}

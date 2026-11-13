// Holiday dress for the course art (developer, 2026-11-13). The game's own pictures are changed
// once as they load, so every view that draws them shows the holiday with no change of its own:
//
//   thanksgiving  the broadleaf trees turn orange, red and yellow (conifers stay green), and their
//                 leaves lie on the rough under them
//   christmas     snow on the tops of the trees, baubles, twinkling lights and a star on most
//                 conifers; string lights along every roof; snow lying in patches on the rough (the
//                 fairways and greens are clear)
//
// The lights twinkle by redrawing their few texels in the dressed picture now and then (twinkle(),
// from HolidayFxScene), so every view of a tree or a roof twinkles with no change of its own.
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
function restyle(scene: Phaser.Scene, key: string, pixels: ((d: Uint8ClampedArray, W: number, H: number, frames: FrameBox[]) => Light[] | void) | null,
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
  let lights: Light[] = [];
  if (pixels) {
    const img = ctx.getImageData(0, 0, W, H);
    lights = pixels(img.data, W, H, frames) || [];
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
  if (lights.length) TWINKLE.set(key, { tex: nt, lights });
  else TWINKLE.delete(key);
  return true;
}

// ------------------------------------------------------------------------ twinkling lights

type RGB = [number, number, number];
/** A light: its top-left texel, size, colours lit and dim, and when it's dim (tick + ph) % per === 0. */
interface Light { x: number; y: number; s: number; on: RGB; off: RGB; ph: number; per: number }
const TWINKLE = new Map<string, { tex: Phaser.Textures.CanvasTexture; lights: Light[] }>();
let tick = 0;

const lit = (l: Light, t: number) => (t + l.ph) % l.per !== 0;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

function paintLight(d: Uint8ClampedArray, W: number, l: Light) {
  for (let yy = 0; yy < l.s; yy++) for (let xx = 0; xx < l.s; xx++) {
    if (l.s >= 3 && (xx === 0 || xx === l.s - 1) && (yy === 0 || yy === l.s - 1)) continue; // round
    const i = ((l.y + yy) * W + l.x + xx) * 4;
    const c = l.s >= 3 && xx === 1 && yy === 1 ? [255, 255, 240] : l.on; // a glint on the bigger bulbs
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
}

/** Dim the lights whose turn it is and light the others (about three times a second). */
export function twinkle(scene: Phaser.Scene) {
  tick++;
  for (const [key, tw] of TWINKLE) {
    if (!scene.textures.exists(key) || scene.textures.get(key) !== tw.tex) { TWINKLE.delete(key); continue; }
    const ctx = tw.tex.context;
    let changed = false;
    for (const l of tw.lights) {
      const now = lit(l, tick);
      if (now === lit(l, tick - 1)) continue;
      ctx.fillStyle = css(now ? l.on : l.off);
      if (l.s >= 3) { ctx.fillRect(l.x + 1, l.y, l.s - 2, l.s); ctx.fillRect(l.x, l.y + 1, l.s, l.s - 2); }
      else ctx.fillRect(l.x, l.y, l.s, l.s);
      if (now && l.s >= 3) { ctx.fillStyle = 'rgb(255,255,240)'; ctx.fillRect(l.x + 1, l.y + 1, 1, 1); }
      changed = true;
    }
    if (changed) tw.tex.refresh();
  }
}

/** The bulbs' colours, and each one dimmed (its glass, unlit). */
const BULBS: RGB[] = [[255, 72, 60], [255, 214, 86], [86, 170, 255], [255, 120, 214], [255, 246, 214], [96, 230, 120]];
const dim = (c: RGB): RGB => [Math.round(c[0] * 0.42 + 14), Math.round(c[1] * 0.42 + 14), Math.round(c[2] * 0.42 + 18)];

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
    if (h === 'thanksgiving') { autumn(d, W, frames); return; }
    return christmasTrees(d, W, frames, ratio);
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

function christmasTrees(d: Uint8ClampedArray, W: number, frames: FrameBox[], ratio: number): Light[] {
  const lights: Light[] = [];
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
        if (hash01(seed, k, 3) < 0.45) continue; // not every spot (the lights take some)
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
    // strings of lights draped across the crown, down to the right, on leaves the snow and the
    // baubles left alone
    const ls = ratio < 4 ? 1 : ratio < 9 ? 2 : 3;
    const lgap = Math.max(5, Math.round(5 * Math.sqrt(ratio)));
    const lstep = Math.max(3, Math.round(3 * Math.sqrt(ratio)));
    const plain = (x: number, y: number) => {
      for (let yy = -1; yy <= ls; yy++) for (let xx = -1; xx <= ls; xx++) {
        if (!leaf(x + xx, y + yy) || snow[(y + yy) * f.w + x + xx]) return false;
        const i = at(x + xx, y + yy);
        if (d[i] > d[i + 1] + 20 || d[i + 2] > d[i + 1] + 20) return false; // a bauble
      }
      return true;
    };
    let n = 0;
    for (let row = Math.floor(lgap * hash01(seed, 0, 9)); row < f.h + f.w * 0.4; row += lgap) {
      for (let x = 1 + Math.floor(hash01(seed, row, 8) * lstep); x < f.w - 1; x += lstep) {
        const sag = 1.2 * Math.sin((x / Math.max(1, f.w)) * Math.PI); // the string droops between its ends
        const y = Math.round(row + x * 0.38 + sag) - Math.floor(f.w * 0.4);
        if (!plain(x, y)) continue;
        n++;
        const on = BULBS[Math.floor(hash01(seed, n, 11) * BULBS.length)];
        const l: Light = { x: f.x + x, y: f.y + y, s: ls, on, off: dim(on), ph: Math.floor(hash01(seed, n, 12) * 5), per: 5 };
        paintLight(d, W, l);
        lights.push(l);
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
  return lights;
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

/**
 * Is there snow on the ground here? A white ball on white snow can't be seen, so the ball there gets
 * the outlined frame the putting views use.
 */
export function onSnow(course: CourseRuntime | null | undefined, x: number, y: number): boolean {
  if (app.holiday !== 'christmas' || !course) return false;
  return SNOWY.has(course.terrain.surface(x, y)) && patchNoise(x, y) >= SNOW_EDGE - 0.02;
}

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
      return roofLights(d, W, H, box, course);
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

/**
 * String lights along the edges of every roof (the clubhouse's and the houses' around the course),
 * a bulb every metre and a half (closer in the putting views), chasing round in threes.
 */
function roofLights(d: Uint8ClampedArray, W: number, H: number, box: GroundBox, course: CourseRuntime): Light[] {
  const out: Light[] = [];
  const s = box.ppm < 4 ? 1 : box.ppm < 16 ? 2 : 3;
  const gapM = box.ppm < 4 ? 1.5 : 0.75;
  const x1 = box.x0 + W / box.ppm, y0 = box.y1 - H / box.ppm;
  course.json.buildings.forEach((b, bi) => {
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, area = 0;
    b.poly.forEach(([x, y], k) => {
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
      const [nx, ny] = b.poly[(k + 1) % b.poly.length];
      area += x * ny - nx * y;
    });
    // the roof is drawn the wall's height above the footprint (as the pipeline bakes it)
    const lift = Math.max(2, Math.round(b.h * 0.7 * box.ppm)) / box.ppm;
    if (maxx < box.x0 - 2 || minx > x1 + 2 || maxy + lift < y0 - 2 || miny > box.y1 + 2) return;
    if (b.h > 14 && Math.abs(area) / 2 < 150) return; // a tower or a lighthouse: drawn its own way
    const seq = Math.floor(hash01(bi, 3, 31) * 4); // each house its own string: four kinds
    let n = 0;
    for (let k = 0; k + 1 < b.poly.length; k++) {
      const [ax, ay] = b.poly[k], [bx, by] = b.poly[k + 1];
      const len = Math.hypot(bx - ax, by - ay);
      for (let t = 0; t < len; t += gapM) {
        const x = ax + ((bx - ax) * t) / len, y = ay + ((by - ay) * t) / len + lift;
        n++;
        const px = Math.round((x - box.x0) * box.ppm - s / 2), py = Math.round((box.y1 - y) * box.ppm - s / 2);
        if (px < 0 || py < 0 || px + s > W || py + s > H) continue;
        const on: RGB = seq === 0 ? BULBS[n % 4] : seq === 1 ? [255, 236, 170] : seq === 2 ? BULBS[n % 2 === 0 ? 0 : 5] : BULBS[n % 3 === 0 ? 2 : 4];
        const l: Light = { x: px, y: py, s, on, off: dim(on), ph: n % 3, per: 3 };
        paintLight(d, W, l);
        out.push(l);
      }
    }
  });
  return out;
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

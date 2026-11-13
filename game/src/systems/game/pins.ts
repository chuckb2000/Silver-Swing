// Hole locations: every green keeps its centre pin (course.json `pin`) and gets
// up to three more, found here from the same green model the physics uses, so
// every course has them without a rebuild. A round then gets a pin sheet: one
// location per hole, chosen so the round mixes front, middle and back pins and
// easy, medium and hard ones (pinSheet below). Pure functions, no Phaser.
//
// A location must be
//   - on the green and at least 14 ft (4.267 m) from every edge of it (developer:
//     10 ft was "a little too close to the edge"); a green too small for two
//     more pins that far in tries 12 ft, then 10 ft,
//   - on putting surface no steeper than 3 % within a club-length around the
//     cup (the green model tilts 1-3 % with undulations up to 1.5 %; real
//     superintendents keep hole locations under about 3 % at these speeds),
//   - at least 15 ft from every other location on the green.
// Among those, the extra pins are picked for interest: spread over the green
// (front / back / left / right of the line in), tucked near a bunker or water,
// near an edge, or on a gentle slope that makes the putt break.

import type { CourseRuntime, HoleJson } from '../../data/course';
import type { GreenModel } from '../physics/terrain';
import { Rng } from '../physics/rng';
import { isOB, isWater, SURF } from '../physics/surfaces';

export const PIN_EDGE_PREFERRED_M = 4.267; // 14 ft from every edge of the green (developer: 10 ft was "a little too close to the edge")
export const PIN_EDGE_STEPS = [4.267, 3.658, 3.048]; // 14, 12, 10 ft: a small green steps down until two more pins fit
export const PIN_EDGE_MIN_M = 3.048; // never closer than 10 ft
export const PIN_MAX_SLOPE = 0.03; // steepest grade around the cup
export const PIN_MIN_SEP_M = 4.572; // 15 ft between two locations on a green
export const PIN_EXTRA = 3; // extra locations per green, besides the centre pin

export type PinDepth = 'front' | 'middle' | 'back';
export type PinSide = 'left' | 'centre' | 'right';

export interface PinSpot {
  x: number;
  y: number;
  /** the course's own pin (course.json `pin`) */
  centre: boolean;
  depth: PinDepth;
  side: PinSide;
  /** 1 easy, 2 medium, 3 hard */
  difficulty: 1 | 2 | 3;
  /** steepest grade within a club-length (fraction) */
  slope: number;
  /** distance to the green's edge (m) */
  edge: number;
  /** distance to the nearest bunker / water / out of bounds beside the green (m), Infinity if none within 10 m */
  hazard: number;
}

/** Short label for the hole intro: "back left", "middle", "front right". */
export function pinLabel(p: PinSpot): string {
  if (p.side === 'centre') return p.depth;
  return p.depth === 'middle' ? `middle ${p.side}` : `${p.depth} ${p.side}`;
}

function greenFor(course: CourseRuntime, hole: HoleJson): GreenModel | undefined {
  return course.terrain.greens.find((g) => g.def.id === hole.greenId);
}

/** Steepest grade of the green surface within r metres of (x, y). */
export function slopeAround(g: GreenModel, x: number, y: number, r = 1.14): number {
  const h = 0.25;
  let worst = 0;
  const pts: [number, number][] = [[0, 0]];
  for (let k = 0; k < 8; k++) pts.push([Math.cos((k * Math.PI) / 4) * r, Math.sin((k * Math.PI) / 4) * r]);
  for (const [dx, dy] of pts) {
    const px = x + dx, py = y + dy;
    const gx = (g.shaped(px + h, py) - g.shaped(px - h, py)) / (2 * h);
    const gy = (g.shaped(px, py + h) - g.shaped(px, py - h)) / (2 * h);
    worst = Math.max(worst, Math.hypot(gx, gy));
  }
  return worst;
}

/** Bunker, water and out-of-bounds cells (1 m) within 10 m of a green, outside it. */
function hazardCells(course: CourseRuntime, g: GreenModel): { x: number; y: number; water: boolean }[] {
  const t = course.terrain, p = g.poly, out: { x: number; y: number; water: boolean }[] = [];
  for (let y = Math.floor(p.minY - 10) + 0.5; y <= p.maxY + 10; y += 1) {
    for (let x = Math.floor(p.minX - 10) + 0.5; x <= p.maxX + 10; x += 1) {
      if (x < 0 || y < 0 || x > t.width || y > t.height || p.contains(x, y)) continue;
      const s = t.surface(x, y);
      if (isWater(s)) out.push({ x, y, water: true });
      else if (s === SURF.bunker || isOB(s)) out.push({ x, y, water: false });
    }
  }
  return out;
}

/** Nearest of those cells (Infinity beyond 10 m). */
function hazardDistance(cells: { x: number; y: number; water: boolean }[], x: number, y: number): { d: number; water: boolean } {
  let d = Infinity, water = false;
  for (const c of cells) {
    const e = Math.hypot(c.x - x, c.y - y);
    if (e < d) { d = e; water = c.water; }
  }
  return d <= 10 ? { d, water } : { d: Infinity, water: false };
}

interface Frame { cx: number; cy: number; ux: number; uy: number; aMin: number; aMax: number; bMin: number; bMax: number }

/** The green seen from the line of play: u points from the approach into the green, v to the player's right. */
function frameFor(g: GreenModel, hole: HoleJson, tee: string): Frame {
  const t = hole.tees[tee] ?? Object.values(hole.tees)[0];
  const cl = t.centerline;
  const [ex, ey] = hole.greenCenter;
  // the last bend before the green (or the tee) gives the direction the approach comes in on
  let k = cl.length - 2;
  while (k > 0 && Math.hypot(cl[k][0] - ex, cl[k][1] - ey) < 30) k--;
  const [sx, sy] = cl[Math.max(0, k)];
  const L = Math.hypot(ex - sx, ey - sy) || 1;
  const ux = (ex - sx) / L, uy = (ey - sy) / L;
  let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
  const p = g.poly;
  for (let i = 0; i < p.xs.length; i++) {
    const dx = p.xs[i] - ex, dy = p.ys[i] - ey;
    const a = dx * ux + dy * uy, b = dx * uy - dy * ux; // b > 0: right of the line in
    aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
  }
  return { cx: ex, cy: ey, ux, uy, aMin, aMax, bMin, bMax };
}

function classify(f: Frame, x: number, y: number): { depth: PinDepth; side: PinSide } {
  const dx = x - f.cx, dy = y - f.cy;
  const a = dx * f.ux + dy * f.uy, b = dx * f.uy - dy * f.ux;
  const ta = (a - f.aMin) / Math.max(1e-6, f.aMax - f.aMin);
  const tb = (b - f.bMin) / Math.max(1e-6, f.bMax - f.bMin);
  const depth: PinDepth = ta < 0.4 ? 'front' : ta > 0.6 ? 'back' : 'middle';
  const side: PinSide = tb < 0.36 ? 'left' : tb > 0.64 ? 'right' : 'centre';
  return { depth, side };
}

function difficultyOf(slope: number, edge: number, hz: { d: number; water: boolean }, depth: PinDepth, edgeMin = PIN_EDGE_MIN_M): { score: number; level: 1 | 2 | 3 } {
  const tucked = hz.d === Infinity ? 0 : Math.max(0, (10 + (edgeMin - PIN_EDGE_MIN_M) - hz.d) / 6.5) * (hz.water ? 1.5 : 1);
  const nearEdge = Math.max(0, Math.min(1, (edgeMin + 3 - edge) / 3)); // as near the edge as this green allows
  const tilt = Math.min(1, slope / PIN_MAX_SLOPE);
  const score = 0.9 * Math.min(1.5, tucked) + 0.6 * nearEdge + 0.5 * tilt + (depth === 'middle' ? 0 : 0.2);
  return { score, level: score < 0.7 ? 1 : score < 1.3 ? 2 : 3 };
}

/**
 * One pin of each kind where the green allows: a hard one tucked near a hazard
 * or an edge, an easy one in open space, and a medium one, each in a part of
 * the green (front / middle / back, left / right) the others don't use.
 */
function pickPins(centre: PinSpot & { score: number }, cands: (PinSpot & { score: number })[], area: number): (PinSpot & { score: number })[] {
  const chosen: (PinSpot & { score: number })[] = [centre];
  const size = Math.sqrt(area);
  const band = (c: { score: number }) => (c.score < 0.7 ? 1 : c.score < 1.3 ? 2 : 3);
  for (const want of [3, 1, 2] as const) {
    let best: (PinSpot & { score: number }) | null = null, bestV = -Infinity;
    for (const c of cands) {
      let near = Infinity;
      for (const q of chosen) near = Math.min(near, Math.hypot(c.x - q.x, c.y - q.y));
      if (near < PIN_MIN_SEP_M) continue;
      const spread = Math.min(1.2, near / Math.max(6, size * 0.4));
      const sameZone = chosen.some((q) => q.depth === c.depth && q.side === c.side) ? -1 : 0;
      const newDepth = chosen.some((q) => q.depth === c.depth) ? 0 : 0.5;
      const newSide = chosen.some((q) => q.side === c.side) ? 0 : 0.25;
      const fit = -0.8 * Math.abs(band(c) - want) - 0.3 * Math.abs(c.score - (want === 1 ? 0.35 : want === 2 ? 1.0 : 1.6));
      const v = 1.2 * spread + sameZone + newDepth + newSide + fit;
      if (v > bestV) { bestV = v; best = c; }
    }
    if (!best) break;
    chosen.push(best);
  }
  return chosen;
}

/** Hole locations on a hole's green: the centre pin first, then up to PIN_EXTRA more. */
export function pinSpots(course: CourseRuntime, hole: HoleJson, tee: string): PinSpot[] {
  const g = greenFor(course, hole);
  const [px0, py0] = hole.pin;
  const centreOnly = (): PinSpot[] => [{ x: px0, y: py0, centre: true, depth: 'middle', side: 'centre', difficulty: 1, slope: 0, edge: 0, hazard: Infinity }];
  if (!g) return centreOnly();
  const f = frameFor(g, hole, tee);
  const cells = hazardCells(course, g);
  const p = g.poly;
  const area = p.area();
  const step = area > 1500 ? 1 : 0.5;
  // candidates on a grid over the green, with their edge distance and slope (the same for every margin tried)
  const grid: { x: number; y: number; edge: number; slope: number; hz: { d: number; water: boolean } }[] = [];
  for (let y = Math.ceil(p.minY / step) * step; y <= p.maxY; y += step) {
    for (let x = Math.ceil(p.minX / step) * step; x <= p.maxX; x += step) {
      if (!p.contains(x, y)) continue;
      const edge = p.edgeDistance(x, y);
      if (edge < PIN_EDGE_MIN_M) continue;
      if (course.obstacles.hidesPoint(x, y)) continue; // a cup the player couldn't see behind a tree on the course view
      const slope = slopeAround(g, x, y);
      if (slope > PIN_MAX_SLOPE) continue;
      grid.push({ x, y, edge, slope, hz: hazardDistance(cells, x, y) });
    }
  }
  let chosen: (PinSpot & { score: number })[] = [];
  for (const edgeMin of PIN_EDGE_STEPS) {
    const spot = (x: number, y: number, centre: boolean, edge = p.edgeDistance(x, y), slope = slopeAround(g, x, y), hz = hazardDistance(cells, x, y)): PinSpot & { score: number } => {
      const { depth, side } = classify(f, x, y);
      const d = difficultyOf(slope, edge, hz, depth, edgeMin);
      return { x, y, centre, depth, side, difficulty: d.level, slope, edge, hazard: hz.d, score: d.score };
    };
    const centre = spot(px0, py0, true);
    const cands = grid.filter((c) => c.edge >= edgeMin).map((c) => spot(c.x, c.y, false, c.edge, c.slope, c.hz));
    chosen = pickPins(centre, cands, area);
    if (chosen.length >= 3) break; // the centre pin and two more fit this far in
  }
  return chosen.map(({ score: _s, ...s }) => ({ ...s, x: Math.round(s.x * 1000) / 1000, y: Math.round(s.y * 1000) / 1000 }));
}

/** Hole locations for every hole of a course (index = course hole - 1), cached per course and tee. */
const cache = new WeakMap<CourseRuntime, Map<string, PinSpot[][]>>();
export function coursePins(course: CourseRuntime, tee: string): PinSpot[][] {
  let m = cache.get(course);
  if (!m) { m = new Map(); cache.set(course, m); }
  let v = m.get(tee);
  if (!v) { v = course.json.holes.map((h) => pinSpots(course, h, tee)); m.set(tee, v); }
  return v;
}

/**
 * A round's pin sheet: which location each hole of the round plays (index into
 * that hole's spots). Like a superintendent's hole-location sheet, the round gets
 * about a third front, middle and back pins and about a third easy, medium and
 * hard ones, never three in a row at the same depth, the centre pin on only a
 * few holes, and a different pin when the same green comes round again (a 9-hole
 * course played twice). Seeded, so a round's sheet is fixed by its seed.
 */
export function pinSheet(spots: PinSpot[][], seed: number, greenOf: (i: number) => string = (i) => String(i)): number[] {
  const n = spots.length;
  if (!n) return [];
  const rng = new Rng((seed ^ 0x51f15e) >>> 0);
  const maxCentre = Math.max(1, Math.round(n / 6));
  const cost = (pick: number[]): number => {
    const depth = { front: 0, middle: 0, back: 0 }, diff = [0, 0, 0, 0];
    let centre = 0, runs = 0, repeats = 0;
    const used = new Map<string, Set<number>>();
    for (let i = 0; i < n; i++) {
      const s = spots[i][pick[i]];
      depth[s.depth]++; diff[s.difficulty]++;
      if (s.centre) centre++;
      if (i >= 2 && s.depth === spots[i - 1][pick[i - 1]].depth && s.depth === spots[i - 2][pick[i - 2]].depth) runs++;
      const gid = greenOf(i);
      const u = used.get(gid) ?? new Set<number>();
      if (u.has(pick[i]) && spots[i].length > u.size) repeats++;
      u.add(pick[i]); used.set(gid, u);
    }
    const t = n / 3;
    let c = 0;
    for (const k of ['front', 'middle', 'back'] as const) c += (depth[k] - t) ** 2;
    for (let k = 1; k <= 3; k++) c += 0.8 * (diff[k] - t) ** 2;
    return c + 4 * runs + 3 * Math.max(0, centre - maxCentre) + 50 * repeats;
  };
  let best: number[] = spots.map(() => 0), bestC = cost(best);
  for (let tries = 0; tries < 300; tries++) {
    const pick = spots.map((s) => Math.floor(rng.next() * s.length));
    // a few passes of local improvement, holes visited in a random order
    for (let pass = 0; pass < 3; pass++) {
      // a shuffle that draws the same numbers in every browser: sort() with a random comparator calls it a
      // different number of times in Chrome and in Safari, so the two drew different sheets from one seed
      // (the daily round's "same pins for everyone")
      const order = spots.map((_, i) => i);
      for (let k = order.length - 1; k > 0; k--) {
        const j = Math.floor(rng.next() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      for (const i of order) {
        let bi = pick[i], bc = Infinity;
        for (let k = 0; k < spots[i].length; k++) {
          pick[i] = k;
          const c = cost(pick) + rng.next() * 0.3; // a little noise so equal sheets still vary by seed
          if (c < bc) { bc = c; bi = k; }
        }
        pick[i] = bi;
      }
    }
    const c = cost(pick);
    if (c < bestC) { bestC = c; best = pick.slice(); }
  }
  return best;
}

/** Pin coordinates for each hole of a round (course holes `courseHoles`, 1-based). */
export function roundPins(course: CourseRuntime, tee: string, courseHoles: number[], seed: number): [number, number][] {
  const all = coursePins(course, tee);
  const spots = courseHoles.map((h) => all[h - 1] ?? []);
  const sheet = pinSheet(spots, seed, (i) => String(courseHoles[i]));
  return sheet.map((k, i) => {
    const s = spots[i][k];
    return s ? [s.x, s.y] : (course.json.holes[courseHoles[i] - 1].pin as [number, number]);
  });
}

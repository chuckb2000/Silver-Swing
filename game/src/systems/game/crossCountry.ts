// Cross-country golf, the bonus mode (developer, 2026-10-27; design in
// docs/reports/cross_country.md). A round is one leg per hole: each leg starts
// on a tee and ends in the cup on a green the player chooses, every tee and
// every green used exactly once. Pure: no Phaser.
//
// The developer's rules:
// - a leg is 85 to 900 yards from the tee to the middle of the green, and a
//   hole's own tee to its own green is always allowed (a 73-yard par 3 too);
// - the game only offers a green that still leaves a way to finish the round;
// - out of bounds is only the course's outer boundary: internal out of bounds
//   and driving ranges play in bounds;
// - scored by gross strokes; no par is shown (one is kept inside the round for
//   the tally's fairway and green stats only, from the leg's length).

import type { CourseRuntime, HoleJson, TeeJson } from '../../data/course';
import { SURF } from '../physics/surfaces';
import { Terrain } from '../physics/terrain';

export const XC_MIN_YD = 85;
export const XC_MAX_YD = 900;
const YD = 0.9144;

/** A leg: [tee hole, green hole], course hole numbers. */
export type Leg = [number, number];

/** Where a course's tees (one tee set) and greens are, by hole number (1-based, index = hole - 1). */
export interface XcMap {
  tees: { x: number; y: number }[];
  greens: { x: number; y: number }[];
}

export function xcMap(json: { defaultTee: string; holes: HoleJson[] }, tee: string = json.defaultTee): XcMap {
  return {
    tees: json.holes.map((h) => { const t = h.tees[tee] ?? Object.values(h.tees)[0]; return { x: t.x, y: t.y }; }),
    greens: json.holes.map((h) => ({ x: h.greenCenter[0], y: h.greenCenter[1] })),
  };
}

/** Straight-line yards from a tee to the middle of a green. */
export function legYards(m: XcMap, tee: number, green: number): number {
  const t = m.tees[tee - 1], g = m.greens[green - 1];
  return Math.hypot(g.x - t.x, g.y - t.y) / YD;
}

/** May a leg go from this tee to this green? 85-900 yd, or a hole's own tee to its own green. */
export function legAllowed(m: XcMap, tee: number, green: number): boolean {
  if (tee === green) return true;
  const yd = legYards(m, tee, green);
  return yd >= XC_MIN_YD && yd <= XC_MAX_YD;
}

/**
 * Can every tee left be paired with a green left by allowed legs? A perfect
 * bipartite matching (Kuhn's augmenting paths; 27 holes at most, instant).
 */
export function canFinish(m: XcMap, teesLeft: number[], greensLeft: number[]): boolean {
  if (teesLeft.length !== greensLeft.length) return false;
  const matchOf = new Map<number, number>(); // green -> tee
  const tryTee = (t: number, seen: Set<number>): boolean => {
    for (const g of greensLeft) {
      if (seen.has(g) || !legAllowed(m, t, g)) continue;
      seen.add(g);
      const other = matchOf.get(g);
      if (other === undefined || tryTee(other, seen)) { matchOf.set(g, t); return true; }
    }
    return false;
  };
  for (const t of teesLeft) if (!tryTee(t, new Set())) return false;
  return true;
}

export interface LegChoice { green: number; yd: number; ok: boolean; why?: 'used' | 'too short' | 'too long' | "can't finish" }

/** The holes not yet used as a tee / as a green, after these legs. */
export function unused(n: number, legs: Leg[]): { tees: number[]; greens: number[] } {
  const t = new Set(legs.map((l) => l[0])), g = new Set(legs.map((l) => l[1]));
  const all = Array.from({ length: n }, (_, i) => i + 1);
  return { tees: all.filter((h) => !t.has(h)), greens: all.filter((h) => !g.has(h)) };
}

/** Every green, and whether a leg from `tee` may end on it now (and why not). */
export function greenChoices(m: XcMap, legs: Leg[], tee: number): LegChoice[] {
  const n = m.tees.length;
  const left = unused(n, legs);
  return Array.from({ length: n }, (_, i) => i + 1).map((g): LegChoice => {
    const yd = legYards(m, tee, g);
    if (!left.greens.includes(g)) return { green: g, yd, ok: false, why: 'used' };
    if (!legAllowed(m, tee, g)) return { green: g, yd, ok: false, why: yd < XC_MIN_YD ? 'too short' : 'too long' };
    const ok = canFinish(m, left.tees.filter((t) => t !== tee), left.greens.filter((x) => x !== g));
    return ok ? { green: g, yd, ok } : { green: g, yd, ok, why: "can't finish" };
  });
}

/** Tees that may start the next leg: unused ones with at least one green they can go to. */
export function teeChoices(m: XcMap, legs: Leg[]): number[] {
  return unused(m.tees.length, legs).tees.filter((t) => greenChoices(m, legs, t).some((c) => c.ok));
}

/** Is a whole round's set of legs a valid one (every tee and green once, every leg allowed)? */
export function validRound(m: XcMap, legs: Leg[]): boolean {
  const n = m.tees.length;
  if (legs.length !== n) return false;
  const t = new Set(legs.map((l) => l[0])), g = new Set(legs.map((l) => l[1]));
  return t.size === n && g.size === n && legs.every(([a, b]) => a >= 1 && a <= n && b >= 1 && b <= n && legAllowed(m, a, b));
}

/**
 * The par the round keeps for a leg (never shown: the developer, "I don't think par even
 * really needs to be calculated"). Only the tally's fairway and green-in-regulation
 * stats use it. A hole's own leg keeps its card par.
 */
export function hiddenPar(yd: number): number {
  return yd <= 250 ? 3 : yd <= 470 ? 4 : yd <= 690 ? 5 : 6;
}

/**
 * A leg as a hole the round can play: the start hole's tee, the target hole's green, pin
 * and putting views, and a straight centre line from tee to green. A hole's own leg is the
 * real hole (its doglegs and card yards).
 */
export function legHole(json: { holes: HoleJson[] }, tee: number, green: number, teeSet: string): HoleJson {
  const g = json.holes[green - 1];
  if (tee === green) return g;
  const src = json.holes[tee - 1];
  const t = src.tees[teeSet] ?? Object.values(src.tees)[0];
  const yd = Math.round(Math.hypot(g.greenCenter[0] - t.x, g.greenCenter[1] - t.y) / YD);
  const leg: TeeJson = { x: t.x, y: t.y, yd, adjYd: yd, realYd: yd, cardYd: yd, centerline: [[t.x, t.y], [g.greenCenter[0], g.greenCenter[1]]] };
  return { number: green, par: hiddenPar(yd), handicap: 0, tees: { [teeSet]: leg }, greenId: g.greenId, greenCenter: g.greenCenter, pin: g.pin };
}

/**
 * The course as cross-country plays it: inside the course boundary nothing is out of bounds
 * (internal out-of-bounds ground plays as rough, a driving range as fairway, a road inside the
 * boundary as a cart path, ...); beyond it, out of bounds as always. The art isn't changed:
 * internal white stakes are still drawn. Made once per course.
 */
const xcCache = new WeakMap<CourseRuntime, CourseRuntime>();
export function xcCourse(course: CourseRuntime): CourseRuntime {
  const hit = xcCache.get(course);
  if (hit) return hit;
  const t = course.terrain;
  const surf = inBoundsInside(t, course.json.boundary);
  const terrain = Object.assign(Object.create(Object.getPrototypeOf(t)) as Terrain, t, { surf });
  const out: CourseRuntime = { ...course, terrain };
  xcCache.set(course, out);
  return out;
}

/** What an out-of-bounds surface inside the boundary plays as in cross-country. */
const INSIDE: Record<number, number> = {
  [SURF.ob]: SURF.rough,
  [SURF.range]: SURF.fairway,
  [SURF.obRoad]: SURF.cartpath,
  [SURF.obWater]: SURF.water,
  [SURF.obWoods]: SURF.woods,
  [SURF.obBuilding]: SURF.building,
  [SURF.obSand]: SURF.bunker,
};

/** A copy of the surface map with the out-of-bounds pixels inside the boundary remapped (scanline fill of the outline). */
export function inBoundsInside(t: Terrain, boundary: number[][]): Uint8Array {
  const out = new Uint8Array(t.surf);
  const n = boundary.length;
  const xs: number[] = [];
  for (let r = 0; r < t.sH; r++) {
    const y = t.height - (r + 0.5) / t.pxPerM; // the pixel row's centre, metres north
    xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = boundary[i], [xj, yj] = boundary[j];
      if ((yi > y) !== (yj > y)) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil(xs[k] * t.pxPerM - 0.5)), c1 = Math.min(t.sW - 1, Math.floor(xs[k + 1] * t.pxPerM - 0.5));
      for (let c = c0; c <= c1; c++) {
        const i = r * t.sW + c;
        const to = INSIDE[out[i]];
        if (to !== undefined) out[i] = to;
      }
    }
  }
  return out;
}

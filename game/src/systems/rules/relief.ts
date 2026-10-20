// Relief procedures (USGA Rules 16.1, 13.1f, 17, 18.2, 19) as pure functions.
// The UI shows the returned area, suggests a point, and validates clicks.

import { isOB, isWater, SURF } from '../physics/surfaces';
import { Terrain, Polygon } from '../physics/terrain';

export const CLUB_LENGTH = 1.14;

export interface Pt { x: number; y: number }

export type ReliefKind =
  | 'stroke_distance'
  | 'back_on_line'
  | 'lateral'
  | 'unplayable_2cl'
  | 'unplayable_line'
  | 'unplayable_line_out'   // in a bunker, outside it for 2 strokes
  | 'free_relief'
  | 'e5';

export interface ReliefArea {
  kind: ReliefKind;
  shape: 'circle' | 'line' | 'point';
  center: Pt;            // circle centre / line origin (reference point) / replay spot
  radius: number;        // circle radius or half-width of the line corridor
  dir?: Pt;              // for 'line': unit vector pointing away from the hole
  hole: Pt;
  refDist: number;       // drops must be no nearer the hole than this
  bunker?: 'in' | 'out'; // must (not) be in a bunker
  avoid?: (x: number, y: number) => boolean; // the condition being relieved
  penalty: number;
  label: string;
}

export interface CourseCtx {
  terrain: Terrain;
  boundary: Polygon;
  hole: Pt;
  holeGreen: Polygon;
  otherGreens: Polygon[];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** General playability of a drop spot (not OB, not water, not a building, not a wrong green). */
export function playable(ctx: CourseCtx, p: Pt): boolean {
  const t = ctx.terrain;
  if (!t.inWorld(p.x, p.y)) return false;
  if (!ctx.boundary.contains(p.x, p.y)) return false;
  const s = t.surface(p.x, p.y);
  if (isOB(s) || isWater(s) || s === SURF.building) return false;
  if (ctx.otherGreens.some((g) => g.contains(p.x, p.y))) return false;
  return true;
}

export function validDrop(ctx: CourseCtx, a: ReliefArea, p: Pt): boolean {
  if (a.shape === 'point') return dist(p, a.center) < 0.01;
  if (!playable(ctx, p)) return false;
  if (dist(p, a.hole) < a.refDist - 1e-6) return false;
  if (a.avoid && a.avoid(p.x, p.y)) return false;
  const s = ctx.terrain.surface(p.x, p.y);
  if (a.bunker === 'in' && s !== SURF.bunker) return false;
  if (a.bunker === 'out' && s === SURF.bunker) return false;
  if (a.shape === 'circle') return dist(p, a.center) <= a.radius + 1e-6;
  // line: behind the reference point, within the corridor
  const d = a.dir!;
  const vx = p.x - a.center.x, vy = p.y - a.center.y;
  const along = vx * d.x + vy * d.y;
  const across = Math.abs(vx * -d.y + vy * d.x);
  return along >= 0 && across <= a.radius;
}

/** Closest valid point to the area's anchor (searching outward). */
export function suggestDrop(ctx: CourseCtx, a: ReliefArea): Pt | null {
  if (a.shape === 'point') return { ...a.center };
  const anchor = a.center;
  if (a.shape === 'circle') {
    for (let r = 0; r <= a.radius + 0.001; r += 0.15) {
      const n = Math.max(1, Math.ceil((2 * Math.PI * r) / 0.2));
      let best: Pt | null = null;
      let bestD = Infinity;
      for (let k = 0; k < n; k++) {
        const th = (2 * Math.PI * k) / n;
        const p = { x: anchor.x + Math.cos(th) * r, y: anchor.y + Math.sin(th) * r };
        if (!validDrop(ctx, a, p)) continue;
        // prefer spots farther from the hole only to break ties; nearest to the anchor first
        const dd = -dist(p, a.hole) * 1e-3;
        if (dd < bestD) { bestD = dd; best = p; }
      }
      if (best) return best;
    }
    return null;
  }
  // line: walk back from the reference point
  const d = a.dir!;
  for (let s = 0.5; s < 250; s += 0.25) {
    const p = { x: anchor.x + d.x * s, y: anchor.y + d.y * s };
    if (validDrop(ctx, a, p)) return p;
  }
  return null;
}

function awayFromHole(hole: Pt, ref: Pt): Pt {
  const dx = ref.x - hole.x, dy = ref.y - hole.y;
  const L = Math.hypot(dx, dy) || 1;
  return { x: dx / L, y: dy / L };
}

/** Rule 17: ball at rest in a penalty area. `cross` is where it last crossed the edge. */
export function penaltyAreaOptions(ctx: CourseCtx, penalty: 'red' | 'yellow', previous: Pt, cross: Pt, waterPoly: Polygon | null): ReliefArea[] {
  const hole = ctx.hole;
  const avoid = waterPoly ? (x: number, y: number) => waterPoly.contains(x, y) : undefined;
  const opts: ReliefArea[] = [
    { kind: 'stroke_distance', shape: 'point', center: previous, radius: 0, hole, refDist: 0, penalty: 1, label: 'replay from the last spot' },
    { kind: 'back_on_line', shape: 'line', center: cross, radius: CLUB_LENGTH, dir: awayFromHole(hole, cross), hole, refDist: dist(cross, hole), avoid, penalty: 1, label: 'drop back on the line' },
  ];
  if (penalty === 'red') {
    opts.push({ kind: 'lateral', shape: 'circle', center: cross, radius: 2 * CLUB_LENGTH, hole, refDist: dist(cross, hole), avoid, penalty: 1, label: 'drop within 2 club-lengths' });
  }
  return opts;
}

/** Rule 18.2: out of bounds. Default stroke and distance; optional Local Rule E-5. */
export function obOptions(ctx: CourseCtx, previous: Pt, wentOut: Pt | null, e5: boolean): ReliefArea[] {
  const opts: ReliefArea[] = [
    { kind: 'stroke_distance', shape: 'point', center: previous, radius: 0, hole: ctx.hole, refDist: 0, penalty: 1, label: 'replay from the last spot' },
  ];
  if (e5 && wentOut) {
    opts.push({ kind: 'e5', shape: 'circle', center: wentOut, radius: 2 * CLUB_LENGTH, hole: ctx.hole, refDist: dist(wentOut, ctx.hole), penalty: 2, label: 'drop where it went out (2 strokes)' });
  }
  return opts;
}

/** Rule 19: unplayable ball. */
export function unplayableOptions(ctx: CourseCtx, ball: Pt, previous: Pt): ReliefArea[] {
  const hole = ctx.hole;
  const inBunker = ctx.terrain.surface(ball.x, ball.y) === SURF.bunker;
  const opts: ReliefArea[] = [
    { kind: 'stroke_distance', shape: 'point', center: previous, radius: 0, hole, refDist: 0, penalty: 1, label: 'replay from the last spot' },
    { kind: 'unplayable_line', shape: 'line', center: ball, radius: CLUB_LENGTH, dir: awayFromHole(hole, ball), hole, refDist: dist(ball, hole), bunker: inBunker ? 'in' : undefined, penalty: 1, label: 'drop back on the line' },
    { kind: 'unplayable_2cl', shape: 'circle', center: ball, radius: 2 * CLUB_LENGTH, hole, refDist: dist(ball, hole), bunker: inBunker ? 'in' : undefined, penalty: 1, label: 'drop within 2 club-lengths' },
  ];
  if (inBunker) {
    opts.push({ kind: 'unplayable_line_out', shape: 'line', center: ball, radius: CLUB_LENGTH, dir: awayFromHole(hole, ball), hole, refDist: dist(ball, hole), bunker: 'out', penalty: 2, label: 'back on the line outside the bunker' });
  }
  return opts;
}

/**
 * Rules 16.1 / 13.1f: nearest point of complete relief from `cond`, then a
 * one club-length relief area no nearer the hole, in the general area.
 */
export function freeReliefArea(ctx: CourseCtx, ball: Pt, cond: (x: number, y: number) => boolean, label: string): ReliefArea | null {
  const hole = ctx.hole;
  const ballDist = dist(ball, hole);
  const general = (p: Pt) => {
    if (!playable(ctx, p) || cond(p.x, p.y)) return false;
    const s = ctx.terrain.surface(p.x, p.y);
    if (s === SURF.bunker || s === SURF.green || isWater(s)) return false;
    return dist(p, hole) >= ballDist - 1e-6;
  };
  let npcr: Pt | null = null;
  for (let r = 0.2; r < 40 && !npcr; r += 0.1) {
    const n = Math.max(8, Math.ceil((2 * Math.PI * r) / 0.1));
    let best: Pt | null = null;
    let bestScore = Infinity;
    for (let k = 0; k < n; k++) {
      const th = (2 * Math.PI * k) / n;
      const p = { x: ball.x + Math.cos(th) * r, y: ball.y + Math.sin(th) * r };
      if (!general(p)) continue;
      // clear of the condition by a ball's width as well
      if (cond(p.x + 0.1, p.y) || cond(p.x - 0.1, p.y) || cond(p.x, p.y + 0.1) || cond(p.x, p.y - 0.1)) continue;
      const score = -dist(p, hole);
      if (score < bestScore) { bestScore = score; best = p; }
    }
    npcr = best;
  }
  if (!npcr) return null;
  return {
    kind: 'free_relief', shape: 'circle', center: npcr, radius: CLUB_LENGTH, hole, refDist: dist(npcr, hole),
    avoid: (x, y) => cond(x, y) || ctx.terrain.surface(x, y) === SURF.bunker || ctx.terrain.surface(x, y) === SURF.green,
    penalty: 0, label,
  };
}

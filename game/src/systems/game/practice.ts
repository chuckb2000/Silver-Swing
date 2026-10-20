// The practice ground (player improvements, item 5): the range (holes 1-5 of
// the practice course: targets at 50-250 yd, one stall each) and four putting
// greens (holes 6-9: flat, 1 %, 2 %, two tiers). Nothing is scored or saved;
// each ball goes back to the stall, or to the next spot of a ten-putt drill.
// Pure: the shot readouts and the drill's ball spots are worked out here.

import type { SimResult } from '../physics/sim';
import type { Polygon } from '../physics/terrain';

export const PRACTICE_COURSE = 'practice';
export const RANGE_HOLES = [1, 2, 3, 4, 5];
export const PUTTING_HOLES = [6, 7, 8, 9];
export const PUTTING_GREENS = ['flat', '1 % slope', '2 % slope', 'two tiers'];
export const DRILL_FT = [5, 15, 30];
export const DRILL_BALLS = 10;
const FT = 0.3048;

export const isRangeHole = (n: number) => n <= 5;

export interface RangeShot {
  carry: number;    // metres from the ball to where it first landed
  total: number;    // metres to where it stopped (along the ground, straight line)
  offline: number;  // metres right (+) or left (-) of the line to the target, where it stopped
  holed: boolean;
}

/** Carry, total and how far off line a range ball finished. */
export function rangeShot(from: { x: number; y: number }, target: { x: number; y: number }, sim: SimResult): RangeShot {
  const land = sim.landing ?? sim.end;
  const ux = target.x - from.x, uy = target.y - from.y;
  const L = Math.hypot(ux, uy) || 1;
  const ex = sim.end.x - from.x, ey = sim.end.y - from.y;
  // right of the line is a clockwise turn from it
  const offline = (ex * uy - ey * ux) / L;
  return { carry: Math.hypot(land.x - from.x, land.y - from.y), total: Math.hypot(ex, ey), offline, holed: sim.holed };
}

/**
 * The spot for ball `k` of a drill: `ft` feet from the cup, each ball from a
 * new direction (the golden angle), always on the green at least 0.5 m from
 * its edge. Null if the green has no room at that distance.
 */
export function drillSpot(cup: { x: number; y: number }, green: Polygon, ft: number, k: number, startAngle = 0): { x: number; y: number } | null {
  const d = ft * FT;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let t = 0; t < 36; t++) {
    const a = startAngle + (k + t * 7) * golden;
    const x = cup.x + Math.cos(a) * d, y = cup.y + Math.sin(a) * d;
    if (green.contains(x, y) && green.edgeDistance(x, y) >= 0.5) return { x, y };
  }
  return null;
}

/** A practice session's tallies: carries per club on the range, holed putts per drill. */
export class PracticeLog {
  carries = new Map<string, number[]>();
  drill = { ft: DRILL_FT[1], ball: 0, holed: 0 };
  lastSet: { ft: number; holed: number } | null = null;

  addCarry(club: string, m: number) {
    if (!this.carries.has(club)) this.carries.set(club, []);
    this.carries.get(club)!.push(m);
  }

  avgCarry(club: string): { n: number; avg: number } | null {
    const l = this.carries.get(club);
    if (!l || !l.length) return null;
    return { n: l.length, avg: l.reduce((a, b) => a + b, 0) / l.length };
  }

  /** A putt of the drill went in or not; true when the set of ten is complete. */
  putt(holed: boolean): boolean {
    this.drill.ball++;
    if (holed) this.drill.holed++;
    if (this.drill.ball < DRILL_BALLS) return false;
    this.lastSet = { ft: this.drill.ft, holed: this.drill.holed };
    this.drill = { ft: this.drill.ft, ball: 0, holed: 0 };
    return true;
  }

  setDrill(ft: number) {
    this.drill = { ft, ball: 0, holed: 0 };
  }
}

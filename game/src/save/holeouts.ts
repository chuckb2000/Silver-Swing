// The leaderboard's stats lists (developer, 2026-10-26): the most feet of putts made in a
// round, and the longest hole-outs from off the green, each with its flight so it can be
// watched again. A hole-out goes on the shared list the moment the ball drops, like an
// eagle (eagleReport.ts), so an unfinished round counts. Pure: also used by the server.

import type { HoleScore } from '../systems/rules/scoring';

export const FT = 0.3048;
export const YD = 0.9144;

/** A hole-out from off the green: a chip-in, a holed approach, an ace. */
export interface HoleOut {
  id: string;        // `${round}-h${slot}`, like an eagle's
  round: string;
  player: string;
  course: string;
  hole: number;      // the course's hole
  par: number;
  /** the stroke's number on the hole (1 = an ace or a holed tee shot) */
  n: number;
  club: string;      // the club's name ("7 iron", "sand wedge")
  dist: number;      // metres, start to cup
  lie: string;       // where it was played from ("fairway", "rough", "bunker"...)
  tee: string;
  difficulty: string;
  date: string;
  /** the flight (systems/match/path.ts encodePath), for the replay; left out of lists */
  path?: string;
}

/** The most bytes a hole-out's flight may take (a long holed approach is about 8 KB). */
export const MAX_PATH = 24_000;

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const int = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Shape check for a hole-out from storage or the network. */
export function isHoleOut(e: unknown): e is HoleOut {
  const x = e as Partial<HoleOut> | null;
  return !!x && typeof x === 'object'
    && str(x.id, 140) && str(x.round, 120) && str(x.player, 40) && str(x.course, 64)
    && int(x.hole, 1, 36) && int(x.par, 3, 6) && int(x.n, 1, 20) && str(x.club, 24)
    && typeof x.dist === 'number' && Number.isFinite(x.dist) && x.dist >= 0 && x.dist <= 700
    && str(x.lie, 24) && str(x.tee, 32) && str(x.difficulty, 16) && str(x.date, 40)
    && (x.path === undefined || (typeof x.path === 'string' && x.path.length <= MAX_PATH));
}

/** Metres of putts holed in a round (the holing stroke of each hole, when it was played on the green). */
export function puttsMadeM(scores: HoleScore[]): number {
  return Math.round(scores.reduce((a, s) => a + (s.made !== undefined && !s.off ? s.made : 0), 0) * 100) / 100;
}

/** Does the round carry the distances (rounds played from 2026-10-26)? */
export const tracksMade = (scores: HoleScore[]) => scores.some((s) => s.made !== undefined);

/** "34 ft" (putts), "142 yd" (hole-outs over 30 yd), "18 ft" (closer). */
export const feet = (m: number) => `${Math.round(m / FT)} ft`;
export const holeOutDistance = (m: number) => (m >= 30 * YD ? `${Math.round(m / YD)} yd` : feet(m));

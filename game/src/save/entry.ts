// A finished round as stored on the leaderboard (this device and the shared
// online board). Pure: also used by the server function (functions/api).

import type { HoleScore, RoundTotals } from '../systems/rules/scoring';

/**
 * 18-hole courses: all 18, front or back nine. 9-hole courses: 9 holes, or
 * twice around (18). Other sizes (13, 19 holes): 'all'. A club of three or
 * more nines: `nines:<a>+<b>` (two nines) or `nines:<a>` (one), by nine id.
 */
export type RoundLength = '18' | 'front' | 'back' | '9' | '9x2' | 'all' | 'xc' | `nines:${string}`;
/** 'xc': cross-country (bonus mode), on its own board and kept off every other list. */
export const ROUND_LENGTHS: RoundLength[] = ['18', 'front', 'back', '9', '9x2', 'all', 'xc'];

/** A round length from storage or the network. */
export function isRoundLength(v: unknown): v is RoundLength {
  return typeof v === 'string' && (ROUND_LENGTHS.includes(v as RoundLength) || /^nines:[a-z0-9_]{1,16}(\+[a-z0-9_]{1,16})?$/.test(v));
}

/** Most holes a round can have (two nines, a 19-hole course, 18 holes twice around). */
export const MAX_ROUND_HOLES = 27;

export interface LeaderboardEntry {
  id: string;
  course: string;
  tee: string;
  length: RoundLength;
  difficulty: string;
  casual: boolean;
  player: string;
  date: string;
  gross: number;
  toPar: number;
  back: number | null;
  scores: HoleScore[];
  totals: RoundTotals;
  /** the daily round of this day (yyyy-mm-dd), when it counted for the daily board */
  daily?: string;
  /** the course hole of each scorecard slot, when it isn't the slot itself (a club's nines) */
  holes?: number[];
  /** the daily par 3s / 4s / 5s (systems/game/tour.ts): each slot's course, hole, tee and yards */
  tour?: { course: string; hole: number; tee: string; yd?: number }[];
  /** cross-country: each leg's [tee hole, green hole], in the order played */
  legs?: [number, number][];
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Shape check for a round from storage, a backup or the network. */
export function isEntry(e: unknown): e is LeaderboardEntry {
  const x = e as Partial<LeaderboardEntry> | null;
  return !!x && typeof x === 'object'
    && str(x.id, 120) && str(x.course, 64) && str(x.tee, 32)
    && isRoundLength(x.length)
    && str(x.difficulty, 16) && typeof x.casual === 'boolean'
    && str(x.player, 40) && str(x.date, 40)
    && Number.isFinite(x.gross) && Number.isFinite(x.toPar)
    && (x.back === null || x.back === undefined || Number.isFinite(x.back))
    && Array.isArray(x.scores) && x.scores.length <= MAX_ROUND_HOLES
    && !!x.totals && typeof x.totals === 'object'
    && (x.daily === undefined || (typeof x.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.daily)))
    && (x.holes === undefined || (Array.isArray(x.holes) && x.holes.length <= MAX_ROUND_HOLES
      && x.holes.every((h) => Number.isInteger(h) && h >= 1 && h <= 99)))
    && (x.tour === undefined || (Array.isArray(x.tour) && x.tour.length <= MAX_ROUND_HOLES
      && x.tour.every((t) => !!t && typeof t === 'object' && str(t.course, 64) && Number.isInteger(t.hole) && t.hole >= 1 && t.hole <= 99
        && str(t.tee, 32) && (t.yd === undefined || (Number.isFinite(t.yd) && t.yd >= 0 && t.yd <= 1000)))))
    && (x.legs === undefined || (Array.isArray(x.legs) && x.legs.length <= MAX_ROUND_HOLES
      && x.legs.every((l) => Array.isArray(l) && l.length === 2 && l.every((h) => Number.isInteger(h) && h >= 1 && h <= 99))));
}

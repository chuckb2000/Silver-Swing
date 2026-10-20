// A finished round as stored on the leaderboard (this device and the shared
// online board). Pure: also used by the server function (functions/api).

import type { HoleScore, RoundTotals } from '../systems/rules/scoring';

/** 18-hole courses: all 18, front or back nine. 9-hole courses: 9 holes, or twice around (18). */
export type RoundLength = '18' | 'front' | 'back' | '9' | '9x2';
export const ROUND_LENGTHS: RoundLength[] = ['18', 'front', 'back', '9', '9x2'];

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
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Shape check for a round from storage, a backup or the network. */
export function isEntry(e: unknown): e is LeaderboardEntry {
  const x = e as Partial<LeaderboardEntry> | null;
  return !!x && typeof x === 'object'
    && str(x.id, 120) && str(x.course, 64) && str(x.tee, 32)
    && ROUND_LENGTHS.includes(x.length as RoundLength)
    && str(x.difficulty, 16) && typeof x.casual === 'boolean'
    && str(x.player, 40) && str(x.date, 40)
    && Number.isFinite(x.gross) && Number.isFinite(x.toPar)
    && (x.back === null || x.back === undefined || Number.isFinite(x.back))
    && Array.isArray(x.scores) && x.scores.length <= 18
    && !!x.totals && typeof x.totals === 'object'
    && (x.daily === undefined || (typeof x.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.daily)));
}

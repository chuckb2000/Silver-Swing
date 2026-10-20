// Eagles and birdies for the "recent eagles" list and the "most birdies in a
// round" board (developer, 2026-10-19). Pure: used by the game and by the
// server function (functions/api), so both count them the same way.

import type { HoleScore } from '../systems/rules/scoring';
import type { LeaderboardEntry } from './entry';

/**
 * A hole played in two or more under par (eagle, albatross, or a hole in one
 * on a par 3), sent the moment the ball drops, so it is kept even if the round
 * is never finished. The id is `<round id>-h<slot>` (slot = the round's hole
 * number, 1-18), so the live report and the finished round's copy are one.
 */
export interface EagleEvent {
  id: string;
  round: string;      // the round's id (LeaderboardEntry.id)
  player: string;
  course: string;     // course id
  hole: number;       // the course's hole number (a 9-hole course played twice: 1-9)
  par: number;
  strokes: number;
  tee: string;
  difficulty: string;
  date: string;       // ISO time the ball dropped
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const int = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

export function isEagle(e: unknown): e is EagleEvent {
  const x = e as Partial<EagleEvent> | null;
  return !!x && typeof x === 'object'
    && str(x.id, 140) && str(x.round, 120) && str(x.player, 40) && str(x.course, 64)
    && int(x.hole, 1, 18) && int(x.par, 3, 6) && int(x.strokes, 1, 4) && (x.strokes as number) <= (x.par as number) - 2
    && str(x.tee, 32) && str(x.difficulty, 16) && str(x.date, 40);
}

/** "eagle", "albatross", "condor", or "hole in one" (an ace on a par 3 is also an eagle). */
export function featName(strokes: number, par: number): string {
  if (strokes === 1) return 'hole in one';
  const d = strokes - par;
  return d <= -4 ? 'condor' : d === -3 ? 'albatross' : 'eagle';
}

/** Is this hole an eagle or better? */
export const isEagleScore = (s: { strokes: number; par: number }) => s.strokes > 0 && s.strokes <= s.par - 2;

/** Birdies or better in a round (eagles count too: they are birdies and one more). */
export function birdiesIn(scores: HoleScore[]): number {
  return scores.filter((s) => s.strokes > 0 && s.strokes < s.par).length;
}

/** The eagles of a finished round, as the live reports would have sent them. */
export function eaglesIn(e: LeaderboardEntry, courseHoles: (slot: number) => number = (slot) => slot): EagleEvent[] {
  if (e.casual) return [];
  const out: EagleEvent[] = [];
  e.scores.forEach((s) => {
    if (!isEagleScore(s)) return;
    out.push({
      id: `${e.id}-h${s.hole}`, round: e.id, player: e.player, course: e.course, hole: courseHoles(s.hole), par: s.par,
      strokes: s.strokes, tee: e.tee, difficulty: e.difficulty, date: e.date,
    });
  });
  return out;
}

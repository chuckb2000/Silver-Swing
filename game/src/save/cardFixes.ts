// Scorecard corrections (design chat, 2026-10-26): a course's par changed after rounds were
// played on it. The server rewrites its stored rounds and eagles once (scores.ts
// applyCardFixes) and every round or eagle that arrives later; each device rewrites its own
// board, eagles and round in progress on load (store.ts, snapshot.ts). Gross never changes.
// Pure: also used by the server function.

import type { LeaderboardEntry, RoundLength } from './entry';
import { HoleScore, totals } from '../systems/rules/scoring';
import type { EagleEvent } from './feats';

export interface CardFix {
  course: string;
  /** the course's hole (not the scorecard slot) */
  hole: number;
  par: number;
  /** when the fix was made, for the record */
  since: string;
  why: string;
}

/** Add a line when a course's card changes after it went live; the fix runs once everywhere. */
export const CARD_FIXES: CardFix[] = [
  { course: 'silvies_chief_egan', hole: 3, par: 3, since: '2026-10-26', why: 'every hole par 3 (PR #81)' },
  { course: 'silvies_chief_egan', hole: 6, par: 3, since: '2026-10-26', why: 'every hole par 3 (PR #81)' },
];

/** A version of the list: the server stores it in `meta` once its rows are rewritten. */
export const CARD_FIXES_KEY = CARD_FIXES.map((f) => `${f.course}:${f.hole}=${f.par}`).join(',');

/** Courses with a fix. */
export const fixedCourses = (fixes: CardFix[] = CARD_FIXES) => [...new Set(fixes.map((f) => f.course))];

/** Scorecard slot -> course hole: a club's nines carry their holes; a 9-hole course twice around repeats. */
export function slotHole(e: { length?: RoundLength; holes?: number[] }, slots?: number[]) {
  return (slot: number): number => {
    if (e.holes && slots) { const i = slots.indexOf(slot); if (i >= 0 && e.holes[i]) return e.holes[i]; }
    else if (e.holes?.[slot - 1]) return e.holes[slot - 1];
    return e.length === '9x2' ? ((slot - 1) % 9) + 1 : slot;
  };
}

/**
 * One hole's score with the corrected par: fairway left out on a par 3, and a green in
 * regulation only if it still is one (strokes before the putts within par - 2). Null if unchanged.
 */
export function fixScore(s: HoleScore, par: number): HoleScore | null {
  if (s.par === par) return null;
  const toGreen = s.strokes - s.putts;
  return {
    ...s, par,
    fairway: par === 3 ? null : s.fairway,
    gir: par < s.par ? s.gir && toGreen <= par - 2 : s.gir,
  };
}

/** Scores with the fixes for this course applied; null if nothing changed. */
export function fixScores(course: string, scores: HoleScore[], hole: (slot: number) => number, fixes: CardFix[] = CARD_FIXES): HoleScore[] | null {
  const mine = fixes.filter((f) => f.course === course);
  if (!mine.length) return null;
  let changed = false;
  const out = scores.map((s) => {
    const f = mine.find((x) => x.hole === hole(s.hole));
    const n = f ? fixScore(s, f.par) : null;
    if (n) changed = true;
    return n ?? s;
  });
  return changed ? out : null;
}

/** A finished round with the fixes applied (par, to par, totals); null if nothing changed. */
export function fixEntry<T extends LeaderboardEntry>(e: T, fixes: CardFix[] = CARD_FIXES): T | null {
  if (e.length === 'xc') return null; // cross-country: a leg is not the hole of its number, and has no par
  const scores = fixScores(e.course, e.scores, slotHole(e), fixes);
  if (!scores) return null;
  const t = totals(scores);
  return { ...e, scores, totals: t, toPar: t.toPar };
}

/**
 * An eagle with the fixes applied: the same one, one with the new par, or null when it is no
 * longer an eagle (a 2 on a hole that became a par 3 is a birdie; an ace stays).
 */
export function fixEagle<T extends EagleEvent>(ev: T, fixes: CardFix[] = CARD_FIXES): T | null {
  const f = fixes.find((x) => x.course === ev.course && x.hole === ev.hole);
  if (!f || f.par === ev.par) return ev;
  return ev.strokes <= f.par - 2 ? { ...ev, par: f.par } : null;
}

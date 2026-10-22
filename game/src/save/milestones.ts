// Milestones (player improvements, item 11): first birdie, first eagle, a
// course's first round, breaking 100/90/80/70, every course in a state played.
// Worked out from a player's finished rounds, so nothing extra is stored and
// the list is the same on every device that has the rounds. Pure.

import type { LeaderboardEntry } from './entry';
import { isFullRound } from '../systems/game/lengths';

export interface Milestone {
  key: string;      // unique per player: 'birdie', 'birdie:<course>', 'break:<course>:80', 'state:OR', ...
  text: string;     // "first birdie at langston"
  round: string;    // the round that earned it
  date: string;     // when
  course?: string;
  /** a lesser milestone the same round also earned (broke 90 and 100 at once): left out of banners */
  minor?: boolean;
}

export interface MilestoneCourse { id: string; name: string; state: string }

const BREAK_18 = [100, 90, 80, 70];
const BREAK_9 = [50, 45, 40, 35];

/** "Langston Golf Course" -> "langston" (short names read better in a banner). */
export function shortName(name: string): string {
  return name.replace(/ (golf|country) club$| golf (course|links)$| golf links$/i, '').toLowerCase();
}

const isEighteen = (e: LeaderboardEntry) => isFullRound(e.length);

/**
 * Every milestone in a player's rounds, in the order they were earned. Casual
 * rounds and rounds on courses no longer offered are left out.
 */
export function milestonesOf(rounds: LeaderboardEntry[], courses: MilestoneCourse[], stateNames: Record<string, string> = {}): Milestone[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const list = rounds.filter((e) => !e.casual && byId.has(e.course)).slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const out: Milestone[] = [];
  const have = new Set<string>();
  const played = new Set<string>();
  const add = (key: string, text: string, e: LeaderboardEntry, course?: string, minor = false) => {
    if (have.has(key)) return;
    have.add(key);
    out.push({ key, text, round: e.id, date: e.date, course, minor });
  };
  const byState = new Map<string, string[]>();
  for (const c of courses) {
    if (!byState.has(c.state)) byState.set(c.state, []);
    byState.get(c.state)!.push(c.id);
  }
  for (const e of list) {
    const c = byId.get(e.course)!;
    const at = shortName(c.name);
    played.add(e.course);
    add(`course:${e.course}`, `first round at ${at}`, e, e.course, true);
    const holes = e.scores.filter((s) => s.strokes > 0);
    if (holes.some((s) => s.strokes === 1)) add('ace', 'hole in one!', e, e.course);
    if (holes.some((s) => s.strokes <= s.par - 2)) {
      add('eagle', 'first eagle', e, e.course);
      add(`eagle:${e.course}`, `first eagle at ${at}`, e, e.course, true);
    }
    if (holes.some((s) => s.strokes < s.par)) {
      add('birdie', 'first birdie', e, e.course);
      add(`birdie:${e.course}`, `first birdie at ${at}`, e, e.course, true);
    }
    // a whole round only (the summary is reached after the last hole)
    const full = holes.length === e.scores.length && (isEighteen(e) || holes.length === 9); // breaking 40 is for nine holes, not 13
    if (full) {
      const marks = isEighteen(e) ? BREAK_18 : BREAK_9;
      const nine = isEighteen(e) ? '' : ' on nine';
      const broke = marks.filter((m) => e.gross < m);
      broke.forEach((m, i) => add(`break:${e.course}:${isEighteen(e) ? 18 : 9}:${m}`, `broke ${m}${nine} at ${at}`, e, e.course, i < broke.length - 1));
      if (e.toPar <= 0) add(`par:${e.course}:${isEighteen(e) ? 18 : 9}`, `${e.toPar < 0 ? 'under' : 'level'} par${nine} at ${at}`, e, e.course);
    }
    for (const [code, ids] of byState) {
      if (ids.length >= 2 && ids.every((id) => played.has(id))) add(`state:${code}`, `every ${(stateNames[code] ?? code).toLowerCase()} course played`, e);
    }
    if (courses.length >= 2 && courses.every((x) => played.has(x.id))) add('all', 'every course played!', e);
  }
  return out;
}

/** The milestones a round has just earned, the main ones first (for the summary's banner). */
export function earnedBy(roundId: string, all: Milestone[]): Milestone[] {
  const mine = all.filter((m) => m.round === roundId);
  const keys = new Set(mine.map((m) => m.key));
  // "first birdie" already says it: "first birdie at x" from the same round is left out
  const repeat = (m: Milestone) => (m.key.startsWith('birdie:') && keys.has('birdie')) || (m.key.startsWith('eagle:') && keys.has('eagle'));
  return [...mine.filter((m) => !m.minor), ...mine.filter((m) => m.minor && !repeat(m))];
}

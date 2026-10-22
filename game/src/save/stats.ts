// "My golf" (player improvements, item 7): a player's rounds summed up - per
// course, overall, and the last few rounds - plus the course passport. Pure:
// built from leaderboard entries (this device's, and the player code's rounds
// on the shared board).

import type { LeaderboardEntry } from './entry';
import { isFullRound } from '../systems/game/lengths';
import { compareRounds } from '../systems/rules/scoring';

export interface CourseStats {
  course: string;
  rounds: number;          // finished, not casual
  avg18: number | null;    // average gross of 18-hole rounds
  avg9: number | null;     // average gross of 9-hole rounds
  best: LeaderboardEntry | null; // lowest gross (18-hole rounds first, else 9)
  last: string;            // date of the last round
}

export interface PlayerStats {
  rounds: number;
  holes: number;
  fairwayPct: number | null;
  girPct: number | null;
  puttsPer18: number | null;
  penaltiesPer18: number | null;
  /** scoring to par per 18 holes over the last rounds, oldest first */
  recent: { date: string; toPar18: number; course: string }[];
  courses: CourseStats[];
}

const is18 = (e: LeaderboardEntry) => isFullRound(e.length);
const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Rounds of one player, each once (the same round from this device and the shared board). */
export function mergeRounds(...lists: LeaderboardEntry[][]): LeaderboardEntry[] {
  const seen = new Map<string, LeaderboardEntry>();
  for (const l of lists) for (const e of l) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()];
}

export function playerStats(all: LeaderboardEntry[], recentN = 10): PlayerStats {
  const rounds = all.filter((e) => !e.casual).sort((a, b) => a.date.localeCompare(b.date));
  const holes = rounds.reduce((a, e) => a + e.scores.length, 0);
  let fw = 0, fwc = 0, gir = 0, putts = 0, pen = 0;
  for (const e of rounds) {
    for (const s of e.scores) {
      if (s.fairway !== null) { fwc++; if (s.fairway) fw++; }
      if (s.gir) gir++;
      putts += s.putts;
      pen += s.penalties;
    }
  }
  const per18 = (n: number) => (holes ? (n / holes) * 18 : null);
  const byCourse = new Map<string, LeaderboardEntry[]>();
  for (const e of rounds) {
    if (!byCourse.has(e.course)) byCourse.set(e.course, []);
    byCourse.get(e.course)!.push(e);
  }
  const courses: CourseStats[] = [...byCourse.entries()].map(([course, list]) => {
    // other sizes (13 or 19 holes) count in "rounds" and the best of last resort, not in the averages
    const r18 = list.filter(is18), r9 = list.filter((e) => !is18(e) && e.scores.length === 9);
    const best = (r18.length ? r18 : r9.length ? r9 : list).slice().sort(compareRounds)[0] ?? null;
    return {
      course, rounds: list.length,
      avg18: avg(r18.map((e) => e.gross)), avg9: avg(r9.map((e) => e.gross)),
      best, last: list[list.length - 1].date,
    };
  }).sort((a, b) => b.last.localeCompare(a.last));
  return {
    rounds: rounds.length, holes,
    fairwayPct: fwc ? (100 * fw) / fwc : null,
    girPct: holes ? (100 * gir) / holes : null,
    puttsPer18: per18(putts),
    penaltiesPer18: per18(pen),
    recent: rounds.slice(-recentN).map((e) => ({ date: e.date, course: e.course, toPar18: e.scores.length ? (e.toPar / e.scores.length) * 18 : 0 })),
    courses,
  };
}

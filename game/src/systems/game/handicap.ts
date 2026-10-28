// Handicaps (developer, 2026-10-20: option 2 of the proposal): the World Handicap
// System's arithmetic with a quick start. Pure.
//
// - Only rounds at Normal difficulty that aren't casual count, on a rated course
//   (a rating and slope for the tees played; East Potomac Red has none).
// - Score differential = 113 / slope x (adjusted gross - course rating), each hole
//   capped at net double bogey (par + 2 + the strokes the player gets there; par + 5
//   before the player has an index).
// - A nine counts as half a round: two nines (any two, oldest first) make one
//   18-hole differential, the sum of their nine-hole differentials (the course
//   rating halved for a nine; a 9-hole course rated for nine holes is used as is).
// - The index from the latest 20 differentials (best 8), with a table for fewer
//   (WHS's, counting a few more in the middle: TABLE);
//   with one or two (18 to 45 holes) it is the table's lowest-minus-2.0 rule
//   (provisional in WHS; not marked in the game, developer 2026-10-20). Rounded to a tenth,
//   at most 54.0.

import type { LeaderboardEntry } from '../../save/entry';

/** What a round needs for the handicap (a LeaderboardEntry has it all; the server sends just this). */
export type HcpRound = Pick<LeaderboardEntry, 'id' | 'course' | 'tee' | 'difficulty' | 'casual' | 'player' | 'date'> & {
  /** the round's length (cross-country, 'xc', never counts) */
  length?: string;
  scores: { hole: number; par: number; strokes: number }[];
};

/** What the handicap needs of a course: its holes' pars and stroke indexes, and each tee's rating and slope. */
export interface HcpCourse {
  id: string;
  holes: number;              // 9 or 18
  pars: number[];             // per course hole
  si: number[];               // stroke index per course hole (1 = hardest)
  ratings: Record<string, [number, number]>; // tee -> [course rating, slope]
}

export interface Differential { value: number; date: string; rounds: string[] }

export interface Handicap {
  index: number;
  provisional: boolean;       // under 54 holes
  counted: number;            // differentials used
  of: number;                 // differentials in the record (at most 20)
  differentials: Differential[];
  /** holes in the rounds that count (a nine still waiting for its partner included) */
  holes: number;
}

const MAX_INDEX = 54;
const RECORD = 20;
/**
 * [how many of the lowest differentials to average, adjustment] for 1..20 differentials.
 * WHS for 1-4 (1-2: the quick start) and 19-20; in between a little more of the record
 * counts than in WHS (developer, 2026-10-21: "bump those handicap numbers down a smidge":
 * 2 of 5-7, 3 of 8-10, 4 of 11-13, 5 of 14-16, 6 of 17-18), and the best 8 only once
 * there are 20 ("we want that handicap to be legit").
 */
const TABLE: [number, number][] = [
  [1, -2], [1, -2], [1, -2], [1, -1], [2, 0], [2, 0], [2, 0], [3, 0], [3, 0], [3, 0],
  [4, 0], [4, 0], [4, 0], [5, 0], [5, 0], [5, 0], [6, 0], [6, 0], [7, 0], [8, 0],
];

const round1 = (v: number) => Math.round(v * 10) / 10;

/** The index from differentials, newest last (null: none yet). */
export function indexOf(diffs: Differential[]): Handicap | null {
  const rec = diffs.slice(-RECORD);
  if (!rec.length) return null;
  const [k, adj] = TABLE[rec.length - 1];
  const low = rec.map((d) => d.value).sort((a, b) => a - b).slice(0, k);
  const avg = low.reduce((a, b) => a + b, 0) / low.length;
  return { index: Math.min(MAX_INDEX, round1(avg + adj)), provisional: rec.length < 3, counted: k, of: rec.length, differentials: rec, holes: 0 };
}

/** Does this round count for the shared index? */
export function counts(e: HcpRound, c: HcpCourse | undefined): boolean {
  if (!c || e.casual || e.difficulty !== 'normal' || e.length === 'xc') return false;
  const r = c.ratings[e.tee];
  if (!r || !(r[0] > 0) || !(r[1] > 0)) return false;
  return e.scores.length === 9 || e.scores.length === 18;
}

/** Course handicap (WHS): index x slope / 113 + (rating - par), for 18 holes or a nine. */
export function courseHandicap(index: number, c: HcpCourse, tee: string, holes: 9 | 18): number | null {
  const r = c.ratings[tee];
  if (!r || !(r[0] > 0)) return null;
  const { rating, par } = ratingFor(c, tee, holes)!;
  return Math.round((holes === 9 ? index / 2 : index) * r[1] / 113 + (rating - par));
}

/** Rating and par for 18 holes or a nine of this course and tee. */
function ratingFor(c: HcpCourse, tee: string, holes: 9 | 18): { rating: number; par: number; slope: number } | null {
  const r = c.ratings[tee];
  if (!r) return null;
  const parAll = c.pars.reduce((a, b) => a + b, 0);
  // a 9-hole course's rating is for nine holes when it is below 45 (East Potomac White 31.0),
  // else for 18 (Highland Links 67.2: twice around)
  const r18 = c.holes === 9 && r[0] < 45 ? r[0] * 2 : r[0];
  const par18 = c.holes === 9 ? parAll * 2 : parAll;
  return holes === 18 ? { rating: r18, par: par18, slope: r[1] } : { rating: r18 / 2, par: par18 / 2, slope: r[1] };
}

/** The course hole of a scorecard slot (a 9-hole course played twice repeats 1-9). */
const courseHoleOf = (slot: number, c: HcpCourse) => ((slot - 1) % c.holes) + 1;

/** Strokes received on each of these holes for a course handicap, by stroke index (WHS allocation). */
export function strokesOn(holes: number[], c: HcpCourse, ch: number): number[] {
  const order = holes.map((h, i) => ({ i, si: c.si[courseHoleOf(h, c) - 1] ?? 99 + i })).sort((a, b) => a.si - b.si);
  const out = holes.map(() => 0);
  if (ch <= 0) return out; // plus handicaps give strokes back: not needed for the cap here
  for (let k = 0; k < ch; k++) out[order[k % holes.length].i] += 1;
  return out;
}

/** A round's nine-hole parts (or its one 18-hole part) with adjusted gross and rating. */
interface Part { id: string; date: string; holes: 9 | 18; adj: number; rating: number; slope: number }

function partsOf(e: HcpRound, c: HcpCourse, index: number | null): Part[] {
  const holes: 9 | 18 = e.scores.length === 18 ? 18 : 9;
  const rp = ratingFor(c, e.tee, holes)!;
  const ch = index === null ? null : courseHandicap(index, c, e.tee, holes);
  const recv = ch === null ? null : strokesOn(e.scores.map((s) => s.hole), c, ch);
  const adj = e.scores.reduce((sum, s, i) => sum + Math.min(s.strokes, s.par + (recv ? 2 + recv[i] : 5)), 0);
  return [{ id: e.id, date: e.date, holes, adj, rating: rp.rating, slope: rp.slope }];
}

const diffOf = (p: Part) => (113 / p.slope) * (p.adj - p.rating);

/**
 * A player's handicap from their rounds (any order; duplicates by id are dropped).
 * `asOf`: only rounds played before this time (for the change since last week).
 */
export function handicapOf(rounds: HcpRound[], courses: Map<string, HcpCourse>, asOf?: string): Handicap | null {
  const seen = new Set<string>();
  const list = rounds
    .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return counts(e, courses.get(e.course)) && (!asOf || e.date < asOf); })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const diffs: Differential[] = [];
  let waiting: { d: number; p: Part } | null = null; // a nine waiting for its partner
  for (const e of list) {
    const cur = indexOf(diffs);
    for (const p of partsOf(e, courses.get(e.course)!, cur ? cur.index : null)) {
      if (p.holes === 18) { diffs.push({ value: round1(diffOf(p)), date: p.date, rounds: [p.id] }); continue; }
      if (!waiting) { waiting = { d: diffOf(p), p }; continue; }
      diffs.push({ value: round1(waiting.d + diffOf(p)), date: p.date, rounds: [waiting.p.id, p.id] });
      waiting = null;
    }
  }
  const h = indexOf(diffs);
  if (h) h.holes = list.reduce((a, e) => a + e.scores.length, 0);
  return h;
}

/** "12.4", a plus handicap as "+1.2" (no mark for a provisional index: developer, 2026-10-20). */
export function indexLabel(h: Handicap): string {
  return h.index < 0 ? `+${(-h.index).toFixed(1)}` : h.index.toFixed(1);
}

/**
 * The rounds that make a player's own handicap ("my golf", the new-round screen), the
 * same ones the board counts: rounds under a name. Rounds played as "player" never
 * reach the board, so they count only while the player has no name at all.
 */
export function ownHcpRounds<T extends HcpRound>(rounds: T[], playerName: string, defaultName: string): T[] {
  return playerName === defaultName ? rounds : rounds.filter((e) => e.player !== defaultName);
}

/** The handicap view of the course list (courses without ratings drop out). */
export function hcpCourses(list: { id: string; holes: number; nines?: unknown[]; pars?: number[]; si?: number[]; ratings?: Record<string, [number, number]> }[]): Map<string, HcpCourse> {
  const m = new Map<string, HcpCourse>();
  for (const c of list) {
    if (!c.pars || !c.si || !c.ratings || !Object.keys(c.ratings).length) continue;
    // only courses of 9 or 18 holes: a 13- or 19-hole course has no rating for a nine or an 18, and a
    // club of three nines is rated per pair of nines, which the course list doesn't keep (yet)
    if ((c.holes !== 9 && c.holes !== 18) || (c.nines?.length ?? 0) >= 3) continue;
    m.set(c.id, { id: c.id, holes: c.holes, pars: c.pars, si: c.si, ratings: c.ratings });
  }
  return m;
}

/** Each player's handicap from a list of rounds (names as on the boards), lowest first; with the index a week earlier. */
/** Holes a player needs on the handicap board: three nines, or an 18 and a nine (developer: no one-round players). */
export const BOARD_MIN_HOLES = 27;

export function handicapBoard(rounds: HcpRound[], courses: Map<string, HcpCourse>, now: Date = new Date(), minHoles = BOARD_MIN_HOLES): { player: string; h: Handicap; weekAgo: Handicap | null }[] {
  const by = new Map<string, HcpRound[]>();
  for (const e of rounds) {
    if (!by.has(e.player)) by.set(e.player, []);
    by.get(e.player)!.push(e);
  }
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const out: { player: string; h: Handicap; weekAgo: Handicap | null }[] = [];
  for (const [player, list] of by) {
    const h = handicapOf(list, courses);
    if (h && h.holes >= minHoles) out.push({ player, h, weekAgo: handicapOf(list, courses, weekAgo) });
  }
  return out.sort((a, b) => a.h.index - b.h.index || a.player.localeCompare(b.player));
}


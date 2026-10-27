// The daily par 3s, par 4s and par 5s (developer, 2026-10-27): a second daily
// round, nine real holes of one par drawn from all the courses, the par going
// round 3, 4, 5 a day at a time. The same holes, tees, wind and pins for
// everyone on the day, like the daily round (daily.ts), on its own board. Pure.

import { hash32, seedFromString } from '../physics/rng';
import { addDays, DailyPlan, dayNumber, localDay } from './daily';

export type TourPar = 3 | 4 | 5;

/** The first day of the cycle: a par 3s day (developer: "day 1 would be a random selection of par 3s"). */
export const TOUR_FROM = '2026-10-28';

/** Holes in a round. */
export const TOUR_HOLES = 9;

/** The board id of each round (a round's `course` on the leaderboards). */
export const TOUR_IDS: Readonly<Record<TourPar, string>> = { 3: 'par3s', 4: 'par4s', 5: 'par5s' };

/** The tee of a round on the boards: each hole is played from its own course's default tee. */
export const TOUR_TEE = 'tour';

/** A hole of the round: its course, the course's hole number and the tee it's played from. */
export interface TourHole {
  course: string;
  hole: number;
  tee: string;
  /** its card yardage from that tee (filled in when the hole is played, for the scorecard) */
  yd?: number;
}

/** What the draw needs of a course (CourseInfo from courses/index.json). */
export interface TourCourse {
  id: string;
  pars?: number[];
  defaultTee: string;
  teeSets: string[];
  group?: string;
  location?: string;
}

export interface TourPlan extends DailyPlan {
  par: TourPar;
  holes: TourHole[];
}

export function isTourId(id: string | undefined | null): boolean {
  return id === 'par3s' || id === 'par4s' || id === 'par5s';
}

export function tourParOf(id: string): TourPar | null {
  return id === 'par3s' ? 3 : id === 'par4s' ? 4 : id === 'par5s' ? 5 : null;
}

/** "par 5s" */
export function tourName(id: string): string {
  const p = tourParOf(id);
  return p ? `par ${p}s` : id;
}

/** The day's par: 3, 4, 5, 3, ... from TOUR_FROM (and backwards before it). */
export function tourPar(day: string): TourPar {
  const k = (((dayNumber(day) - dayNumber(TOUR_FROM)) % 3) + 3) % 3;
  return ([3, 4, 5] as const)[k];
}

/** A course's place (East Potomac's three courses are one, so are Bandon's): its group, or its town. */
function placeOf(c: TourCourse): string {
  return c.group ?? (c.location ? c.location.split(',')[0].trim().toLowerCase() : c.id);
}

function teeOf(c: TourCourse): string {
  return c.teeSets.includes(c.defaultTee) ? c.defaultTee : c.teeSets[0] ?? c.defaultTee;
}

interface Cand { c: TourCourse; hole: number; key: string; place: string }

/** Every hole of that par on the courses in the rotation on the day. */
function poolFor(par: TourPar, courses: TourCourse[], roster: Readonly<Record<string, string>> | undefined, day: string): Cand[] {
  const out: Cand[] = [];
  for (const c of courses) {
    if (roster && !(roster[c.id] !== undefined && roster[c.id] <= day)) continue;
    (c.pars ?? []).forEach((p, i) => { if (p === par) out.push({ c, hole: i + 1, key: `${c.id}:${i + 1}`, place: placeOf(c) }); });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Draws that a hole sits out after it was played: half the pool's worth of
 * rounds of that par (par 5s: 144 holes, eight rounds, about 24 days).
 */
export function tourRest(poolSize: number): number {
  return Math.floor(poolSize / TOUR_HOLES / 2);
}

/**
 * Nine holes from the pool in a random order, one per course and, while there
 * are enough, one per place, leaving out the holes drawn lately (`recent`).
 * The rules are relaxed one at a time when the pool is too small for them.
 */
function draw(seed: number, pool: Cand[], recent: Set<string>): Cand[] {
  const order = pool
    .map((x) => ({ x, r: hash32(seed ^ seedFromString(x.key)) }))
    .sort((a, b) => a.r - b.r || a.x.key.localeCompare(b.x.key))
    .map((o) => o.x);
  const picked: Cand[] = [];
  const tiers: ((x: Cand) => boolean)[] = [
    (x) => !recent.has(x.key) && !picked.some((p) => p.place === x.place),
    (x) => !recent.has(x.key) && !picked.some((p) => p.c.id === x.c.id),
    (x) => !picked.some((p) => p.c.id === x.c.id),
    (x) => !picked.includes(x),
  ];
  for (const ok of tiers) {
    for (const x of order) {
      if (picked.length >= TOUR_HOLES) return picked;
      if (ok(x)) picked.push(x);
    }
  }
  return picked;
}

/**
 * The day's round: nine holes of the day's par from the courses in the
 * rotation that day (src/data/dailyRoster.ts: a course merged today joins
 * tomorrow), drawn from the date. Each day of a par looks back on the days of
 * that par before it, so a hole isn't drawn again soon (tourRest). Null when
 * there aren't nine holes of the par.
 */
export function tourPlan(day: string, courses: TourCourse[], roster?: Readonly<Record<string, string>>): TourPlan | null {
  const par = tourPar(day);
  const history: string[][] = [];
  // the days of this par from the first one on (a day before TOUR_FROM has none before it)
  let d = day;
  const days: string[] = [];
  while (d >= TOUR_FROM) { days.unshift(d); d = addDays(d, -3); }
  if (!days.length) days.push(day);
  let last: Cand[] = [];
  for (const dd of days) {
    const pool = poolFor(par, courses, roster, dd);
    const rest = tourRest(pool.length);
    const recent = new Set(rest > 0 ? history.slice(-rest).flat() : []);
    last = draw(seedFromString(`tour-draw:${dd}`), pool, recent);
    history.push(last.map((x) => x.key));
  }
  if (last.length < TOUR_HOLES) return null;
  return {
    day, par, courseId: TOUR_IDS[par], tee: TOUR_TEE, length: '9', seed: seedFromString(`tour:${day}`),
    holes: last.map((x) => ({ course: x.c.id, hole: x.hole, tee: teeOf(x.c) })),
  };
}

/** The calendar day (yyyy-mm-dd, local) of an ISO time. */
function dayOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : localDay(d);
}

/**
 * Whether a daily par round's card may list where its holes were (developer, 2026-10-27: "the
 * list of holes on the scorecard only shows up after the round and won't show up on the
 * leaderboard unless you've already completed the daily"): the round's day is over, or `mine`
 * (this device's finished rounds) has a round of that day's pars, a second go included.
 */
export function tourHolesOpen(
  e: { course: string; daily?: string; date: string },
  mine: { course: string; daily?: string; date: string }[],
  today: string = localDay(),
): boolean {
  if (!isTourId(e.course)) return true;
  const day = e.daily ?? dayOf(e.date);
  if (day < today) return true;
  return mine.some((b) => b.course === e.course && (b.daily ?? dayOf(b.date)) === day);
}

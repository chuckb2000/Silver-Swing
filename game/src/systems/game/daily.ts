// The daily round (player improvements, item 4): one course a day, nine holes
// at Normal, the same tees, wind and pins for everyone (all from the date), on
// its own board. Pure.

import type { LeaderboardEntry, RoundLength } from '../../save/entry';
import { hash32, seedFromString } from '../physics/rng';
import { compareRounds } from '../rules/scoring';
import type { Nine } from './lengths';

/** The calendar day (yyyy-mm-dd) in the player's own time zone. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Days since 1970-01-01 of a yyyy-mm-dd day. */
export function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** The Monday of the day's week (the weekly board runs Monday to Sunday). */
export function weekStart(day: string): string {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday 0
  return addDays(day, -dow);
}

export interface DailyCourse { id: string; holes: number; defaultTee: string; teeSets: string[]; nines?: Nine[]; group?: string; location?: string }

export interface DailyPlan {
  day: string;
  courseId: string;
  tee: string;
  length: RoundLength;
  seed: number;
}

/** A day the developer picked by hand (src/data/dailyRoster.ts DAILY_PICKS). */
export interface DailyPick { courseId: string; length: RoundLength; tee?: string }

/**
 * From this day on the daily is drawn at random each day instead of taking
 * turns in a fixed order (developer, 2026-10-25: East Potomac Red, White and
 * Blue came up three days running, and the fixed order shifted every time a
 * course joined). Days before it keep the old order, so their boards stand.
 */
export const RANDOM_DAILY_FROM = '2026-10-25';

/** Days a drawn course sits out: about two thirds of the rotation. */
export function restDays(courses: number): number {
  return Math.floor((courses * 2) / 3);
}

/** Days a place (a group such as East Potomac, or a town such as Bandon) sits out. */
export const PLACE_REST_DAYS = 5;

/** The old days the first draws look back on, so the change doesn't repeat what came just before it. */
const LOOK_BACK = 14;

/** A course's place: its group, or the town of its location. */
export function placeOf(c: DailyCourse): string {
  return c.group ?? (c.location ? c.location.split(',')[0].trim().toLowerCase() : c.id);
}

function nineable(all: DailyCourse[], roster: Readonly<Record<string, string>> | undefined, day: string): DailyCourse[] {
  // nine holes: a course of 9 or 18, or a club's nines; a course of 13 or 19 holes has no nine
  const ok = all.filter((c) => c.holes === 9 || c.holes === 18 || (c.nines?.length ?? 0) >= 3);
  return roster ? ok.filter((c) => roster[c.id] !== undefined && roster[c.id] <= day) : ok;
}

function teeOf(c: DailyCourse, want?: string): string {
  return want && c.teeSets.includes(want) ? want : c.teeSets.includes(c.defaultTee) ? c.defaultTee : c.teeSets[0] ?? c.defaultTee;
}

function pickedPlan(day: string, all: DailyCourse[], picks?: Readonly<Record<string, DailyPick>>): DailyPlan | null {
  // a day the developer chose (src/data/dailyRoster.ts DAILY_PICKS), when that course is on offer
  const pick = picks?.[day];
  const pc = pick && all.find((c) => c.id === pick.courseId);
  if (!pick || !pc) return null;
  return { day, courseId: pc.id, tee: teeOf(pc, pick.tee), length: pick.length, seed: seedFromString(`daily:${day}`) };
}

/** The old daily (before RANDOM_DAILY_FROM): courses take turns in a fixed order. */
function turnPlan(day: string, courses: DailyCourse[]): DailyPlan {
  const order = courses.slice().sort((a, b) => hash32(seedFromString(a.id)) - hash32(seedFromString(b.id)) || a.id.localeCompare(b.id));
  const n = dayNumber(day);
  const c = order[((n % order.length) + order.length) % order.length];
  const nines = (c.nines?.length ?? 0) >= 3 ? c.nines! : null;
  const length: RoundLength = nines ? `nines:${nines[((n % nines.length) + nines.length) % nines.length].id}`
    : c.holes === 9 ? '9' : n % 2 === 0 ? 'front' : 'back';
  return { day, courseId: c.id, tee: teeOf(c), length, seed: seedFromString(`daily:${day}`) };
}

/** A drawn day: any course that hasn't been played lately, away from the last few days' places. */
function drawnPlan(day: string, courses: DailyCourse[], history: DailyCourse[]): DailyPlan {
  const pool = courses.slice().sort((a, b) => a.id.localeCompare(b.id));
  const recent = new Set(history.slice(-restDays(pool.length)).map((c) => c.id));
  const places = new Set(history.slice(-PLACE_REST_DAYS).map(placeOf));
  // relax the rules one at a time when a small rotation leaves nothing
  const tries = [
    pool.filter((c) => !recent.has(c.id) && !places.has(placeOf(c))),
    pool.filter((c) => !recent.has(c.id) && placeOf(c) !== (history.length ? placeOf(history[history.length - 1]) : '')),
    pool.filter((c) => !history.length || c.id !== history[history.length - 1].id),
    pool,
  ];
  const from = tries.find((t) => t.length)!;
  // the longer a course has waited, the likelier it is drawn (one never drawn counts as two rotations)
  const waited = (c: DailyCourse) => {
    const last = history.map((h) => h.id).lastIndexOf(c.id);
    return last < 0 ? 2 * pool.length : history.length - last;
  };
  const weights = from.map((c) => waited(c) ** 2);
  const r = hash32(seedFromString(`daily-draw:${day}`));
  let x = (r / 0x1_0000_0000) * weights.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < from.length - 1 && x >= weights[i]) x -= weights[i++];
  const c = from[i];
  const r2 = hash32(r ^ 0x9e3779b9);
  const nines = (c.nines?.length ?? 0) >= 3 ? c.nines! : null;
  const length: RoundLength = nines ? `nines:${nines[r2 % nines.length].id}` : c.holes === 9 ? '9' : r2 % 2 === 0 ? 'front' : 'back';
  return { day, courseId: c.id, tee: teeOf(c), length, seed: seedFromString(`daily:${day}`) };
}

/**
 * The day's round. Before RANDOM_DAILY_FROM, courses took turns in a fixed
 * shuffled order (by a hash of the id). From it on, each day is drawn from
 * the date among the courses in the rotation that day, leaving out those
 * played in the last two thirds of a rotation's worth of days and the places
 * of the last five days (the old days before it included), the courses that have waited longest likeliest (East Potomac's three courses are one place, so are
 * Bandon's), so each day follows from the days before it. An 18-hole course
 * plays a drawn nine, a club of three nines one of its nines. With a roster
 * (src/data/dailyRoster.ts), only the courses in the rotation on a day count,
 * so a course added today changes the daily from its first day on, never
 * today's. A course of 13 or 19 holes has no nine and isn't in it.
 */
export function dailyPlan(day: string, all: DailyCourse[], roster?: Readonly<Record<string, string>>, picks?: Readonly<Record<string, DailyPick>>): DailyPlan | null {
  const picked = pickedPlan(day, all, picks);
  if (picked) return picked;
  const courses = nineable(all, roster, day);
  if (!courses.length) return null;
  if (day < RANDOM_DAILY_FROM) return turnPlan(day, courses);
  // walk forward from the first drawn day; each day's draw depends on the days before it
  const byId = new Map(all.map((c) => [c.id, c]));
  const history: DailyCourse[] = [];
  for (let d = addDays(RANDOM_DAILY_FROM, -LOOK_BACK); ; d = addDays(d, 1)) {
    const p = pickedPlan(d, all, picks);
    const todays = p ? null : nineable(all, roster, d);
    const plan = p ?? (!todays!.length ? null : d < RANDOM_DAILY_FROM ? turnPlan(d, todays!) : drawnPlan(d, todays!, history));
    if (d === day) return plan;
    const c = plan && byId.get(plan.courseId);
    if (c) history.push(c);
  }
}

export interface WeekRow {
  player: string;
  days: number;      // daily rounds played this week
  counted: number;   // the best five of them
  toPar: number;     // sum to par of the counted rounds
  rounds: LeaderboardEntry[];
}

/** Was this round played on the day's own round (course, nine and tees)? */
export function playsPlan(e: LeaderboardEntry, plan: DailyPlan): boolean {
  return e.daily === plan.day && e.course === plan.courseId && e.length === plan.length && e.tee === plan.tee;
}

/**
 * The plan of each day, for the boards to keep only rounds of that day's own
 * course: a round tagged with the day but played on another course (a daily
 * started before the day's rotation changed, an older build) is left out.
 */
export type PlanFor = (day: string) => DailyPlan | null;

/**
 * The week's board: each player's best five daily rounds (to par: the courses
 * differ), more rounds first, then the lower total. One round per player and
 * day (the first, if a list has more). With `planFor`, only rounds of each
 * day's own course count.
 */
export function weekStandings(entries: LeaderboardEntry[], best = 5, planFor?: PlanFor): WeekRow[] {
  const by = new Map<string, Map<string, LeaderboardEntry>>();
  const plans = new Map<string, DailyPlan | null>();
  const fits = (e: LeaderboardEntry) => {
    if (!planFor) return true;
    if (!plans.has(e.daily!)) plans.set(e.daily!, planFor(e.daily!));
    const p = plans.get(e.daily!);
    return !!p && playsPlan(e, p);
  };
  for (const e of entries) {
    if (!e.daily || !fits(e)) continue;
    if (!by.has(e.player)) by.set(e.player, new Map());
    const days = by.get(e.player)!;
    const had = days.get(e.daily);
    if (!had || e.date < had.date) days.set(e.daily, e);
  }
  const rows: WeekRow[] = [...by.entries()].map(([player, days]) => {
    const rounds = [...days.values()].sort((a, b) => a.daily!.localeCompare(b.daily!));
    const top = rounds.map((e) => e.toPar).sort((a, b) => a - b).slice(0, best);
    return { player, days: rounds.length, counted: top.length, toPar: top.reduce((a, b) => a + b, 0), rounds };
  });
  return rows.sort((a, b) => b.counted - a.counted || a.toPar - b.toPar || a.player.localeCompare(b.player));
}

/**
 * A day's board: one round per player (the first), lowest first. With the
 * day's `plan`, only rounds of its course, nine and tees count (rounds of
 * different courses tagged with the same day used to share the board).
 */
export function dayStandings(entries: LeaderboardEntry[], day: string, plan?: DailyPlan | null): LeaderboardEntry[] {
  const first = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    if (e.daily !== day) continue;
    if (plan !== undefined && (!plan || !playsPlan(e, plan))) continue;
    const had = first.get(e.player);
    if (!had || e.date < had.date) first.set(e.player, e);
  }
  return [...first.values()].sort(compareRounds);
}

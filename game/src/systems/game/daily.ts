// The daily round (player improvements, item 4): one course a day, nine holes
// at Normal, the same tees, wind and pins for everyone (all from the date), on
// its own board. Pure.

import type { LeaderboardEntry, RoundLength } from '../../save/entry';
import { hash32, seedFromString } from '../physics/rng';
import { compareRounds } from '../rules/scoring';

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

export interface DailyCourse { id: string; holes: number; defaultTee: string; teeSets: string[] }

export interface DailyPlan {
  day: string;
  courseId: string;
  tee: string;
  length: RoundLength;
  seed: number;
}

/**
 * The day's round. Courses take turns in a fixed shuffled order (by a hash of
 * the id); an 18-hole course plays its front nine on even days and its back
 * nine on odd ones. With a roster (src/data/dailyRoster.ts), only the courses
 * in the rotation on that day count, so a course added today changes the
 * daily from its first day on, never today's.
 */
export interface DailyPick { courseId: string; length: RoundLength; tee?: string }

export function dailyPlan(day: string, all: DailyCourse[], roster?: Readonly<Record<string, string>>, picks?: Readonly<Record<string, DailyPick>>): DailyPlan | null {
  // a day the developer chose (src/data/dailyRoster.ts DAILY_PICKS), when that course is on offer
  const pick = picks?.[day];
  const pc = pick && all.find((c) => c.id === pick.courseId);
  if (pick && pc) {
    const tee = pick.tee && pc.teeSets.includes(pick.tee) ? pick.tee : pc.teeSets.includes(pc.defaultTee) ? pc.defaultTee : pc.teeSets[0] ?? pc.defaultTee;
    return { day, courseId: pc.id, tee, length: pick.length, seed: seedFromString(`daily:${day}`) };
  }
  const courses = roster ? all.filter((c) => roster[c.id] !== undefined && roster[c.id] <= day) : all;
  if (!courses.length) return null;
  const order = courses.slice().sort((a, b) => hash32(seedFromString(a.id)) - hash32(seedFromString(b.id)) || a.id.localeCompare(b.id));
  const n = dayNumber(day);
  const c = order[((n % order.length) + order.length) % order.length];
  const tee = c.teeSets.includes(c.defaultTee) ? c.defaultTee : c.teeSets[0] ?? c.defaultTee;
  const length: RoundLength = c.holes === 9 ? '9' : n % 2 === 0 ? 'front' : 'back';
  return { day, courseId: c.id, tee, length, seed: seedFromString(`daily:${day}`) };
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

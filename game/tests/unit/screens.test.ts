// Afternoon review fixes: screens (2026-10-20). The pure parts of the screen fixes.

import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../src/save/entry';
import { totals, type HoleScore } from '../../src/systems/rules/scoring';
import { addDays, dailyPlan, dayStandings, playsPlan, weekStandings } from '../../src/systems/game/daily';
import { cardBlocks, holesFor } from '../../src/systems/game/lengths';

function round(id: string, o: { player?: string; course?: string; tee?: string; length?: LeaderboardEntry['length']; daily: string; strokes?: number; date?: string }): LeaderboardEntry {
  const first = o.length === 'back' ? 10 : 1;
  const scores: HoleScore[] = Array.from({ length: 9 }, (_, i) => ({ hole: first + i, par: 4, strokes: o.strokes ?? 4, putts: 2, penalties: 0, fairway: true, gir: true }));
  const t = totals(scores);
  return {
    id, course: o.course ?? 'a', tee: o.tee ?? 'Blue', length: o.length ?? 'front', difficulty: 'normal', casual: false,
    player: o.player ?? 'kim', date: o.date ?? `${o.daily}T15:00:00Z`, gross: t.strokes, toPar: t.toPar, back: t.back, scores, totals: t, daily: o.daily,
  };
}

describe("the daily boards keep only the day's own course", () => {
  const courses = [
    { id: 'a', holes: 18, defaultTee: 'Blue', teeSets: ['Blue'] },
    { id: 'b', holes: 9, defaultTee: 'Blue', teeSets: ['Blue'] },
  ];
  const planFor = (d: string) => dailyPlan(d, courses);
  const day = '2026-10-20';
  const plan = planFor(day)!;
  const other = courses.find((c) => c.id !== plan.courseId)!.id;

  it('a round of another course tagged with the day is left off the day board', () => {
    const mine = round('m', { course: plan.courseId, length: plan.length, tee: plan.tee, daily: day, strokes: 5 });
    const elsewhere = round('x', { player: 'sam', course: other, length: other === 'b' ? '9' : 'front', daily: day, strokes: 3 });
    expect(playsPlan(mine, plan)).toBe(true);
    expect(playsPlan(elsewhere, plan)).toBe(false);
    expect(dayStandings([elsewhere, mine], day, plan).map((e) => e.id)).toEqual(['m']);
    expect(dayStandings([elsewhere, mine], day).map((e) => e.id)).toEqual(['x', 'm']); // no plan: as before
    expect(dayStandings([mine], day, null)).toEqual([]); // no daily that day: nothing counts
  });

  it("the wrong nine or tees don't count either; the first matching round does", () => {
    const wrongNine = round('w', { course: plan.courseId, length: plan.length === 'front' ? 'back' : 'front', tee: plan.tee, daily: day, date: `${day}T09:00:00Z` });
    const wrongTee = round('t', { course: plan.courseId, length: plan.length, tee: 'Red', daily: day, date: `${day}T09:30:00Z` });
    const ok = round('ok', { course: plan.courseId, length: plan.length, tee: plan.tee, daily: day, date: `${day}T10:00:00Z` });
    expect(dayStandings([wrongNine, wrongTee, ok], day, plan).map((e) => e.id)).toEqual(['ok']);
  });

  it("the week board picks each day's round from that day's course", () => {
    const rounds: LeaderboardEntry[] = [];
    for (let n = 0; n < 3; n++) {
      const d = addDays(day, n);
      const p = planFor(d)!;
      const off = courses.find((c) => c.id !== p.courseId)!;
      // an early round of the wrong course (better score) and the real one
      rounds.push(round(`bad${n}`, { course: off.id, length: off.holes === 9 ? '9' : 'front', daily: d, strokes: 3, date: `${d}T08:00:00Z` }));
      rounds.push(round(`good${n}`, { course: p.courseId, length: p.length, tee: p.tee, daily: d, strokes: 5, date: `${d}T12:00:00Z` }));
    }
    const [row] = weekStandings(rounds, 5, planFor);
    expect(row.rounds.map((e) => e.id)).toEqual(['good0', 'good1', 'good2']);
    expect(row.toPar).toBe(27);
    expect(weekStandings(rounds)[0].rounds.map((e) => e.id)).toEqual(['bad0', 'bad1', 'bad2']); // without plans: the first of the day
  });
});

describe('a round\'s scorecard shows the nines it plays', () => {
  it('front, back, 18, and a 9-hole course once or twice around', () => {
    expect(cardBlocks(holesFor('front'), 18)).toEqual([[1, 9, 'out']]);
    expect(cardBlocks(holesFor('back'), 18)).toEqual([[10, 18, 'in']]);
    expect(cardBlocks(holesFor('18'), 18)).toEqual([[1, 9, 'out'], [10, 18, 'in']]);
    expect(cardBlocks(holesFor('9'), 9)).toEqual([[1, 9, 'tot']]);
    expect(cardBlocks(holesFor('9x2'), 9)).toEqual([[1, 9, 'out'], [10, 18, 'in']]);
  });
});

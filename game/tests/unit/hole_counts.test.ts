// Courses of 13 and 19 holes, and clubs of three nines (developer, 2026-10-20):
// the round lengths they offer, which course holes a round plays, the
// scorecard's blocks, and whole rounds by the robot on courses made from
// Oswego Lake's holes.
import { describe, expect, it } from 'vitest';
import type { CourseJson } from '../../src/data/course';
import { isEntry, isRoundLength, LeaderboardEntry } from '../../src/save/entry';
import { dailyPlan } from '../../src/systems/game/daily';
import { hcpCourses } from '../../src/systems/game/handicap';
import { cardBlocks, CourseShape, holeName, isFullRound, lengthLabel, lengthOf, lengthsFor, planFor, shapeOfCourse } from '../../src/systems/game/lengths';
import { Round } from '../../src/systems/game/round';
import { totals } from '../../src/systems/rules/scoring';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';
import { DatabaseSync } from 'node:sqlite';
import { D1Like, D1Statement, handleEaglesGet, handleGet, handlePost, resetSchemaCache } from '../../src/server/scores';

function fakeD1(): D1Like {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: (sql: string) => stmt(sql) };
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const NINES: CourseShape = {
  holes: 27,
  nines: [
    { id: 'red', name: 'Red', holes: range(1, 9) },
    { id: 'white', name: 'White', holes: range(10, 18) },
    { id: 'blue', name: 'Blue', holes: range(19, 27) },
  ],
};

describe('round lengths for every size of course', () => {
  it('offers the usual rounds', () => {
    expect(lengthsFor(9)).toEqual(['9', '9x2']);
    expect(lengthsFor(18)).toEqual(['18', 'front', 'back']);
    expect(lengthsFor(13)).toEqual(['all']);
    expect(lengthsFor(19)).toEqual(['all']); // a par-3 course, played all at once (developer)
    expect(lengthsFor(NINES)).toEqual(['nines:red+white', 'nines:white+blue', 'nines:blue+red', 'nines:red', 'nines:white', 'nines:blue']);
  });

  it('names them', () => {
    expect(lengthLabel('all', 13)).toBe('13 holes');
    expect(lengthLabel('all', 19)).toBe('19 holes');
    expect(lengthLabel('nines:blue+red', NINES)).toBe('blue / red');
    expect(lengthLabel('nines:white', NINES)).toBe('white nine');
    expect(lengthLabel('front')).toBe('front 9');
  });

  it('plays the right course holes in the right order', () => {
    expect(planFor('all', 13)).toEqual({ slots: range(1, 13), courseHoles: range(1, 13) });
    expect(planFor('all', 19).slots).toHaveLength(19);
    expect(planFor('18', 19)).toEqual({ slots: range(1, 18), courseHoles: range(1, 18) });
    expect(planFor('back', 19)).toEqual({ slots: range(10, 18), courseHoles: range(10, 18) });
    expect(planFor('nines:blue+red', NINES)).toEqual({ slots: range(1, 18), courseHoles: [...range(19, 27), ...range(1, 9)] });
    expect(planFor('nines:white', NINES)).toEqual({ slots: range(1, 9), courseHoles: range(10, 18) });
    expect(planFor('9x2', 9).courseHoles).toEqual([...range(1, 9), ...range(1, 9)]);
    expect(() => planFor('nines:green', NINES)).toThrow();
  });

  it('works out the length of an old round from its holes', () => {
    expect(lengthOf(range(1, 13), 13)).toBe('all');
    expect(lengthOf(range(1, 19), 19)).toBe('all');
    expect(lengthOf(range(1, 18), 19)).toBe('18');
    expect(lengthOf(range(10, 18), 19)).toBe('back');
    expect(lengthOf(range(1, 18), 18)).toBe('18');
  });

  it('cuts the scorecard into nines, and names a club\'s nines', () => {
    expect(cardBlocks('all', range(1, 13), 13)).toEqual([[1, 9, 'out'], [10, 13, 'in']]);
    expect(cardBlocks('all', range(1, 19), 19)).toEqual([[1, 9, 'out'], [10, 18, 'in'], [19, 19, 'xtra']]);
    expect(cardBlocks('all', range(1, 6), 6)).toEqual([[1, 6, 'tot']]);
    expect(cardBlocks('nines:white+blue', range(1, 18), NINES)).toEqual([[1, 9, 'white'], [10, 18, 'blue']]);
    expect(cardBlocks('front', range(1, 9))).toEqual([[1, 9, 'out']]);
  });

  it('shows a club\'s holes by their number in their nine', () => {
    expect(holeName(12, 3, NINES)).toEqual({ num: 3, nine: 'red' });
    expect(holeName(1, 19, NINES)).toEqual({ num: 1, nine: 'blue' });
    expect(holeName(12, 12, 19)).toEqual({ num: 12 });
  });

  it('counts two nines as a full round, one nine or 13 holes not', () => {
    expect(isFullRound('nines:red+white')).toBe(true);
    expect(isFullRound('nines:red')).toBe(false);
    expect(isFullRound('all')).toBe(false);
    expect(isFullRound('9x2')).toBe(true);
  });
});

describe('saved rounds and the daily round', () => {
  const base = (over: Partial<LeaderboardEntry>): LeaderboardEntry => ({
    id: 'r1', course: 'c', tee: 'Blue', length: '18', difficulty: 'normal', casual: false, player: 'chuck', date: '2026-10-20T10:00:00Z',
    gross: 80, toPar: 8, back: 40, scores: [], totals: totals([]), ...over,
  });

  it('accepts the new lengths, up to 27 holes, and a club\'s hole list', () => {
    for (const l of ['all', 'nines:red', 'nines:red+white', '9x2']) expect(isRoundLength(l)).toBe(true);
    for (const l of ['nines:', 'nines:Red', 'nines:a+b+c', '27', 'nines:a b']) expect(isRoundLength(l)).toBe(false);
    const s = { hole: 1, par: 4, strokes: 4, putts: 2, penalties: 0, fairway: true, gir: true };
    expect(isEntry(base({ length: 'all', scores: Array.from({ length: 19 }, (_, i) => ({ ...s, hole: i + 1 })) }))).toBe(true);
    expect(isEntry(base({ length: 'nines:blue+red', holes: [...range(19, 27), ...range(1, 9)] }))).toBe(true);
    expect(isEntry(base({ holes: [0] }))).toBe(false);
    expect(isEntry(base({ scores: Array.from({ length: 28 }, () => s) }))).toBe(false);
  });

  it('daily: a club of nines plays one nine, 13- and 19-hole courses sit out, the rest is unchanged', () => {
    const c18 = { id: 'oswego_lake', holes: 18, defaultTee: 'Blue', teeSets: ['Blue'] };
    const c9 = { id: 'highland_links', holes: 9, defaultTee: 'Blue', teeSets: ['Blue'] };
    const days = range(0, 30).map((i) => `2026-11-${String(1 + (i % 30)).padStart(2, '0')}`);
    const before = days.map((d) => dailyPlan(d, [c18, c9]));
    const withSmall = days.map((d) => dailyPlan(d, [c18, c9, { id: 'preserve', holes: 13, defaultTee: 'Blue', teeSets: ['Blue'] },
      { id: 'nineteen', holes: 19, defaultTee: 'Blue', teeSets: ['Blue'] }]));
    expect(withSmall).toEqual(before);
    const club = { id: 'three_nines', holes: 27, defaultTee: 'Blue', teeSets: ['Blue'], nines: NINES.nines };
    const plans = days.map((d) => dailyPlan(d, [club])!);
    expect(new Set(plans.map((p) => p.length))).toEqual(new Set(['nines:red', 'nines:white', 'nines:blue']));
  });

  it('daily with the rotation roster: a 13-hole course in the roster still sits out', () => {
    const c18 = { id: 'oswego_lake', holes: 18, defaultTee: 'Blue', teeSets: ['Blue'] };
    const c9 = { id: 'highland_links', holes: 9, defaultTee: 'Blue', teeSets: ['Blue'] };
    const small = { id: 'preserve', holes: 13, defaultTee: 'Blue', teeSets: ['Blue'] };
    const roster = { oswego_lake: '2026-10-01', highland_links: '2026-10-01', preserve: '2026-10-01' };
    const days = range(1, 28).map((i) => `2026-11-${String(i).padStart(2, '0')}`);
    for (const d of days) expect(dailyPlan(d, [c18, c9, small], roster)!.courseId).not.toBe('preserve');
    expect(days.map((d) => dailyPlan(d, [c18, c9, small], roster))).toEqual(days.map((d) => dailyPlan(d, [c18, c9], roster)));
  });

  it('handicaps leave out courses of 13 or 19 holes and clubs of nines', () => {
    const rated = { pars: Array(18).fill(4), si: range(1, 18), ratings: { Blue: [70.1, 125] as [number, number] } };
    const m = hcpCourses([
      { id: 'eighteen', holes: 18, ...rated },
      { id: 'preserve', holes: 13, ...rated, pars: Array(13).fill(3), si: range(1, 13) },
      { id: 'nineteen', holes: 19, ...rated, pars: Array(19).fill(3), si: range(1, 19) },
      { id: 'three_nines', holes: 27, nines: NINES.nines, ...rated, pars: Array(27).fill(4), si: range(1, 27) },
    ]);
    expect([...m.keys()]).toEqual(['eighteen']);
  });
});

describe('the shared board takes the new rounds', () => {
  it('a 19-hole round and a round of two nines go up; an eagle at a club of nines is listed on its own hole', async () => {
    resetSchemaCache();
    const db = fakeD1();
    const hs = (n: number, eagleAt = 0) => Array.from({ length: n }, (_, i) => ({ hole: i + 1, par: 5, strokes: i + 1 === eagleAt ? 3 : 5, putts: 2, penalties: 0, fairway: true, gir: true }));
    const mk = (id: string, length: string, scores: ReturnType<typeof hs>, extra = {}) => ({
      id, course: 'club', tee: 'Blue', length, difficulty: 'normal', casual: false, player: 'chuck', date: '2026-10-20T10:00:00Z',
      gross: scores.reduce((a, x) => a + x.strokes, 0), toPar: 0, back: null, scores, totals: totals(scores), ...extra,
    });
    const res = await (await handlePost(db, JSON.stringify([
      mk('a', 'all', hs(19)),
      mk('b', 'nines:blue+red', hs(18, 2), { holes: [...range(19, 27), ...range(1, 9)] }),
    ]))).json();
    expect(res).toMatchObject({ added: 2 });
    const board = (await (await handleGet(db, new URL('https://x/api/scores?course=club'))).json()) as { entries: LeaderboardEntry[] };
    expect(board.entries.map((e) => e.length).sort()).toEqual(['all', 'nines:blue+red']);
    const got = (await (await handleEaglesGet(db, new URL('http://x/api/eagles'))).json()) as { eagles: { id: string; hole: number }[] };
    expect(got.eagles).toEqual([expect.objectContaining({ id: 'b-h2', hole: 20 })]);
  });
});

describe('whole rounds on courses of other sizes (robot golfer)', () => {
  /** Oswego Lake's holes as a course of n holes: the first n, then from 1 again, numbered on. */
  const resized = (n: number, nines?: CourseShape['nines']) => loadCourseFiles('oswego_lake', (j: CourseJson) => {
    const holes = range(1, n).map((k) => ({ ...j.holes[(k - 1) % 18], number: k }));
    return { ...j, holes, par: holes.reduce((a, h) => a + h.par, 0), ...(nines ? { nines } : {}) };
  });

  function play(course: ReturnType<typeof resized>, plan: { slots: number[]; courseHoles: number[] }) {
    const r = new Round(course, { ...roundCfg(course, plan.slots, 3), courseHoles: plan.courseHoles });
    r.startHole(0);
    const played: number[] = [];
    const names: { num: number; nine?: string }[] = [];
    let guard = 0;
    while (!r.finished && guard++ < 60 * plan.slots.length) {
      if (r.tally.strokes === 0 && r.shotNo === 0) { played.push(r.courseHole); names.push(r.holeName); }
      const club = r.autoClub();
      const putt = club.kind === 'putter';
      const scale = r.autoSwingScale(club);
      const d = r.distToPin();
      const power = putt ? Math.min(1, (d * 1.1 + 0.3) / scale) : Math.max(0.15, Math.min(1, d / Math.max(1, r.fullCarry(club) * scale)));
      const p = r.plan(club.id, r.defaultAim(club, scale), meterFor(power, 0, putt), 0, scale);
      const out = r.resolve(p, r.simulate(p));
      if (out.kind === 'holed' || out.kind === 'gimme') { r.finishHole(); r.nextHole(); continue; }
      if (out.kind === 'water' || out.kind === 'ob') r.applyRelief(out.options[0], out.options[0].center);
      if (out.kind === 'wrong_green' || out.kind === 'cartpath') r.applyRelief(out.area, out.area.center);
      if (r.tally.strokes > 14) { r.finishHole(true); r.nextHole(); }
    }
    return { r, played, names };
  }

  it('13 holes: all of them, in order, on a 13-hole card', () => {
    const c = resized(13);
    expect(lengthsFor(shapeOfCourse(c.json))).toEqual(['all']);
    const { r, played } = play(c, planFor('all', 13));
    expect(r.finished).toBe(true);
    expect(r.scores.map((s) => s.hole)).toEqual(range(1, 13));
    expect(played).toEqual(range(1, 13));
    expect(totals(r.scores).holes).toBe(13);
  });

  it('19 holes: all 19, the 19th last', () => {
    const c = resized(19);
    const { r, played } = play(c, planFor('all', 19));
    expect(r.scores).toHaveLength(19);
    expect(played[18]).toBe(19);
  }, 60_000);

  it('three nines: blue then red, scored 1-18, shown as blue 1-9 and red 1-9', () => {
    const c = resized(27, NINES.nines);
    const { r, played, names } = play(c, planFor('nines:blue+red', shapeOfCourse(c.json)));
    expect(r.scores.map((s) => s.hole)).toEqual(range(1, 18));
    expect(played).toEqual([...range(19, 27), ...range(1, 9)]);
    expect(names[0]).toEqual({ num: 1, nine: 'blue' });
    expect(names[17]).toEqual({ num: 9, nine: 'red' });
    expect(r.scores[0].par).toBe(c.json.holes[18].par);
  }, 60_000);
});

describe('a course of 14 holes (developer, 2026-10-22: "do we support a 14 hole course?")', () => {
  it('is played all at once, on a card of a nine and five', () => {
    expect(lengthsFor(14)).toEqual(['all']);
    expect(lengthLabel('all', 14)).toBe('14 holes');
    expect(planFor('all', 14)).toEqual({ slots: Array.from({ length: 14 }, (_, i) => i + 1), courseHoles: Array.from({ length: 14 }, (_, i) => i + 1) });
    expect(cardBlocks('all', Array.from({ length: 14 }, (_, i) => i + 1), 14)).toEqual([[1, 9, 'out'], [10, 14, 'in']]);
    expect(lengthOf(Array.from({ length: 14 }, (_, i) => i + 1), 14)).toBe('all');
    expect(isFullRound('all')).toBe(false);
  });
});

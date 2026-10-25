// Player improvements approved 2026-10-20 (docs/reports/player_improvements.md
// items 2, 3, 4, 5, 7, 8, 9 and 11).
import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { PlannedShot, Round } from '../../src/systems/game/round';
import { strokeLabel } from '../../src/systems/game/strokes';
import type { SimResult } from '../../src/systems/physics/sim';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

describe('replay (item 9)', () => {
  const course = loadCourseFiles('oswego_lake');

  it('plays the last stroke back exactly: the same path, events and end', () => {
    const r = new Round(course, roundCfg(course, [1, 2]));
    r.startHole(0);
    const c = clubById('dr');
    const p = r.plan(c.id, r.defaultAim(c, 1), meterFor(0.95, 4, false), 0, 1);
    const sim = r.simulate(p);
    r.resolve(p, sim);
    const again = r.replay()!;
    expect(again.n).toBe(sim.n);
    expect(again.end).toEqual(sim.end);
    expect(again.events).toEqual(sim.events);
    expect(Array.from(again.samples)).toEqual(Array.from(sim.samples));
  });

  it('a putt replays the same, and the next hole starts with nothing to replay', () => {
    const r = new Round(course, roundCfg(course, [1, 2], 11));
    r.startHole(0);
    r.ball = { x: r.pin.x + 4, y: r.pin.y + 1, teedUp: false };
    r.refreshLie();
    const pu = clubById('pt');
    const p = r.plan(pu.id, r.defaultAim(pu, 1), meterFor(0.4, 0, true), 0, 12);
    const sim = r.simulate(p);
    expect(r.replay()!.end).toEqual(sim.end);
    r.nextHole();
    expect(r.replay()).toBeNull();
  });
});

describe('rewatch a shot (developer, 2026-10-20)', () => {
  const course = loadCourseFiles('oswego_lake');

  it('keeps every played stroke of the hole, and any of them plays back exactly', () => {
    const r = new Round(course, roundCfg(course, [1, 2], 5));
    r.startHole(0);
    const sims: SimResult[] = [];
    for (const [id, pw] of [['dr', 0.95], ['7i', 0.8], ['sw', 0.6]] as [string, number][]) {
      const c = clubById(id);
      // a probe that is never played must not be listed
      r.simulate(r.plan(c.id, r.defaultAim(c, 1), meterFor(0.3, 0, false), 0, 1));
      const p = r.plan(c.id, r.defaultAim(c, 1), meterFor(pw, 3, false), 0, 1);
      const sim = r.simulate(p);
      const o = r.resolve(p, sim);
      sims.push(sim);
      if (o.kind !== 'rest') break;
    }
    expect(r.strokes.length).toBe(sims.length);
    r.strokes.forEach((st, i) => {
      expect(st.n).toBe(i + 1);
      const again = r.replayStroke(i)!;
      expect(again.end).toEqual(sims[i].end);
      expect(Array.from(again.samples)).toEqual(Array.from(sims[i].samples));
      expect(st.to).toEqual({ x: sims[i].end.x, y: sims[i].end.y });
    });
    expect(r.strokes[0].from).toEqual({ x: r.tee.x, y: r.tee.y });
    expect(r.replayStroke(9)).toBeNull();
    r.nextHole();
    expect(r.strokes).toEqual([]);
  });

  it('a mulligan takes its stroke off the list', () => {
    const cfg = roundCfg(course, [1, 2], 7);
    cfg.settings = { ...cfg.settings, mulligans: true };
    const r = new Round(course, cfg);
    r.startHole(0);
    const c = clubById('dr');
    const p = r.plan(c.id, r.defaultAim(c, 1), meterFor(0.9, 2, false), 0, 1);
    r.resolve(p, r.simulate(p));
    expect(r.strokes.length).toBe(1);
    expect(r.mulligan()).toBe(true);
    expect(r.strokes.length).toBe(0);
  });

  it('labels a stroke by number, club, distance and result', () => {
    const club = clubById('7i'), pt = clubById('pt');
    const base = { hole: 1, seq: 0, from: { x: 0, y: 0 } };
    const shot = (c: typeof club) => ({ club: c }) as unknown as PlannedShot;
    expect(strokeLabel({ ...base, shot: shot(club), n: 2, to: { x: 0, y: 137.16 }, result: 'rest' }, 'yd')).toBe('shot 2 · 7 iron · 150 yd');
    expect(strokeLabel({ ...base, shot: shot(club), n: 2, to: { x: 0, y: 137.16 }, result: 'water' }, 'm')).toBe('shot 2 · 7 iron · 137 m · water');
    expect(strokeLabel({ ...base, shot: shot(pt), n: 4, to: { x: 3.6576, y: 0 }, result: 'holed' }, 'yd')).toBe('shot 4 · putter · 12 ft · holed');
    expect(strokeLabel({ ...base, shot: shot(pt), n: 4, to: { x: 3.66, y: 0 }, result: 'holed' }, 'm')).toBe('shot 4 · putter · 3.7 m · holed');
  });
});

import { DatabaseSync } from 'node:sqlite';
import { beforeEach } from 'vitest';
import type { LeaderboardEntry } from '../../src/save/entry';
import { isEntry } from '../../src/save/entry';
import { earnedBy, milestonesOf } from '../../src/save/milestones';
import { mergeRounds, playerStats } from '../../src/save/stats';
import { feedBadges, timeAgo } from '../../src/save/feed';
import { D1Like, D1Statement, handleGet, handlePost, handleRecentGet, resetFeedCache, resetSchemaCache } from '../../src/server/scores';
import { addDays, dailyPlan, dayStandings, PLACE_REST_DAYS, placeOf, RANDOM_DAILY_FROM, restDays, weekStandings, weekStart } from '../../src/systems/game/daily';
import type { DailyCourse } from '../../src/systems/game/daily';
import { DAILY_PICKS, DAILY_ROSTER } from '../../src/data/dailyRoster';
import index from '../../public/courses/index.json';
import { drillSpot, PracticeLog, rangeShot } from '../../src/systems/game/practice';
import type { HoleScore } from '../../src/systems/rules/scoring';
import { totals } from '../../src/systems/rules/scoring';
import { Polygon } from '../../src/systems/physics/terrain';

/** A finished round with these strokes on these pars. */
function round(id: string, opts: { player?: string; course?: string; strokes: number[]; pars?: number[]; date?: string; length?: LeaderboardEntry['length']; casual?: boolean; daily?: string }): LeaderboardEntry {
  const pars = opts.pars ?? opts.strokes.map(() => 4);
  const first = opts.length === 'back' ? 10 : 1;
  const scores: HoleScore[] = opts.strokes.map((s, i) => ({ hole: first + i, par: pars[i], strokes: s, putts: 2, penalties: 0, fairway: pars[i] === 3 ? null : i % 2 === 0, gir: i % 3 === 0 }));
  const t = totals(scores);
  return {
    id, course: opts.course ?? 'langston', tee: 'Royal', length: opts.length ?? (scores.length === 18 ? '18' : 'front'), difficulty: 'normal',
    casual: !!opts.casual, player: opts.player ?? 'charlie', date: opts.date ?? '2026-10-20T15:00:00Z', gross: t.strokes, toPar: t.toPar, back: t.back,
    scores, totals: t, ...(opts.daily ? { daily: opts.daily } : {}),
  };
}

const COURSES = [
  { id: 'langston', name: 'Langston Golf Course', state: 'DC' },
  { id: 'east_potomac_blue', name: 'East Potomac Blue', state: 'DC' },
  { id: 'franklin', name: 'Franklin Country Club', state: 'MA' },
];

describe('milestones (item 11)', () => {
  it('first birdie, broke 90, first round at a course, every course in a state', () => {
    const a = round('a', { strokes: Array(18).fill(5), date: '2026-10-01T00:00:00Z' });                // 90: no break yet
    const b = round('b', { strokes: [3, ...Array(17).fill(5)], date: '2026-10-02T00:00:00Z' });        // 88, a birdie
    const c = round('c', { course: 'east_potomac_blue', strokes: Array(9).fill(5), date: '2026-10-03T00:00:00Z' });
    const all = milestonesOf([c, b, a], COURSES, { DC: 'District of Columbia' });
    expect(earnedBy('a', all).map((m) => m.text)).toEqual(['broke 100 at langston', 'first round at langston']);
    expect(earnedBy('b', all).map((m) => m.text)).toEqual(['first birdie', 'broke 90 at langston']);
    expect(earnedBy('c', all).map((m) => m.text)).toContain('every district of columbia course played');
  });

  it('casual rounds and rounds on courses no longer offered earn nothing', () => {
    const all = milestonesOf([round('x', { strokes: Array(18).fill(3), casual: true }), round('y', { course: 'gone', strokes: Array(18).fill(3) })], COURSES);
    expect(all).toEqual([]);
  });

  it('breaking two marks at once shows the better one first', () => {
    const all = milestonesOf([round('z', { strokes: Array(18).fill(4).map((v, i) => (i < 2 ? 3 : v)) })], COURSES);
    const texts = earnedBy('z', all).map((m) => m.text);
    expect(texts.indexOf('broke 80 at langston')).toBeLessThan(texts.indexOf('broke 90 at langston'));
    expect(texts).toContain('under par at langston');
  });
});

describe('my golf stats (item 7)', () => {
  it('per course averages, per-18 rates, and one copy of each round', () => {
    const r1 = round('r1', { strokes: Array(18).fill(5) });
    const r2 = round('r2', { strokes: Array(9).fill(4), length: 'front' });
    const st = playerStats(mergeRounds([r1, r2], [r1]));
    expect(st.rounds).toBe(2);
    expect(st.puttsPer18).toBeCloseTo(36);
    expect(st.courses[0].avg18).toBe(90);
    expect(st.courses[0].avg9).toBe(36);
    expect(st.courses[0].best!.id).toBe('r1');
    expect(st.recent.map((r) => Math.round(r.toPar18))).toEqual([18, 0]);
  });
});

describe('daily round (item 4)', () => {
  const courses = [
    { id: 'a', holes: 18, defaultTee: 'Blue', teeSets: ['Blue', 'White'] },
    { id: 'b', holes: 9, defaultTee: 'Blue', teeSets: ['Blue'] },
    { id: 'c', holes: 18, defaultTee: 'Gold', teeSets: ['Royal'] },
  ];
  it('is the same for everyone on a day and changes day to day', () => {
    const p = dailyPlan('2026-10-20', courses)!;
    expect(dailyPlan('2026-10-20', courses.slice().reverse())).toEqual(p);
    const week = Array.from({ length: 6 }, (_, i) => dailyPlan(addDays('2026-10-20', i), courses)!.courseId);
    expect(new Set(week).size).toBe(3);
    expect(dailyPlan('2026-10-21', courses)!.seed).not.toBe(p.seed);
    for (let i = 0; i < 6; i++) {
      const q = dailyPlan(addDays('2026-10-20', i), courses)!;
      if (q.courseId === 'b') expect(q.length).toBe('9');
      else expect(['front', 'back']).toContain(q.length);
      if (q.courseId === 'c') expect(q.tee).toBe('Royal'); // the default isn't built: the first set
    }
  });

  it('a course added to the rotation changes the daily from its first day on, never before (developer, 2026-10-20)', () => {
    const roster = { a: '2026-10-20', b: '2026-10-20', c: '2026-10-20' };
    const before = Array.from({ length: 5 }, (_, i) => dailyPlan(addDays('2026-10-20', i), courses, roster)!.courseId);
    const more = [...courses, { id: 'd', holes: 18, defaultTee: 'Blue', teeSets: ['Blue'] }];
    const later = { ...roster, d: '2026-10-23' };
    const after = Array.from({ length: 5 }, (_, i) => dailyPlan(addDays('2026-10-20', i), more, later)!.courseId);
    expect(after.slice(0, 3)).toEqual(before.slice(0, 3));
    expect(dailyPlan('2026-10-20', courses, {})).toBeNull(); // not in the rotation: never the daily
  });

  it("the real rotation: 2026-10-20 stays Stone Creek after that afternoon's three courses", () => {
    const all = (index as { courses: { id: string; holes: number; defaultTee: string; teeSets: string[] }[] }).courses;
    expect(dailyPlan('2026-10-20', all, DAILY_ROSTER)!.courseId).toBe('stone_creek');
    for (const c of all) expect(DAILY_ROSTER[c.id], `${c.id} is in the daily rotation`).toBeDefined();
  });

  it("a picked day: 2026-10-21 is the back nine at Oswego Lake (developer); the days around it keep the rotation", () => {
    const all = (index as { courses: { id: string; holes: number; defaultTee: string; teeSets: string[] }[] }).courses;
    const p = dailyPlan('2026-10-21', all, DAILY_ROSTER, DAILY_PICKS)!;
    expect([p.courseId, p.length, p.tee]).toEqual(['oswego_lake', 'back', 'Blue']);
    expect(dailyPlan('2026-10-20', all, DAILY_ROSTER, DAILY_PICKS)).toEqual(dailyPlan('2026-10-20', all, DAILY_ROSTER));
    expect(dailyPlan('2026-10-22', all, DAILY_ROSTER, DAILY_PICKS)).toEqual(dailyPlan('2026-10-22', all, DAILY_ROSTER));
  });

  it('from 2026-10-25 the daily is drawn: no place twice in five days, no course again within two thirds of the rotation (developer, 2026-10-25)', () => {
    const all = (index as { courses: DailyCourse[] }).courses;
    // East Potomac Red, White and Blue had come up on the 22nd, 24th and 25th; today changes
    expect(dailyPlan('2026-10-25', all, DAILY_ROSTER, DAILY_PICKS)!.courseId).not.toMatch(/^east_potomac/);
    // the days before the change keep their courses (their boards stand)
    expect(dailyPlan('2026-10-24', all, DAILY_ROSTER, DAILY_PICKS)!.courseId).toBe('east_potomac_white');
    const days = Array.from({ length: 200 }, (_, i) => addDays(RANDOM_DAILY_FROM, i));
    const plans = days.map((d) => dailyPlan(d, all, DAILY_ROSTER, DAILY_PICKS)!);
    const byId = new Map(all.map((c) => [c.id, c]));
    const pool = all.filter((c) => (c.holes === 9 || c.holes === 18) && DAILY_ROSTER[c.id] <= RANDOM_DAILY_FROM).length;
    for (let i = 1; i < plans.length; i++) {
      const place = placeOf(byId.get(plans[i].courseId)!);
      for (let k = 1; k <= Math.min(i, PLACE_REST_DAYS); k++) expect(placeOf(byId.get(plans[i - k].courseId)!), days[i]).not.toBe(place);
      for (let k = 1; k <= Math.min(i, restDays(pool)); k++) expect(plans[i - k].courseId, days[i]).not.toBe(plans[i].courseId);
    }
    // every course in the rotation comes up within two rotations
    expect(new Set(plans.slice(0, 2 * pool).map((p) => p.courseId)).size).toBe(pool);
    // the same for everyone, whatever order the list is in; a course added later leaves the days before it alone
    expect(dailyPlan('2026-11-20', all.slice().reverse(), DAILY_ROSTER, DAILY_PICKS)).toEqual(dailyPlan('2026-11-20', all, DAILY_ROSTER, DAILY_PICKS));
    const extra = [...all, { id: 'zz_new', holes: 18, defaultTee: 'Blue', teeSets: ['Blue'], location: 'Nowhere, Oregon' }];
    const later = { ...DAILY_ROSTER, zz_new: '2026-11-10' };
    for (const d of days.slice(0, 16)) expect(dailyPlan(d, extra, later, DAILY_PICKS)).toEqual(dailyPlan(d, all, DAILY_ROSTER, DAILY_PICKS));
  });

  it('weeks start on Monday; the week board counts the best five days, more days first', () => {
    expect(weekStart('2026-10-20')).toBe('2026-10-19'); // a Tuesday
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // a Sunday
    const d = (n: number) => addDays('2026-10-19', n);
    const sam = [0, 1, 2, 3, 4, 5].map((n) => round(`s${n}`, { player: 'sam', strokes: Array(9).fill(n === 5 ? 9 : 5), daily: d(n), length: 'front' }));
    const kim = [0, 1].map((n) => round(`k${n}`, { player: 'kim', strokes: Array(9).fill(3), daily: d(n), length: 'front' }));
    const rows = weekStandings([...kim, ...sam]);
    expect(rows.map((r) => r.player)).toEqual(['sam', 'kim']);
    expect(rows[0]).toMatchObject({ days: 6, counted: 5, toPar: 45 }); // the 9s left out
  });

  it("a day's board keeps each player's first round", () => {
    const a1 = round('a1', { strokes: Array(9).fill(5), daily: '2026-10-20', date: '2026-10-20T10:00:00Z', length: 'front' });
    const a2 = round('a2', { strokes: Array(9).fill(3), daily: '2026-10-20', date: '2026-10-20T11:00:00Z', length: 'front' });
    expect(dayStandings([a2, a1], '2026-10-20').map((e) => e.id)).toEqual(['a1']);
  });

  it('a daily field that is not a day makes the round invalid', () => {
    expect(isEntry(round('ok', { strokes: [4], daily: '2026-10-20' }))).toBe(true);
    expect(isEntry({ ...round('bad', { strokes: [4] }), daily: 'today' })).toBe(false);
  });
});

/** Minimal D1 look-alike over node:sqlite (as in online.test.ts). */
function fakeD1(): D1Like {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: (sql: string) => stmt(sql) };
}
const KEY = 'abcdefghjkmnpqrs', KEY2 = 'stuvwxyzabcdefgh';

describe('server: own rounds, daily boards, activity feed (items 4, 7, 8)', () => {
  let db: D1Like;
  beforeEach(() => { resetSchemaCache(); resetFeedCache(); db = fakeD1(); });
  const today = new Date().toISOString().slice(0, 10);
  const get = async (q: string) => (await (await handleGet(db, new URL(`http://x/api/scores?${q}`))).json()) as { entries: LeaderboardEntry[] };

  it("returns a player code's own rounds and nobody else's", async () => {
    await handlePost(db, JSON.stringify([{ ...round('m1', { strokes: [4] }), owner: KEY }, { ...round('o1', { player: 'sam', strokes: [4] }), owner: KEY2 }]));
    expect((await get(`owner=${KEY}`)).entries.map((e) => e.id)).toEqual(['m1']);
    expect((await handleGet(db, new URL('http://x/api/scores?owner=bad'))).status).toBe(400);
  });

  it('counts one daily round per player code and day; a second go is an ordinary round', async () => {
    const d1 = { ...round('d1', { strokes: Array(9).fill(5), daily: today, length: 'front', date: new Date().toISOString() }), owner: KEY };
    const d2 = { ...round('d2', { strokes: Array(9).fill(3), daily: today, length: 'front', date: new Date().toISOString() }), owner: KEY };
    const hard = { ...round('d3', { player: 'sam', strokes: Array(9).fill(4), daily: today, length: 'front' }), difficulty: 'pro', owner: KEY2 };
    await handlePost(db, JSON.stringify([d1]));
    await handlePost(db, JSON.stringify([d2, hard]));
    expect((await get(`daily=${today}`)).entries.map((e) => e.id)).toEqual(['d1']);
    expect((await get('course=langston')).entries.find((e) => e.id === 'd2')!.daily).toBeUndefined();
    expect((await get(`week=${weekStart(today)}`)).entries.map((e) => e.id)).toEqual(['d1']);
  });

  it('the feed lists the latest rounds with personal-best and record badges', async () => {
    await handlePost(db, JSON.stringify([{ ...round('f1', { strokes: Array(18).fill(5) }), owner: KEY }]));
    await new Promise((r) => setTimeout(r, 5));
    await handlePost(db, JSON.stringify([{ ...round('f2', { player: 'sam', strokes: Array(18).fill(6) }), owner: KEY2 }]));
    await new Promise((r) => setTimeout(r, 5));
    await handlePost(db, JSON.stringify([{ ...round('f3', { strokes: Array(18).fill(4) }), owner: KEY }]));
    const body = (await (await handleRecentGet(db, new URL('http://x/api/recent?limit=10'))).json()) as { rounds: { id: string; pb: boolean; record: boolean }[] };
    expect(body.rounds.map((r) => [r.id, r.pb, r.record])).toEqual([['f3', true, true], ['f2', false, false], ['f1', false, false]]);
  });

  it('badges and times read sensibly', () => {
    expect(feedBadges(70, true, 80, 75)).toEqual({ pb: false, record: false });
    expect(feedBadges(70, false, null, null)).toEqual({ pb: false, record: false });
    const now = Date.parse('2026-10-20T12:00:00Z');
    expect(timeAgo('2026-10-20T11:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-10-20T10:00:00Z', now)).toBe('2 h ago');
    expect(timeAgo('2026-10-18T12:00:00Z', now)).toBe('2 days ago');
  });
});

describe('practice ground (item 5)', () => {
  const course = loadCourseFiles('practice');

  it('has five range targets 50-250 yd from their stalls and four putting greens', () => {
    expect(course.json.holes.length).toBe(9);
    const yd = course.json.holes.slice(0, 5).map((h) => Math.round(Object.values(h.tees)[0].cardYd / 50) * 50);
    expect(yd).toEqual([50, 100, 150, 200, 250]);
  });

  it('reads a range ball: carry, total, and the side it missed on', () => {
    const r = new Round(course, { ...roundCfg(course, [1, 2, 3, 4, 5, 6, 7, 8, 9]), practice: true });
    r.startHole(2);
    r.practiceReset();
    const c = clubById('7i');
    const p = r.plan(c.id, r.defaultAim(c, 1), meterFor(1, 0, false), 0, 1);
    const sim = r.simulate(p);
    const rs = rangeShot(r.ball, r.pin, sim);
    expect(rs.carry).toBeGreaterThan(130);
    expect(rs.total).toBeGreaterThanOrEqual(rs.carry - 1);
    expect(Math.abs(rs.offline)).toBeLessThan(15);
  });

  it('puts drill balls on the green at the right distance, each from a new side', () => {
    const r = new Round(course, { ...roundCfg(course, [1, 2, 3, 4, 5, 6, 7, 8, 9]), practice: true });
    for (const i of [5, 6, 7, 8]) {
      r.startHole(i);
      const spots = Array.from({ length: 10 }, (_, k) => drillSpot(r.pin, r.holeGreen, 30, k));
      for (const s of spots) {
        expect(s).not.toBeNull();
        expect(Math.hypot(s!.x - r.pin.x, s!.y - r.pin.y)).toBeCloseTo(30 * 0.3048, 3);
        expect(r.holeGreen.contains(s!.x, s!.y)).toBe(true);
      }
      expect(new Set(spots.map((s) => `${s!.x.toFixed(1)},${s!.y.toFixed(1)}`)).size).toBe(10);
    }
  });

  it('the flat green is flat and the 2 % green is 2 %', () => {
    const t = course.terrain;
    const slope = (x: number, y: number) => Math.hypot(t.z(x + 0.5, y) - t.z(x - 0.5, y), t.z(x, y + 0.5) - t.z(x, y - 0.5));
    const r = new Round(course, roundCfg(course, [1, 2, 3, 4, 5, 6, 7, 8, 9]));
    r.startHole(5);
    expect(slope(r.pin.x + 4, r.pin.y)).toBeLessThan(0.002);
    r.startHole(7);
    expect(slope(r.pin.x + 5, r.pin.y + 2)).toBeGreaterThan(0.015);
  });

  it('a drill is ten balls; the tally carries the set', () => {
    const log = new PracticeLog();
    log.setDrill(5);
    for (let i = 0; i < 9; i++) expect(log.putt(i % 2 === 0)).toBe(false);
    expect(log.putt(true)).toBe(true);
    expect(log.lastSet).toEqual({ ft: 5, holed: 6 });
    expect(log.drill.ball).toBe(0);
    void Polygon;
  });
});

// The daily par 3s / 4s / 5s (developer, 2026-10-27): nine real holes of one
// par drawn from all the courses, the par going round 3, 4, 5 a day at a time.
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DAILY_ROSTER } from '../../src/data/dailyRoster';
import { isEntry, LeaderboardEntry } from '../../src/save/entry';
import { eaglesIn } from '../../src/save/feats';
import { D1Like, D1Statement, handleEaglesGet, handleGet, handlePost, resetSchemaCache } from '../../src/server/scores';
import { addDays, dayStandings } from '../../src/systems/game/daily';
import { Round, RoundConfig } from '../../src/systems/game/round';
import { isTourId, TOUR_FROM, TOUR_HOLES, tourName, tourPar, tourPlan, tourRest } from '../../src/systems/game/tour';
import { totals } from '../../src/systems/rules/scoring';
import { loadCourseFiles, meterFor, registry } from './helpers';

const courses = registry();
const placeOf = (id: string) => {
  const c = courses.find((x) => x.id === id)!;
  return c.group ?? c.location.split(',')[0].trim().toLowerCase();
};

describe('which par, which holes', () => {
  it('goes round par 3s, 4s and 5s a day at a time, par 3s first', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => tourPar(addDays(TOUR_FROM, i)))).toEqual([3, 4, 5, 3, 4, 5]);
    expect(tourPar(addDays(TOUR_FROM, -1))).toBe(5);
    expect(tourName('par5s')).toBe('par 5s');
    expect(isTourId('par4s') && !isTourId('newport')).toBe(true);
  });

  it('every day for four months: nine holes of the par, one per course and place, in the rotation that day', () => {
    for (let i = 0; i < 120; i++) {
      const day = addDays(TOUR_FROM, i);
      const p = tourPlan(day, courses, DAILY_ROSTER)!;
      expect(p.holes).toHaveLength(TOUR_HOLES);
      expect(p.courseId).toBe(`par${p.par}s`);
      for (const h of p.holes) {
        const c = courses.find((x) => x.id === h.course)!;
        expect(c.pars![h.hole - 1], `${day} ${h.course} ${h.hole}`).toBe(p.par);
        expect(DAILY_ROSTER[h.course] <= day).toBe(true);
        expect(c.teeSets).toContain(h.tee);
      }
      expect(new Set(p.holes.map((h) => h.course)).size).toBe(TOUR_HOLES);
      expect(new Set(p.holes.map((h) => placeOf(h.course))).size).toBe(TOUR_HOLES);
    }
  });

  it('is the same for everyone (order of the list, a second call) and changes day to day', () => {
    const day = addDays(TOUR_FROM, 7);
    const p = tourPlan(day, courses, DAILY_ROSTER)!;
    expect(tourPlan(day, courses.slice().reverse(), DAILY_ROSTER)).toEqual(p);
    expect(tourPlan(addDays(day, 3), courses, DAILY_ROSTER)!.holes).not.toEqual(p.holes);
    expect(tourPlan(addDays(day, 1), courses, DAILY_ROSTER)!.seed).not.toBe(p.seed);
  });

  it('a hole drawn sits out the next rounds of its par', () => {
    for (const start of [0, 1, 2]) {
      const keys: string[][] = [];
      for (let k = 0; k < 30; k++) {
        const p = tourPlan(addDays(TOUR_FROM, start + 3 * k), courses, DAILY_ROSTER)!;
        keys.push(p.holes.map((h) => `${h.course}:${h.hole}`));
      }
      const pool = courses.reduce((n, c) => n + (c.pars ?? []).filter((x) => x === tourPar(addDays(TOUR_FROM, start))).length, 0);
      const rest = tourRest(pool);
      expect(rest).toBeGreaterThan(2);
      keys.forEach((ks, k) => {
        const before = new Set(keys.slice(Math.max(0, k - rest), k).flat());
        for (const key of ks) expect(before.has(key), `day ${k} of par ${tourPar(addDays(TOUR_FROM, start))}: ${key}`).toBe(false);
      });
    }
  });

  it('a course merged today joins tomorrow: today\'s holes stay put', () => {
    const day = addDays(TOUR_FROM, 4);
    const today = tourPlan(day, courses, DAILY_ROSTER)!;
    const late = { ...DAILY_ROSTER };
    for (const id of ['newport', 'sea_ranch', 'presidio']) late[id] = addDays(day, 1);
    // newport and the others aren't drawn today when they join tomorrow
    const without = tourPlan(day, courses, late)!;
    for (const h of without.holes) expect(['newport', 'sea_ranch', 'presidio']).not.toContain(h.course);
    expect(today.holes.length).toBe(9);
    // and a course not yet on offer at all leaves the day alone
    expect(tourPlan(day, courses, { ...DAILY_ROSTER, not_yet: addDays(day, 1) })).toEqual(today);
  });
});

describe('a round over several courses (robot golfer)', () => {
  const lake = loadCourseFiles('oswego_lake');
  const links = loadCourseFiles('highland_links');
  const par3 = (c: typeof lake) => c.json.holes.filter((h) => h.par === 3).map((h) => h.number);
  const holes = [
    { course: 'oswego_lake', hole: par3(lake)[0], tee: lake.json.defaultTee },
    { course: 'highland_links', hole: par3(links)[0], tee: links.json.defaultTee },
    { course: 'oswego_lake', hole: par3(lake)[1], tee: lake.json.defaultTee },
  ];
  const cfg = (): RoundConfig => ({
    courseId: 'par3s', tee: 'tour', holes: [1, 2, 3], length: '9', courseHoles: holes.map((h) => h.hole), tour: holes.map((h) => ({ ...h })),
    playerName: 'test', seed: 11, daily: TOUR_FROM, startedAt: '2026-10-28T00:00:00Z',
    settings: { difficulty: 'normal', lefty: false, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
  });

  function playHole(r: Round) {
    let guard = 0;
    while (guard++ < 40) {
      const club = r.autoClub();
      const putt = club.kind === 'putter';
      const scale = r.autoSwingScale(club);
      const d = r.distToPin();
      const power = putt ? Math.min(1, (d * 1.1 + 0.3) / scale) : Math.max(0.15, Math.min(1, d / Math.max(1, r.fullCarry(club) * scale)));
      const p = r.plan(club.id, r.defaultAim(club, scale), meterFor(power, 0, putt), 0, scale);
      const out = r.resolve(p, r.simulate(p));
      if (out.kind === 'holed' || out.kind === 'gimme') { r.finishHole(); return; }
      if (out.kind === 'water' || out.kind === 'ob') r.applyRelief(out.options[0], out.options[0].center);
      if (out.kind === 'wrong_green' || out.kind === 'cartpath') r.applyRelief(out.area, out.area.center);
      if (r.tally.strokes > 14) { r.finishHole(true); return; }
    }
  }

  it('waits for each hole\'s course, plays it from its own tee, with its own pin, wind and yards', () => {
    const byId = { oswego_lake: lake, highland_links: links };
    const r = new Round(lake, cfg());
    r.startHole(0);
    const seen: { course: string; hole: number; tee: string; par: number; pin: [number, number] }[] = [];
    while (!r.finished) {
      expect(r.needsCourse).toBe(false);
      expect(r.course.json.id).toBe(holes[r.holeIndex].course);
      expect(r.holeName).toEqual({ num: r.holeIndex + 1 });
      seen.push({ course: r.course.json.id, hole: r.courseHole, tee: r.teeName, par: r.hole.par, pin: r.cfg.pins![r.holeIndex] });
      expect(r.ball.x).toBe(r.tee.x);
      playHole(r);
      if (!r.nextHole()) break;
      // the move to Highland Links and back to Oswego Lake each need a load
      expect(r.needsCourse).toBe(true);
      r.setCourse(byId[r.courseIdAt(r.holeIndex) as keyof typeof byId]);
      r.startHole(r.holeIndex);
    }
    expect(seen.map((s) => [s.course, s.hole])).toEqual(holes.map((h) => [h.course, h.hole]));
    expect(seen.every((s) => s.par === 3)).toBe(true);
    expect(r.scores.map((s) => s.hole)).toEqual([1, 2, 3]);
    expect(r.cfg.tour!.every((t) => (t.yd ?? 0) > 50)).toBe(true);
    // the same seed: the same pins and wind for everyone
    const again = new Round(lake, cfg());
    again.startHole(0);
    expect(again.cfg.pins![0]).toEqual(seen[0].pin);
    expect(again.wind).toEqual(r.winds[0]);
  });

  it('a round resumed on a later hole gets that hole\'s pin and wind back', () => {
    const r = new Round(lake, cfg());
    r.startHole(0);
    playHole(r);
    r.nextHole();
    r.setCourse(links);
    r.startHole(1);
    const pin = r.pin, wind = r.wind;
    const saved = structuredClone(r.cfg);
    const back = new Round(links, saved);
    back.startHole(1);
    expect(back.pin).toEqual(pin);
    expect(back.wind).toEqual(wind);
  });
});

describe('the boards', () => {
  function fakeD1(): D1Like {
    const db = new DatabaseSync(':memory:');
    const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
      bind: (...v: unknown[]) => stmt(sql, v),
      all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
      run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
    });
    return { prepare: (sql: string) => stmt(sql) };
  }
  const KEY = 'abcdefghjkmnpqrs';
  const today = new Date().toISOString().slice(0, 10);
  const tourHoles = Array.from({ length: 9 }, (_, i) => ({ course: i % 2 ? 'newport' : 'sea_ranch', hole: i + 1, tee: 'Black', yd: 500 + i }));
  const mk = (id: string, course: string, strokes: number[], extra: Partial<LeaderboardEntry> = {}): LeaderboardEntry => {
    const scores = strokes.map((s, i) => ({ hole: i + 1, par: 5, strokes: s, putts: 2, penalties: 0, fairway: true, gir: true }));
    const t = totals(scores);
    return {
      id, course, tee: course === 'par5s' ? 'tour' : 'Blue', length: '9', difficulty: 'normal', casual: false, player: 'chuck',
      date: new Date().toISOString(), gross: t.strokes, toPar: t.toPar, back: null, scores, totals: t, daily: today, ...extra,
    };
  };

  it('a round carries its holes; a bad list is refused', () => {
    expect(isEntry(mk('t', 'par5s', Array(9).fill(5), { tour: tourHoles }))).toBe(true);
    expect(isEntry(mk('t', 'par5s', Array(9).fill(5), { tour: [{ course: 'x', hole: 0, tee: 'Black' }] }))).toBe(false);
    expect(isEntry(mk('t', 'par5s', Array(9).fill(5), { tour: [{ course: '', hole: 3, tee: 'Black' }] }))).toBe(false);
  });

  it('the daily round and the daily par 5s each count once a day; an eagle goes on its own course', async () => {
    resetSchemaCache();
    const db = fakeD1();
    const eagle = [5, 3, 5, 5, 5, 5, 5, 5, 5];
    await handlePost(db, JSON.stringify([
      { ...mk('round1', 'oswego_lake', Array(9).fill(5), { length: 'front' }), owner: KEY },
      { ...mk('tour1', 'par5s', eagle, { tour: tourHoles }), owner: KEY },
      { ...mk('tour2', 'par5s', Array(9).fill(4), { tour: tourHoles }), owner: KEY }, // a second go: not the day's
    ]));
    const got = (await (await handleGet(db, new URL(`https://x/api/scores?daily=${today}`))).json()) as { entries: LeaderboardEntry[] };
    expect(got.entries.map((e) => e.id).sort()).toEqual(['round1', 'tour1']);
    const t = got.entries.find((e) => e.id === 'tour1')!;
    expect(t.tour).toEqual(tourHoles);
    const plan = { day: today, courseId: 'par5s', tee: 'tour', length: '9' as const, seed: 1 };
    expect(dayStandings(got.entries, today, plan).map((e) => e.id)).toEqual(['tour1']);
    const eagles = (await (await handleEaglesGet(db, new URL('http://x/api/eagles'))).json()) as { eagles: { course: string; hole: number; tee: string }[] };
    expect(eagles.eagles).toEqual([expect.objectContaining({ course: 'newport', hole: 2, tee: 'Black' })]);
    expect(eaglesIn(t).map((e) => [e.course, e.hole])).toEqual([['newport', 2]]);
  });
});

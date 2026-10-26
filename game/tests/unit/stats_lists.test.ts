// The leaderboard's stats tab (developer, 2026-10-26): most feet of putts made in a round,
// the longest hole-outs from off the green (with their flights, to watch again), most birdies.
import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { HoleOut, holeOutDistance, isHoleOut, puttsMadeM, tracksMade } from '../../src/save/holeouts';
import type { LeaderboardEntry } from '../../src/save/entry';
import { D1Like, D1Statement, handleHoleoutsGet, handleHoleoutsPost, handlePost, handleRecordsGet, resetSchemaCache } from '../../src/server/scores';
import { decodePath, encodePath } from '../../src/systems/match/path';
import { HoleScore, HoleTally, totals } from '../../src/systems/rules/scoring';
import type { SimResult } from '../../src/systems/physics/sim';
import { loadCourseFiles, meterFor, robotRound, roundCfg } from './helpers';
import { Round } from '../../src/systems/game/round';
import { clubById } from '../../src/data/clubs';
import { SURF } from '../../src/systems/physics/surfaces';

function fakeD1(): D1Like & { raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: (sql: string) => stmt(sql), raw: db };
}

/** A holed chip: 60 samples from (0, 0) to the cup at (20, 0). */
function chip(holed = true): SimResult {
  const n = 60;
  const samples = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { samples[i * 3] = (20 * i) / (n - 1); samples[i * 3 + 2] = 3 * Math.sin((Math.PI * i) / (n - 1)); }
  return {
    samples, n, end: { x: 20, y: 0, z: 0 }, restSurface: 3, holed, inWater: false, waterCross: null,
    landing: { x: 14, y: 0, z: 0, t: 0.3 }, events: [{ t: 0.3, type: 'land', x: 14, y: 0, z: 0, surf: 3 }, ...(holed ? [{ t: 0.49, type: 'holed' as const, x: 20, y: 0, z: 0 }] : [])],
    duration: 0.5, hitTree: false,
  };
}

const holeOut = (id: string, dist: number, path?: string): HoleOut => ({
  id, round: id.split('-h')[0], player: 'charlie', course: 'langston', hole: 4, par: 4, n: 3, club: 'sand wedge', dist,
  lie: 'rough', tee: 'Blue', difficulty: 'normal', date: '2026-10-26T15:00:00Z', path,
});

describe('tracking the holing stroke', () => {
  it('a hole holed out carries its length and whether it started off the green; a picked-up one does not', () => {
    const t = new HoleTally(1, 4);
    t.stroke(false); t.stroke(false); t.stroke(true);
    t.holed(4.567, false);
    expect(t.finish()).toMatchObject({ made: 4.57, off: false });
    expect(new HoleTally(2, 4).finish().made).toBeUndefined();
  });

  it('a robot round: every hole holed has its distance; putts made add up from the putts on the green', () => {
    const r = robotRound(loadCourseFiles('langston'), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const holed = r.scores.filter((s) => s.made !== undefined);
    expect(holed.length).toBeGreaterThan(5);
    for (const s of holed) expect(s.made!).toBeGreaterThanOrEqual(0);
    const onGreen = holed.filter((s) => !s.off).reduce((a, s) => a + s.made!, 0);
    expect(puttsMadeM(r.scores)).toBeCloseTo(onGreen, 1);
    expect(tracksMade(r.scores)).toBe(true);
  });

  it('a putt holed from the fringe is a putt made, not a hole-out; a chip from there is a hole-out (developer, 2026-10-26)', () => {
    const c = loadCourseFiles('langston');
    const holeAt = (club: string) => {
      const r = new Round(c, roundCfg(c, [1]));
      r.startHole(0);
      // a fringe spot near the first green
      const t = c.terrain;
      let at: { x: number; y: number } | null = null;
      for (let d = 2; d < 30 && !at; d += 0.5) for (let a = 0; a < 6.28 && !at; a += 0.1) {
        const x = r.pin.x + d * Math.cos(a), y = r.pin.y + d * Math.sin(a);
        if (t.surface(x, y) === SURF.fringe && !r.onHoleGreen({ x, y })) at = { x, y };
      }
      r.ball = { x: at!.x, y: at!.y, teedUp: false };
      r.refreshLie();
      expect(r.lie.kind).toBe('fringe');
      const p = r.plan(club, r.defaultAim(clubById(club), 1), meterFor(0.3, 0, club === 'pt'), 0, club === 'pt' ? 12 * 0.3048 : 0.25);
      const n = 20, samples = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { samples[i * 3] = at!.x + ((r.pin.x - at!.x) * i) / (n - 1); samples[i * 3 + 1] = at!.y + ((r.pin.y - at!.y) * i) / (n - 1); }
      const sim: SimResult = { samples, n, end: { x: r.pin.x, y: r.pin.y, z: 0 }, restSurface: SURF.green, holed: true, inWater: false, waterCross: null, landing: null, events: [], duration: 1, hitTree: false };
      expect(r.resolve(p, sim).kind).toBe('holed');
      return r.finishHole();
    };
    expect(holeAt('pt')).toMatchObject({ off: false });
    expect(holeAt('lw')).toMatchObject({ off: true });
  });

  it('distances read in feet close in, yards from 30 yd', () => {
    expect(holeOutDistance(6)).toBe('20 ft');
    expect(holeOutDistance(100)).toBe('109 yd');
  });

  it('a hole-out keeps its flight within the size limit and reads back', () => {
    const p = encodePath(chip());
    expect(p.length).toBeLessThan(24_000);
    expect(isHoleOut(holeOut('r1-h4', 18.3, p))).toBe(true);
    expect(decodePath(p)!.holed).toBe(true);
  });
});

describe('the shared stats lists', () => {
  let db: ReturnType<typeof fakeD1>;
  beforeEach(() => { resetSchemaCache(); db = fakeD1(); });

  it('most feet of putts made in a round: rounds with the distances, longest first', async () => {
    const round = (id: string, made: number[], player: string): LeaderboardEntry => {
      const scores: HoleScore[] = made.map((m, i) => ({ hole: i + 1, par: 4, strokes: 4, putts: 2, penalties: 0, fairway: true, gir: true, made: m, off: false }));
      const t = totals(scores);
      return { id, course: 'langston', tee: 'Blue', length: '9', difficulty: 'normal', casual: false, player, date: '2026-10-26T15:00:00Z', gross: t.strokes, toPar: t.toPar, back: null, scores, totals: t };
    };
    await handlePost(db, JSON.stringify([{ ...round('a', [3, 3, 3], 'amy'), owner: 'aaaaaaaa11' }, { ...round('b', [10, 2, 1], 'sam'), owner: 'bbbbbbbb11' }]));
    // an older round without the distances isn't on the list
    const old = round('c', [1], 'cat');
    old.scores = old.scores.map(({ made: _m, off: _o, ...s }) => s);
    await handlePost(db, JSON.stringify({ ...old, owner: 'cccccccc11' }));
    const res = await (await handleRecordsGet(db, new URL('https://x.pages.dev/api/records?kind=putts'))).json() as { records: { player: string; made: number }[] };
    expect(res.records.map((r) => [r.player, r.made])).toEqual([['sam', 13], ['amy', 9]]);
  });

  it('hole-outs: longest first without flights; one by id with its flight; a flight that does not end in the cup is dropped', async () => {
    const owner = 'aaaaaaaa11';
    await handleHoleoutsPost(db, JSON.stringify([
      { ...holeOut('r1-h4', 18.3, encodePath(chip())), owner },
      { ...holeOut('r2-h7', 120.5, encodePath(chip())), owner, hole: 7 },
      { ...holeOut('r3-h2', 40, encodePath(chip(false))), owner, hole: 2 },
    ]));
    const list = await (await handleHoleoutsGet(db, new URL('https://x.pages.dev/api/holeouts'))).json() as { holeouts: HoleOut[] };
    expect(list.holeouts.map((h) => h.dist)).toEqual([120.5, 40, 18.3]);
    expect(list.holeouts.every((h) => h.path === undefined)).toBe(true);
    const one = await (await handleHoleoutsGet(db, new URL('https://x.pages.dev/api/holeouts?id=r1-h4'))).json() as { holeout: HoleOut };
    expect(decodePath(one.holeout.path!)!.holed).toBe(true);
    const bad = await (await handleHoleoutsGet(db, new URL('https://x.pages.dev/api/holeouts?id=r3-h2'))).json() as { holeout: HoleOut };
    expect(bad.holeout.path).toBeUndefined();
    // a putt from the fringe (an older copy of the game): not on the list
    await handleHoleoutsPost(db, JSON.stringify({ ...holeOut('r4-h1', 9, encodePath(chip())), club: 'putter', lie: 'fringe', owner }));
    expect((db.raw.prepare("SELECT COUNT(*) AS n FROM holeouts WHERE id = 'r4-h1'").get() as { n: number }).n).toBe(0);
    // no player key, or not a hole-out: refused
    const r = await (await handleHoleoutsPost(db, JSON.stringify([holeOut('r9-h1', 5), { ...holeOut('r8-h1', 5), dist: -1, owner }]))).json() as { rejected: number };
    expect(r.rejected).toBe(2);
  });
});

describe('on this device', () => {
  it('hole-outs are kept with their flights; the shortest sent ones go when the list is full', async () => {
    const store = await import('../../src/save/store');
    await store.saveHoleouts([]);
    for (let i = 0; i < 62; i++) {
      await store.recordHoleout(holeOut(`d${i}-h1`, i));
      const all = await store.loadHoleouts();
      for (const h of all) h.sent = true;
      await store.saveHoleouts(all);
    }
    const all = await store.loadHoleouts();
    expect(all.length).toBe(60);
    expect(Math.min(...all.map((h) => h.dist))).toBe(2);
  });
});

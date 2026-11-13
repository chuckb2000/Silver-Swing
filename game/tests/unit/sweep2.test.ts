// The second overnight sweep (2026-11-13): the cases found by the review and the play-through robot.
import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';
import { Round } from '../../src/systems/game/round';
import { simulateShot } from '../../src/systems/physics/sim';
import { Rng } from '../../src/systems/physics/rng';
import { isOB, isWater, SURF } from '../../src/systems/physics/surfaces';
import { playable } from '../../src/systems/rules/relief';
import { pinSheet } from '../../src/systems/game/pins';
import { fixEntry } from '../../src/save/cardFixes';
import type { LeaderboardEntry } from '../../src/save/entry';
import { totals, HoleScore } from '../../src/systems/rules/scoring';
import { D1Like, D1Statement, handlePost, recordMatch, resetSchemaCache } from '../../src/server/scores';

function fakeD1(failOn?: (sql: string, args: unknown[]) => boolean): D1Like & { raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => {
      if (failOn?.(sql, args)) throw new Error('D1_ERROR: too many queries');
      const r = db.prepare(sql).run(...(args as never[]));
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return { prepare: (sql: string) => stmt(sql), raw: db };
}

const entry = (id: string, o: Partial<LeaderboardEntry> = {}): LeaderboardEntry => {
  const scores: HoleScore[] = Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, par: 4, strokes: 4, putts: 2, penalties: 0, fairway: true, gir: true }));
  const t = totals(scores);
  return { id, course: 'langston', tee: 'Blue', length: 'front', difficulty: 'normal', casual: false, player: 'amy', date: new Date().toISOString(), gross: t.strokes, toPar: t.toPar, back: null, scores, totals: t, ...o };
};

describe('physics and rules', () => {
  it('a ball wedged against a building comes to rest at once (it bounced there for 45 s: Stone Creek 8)', () => {
    const c = loadCourseFiles('stone_creek');
    const spec = { x: 223.85673518474496, y: 509.6624104475886, z: 139.61801369493307, aim: -0.9155287990196673, pin: { x: 623.121, y: 420.107 },
      flight: { carry: 103.34967465427269, apex: 24.321225891349837, hang: 5.269598943125798, curveDeg: 8.97232531607151, windX: -2.6218373018250825, windY: -0.7143002159689458, firstBounceK: 0.3646134701418244, spin: 0, spinBack: 0 } };
    let longest = 0, walls = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const sim = simulateShot(c.terrain, c.obstacles, spec, new Rng(seed));
      longest = Math.max(longest, sim.duration);
      walls = Math.max(walls, sim.events.filter((e) => e.type === 'wall').length);
    }
    expect(longest).toBeLessThan(30);
    expect(walls).toBeLessThan(40);
  });

  it('Needham 6: the club offered on the tee can be kept dry, and the default tee shot is', () => {
    const c = loadCourseFiles('needham');
    for (const seed of [7, 21, 33]) {
      const r = new Round(c, roundCfg(c, [6], seed));
      r.startHole(0);
      const club = r.autoClub();
      expect(club.id).not.toBe('dr');
      const p = r.plan(club.id, r.defaultAim(club, 1), meterFor(1, 0, false), 0, 1);
      const sim = r.simulate(p);
      expect(sim.inWater || isWater(sim.restSurface) || isOB(sim.restSurface)).toBe(false);
      // the driver is still in the bag
      expect(r.allowedClubs().some((x) => x.id === 'dr')).toBe(true);
    }
  });

  it('the driver stays the tee club where a line is clear (no lay-up on an ordinary hole)', () => {
    const c = loadCourseFiles('oswego_lake');
    const r = new Round(c, roundCfg(c, [1, 5, 9], 7));
    for (let i = 0; i < 3; i++) {
      r.startHole(i);
      if (r.hole.par >= 4 && r.distToPin() > 230) expect(r.autoClub().id).toBe('dr');
    }
  });

  it('no drop spot is inside a tree trunk', () => {
    const c = loadCourseFiles('oswego_lake');
    const r = new Round(c, roundCfg(c, [1], 7));
    r.startHole(0);
    const ctx = r.courseCtx();
    let inTrunk = 0, checked = 0;
    for (const t of c.obstacles.trees.filter((_, i) => i % 7 === 0)) {
      if (!c.boundary.contains(t.x, t.y)) continue;
      checked++;
      if (playable(ctx, { x: t.x, y: t.y }) || playable(ctx, { x: t.x + 0.3, y: t.y })) inTrunk++;
    }
    expect(checked).toBeGreaterThan(50);
    expect(inTrunk).toBe(0);
  });

  it('"on the green" and the lie agree along a green\'s edge', () => {
    const c = loadCourseFiles('langston');
    const r = new Round(c, roundCfg(c, [1, 2, 3], 7));
    let n = 0;
    for (let h = 0; h < 3; h++) {
      r.startHole(h);
      for (let d = 2; d < 28; d += 0.37) for (let a = 0; a < 6.28; a += 0.21) {
        const p = { x: r.pin.x + d * Math.cos(a), y: r.pin.y + d * Math.sin(a) };
        const s = c.terrain.surface(p.x, p.y);
        if (s !== SURF.green && s !== SURF.fringe) continue;
        n++;
        if (r.onHoleGreen(p)) expect(s).toBe(SURF.green);
        if (s === SURF.fringe) expect(r.onHoleGreen(p)).toBe(false);
      }
    }
    expect(n).toBeGreaterThan(500);
  });

  it('a pin sheet does not depend on how the browser sorts (no random comparator)', () => {
    const src = pinSheet.toString();
    expect(src).not.toMatch(/sort\(\(\)\s*=>/);
    const spots = Array.from({ length: 9 }, (_, i) => Array.from({ length: 4 }, (_, k) => ({ x: i, y: k, depth: (['front', 'middle', 'back'] as const)[k % 3], side: 0, diff: (k % 3) + 1, centre: k === 0 }))) as never;
    expect(pinSheet(spots, 1234)).toEqual(pinSheet(spots, 1234));
  });

  it('casual max 2x par: the cap reached by an unplayable ball is the round\'s to see', () => {
    const c = loadCourseFiles('langston');
    const cfg = roundCfg(c, [1], 7);
    cfg.settings = { ...cfg.settings, maxDoublePar: true };
    const r = new Round(c, cfg);
    r.startHole(0);
    r.tally.strokes = r.hole.par * 2 - 1;
    const opts = r.unplayable();
    r.applyRelief(opts[0], opts[0].center);
    expect(r.tally.strokes).toBeGreaterThanOrEqual(r.hole.par * 2);
  });
});

describe('saving and the shared board', () => {
  beforeEach(() => resetSchemaCache());

  it('a round the server could not store is reported as failed, not as taken in (so the game sends it again)', async () => {
    const db = fakeD1((sql, args) => sql.startsWith('INSERT OR IGNORE INTO rounds') && args[0] === 'bad');
    const res = await (await handlePost(db, JSON.stringify([{ ...entry('ok1'), owner: 'aaaaaaaa11' }, { ...entry('bad'), owner: 'aaaaaaaa11' }]))).json() as { added: number; failed: string[]; rejected: number };
    expect(res.added).toBe(1);
    expect(res.failed).toEqual(['bad']);
    expect(res.rejected).toBe(0);
  });

  it('a daily round sent days later still counts for its day; one dated another day does not', async () => {
    const db = fakeD1();
    const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
    const at = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    await handlePost(db, JSON.stringify([
      { ...entry('late', { daily: day(4), date: at(4) }), owner: 'aaaaaaaa11' },
      { ...entry('wrongday', { daily: day(1), date: at(6), player: 'sam' }), owner: 'bbbbbbbb11' },
      { ...entry('old', { daily: day(20), date: at(20), player: 'kim' }), owner: 'cccccccc11' },
    ]));
    const rows = db.raw.prepare('SELECT id, daily FROM rounds ORDER BY id').all() as { id: string; daily: string | null }[];
    expect(Object.fromEntries(rows.map((r) => [r.id, r.daily]))).toEqual({ late: day(4), old: null, wrongday: null });
  });

  it('a course\'s corrected card is not applied to a cross-country round', () => {
    const scores: HoleScore[] = [3, 6].map((h) => ({ hole: h, par: 5, strokes: 5, putts: 2, penalties: 0, fairway: true, gir: true }));
    const t = totals(scores);
    const xc = { ...entry('x'), course: 'silvies_chief_egan', length: 'xc' as const, scores, totals: t, gross: t.strokes, toPar: t.toPar };
    expect(fixEntry(xc)).toBeNull();
  });

  it('an existing board moved to a new schema asks for the rounds again, then takes them', async () => {
    const db = fakeD1();
    await handlePost(db, JSON.stringify([{ ...entry('first'), owner: 'aaaaaaaa11' }]));
    db.raw.prepare("UPDATE meta SET v = '1' WHERE k = 'schema'").run(); // as an older deploy left it
    resetSchemaCache();
    const busy = await handlePost(db, JSON.stringify([{ ...entry('second'), owner: 'aaaaaaaa11' }]));
    expect(busy.status).toBe(503);
    const again = await (await handlePost(db, JSON.stringify([{ ...entry('second'), owner: 'aaaaaaaa11' }]))).json() as { added: number };
    expect(again.added).toBe(1);
  });

  it('a round sent again under another of its device\'s names is renamed on the board, with its eagles', async () => {
    const db = fakeD1();
    const eagle = entry('r1', { player: 'amy' });
    eagle.scores[0] = { ...eagle.scores[0], strokes: 2 };
    await handlePost(db, JSON.stringify([{ ...eagle, owner: 'aaaaaaaa11' }]));
    await handlePost(db, JSON.stringify([{ ...eagle, player: 'amelia', owner: 'aaaaaaaa11' }]));
    expect((db.raw.prepare("SELECT player FROM rounds WHERE id = 'r1'").get() as { player: string }).player).toBe('amelia');
    expect((db.raw.prepare("SELECT DISTINCT player FROM eagles WHERE round = 'r1'").all() as { player: string }[]).map((r) => r.player)).toEqual(['amelia']);
    // another device can't rename it
    await handlePost(db, JSON.stringify([{ ...eagle, player: 'mallory', owner: 'bbbbbbbb11' }]));
    expect((db.raw.prepare("SELECT player FROM rounds WHERE id = 'r1'").get() as { player: string }).player).toBe('amelia');
  });

  it('a 19-hole match is recorded', async () => {
    const db = fakeD1();
    const r = { winner: 0 as const, players: ['amy', 'sam'], owners: ['aaaaaaaa11', 'bbbbbbbb11'], margin: '2&1', how: 'holes' as const, holes: 19, played: 18, courseId: 'shortys', tee: 'Back' };
    expect(await recordMatch(db, 'abcd23', r as never)).not.toBe('invalid');
  });
});

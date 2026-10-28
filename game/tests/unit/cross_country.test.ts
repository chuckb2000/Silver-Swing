// Cross-country golf (developer, 2026-10-27): legs of 85-900 yd or a hole's own,
// each tee and green once, out of bounds only beyond the boundary.
import { describe, expect, it } from 'vitest';
import { canFinish, greenChoices, legAllowed, legHole, legYards, Leg, teeChoices, unused, validRound, xcCourse, xcMap, XC_MAX_YD, XC_MIN_YD } from '../../src/systems/game/crossCountry';
import { Round, RoundConfig } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { Rng } from '../../src/systems/physics/rng';
import { loadCourseFiles, meterFor, registry } from './helpers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const json = (id: string) => JSON.parse(readFileSync(resolve(__dirname, `../../public/courses/${id}/course.json`), 'utf8'));

describe('which legs', () => {
  it('85 to 900 yards, or a hole\'s own tee to its own green however short', () => {
    const m = { tees: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], greens: [{ x: 0, y: 60 }, { x: 0, y: 84 * 0.9144 }, { x: 0, y: 901 * 0.9144 }] };
    expect(legAllowed(m, 1, 1)).toBe(true);   // its own: 66 yd
    expect(legAllowed(m, 2, 1)).toBe(false);  // 66 yd from another tee
    expect(legAllowed(m, 1, 2)).toBe(false);  // 84 yd
    expect(legAllowed(m, 1, 3)).toBe(false);  // 901 yd
    expect(XC_MIN_YD).toBe(85);
    expect(XC_MAX_YD).toBe(900);
  });

  it('every course can be played, and a random route always finishes', () => {
    for (const c of registry()) {
      const m = xcMap(json(c.id));
      const n = m.tees.length;
      expect(canFinish(m, unused(n, []).tees, unused(n, []).greens), c.id).toBe(true);
      // random choices among the offered ones never get stuck
      const rng = new Rng(7);
      const legs: Leg[] = [];
      while (legs.length < n) {
        const tees = teeChoices(m, legs);
        expect(tees.length, `${c.id} after ${legs.length}`).toBeGreaterThan(0);
        const t = tees[Math.floor(rng.next() * tees.length)];
        const ok = greenChoices(m, legs, t).filter((x) => x.ok);
        legs.push([t, ok[Math.floor(rng.next() * ok.length)].green]);
      }
      expect(validRound(m, legs), c.id).toBe(true);
    }
  });

  it('greys out greens with the reason', () => {
    const m = xcMap(json('oswego_lake'));
    const ch = greenChoices(m, [[1, 5]], 2);
    expect(ch.find((c) => c.green === 5)!.why).toBe('used');
    const short = ch.find((c) => c.green !== 2 && c.yd < XC_MIN_YD);
    if (short) expect(short.why).toBe('too short');
    expect(ch.find((c) => c.green === 2)!.ok).toBe(true); // its own green
  });
});

describe('a leg as a hole', () => {
  it('runs straight from one hole\'s tee to another\'s green; a hole\'s own leg is the real hole', () => {
    const j = json('oswego_lake');
    const h = legHole(j, 4, 12, j.defaultTee);
    const t = j.holes[3].tees[j.defaultTee];
    expect(h.tees[j.defaultTee].x).toBe(t.x);
    expect(h.greenId).toBe(j.holes[11].greenId);
    expect(h.tees[j.defaultTee].centerline).toEqual([[t.x, t.y], j.holes[11].greenCenter]);
    expect(h.tees[j.defaultTee].yd).toBe(Math.round(legYards(xcMap(j), 4, 12)));
    expect(legHole(j, 7, 7, j.defaultTee)).toBe(j.holes[6]);
  });
});

describe('out of bounds only beyond the boundary', () => {
  it('a driving range and internal out of bounds play in bounds; outside the boundary stays out', () => {
    // a course with a range inside its boundary
    const withRange = registry().map((c) => c.id).find((id) => {
      const c = loadCourseFiles(id);
      for (let i = 0; i < c.terrain.surf.length; i += 97) if (c.terrain.surf[i] === SURF.range) return true;
      return false;
    });
    expect(withRange).toBeTruthy();
    const c = loadCourseFiles(withRange!);
    const x = xcCourse(c);
    expect(xcCourse(c)).toBe(x); // made once
    let range = 0, rangeIn = 0, outside = 0, outsideOB = 0;
    const t = c.terrain;
    for (let r = 0; r < t.sH; r += 7) for (let col = 0; col < t.sW; col += 7) {
      const px = (col + 0.5) / t.pxPerM, py = t.height - (r + 0.5) / t.pxPerM;
      const s = t.surface(px, py), s2 = x.terrain.surface(px, py);
      if (!c.boundary.contains(px, py)) { if (isOB(s)) { outside++; if (isOB(s2)) outsideOB++; } continue; }
      if (s === SURF.range) { range++; if (s2 === SURF.fairway) rangeIn++; }
      if (isOB(s2)) expect.fail(`${withRange}: still out of bounds inside the boundary at ${px}, ${py}`);
    }
    expect(range).toBeGreaterThan(0);
    expect(rangeIn).toBe(range);
    expect(outsideOB).toBe(outside);
    // the course itself is untouched
    expect(c.terrain).not.toBe(x.terrain);
  });
});

describe('a cross-country round (robot golfer)', () => {
  it('plays chosen legs: the tee of one hole, the green of another, then waits for the next choice', () => {
    const course = loadCourseFiles('oswego_lake');
    const cfg: RoundConfig = {
      courseId: 'oswego_lake', tee: course.json.defaultTee, holes: course.json.holes.map((h) => h.number), length: 'xc',
      xc: { legs: [] }, playerName: 'test', seed: 5, startedAt: '2026-10-27T00:00:00Z',
      settings: { difficulty: 'normal', lefty: false, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
    };
    const r = new Round(course, cfg);
    r.startHole(0);
    expect(r.needsLeg).toBe(true);
    const m = xcMap(course.json);
    const plan: Leg[] = [];
    for (let k = 0; k < 3; k++) {
      const t = teeChoices(m, plan)[k];
      // the shortest leg to another hole's green (the robot is no good at 700 yards through the woods)
      const g = greenChoices(m, plan, t).filter((c) => c.ok && c.green !== t).sort((a, b) => a.yd - b.yd)[0].green;
      plan.push([t, g]);
      cfg.xc!.legs[k] = [t, g];
      r.startHole(k);
      expect(r.needsLeg).toBe(false);
      expect(r.ball.x).toBe(course.json.holes[t - 1].tees[cfg.tee].x);
      expect(r.hole.greenId).toBe(course.json.holes[g - 1].greenId);
      expect(r.courseHole).toBe(g);
      let guard = 0;
      while (guard++ < 40) {
        const club = r.autoClub();
        const putt = club.kind === 'putter';
        const scale = r.autoSwingScale(club);
        const d = r.distToPin();
        const power = putt ? Math.min(1, (d * 1.1 + 0.3) / scale) : Math.max(0.15, Math.min(1, d / Math.max(1, r.fullCarry(club) * scale)));
        const p = r.plan(club.id, r.defaultAim(club, scale), meterFor(power, 0, putt), 0, scale);
        const out = r.resolve(p, r.simulate(p));
        if (out.kind === 'holed') break;
        if (out.kind === 'water' || out.kind === 'ob') r.applyRelief(out.options[0], out.options[0].center);
        if (out.kind === 'wrong_green' || out.kind === 'cartpath') r.applyRelief(out.area, out.area.center);
      }
      r.finishHole();
      r.nextHole();
      expect(r.needsLeg).toBe(true);
    }
    expect(r.scores.map((s) => s.hole)).toEqual([1, 2, 3]);
    expect(r.scores.every((s) => s.strokes > 0 && s.strokes < 15)).toBe(true);
  });
});

describe('kept off every other board and list', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { handleEaglesGet, handleGet, handleHandicapsGet, handlePost, handleRecentGet, handleRecordsGet, resetFeedCache, resetSchemaCache } = await import('../../src/server/scores');
  const { totals } = await import('../../src/systems/rules/scoring');
  const { playerStats } = await import('../../src/save/stats');
  const { milestonesOf } = await import('../../src/save/milestones');
  const { counts } = await import('../../src/systems/game/handicap');
  const { isEntry } = await import('../../src/save/entry');
  const fakeD1 = () => {
    const db = new DatabaseSync(':memory:');
    const stmt = (sql: string, args: unknown[] = []): any => ({
      bind: (...v: unknown[]) => stmt(sql, v),
      all: async () => ({ results: db.prepare(sql).all(...(args as never[])) }),
      run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
    });
    return { prepare: (sql: string) => stmt(sql) };
  };
  // eighteen legs of which one holed in one: an "eagle" by its hidden par, which must not be listed
  const scores = Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: 4, strokes: i === 0 ? 1 : 3, putts: 1, penalties: 0, fairway: true, gir: true }));
  const t = totals(scores);
  const xc = {
    id: 'xc1', course: 'oswego_lake', tee: 'Blue', length: 'xc', difficulty: 'normal', casual: false, player: 'chuck',
    date: new Date().toISOString(), gross: t.strokes, toPar: t.toPar, back: t.back, scores, totals: t,
    legs: scores.map((_, i) => [i + 1, ((i + 1) % 18) + 1] as [number, number]),
  };

  it('a round carries its legs; the server keeps it for the course, and nowhere else', async () => {
    expect(isEntry(xc)).toBe(true);
    resetSchemaCache(); resetFeedCache();
    const db = fakeD1();
    expect(await (await handlePost(db, JSON.stringify([{ ...xc, owner: 'abcdefghjkmnpqrs' }]))).json()).toMatchObject({ added: 1 });
    const board = (await (await handleGet(db, new URL('https://x/api/scores?course=oswego_lake'))).json()) as { entries: { id: string; legs: unknown }[] };
    expect(board.entries.map((e) => e.id)).toEqual(['xc1']);
    expect(board.entries[0].legs).toEqual(xc.legs);
    const recent = (await (await handleRecentGet(db, new URL('https://x/api/recent'))).json()) as { rounds: unknown[] };
    expect(recent.rounds).toEqual([]);
    const eagles = (await (await handleEaglesGet(db, new URL('https://x/api/eagles'))).json()) as { eagles: unknown[] };
    expect(eagles.eagles).toEqual([]);
    for (const kind of ['birdies', 'putts']) {
      const rec = (await (await handleRecordsGet(db, new URL(`https://x/api/records?kind=${kind}`))).json()) as { rows?: unknown[]; records?: unknown[] };
      expect(rec.rows ?? rec.records ?? []).toEqual([]);
    }
    const hcp = (await (await handleHandicapsGet(db)).json()) as { players?: { rounds?: unknown[] }[] };
    expect(JSON.stringify(hcp)).not.toContain('xc1');
  });

  it('nor in this device\'s stats, milestones or handicap', () => {
    expect(playerStats([xc as never]).rounds).toBe(0);
    expect(milestonesOf([xc as never], [{ id: 'oswego_lake', name: 'Oswego Lake Country Club', location: 'Lake Oswego, Oregon', state: 'OR' } as never])).toEqual([]);
    expect(counts(xc as never, { pars: [], si: [], ratings: { Blue: [70, 120] } } as never)).toBe(false);
  });
});

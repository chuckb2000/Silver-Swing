// Bugs found in the review of 2026-10-20 (docs/reports/bug_and_playability_review.md):
// each test fails on the code before the fix.
import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { coursePins } from '../../src/systems/game/pins';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot, SimResult } from '../../src/systems/physics/sim';
import { SURF } from '../../src/systems/physics/surfaces';
import { flatTerrain } from '../../src/systems/physics/terrain';
import { FULL_MAX, SwingMeter } from '../../src/systems/swing/meter';
import { loadCourseFiles, meterFor, registry, roundCfg } from './helpers';

/** A finished stroke that came to rest at (x, y) on `surf` (only what Round.resolve reads). */
function fakeSim(from: { x: number; y: number }, x: number, y: number, surf: number): SimResult {
  const n = 20;
  const samples = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    samples[i * 3] = from.x + (x - from.x) * f;
    samples[i * 3 + 1] = from.y + (y - from.y) * f;
  }
  const water = surf === SURF.water || surf === SURF.obWater;
  return {
    samples, n, end: { x, y, z: 0 }, restSurface: surf, holed: false, inWater: water, waterCross: water ? { x: from.x, y: from.y } : null,
    landing: { x, y, z: 0, t: 1 }, events: [], duration: 1, hitTree: false,
  };
}

describe('rules', () => {
  const langston = loadCourseFiles('langston');
  const t = langston.terrain;
  const find = (want: number) => {
    for (let y = 2; y < t.height; y += 3) for (let x = 2; x < t.width; x += 3) if (t.surface(x, y) === want) return { x, y };
    throw new Error(`no surface ${want}`);
  };

  it('a ball that ends in water beyond the boundary (the Anacostia) is out of bounds, not a red penalty area', () => {
    const r = new Round(langston, roundCfg(langston, [1]));
    r.startHole(0);
    const p = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    const w = find(SURF.obWater);
    const out = r.resolve(p, fakeSim(r.ball, w.x, w.y, SURF.obWater));
    expect(out.kind).toBe('ob');
  });

  it('casual double-par maximum is a cap: a penalty or a gimme never takes the score past it', () => {
    const cfg = roundCfg(langston, [1]);
    cfg.settings.maxDoublePar = true;
    const r = new Round(langston, cfg);
    r.startHole(0);
    const par = r.hole.par;
    r.tally.strokes = par * 2 - 2; // the next stroke plus a drop would reach the cap
    const p = r.plan('7i', r.defaultAim(clubById('7i'), 1), meterFor(0.5, 0, false), 0, 1);
    const w = find(SURF.water);
    const out = r.resolve(p, fakeSim(r.ball, w.x, w.y, SURF.water));
    expect(out.kind).toBe('max_score');
    expect(r.finishHole(true).strokes).toBe(par * 2);
  });

  it('a mulligan rewinds the whole shot: strokes, penalties and the ball', () => {
    const cfg = roundCfg(langston, [1]);
    cfg.settings.mulligans = true;
    const r = new Round(langston, cfg);
    r.startHole(0);
    const p0 = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    r.resolve(p0, fakeSim(r.ball, r.ball.x + 30, r.ball.y + 30, SURF.fairway)); // shot 1 on the fairway
    const before = { strokes: r.tally.strokes, penalties: r.tally.penalties, x: r.ball.x, y: r.ball.y };
    const p1 = r.plan('7i', r.defaultAim(clubById('7i'), 1), meterFor(0.7, 0, false), 0, 1);
    const w = find(SURF.water);
    const out = r.resolve(p1, fakeSim(r.ball, w.x, w.y, SURF.water));
    expect(out.kind).toBe('water');
    if (out.kind !== 'water') return;
    r.applyRelief(out.options.find((o) => o.kind === 'stroke_distance')!, { x: before.x, y: before.y });
    expect(r.tally.penalties).toBe(1);
    expect(r.mulligan()).toBe(true);
    expect(r.tally.strokes).toBe(before.strokes);
    expect(r.tally.penalties).toBe(before.penalties);
    expect([r.ball.x, r.ball.y]).toEqual([before.x, before.y]);
  });
});

describe('a relief choice left open is saved with the round', () => {
  const langston = loadCourseFiles('langston');
  const t = langston.terrain;
  const find = (want: number) => {
    for (let y = 2; y < t.height; y += 3) for (let x = 2; x < t.width; x += 3) if (t.surface(x, y) === want) return { x, y };
    throw new Error(`no surface ${want}`);
  };
  const strip = (o: { kind: string; options?: { kind: string; center: { x: number; y: number }; radius: number; penalty: number }[] }) =>
    (o.options ?? []).map((a) => ({ kind: a.kind, center: a.center, radius: a.radius, penalty: a.penalty }));

  it('water: a resumed round reopens the same options with the stroke counted (no free replay)', () => {
    const r = new Round(langston, roundCfg(langston, [1]));
    r.startHole(0);
    const p = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    const w = find(SURF.water);
    const out = r.resolve(p, fakeSim(r.ball, w.x, w.y, SURF.water));
    expect(out.kind).toBe('water');
    expect(r.pending?.kind).toBe('water');
    // what the snapshot keeps (JSON), into a fresh round
    const saved = JSON.parse(JSON.stringify({ pending: r.pending, ball: r.ball, prev: r.prev, strokes: r.tally.strokes }));
    const r2 = new Round(langston, r.cfg);
    r2.startHole(0);
    r2.tally.strokes = saved.strokes;
    r2.ball = saved.ball;
    r2.prev = saved.prev;
    r2.pending = saved.pending;
    const again = r2.reliefOutcome(r2.pending!);
    expect(again.kind).toBe('water');
    expect(strip(again as never)).toEqual(strip(out as never));
    expect(r2.tally.strokes).toBe(1);
    if (again.kind !== 'water') return;
    r2.applyRelief(again.options[0], again.options[0].center);
    expect(r2.pending).toBeNull();
    expect([r2.tally.strokes, r2.tally.penalties]).toEqual([2, 1]); // the stroke and its penalty, once
  });

  it('out of bounds: the E-5 option comes back too', () => {
    const cfg = roundCfg(langston, [1]);
    cfg.settings.e5 = true;
    const r = new Round(langston, cfg);
    r.startHole(0);
    const p = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    const o = find(SURF.ob);
    const out = r.resolve(p, fakeSim(r.ball, o.x, o.y, SURF.ob));
    expect(out.kind).toBe('ob');
    const saved = JSON.parse(JSON.stringify(r.pending));
    const again = r.reliefOutcome(saved);
    expect(strip(again as never)).toEqual(strip(out as never));
  });
});

describe('physics', () => {
  it('a punch shot (apex capped under trees) hit down a slope lands instead of hanging in the air', () => {
    const c = clubById('7i');
    const t = flatTerrain(SURF.fairway, { width: 600, height: 200, slopeX: -0.1, z0: 100 });
    const res = simulateShot(t, null, {
      x: 10, y: 100, z: t.z(10, 100), aim: 0, pin: null,
      flight: { carry: c.carryM * 0.8, apex: c.apexM, hang: c.hangS, curveDeg: 0, windX: 0, windY: 2, firstBounceK: 0.5, spin: 0, spinBack: 0, apexCap: 2 },
    }, new Rng(1));
    expect(res.landing).not.toBeNull();
    expect(res.duration).toBeLessThan(20);
  });

  it('a punch shot does not run out much farther than a clean one', () => {
    const c = clubById('4h');
    const t = flatTerrain(SURF.fairway, { width: 700, height: 200 });
    const run = (apexCap?: number) => {
      const r = simulateShot(t, null, {
        x: 10, y: 100, z: t.z(10, 100), aim: 0, pin: null,
        flight: { carry: c.carryM * 0.8, apex: c.apexM, hang: c.hangS, curveDeg: 0, windX: 0, windY: 0, firstBounceK: 0.5, spin: 0, spinBack: 0, apexCap },
      }, new Rng(1));
      return r.end.x - (r.landing?.x ?? 0);
    };
    expect(run(2)).toBeLessThan(run() * 3);
  });

  it('a swing with no power leaves the ball where it was (no NaN)', () => {
    const t = flatTerrain(SURF.fairway, { width: 200, height: 200 });
    const res = simulateShot(t, null, {
      x: 50, y: 50, z: t.z(50, 50), aim: 0, pin: null,
      flight: { carry: 0, apex: 0, hang: 0, curveDeg: 0, windX: 0, windY: 0, firstBounceK: 0.5, spin: 0, spinBack: 0 },
    }, new Rng(1));
    expect(Number.isFinite(res.end.x)).toBe(true);
    expect(res.end.x).toBeCloseTo(50, 3);
  });
});

describe('meter', () => {
  it('the latency setting shifts the automatic turn at the end of the bar like it shifts the taps', () => {
    const m = new SwingMeter('full', 1.6, FULL_MAX, 120, 1.0);
    m.tap(0);
    const tEnd = m.timeTo(FULL_MAX);
    m.update(tEnd + 60); // on screen the cursor is at the end, but a tap now counts as 60 ms earlier
    expect(m.phase).toBe('power');
    m.tap(tEnd + 60);
    expect(m.power).toBeLessThan(FULL_MAX);
  });

  it('the same tap delivered twice does not count twice', () => {
    const m = new SwingMeter('full', 1.6, FULL_MAX, 0, 1.0);
    m.tap(1000);
    m.tap(1000);
    expect(m.phase).toBe('power');
  });
});

describe('pins', () => {
  it('no extra pin is hidden behind a tree in the course view', () => {
    for (const c of registry()) {
      const course = loadCourseFiles(c.id);
      for (const spots of coursePins(course, course.json.defaultTee)) {
        for (const s of spots) if (!s.centre) expect(course.obstacles.hidesPoint(s.x, s.y), `${c.id}`).toBe(false);
      }
    }
  }, 120_000);
});

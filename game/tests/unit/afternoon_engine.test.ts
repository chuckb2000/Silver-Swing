// Engine findings of the afternoon review (2026-10-20, DECISIONS.md "Afternoon
// review fixes: engine"): each test fails on the code before the fix.
import { describe, expect, it } from 'vitest';
import { clubById, PUTTER } from '../../src/data/clubs';
import { makeWind } from '../../src/data/difficulty';
import { greenPartners, PUTT_SCALES_FT, PUTT_SCALES_M, puttScales, Round } from '../../src/systems/game/round';
import { puttSpeedFor } from '../../src/systems/physics/calibrate';
import { Obstacles, TRUNK_R } from '../../src/systems/physics/obstacles';
import { Rng } from '../../src/systems/physics/rng';
import { BALL_R, simulateShot, SimResult } from '../../src/systems/physics/sim';
import { isWater, SURF } from '../../src/systems/physics/surfaces';
import { flatTerrain } from '../../src/systems/physics/terrain';
import { LieContext, lieIsPenal, lieModsFor, makeLie, spinFor } from '../../src/systems/rules/lie';
import { penaltyAreaOptions, suggestDrop } from '../../src/systems/rules/relief';
import { powerFactor, shotCarry, strikeFrom } from '../../src/systems/swing/outcome';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

const calm = makeWind(0, 0);

/** A finished stroke that came to rest at (x, y) on `surf` (only what Round.resolve reads). */
function fakeSim(from: { x: number; y: number }, x: number, y: number, surf: number): SimResult {
  const n = 20;
  const samples = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    samples[i * 3] = from.x + (x - from.x) * f;
    samples[i * 3 + 1] = from.y + (y - from.y) * f;
  }
  return {
    samples, n, end: { x, y, z: 0 }, restSurface: surf, holed: false, inWater: false, waterCross: null,
    landing: { x, y, z: 0, t: 1 }, events: [], duration: 1, hitTree: false,
  };
}

describe('water beyond the boundary (Round Lake, Neacoxie Creek)', () => {
  /** Tee shots at red water outside the boundary near the hole (every third target, calm, perfect strikes). */
  function teeShotsAtOuterWater(id: string, hole: number) {
    const course = loadCourseFiles(id);
    const t = course.terrain;
    const h = course.json.holes[hole - 1];
    const tee = h.tees[course.json.defaultTee] ?? Object.values(h.tees)[0];
    const targets: { x: number; y: number }[] = [];
    for (let x = 0; x < t.width; x += 6) for (let y = 0; y < t.height; y += 6) {
      if (t.surface(x, y) !== SURF.water || course.boundary.contains(x, y)) continue;
      if (Math.min(...tee.centerline.map(([a, b]) => Math.hypot(a - x, b - y))) < 250) targets.push({ x, y });
    }
    const res = { water: 0, refInBounds: 0, withDrop: 0, obFirst: 0 };
    for (const tg of targets.filter((_, i) => i % 3 === 0)) {
      const d = Math.hypot(tg.x - tee.x, tg.y - tee.y);
      if (d > 230 || d < 40) continue;
      const r = new Round(course, roundCfg(course, [hole]));
      r.startHole(0);
      r.wind = calm;
      const club = r.allowedClubs().filter((c) => c.kind !== 'putter').sort((a, b) => Math.abs(a.carryM - d) - Math.abs(b.carryM - d))[0];
      const plan = r.plan(club.id, Math.atan2(tg.y - tee.y, tg.x - tee.x), meterFor(Math.min(1, d / r.fullCarry(club)), 0, false), 0, 1);
      const sim = r.simulate(plan);
      const o = r.resolve(plan, sim);
      if (o.kind === 'ob' && sim.inWater) res.obFirst++;
      if (o.kind !== 'water') continue;
      res.water++;
      const ref = o.options.find((a) => a.kind === 'back_on_line')!.center;
      if (course.boundary.contains(ref.x, ref.y)) res.refInBounds++;
      if (o.options.some((a) => a.kind !== 'stroke_distance' && suggestDrop(r.courseCtx(), a) !== null)) res.withDrop++;
    }
    return res;
  }

  it('Gearhart 6: a ball that crossed the bank into the creek gets its drops (the reference point is in bounds)', () => {
    const r = teeShotsAtOuterWater('gearhart', 6);
    expect(r.water).toBeGreaterThan(20);
    expect(r.refInBounds).toBe(r.water);
    expect(r.withDrop).toBe(r.water); // before the fix: 9 of 35
    expect(r.obFirst).toBeGreaterThan(0); // the creek 100 m beyond the boundary: out of bounds first
  });

  it('Bandon Trails 7: Round Lake drops are offered; a ball across a wide strip of out-of-bounds ground is out of bounds', () => {
    const r = teeShotsAtOuterWater('bandon_trails', 7);
    expect(r.water).toBeGreaterThan(100);
    expect(r.refInBounds).toBe(r.water);
    expect(r.withDrop).toBe(r.water); // before the fix: about a third of them
    expect(r.obFirst).toBeGreaterThan(0);
  });
});

describe('lateral relief at ordinary ponds', () => {
  it('Stone Creek 4: the reference point is outside the penalty area outline, so a lateral drop exists', () => {
    const course = loadCourseFiles('stone_creek');
    const r = new Round(course, roundCfg(course, [4]));
    r.startHole(0);
    r.ball = { x: 444.0, y: 956.9, teedUp: false };
    r.refreshLie();
    r.wind = calm;
    const plan = r.plan('3w', Math.atan2(727.7 - 956.9, 438.1 - 444.0), meterFor(1, 0, false), 0, 1);
    const sim = r.simulate(plan);
    const o = r.resolve(plan, sim);
    expect(o.kind).toBe('water');
    if (o.kind !== 'water') return;
    const w = course.water.find((q) => q.poly.contains(sim.end.x, sim.end.y))!;
    const ctx = r.courseCtx();
    // the old reference (the last sample off the mapped water) is inside the outline: no lateral drop
    const old = penaltyAreaOptions(ctx, 'red', r.prev, sim.waterCross!, w.poly).find((a) => a.kind === 'lateral')!;
    expect(w.poly.contains(sim.waterCross!.x, sim.waterCross!.y)).toBe(true);
    expect(suggestDrop(ctx, old)).toBeNull();
    const lat = o.options.find((a) => a.kind === 'lateral')!;
    expect(w.poly.contains(lat.center.x, lat.center.y)).toBe(false);
    expect(isWater(course.terrain.surface(lat.center.x, lat.center.y))).toBe(false);
    expect(suggestDrop(ctx, lat)).not.toBeNull();
  });
});

describe('a ball against a trunk on a steep slope', () => {
  for (const [surf, slope] of [[SURF.woods, 0.45], [SURF.fairway, 0.3], [SURF.rough, 0.7]] as const) {
    it(`comes to rest against the trunk (surface ${surf}, ${slope * 100} % slope)`, () => {
      // downhill toward +x; a trunk 2 m below the ball
      const t = flatTerrain(surf, { width: 100, height: 60, slopeX: -slope, z0: 80 });
      const tree = { i: 0, x: 50, y: 30, h: 12, r: 3, conifer: false, base: t.z(50, 30) };
      const obs = new Obstacles([tree], [], t.width, t.height);
      const res = simulateShot(t, obs, { x: 48, y: 30, z: t.z(48, 30), aim: 0, rollSpeed: 0, pin: null }, new Rng(1));
      expect(res.events.some((e) => e.type === 'trunk')).toBe(true);
      expect(res.duration).toBeLessThan(10); // was the 45 s cap
      expect(Math.hypot(res.end.x - tree.x, res.end.y - tree.y)).toBeLessThan(TRUNK_R + BALL_R + 0.05);
      expect(res.events[res.events.length - 1].type).toBe('rest');
    });
  }

  it('a quick ball still bounces off the trunk on flat ground', () => {
    const t = flatTerrain(SURF.fairway, { width: 100, height: 60 });
    const obs = new Obstacles([{ i: 0, x: 50, y: 30, h: 12, r: 3, conifer: false, base: t.z(50, 30) }], [], t.width, t.height);
    const res = simulateShot(t, obs, { x: 40, y: 30, z: t.z(40, 30), aim: 0, rollSpeed: 6, pin: null }, new Rng(1));
    expect(res.events.some((e) => e.type === 'trunk')).toBe(true);
    expect(res.end.x).toBeLessThan(50 - TRUNK_R - 0.5); // came back off it
  });
});

describe('Langdon 9/18: one double green traced as two touching halves', () => {
  const course = loadCourseFiles('langdon');
  const g9 = course.greenPolys.get('desk_9_green_0')!, g18 = course.greenPolys.get('desk_18_green_0')!;
  /** A spot on the hole-9 half (not on the 18 half), the nearest such to the 18 pin from which
   *  a straight putt stays dry (the green wraps round the pond's north tip, so the halves meet
   *  beside the water; course chat, 2026-10-20). */
  const on9Near18 = (() => {
    const pin = course.json.holes[17].pin;
    const dryLine = (x: number, y: number) => {
      const n = Math.ceil(Math.hypot(pin[0] - x, pin[1] - y) / 0.25);
      for (let k = 0; k <= n; k++) {
        const f = k / n, px = x + (pin[0] - x) * f, py = y + (pin[1] - y) * f;
        for (const [dx, dy] of [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) if (course.terrain.surface(px + dx, py + dy) === SURF.water) return false;
      }
      return true;
    };
    let best = { x: 0, y: 0 }, bd = Infinity;
    for (let x = g9.minX; x < g9.maxX; x += 0.5) for (let y = g9.minY; y < g9.maxY; y += 0.5) {
      if (!g9.contains(x, y) || g18.contains(x, y) || g9.edgeDistance(x, y) < 1.5 || course.terrain.surface(x, y) !== SURF.green) continue;
      if (Math.hypot(x - pin[0], y - pin[1]) >= bd || !dryLine(x, y)) continue;
      const d = Math.hypot(x - pin[0], y - pin[1]);
      if (d < bd) { bd = d; best = { x, y }; }
    }
    return best;
  })();

  it('the halves are partners, and the only touching greens on any hole', () => {
    const p = greenPartners(course);
    expect(p.get('desk_9_green_0')).toEqual(['desk_18_green_0']);
    expect(p.get('desk_18_green_0')).toEqual(['desk_9_green_0']);
    expect([...p.keys()].length).toBe(2);
  });

  it('an approach to 18 on the hole-9 half is on the green: no wrong-green relief, putter, green in regulation', () => {
    const r = new Round(course, roundCfg(course, [18]));
    r.startHole(0);
    expect(r.courseCtx().otherGreens).not.toContain(g9);
    // tee shot to the fairway short of the green, then the approach onto the 9 half
    const fair = { x: r.pin.x - 100, y: r.pin.y };
    const p0 = r.plan('dr', r.defaultAim(clubById('dr'), 1), meterFor(1, 0, false), 0, 1);
    r.resolve(p0, fakeSim(r.ball, fair.x, fair.y, SURF.fairway));
    const p1 = r.plan('9i', r.defaultAim(clubById('9i'), 1), meterFor(0.8, 0, false), 0, 1);
    const out = r.resolve(p1, fakeSim(r.ball, on9Near18.x, on9Near18.y, SURF.green));
    expect(out.kind).toBe('rest');
    expect(r.pending).toBeNull();
    expect(r.onHoleGreen()).toBe(true);
    expect(r.lie.kind).toBe('green');
    expect(r.autoClub().kind).toBe('putter');
    // putt out (holing out still works) and the green counts as hit in regulation
    for (let k = 0; k < 8 && r.distToPin() > 0; k++) {
      const scale = r.autoPuttScale();
      const power = Math.min(1, (r.distToPin() * 1.05 + 0.3) / scale);
      const plan = r.plan(PUTTER.id, r.defaultAim(PUTTER, scale), meterFor(power, 0, true), 0, scale);
      const o = r.resolve(plan, r.simulate(plan));
      if (o.kind === 'holed') break;
      expect(o.kind).toBe('rest');
    }
    const s = r.finishHole();
    expect(s.putts).toBeGreaterThan(0);
    expect(s.gir).toBe(true);
  });

  it('hole 9 also treats the 18 half as its own green', () => {
    const r = new Round(course, roundCfg(course, [9]));
    r.startHole(0);
    expect(r.courseCtx().otherGreens).not.toContain(g18);
    expect(r.courseCtx().otherGreens.length).toBe(course.greenPolys.size - 2);
  });
});

describe('longer putter settings', () => {
  it('120 and 160 ft (36 and 48 m), marks in whole units, and the automatic setting reaches them', () => {
    expect(PUTT_SCALES_FT.slice(-2)).toEqual([120, 160]);
    expect(PUTT_SCALES_M.slice(-2)).toEqual([36, 48]);
    for (const s of [...PUTT_SCALES_FT, ...PUTT_SCALES_M]) for (const f of [0.25, 0.5, 0.75]) expect(Number.isInteger(s * f)).toBe(true);
    const course = loadCourseFiles('oswego_lake');
    const r = new Round(course, roundCfg(course, [1]));
    r.startHole(0);
    r.ball = { x: r.pin.x - 25, y: r.pin.y, teedUp: false };
    expect(r.autoPuttScale('yd')).toBeCloseTo(160 * 0.3048, 6); // 82 ft: 1.6 x = 131 ft
    r.ball = { x: r.pin.x - 20, y: r.pin.y, teedUp: false };
    expect(r.autoPuttScale('yd')).toBeCloseTo(120 * 0.3048, 6);
    expect(r.autoPuttScale('m')).toBe(36);
    r.ball = { x: r.pin.x - 60, y: r.pin.y, teedUp: false };
    expect(r.autoPuttScale('m')).toBe(48); // the longest when nothing covers it
    expect(puttScales('yd').length).toBe(6);
  });

  it('a scale is a distance: 100 % of 160 ft rolls 160 ft on a flat stimp-10 green (and 100 % of 25 m rolls 25 m)', () => {
    const t = flatTerrain(SURF.green, { width: 120, height: 40 });
    for (const d of [25, 160 * 0.3048]) {
      const res = simulateShot(t, null, { x: 5, y: 20, z: t.z(5, 20), aim: 0, rollSpeed: puttSpeedFor(d), pin: null }, new Rng(1));
      expect(Math.abs(res.end.x - 5 - d)).toBeLessThan(0.5);
    }
  });
});

describe('gorse: one carry for the strike, the labels and the swing length', () => {
  const ctx: LieContext = { surface: SURF.gorse, teedUp: false, distToGreenEdge: 120, canopyBase: null };
  const lie = makeLie(ctx, new Rng(9));

  it('carry = min(club x lie x power factor(power x swing length), cap)', () => {
    const c = clubById('pw');
    const mods = lieModsFor(lie, c);
    for (const sc of [1, 0.75, 0.5, 0.25]) for (const pw of [0.2, 0.4, 0.7, 1]) {
      const want = Math.min(c.carryM * powerFactor(pw * sc) * mods.distMult, lie.carryCap!);
      expect(shotCarry(c, mods, sc, pw)).toBeCloseTo(want, 9);
      expect(strikeFrom(meterFor(pw, 0, false), c, mods, 2.5, false, sc).carry).toBeCloseTo(shotCarry(c, mods, sc, meterFor(pw, 0, false).power), 9);
    }
  });

  it('the round shows the same carry as the strike flies, and picks the swing length with it', () => {
    const course = loadCourseFiles('oswego_lake');
    const r = new Round(course, roundCfg(course, [1]));
    r.startHole(0);
    r.lie = lie;
    const c = clubById('lw');
    r.ball = { x: r.pin.x - 10, y: r.pin.y, teedUp: false }; // wants 11.5 m
    const sc = r.autoSwingScale(c);
    expect(sc).toBe(0.25); // a 1/4 wedge carries 17 m (the old cap x 1/4 said 6 m and picked 1/2)
    expect(r.carryFor(c, sc)).toBeGreaterThanOrEqual(10 * 1.15);
    // the label: a 1/2 wedge from gorse carries min(34 m, cap), not cap x 1/2
    expect(r.carryFor(c, 0.5)).toBeCloseTo(Math.min(c.carryM * 0.5, lie.carryCap!), 9);
    const s = strikeFrom(meterFor(1, 0, false), c, lieModsFor(lie, c), r.preset.perfectZone, false, 0.5);
    expect(r.carryFor(c, 0.5)).toBeCloseTo(s.carry, 9);
  });

  it('no spin at all from gorse, and the lie shows as a bad one', () => {
    expect(spinFor(lie, 1)).toBe(0);
    expect(spinFor(lie, -1)).toBe(0);
    expect(lieIsPenal(lie)).toBe(true);
    expect(lie.distMult).toBe(1); // why the old distMult < 1 tint showed it green
    const course = loadCourseFiles('oswego_lake');
    const r = new Round(course, roundCfg(course, [1]));
    r.startHole(0);
    r.ball = { x: r.pin.x - 40, y: r.pin.y, teedUp: false };
    r.lie = lie;
    const plan = r.plan('lw', 0, meterFor(1, 0, false), 1, 1); // topspin asked for
    expect(plan.spec.flight!.spin).toBe(0);
  });

  it('lie colours: fairway and tee green; rough, punch, bunkers and gorse yellow', () => {
    const L = (surface: number, extra: Partial<LieContext> = {}) => makeLie({ ...ctx, surface, ...extra }, new Rng(3));
    expect(lieIsPenal(L(SURF.fairway))).toBe(false);
    expect(lieIsPenal(L(SURF.green))).toBe(false);
    expect(lieIsPenal(L(SURF.fairway, { teedUp: true }))).toBe(false);
    expect(lieIsPenal(L(SURF.rough))).toBe(true);
    expect(lieIsPenal(L(SURF.rough, { canopyBase: 5 }))).toBe(true);
    expect(lieIsPenal(L(SURF.bunker))).toBe(true);
    expect(lieIsPenal(L(SURF.bunker, { distToGreenEdge: 10 }))).toBe(true);
  });
});

describe('the meter readout follows the overswing power factor', () => {
  it('110 % on the meter is +8 %, not +10 %', () => {
    const course = loadCourseFiles('oswego_lake');
    const r = new Round(course, roundCfg(course, [1]));
    r.startHole(0);
    r.ball = { x: r.pin.x - 200, y: r.pin.y, teedUp: false };
    r.refreshLie();
    const c = clubById('7i');
    expect(r.carryFor(c, 1, 1.1)).toBeCloseTo(r.fullCarry(c) * 1.08, 9);
    expect(r.carryFor(c, 1, 1.05)).toBeCloseTo(r.fullCarry(c) * 1.04, 9);
    const s = strikeFrom(meterFor(1.1, 0, false), c, lieModsFor(r.lie, c), r.preset.perfectZone, false, 1);
    expect(r.carryFor(c, 1, meterFor(1.1, 0, false).power)).toBeCloseTo(s.carry, 9);
  });
});

// a mulligan after a resume: tests/unit/afternoon_snapshot.test.ts

describe('the default aim allows for the hole\'s wind', () => {
  it('Eastmoreland 14: where a line clear of the creek exists in the hole\'s wind, the default drive takes it', () => {
    const course = loadCourseFiles('eastmoreland');
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const dr = clubById('dr');
    /** the perfect drive down this line in the hole's steady wind: in the creek? */
    const wet = (r: Round, aim: number) => {
      const plan = r.plan(dr.id, aim, meterFor(1, 0, false), 0, 1);
      plan.spec.flight!.windX = r.wind.vx; plan.spec.flight!.windY = r.wind.vy;
      const sim = simulateShot(course.terrain, course.obstacles, plan.spec, new Rng(1));
      return sim.inWater || isWater(sim.restSurface);
    };
    for (const seed of [8, 22, 30, 51]) {
      const r = new Round(course, roundCfg(course, holes, seed));
      r.startHole(13);
      const wind = r.wind;
      expect(wind.mph).toBeGreaterThan(3);
      // the line picked in calm air (the old check) goes in the creek in this wind
      r.wind = calm;
      const calmAim = r.defaultAim(dr, 1);
      r.wind = wind;
      expect(wet(r, calmAim)).toBe(true);
      expect(wet(r, r.defaultAim(dr, 1))).toBe(false);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { CLUBS, clubById, rollM } from '../../src/data/clubs';
import { firstBounceK, puttSpeedFor, rollOutFor } from '../../src/systems/physics/calibrate';
import { Rng } from '../../src/systems/physics/rng';
import { MPH, simulateShot } from '../../src/systems/physics/sim';
import { SURF } from '../../src/systems/physics/surfaces';
import { flatTerrain } from '../../src/systems/physics/terrain';
import { Obstacles } from '../../src/systems/physics/obstacles';

const full = CLUBS.filter((c) => c.kind !== 'putter');

describe('club calibration (spec 7.3)', () => {
  it.each(full.map((c) => [c.id, c] as const))('%s carries within 2% of the table at 100%%, calm, flat', (_id, club) => {
    const r = rollOutFor(club, firstBounceK(club));
    expect(Math.abs(r.carry - club.carryM) / club.carryM).toBeLessThan(0.02);
  });

  it.each(full.map((c) => [c.id, c] as const))('%s rolls out within 40% of the table on a flat fairway', (_id, club) => {
    const r = rollOutFor(club, firstBounceK(club));
    const target = rollM(club);
    if (target < 1) expect(r.roll).toBeLessThan(1.5);
    else expect(Math.abs(r.roll - target) / target).toBeLessThan(0.4);
  });

  it('a 100% putt rolls 25 m +-0.5 m on a flat stimp-10 green', () => {
    const t = flatTerrain(SURF.green, { width: 100, height: 40 });
    const r = simulateShot(t, null, { x: 5, y: 20, z: t.z(5, 20), aim: 0, rollSpeed: puttSpeedFor(25), pin: null }, new Rng(3));
    expect(Math.abs(r.end.x - 5 - 25)).toBeLessThan(0.5);
  });

  it('70% 7-iron carries about 101 m (linear power)', () => {
    const c = clubById('7i');
    const r = rollOutFor(c, firstBounceK(c), SURF.fairway, 0.7);
    expect(r.carry).toBeGreaterThan(99);
    expect(r.carry).toBeLessThan(103);
  });
});

describe('wind (spec 7.2)', () => {
  it('10 mph crosswind moves a 7-iron 7-9 yd', () => {
    const c = clubById('7i');
    const t = flatTerrain(SURF.fairway, { width: 400, height: 200 });
    const shot = (wy: number) => simulateShot(t, null, {
      x: 10, y: 100, z: t.z(10, 100), aim: 0, pin: null,
      flight: { carry: c.carryM, apex: c.apexM, hang: c.hangS, curveDeg: 0, windX: 0, windY: wy, firstBounceK: firstBounceK(c), spin: 0, spinBack: 0 },
    }, new Rng(1));
    const calm = shot(0).landing!;
    const windy = shot(10 * MPH).landing!;
    const yd = Math.abs(windy.y - calm.y) / 0.9144;
    expect(yd).toBeGreaterThan(7);
    expect(yd).toBeLessThan(9);
  });

  it('headwind shortens and tailwind lengthens carry', () => {
    const c = clubById('7i');
    const t = flatTerrain(SURF.fairway, { width: 400, height: 200 });
    const carry = (wx: number) => simulateShot(t, null, {
      x: 10, y: 100, z: t.z(10, 100), aim: 0, pin: null,
      flight: { carry: c.carryM, apex: c.apexM, hang: c.hangS, curveDeg: 0, windX: wx, windY: 0, firstBounceK: firstBounceK(c), spin: 0, spinBack: 0 },
    }, new Rng(1)).landing!.x - 10;
    expect(carry(-10 * MPH)).toBeCloseTo(c.carryM * 0.9, 0);
    expect(carry(10 * MPH)).toBeCloseTo(c.carryM * 1.05, 0);
  });
});

describe('elevation and slopes', () => {
  it('uphill shots land shorter, downhill longer', () => {
    const c = clubById('7i');
    const carry = (slope: number) => {
      const t = flatTerrain(SURF.fairway, { width: 400, height: 200, slopeX: slope, z0: 100 });
      return simulateShot(t, null, {
        x: 10, y: 100, z: t.z(10, 100), aim: 0, pin: null,
        flight: { carry: c.carryM, apex: c.apexM, hang: c.hangS, curveDeg: 0, windX: 0, windY: 0, firstBounceK: firstBounceK(c), spin: 0, spinBack: 0 },
      }, new Rng(1)).landing!.x - 10;
    };
    expect(carry(0.08)).toBeLessThan(c.carryM - 5);
    expect(carry(-0.08)).toBeGreaterThan(c.carryM + 5);
  });

  it('a putt breaks downhill on a side slope', () => {
    const t = flatTerrain(SURF.green, { width: 60, height: 60, slopeY: 0.02 });
    const r = simulateShot(t, null, { x: 5, y: 30, z: t.z(5, 30), aim: 0, rollSpeed: puttSpeedFor(10), pin: null }, new Rng(1));
    expect(r.end.y).toBeLessThan(29.5);
  });
});

describe('cup (spec 7.5)', () => {
  it('a slow putt on line drops', () => {
    const t = flatTerrain(SURF.green, { width: 60, height: 60 });
    const r = simulateShot(t, null, { x: 10, y: 30, z: t.z(10, 30), aim: 0, rollSpeed: puttSpeedFor(6), pin: { x: 14, y: 30 } }, new Rng(1));
    expect(r.holed).toBe(true);
  });

  it('a putt 7 cm wide with pace lips out', () => {
    const t = flatTerrain(SURF.green, { width: 60, height: 60 });
    const r = simulateShot(t, null, { x: 10, y: 30, z: t.z(10, 30), aim: 0, rollSpeed: puttSpeedFor(8), pin: { x: 14, y: 30.07 } }, new Rng(1));
    expect(r.holed).toBe(false);
    expect(r.events.some((e) => e.type === 'lipout')).toBe(true);
  });

  it('a putt that is far too fast does not drop', () => {
    const t = flatTerrain(SURF.green, { width: 80, height: 60 });
    const r = simulateShot(t, null, { x: 10, y: 30, z: t.z(10, 30), aim: 0, rollSpeed: puttSpeedFor(25), pin: { x: 12, y: 30 } }, new Rng(1));
    expect(r.holed).toBe(false);
  });
});

describe('water and trees', () => {
  it('a ball landing in water stays in and records where it crossed the edge', () => {
    const t = flatTerrain(SURF.fairway, { width: 300, height: 100 });
    // paint a water strip from x = 140 m to 170 m
    for (let r = 0; r < t.sH; r++) for (let c = 280; c < 340; c++) t.surf[r * t.sW + c] = SURF.water;
    const c = clubById('7i');
    const r = simulateShot(t, null, {
      x: 10, y: 50, z: t.z(10, 50), aim: 0, pin: null,
      flight: { carry: c.carryM, apex: c.apexM, hang: c.hangS, curveDeg: 0, windX: 0, windY: 0, firstBounceK: firstBounceK(c), spin: 0, spinBack: 0 },
    }, new Rng(1));
    expect(r.inWater).toBe(true);
    expect(r.waterCross!.x).toBeLessThan(140.5);
    expect(r.waterCross!.x).toBeGreaterThan(138);
  });

  it('a low shot into a trunk bounces back', () => {
    const t = flatTerrain(SURF.fairway, { width: 300, height: 100 });
    const tree = { i: 0, x: 40, y: 50, h: 30, r: 5, conifer: true, base: t.z(40, 50) };
    const obs = new Obstacles([tree], [], t.width, t.height);
    const r = simulateShot(t, obs, { x: 10, y: 50, z: t.z(10, 50), aim: 0, rollSpeed: 12, pin: null }, new Rng(1));
    expect(r.end.x).toBeLessThan(40);
    expect(r.events.some((e) => e.type === 'trunk')).toBe(true);
  });

  it('simulation is deterministic for a given seed', () => {
    const t = flatTerrain(SURF.fairway, { width: 400, height: 200 });
    const trees = Array.from({ length: 40 }, (_, i) => ({ i, x: 60 + (i % 10) * 9, y: 90 + Math.floor(i / 10) * 6, h: 25, r: 5, conifer: true, base: 50 }));
    const obs = new Obstacles(trees, [], t.width, t.height);
    const c = clubById('6i');
    const run = () => simulateShot(t, obs, {
      x: 10, y: 100, z: t.z(10, 100), aim: 0.02, pin: null,
      flight: { carry: c.carryM, apex: c.apexM, hang: c.hangS, curveDeg: 3, windX: 1, windY: -2, firstBounceK: firstBounceK(c), spin: 0, spinBack: 0 },
    }, new Rng(42)).end;
    expect(run()).toEqual(run());
  });
});

describe('tree occlusion on screen (3/4 view)', () => {
  it('a tree hides ground north of its trunk up to 0.7 x its height, not south or to the side', () => {
    const tree = { i: 0, x: 50, y: 50, h: 30, r: 4, conifer: true, base: 0 };
    const obs = new Obstacles([tree], [], 100, 100);
    expect(obs.hidesPoint(50, 60)).toBe(true);      // under the crown on screen
    expect(obs.hidesPoint(52, 58)).toBe(true);
    expect(obs.hidesPoint(50, 45)).toBe(false);     // south of the trunk
    expect(obs.hidesPoint(60, 60)).toBe(false);     // beside the crown
    expect(obs.hidesPoint(50, 50 + 30 * 0.7 + 1)).toBe(false); // above the tree top
    expect(obs.hidesPoint(53, 51)).toBe(false);     // beside the trunk, below the crown
  });
});


describe('spin roll-out (developer, 2026-10-19: topspin driver rolled too far)', () => {
  it('topspin adds about 30 % to a driver roll-out, not 50 %; wind drift matches the developer reference', () => {
    const d = clubById('dr');
    const plain = rollOutFor(d, firstBounceK(d), SURF.fairway, 1, 0).roll;
    const top = rollOutFor(d, firstBounceK(d), SURF.fairway, 1, 1).roll;
    expect(top / plain).toBeGreaterThan(1.2);
    expect(top / plain).toBeLessThan(1.4);
    // a 6 mph direct crosswind blows a drive 4-6 yd off line where it lands
    const t = flatTerrain(SURF.fairway, { width: 700, height: 200 });
    const shot = (wy: number) => simulateShot(t, null, {
      x: 10, y: 100, z: t.z(10, 100), aim: 0, pin: null,
      flight: { carry: d.carryM, apex: d.apexM, hang: d.hangS, curveDeg: 0, windX: 0, windY: wy, firstBounceK: firstBounceK(d), spin: 0, spinBack: 0 },
    }, new Rng(1)).landing!;
    const yd = Math.abs(shot(6 * MPH).y - shot(0).y) / 0.9144;
    expect(yd).toBeGreaterThan(4);
    expect(yd).toBeLessThan(6);
  });
});

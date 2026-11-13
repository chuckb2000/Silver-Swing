// Integral objects (Old Course chat, 2026-11-13): a road or wall the local rules make part of the
// course. A ball on a cart path inside one plays as it lies (no free relief); its lie reads "road".
import { describe, expect, it } from 'vitest';
import { CourseRuntime } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

/** A cart path spot inside the boundary, near the first hole's tee. */
function pathSpot(c: CourseRuntime): { x: number; y: number } {
  const t = c.json.holes[0].tees[c.json.defaultTee] ?? Object.values(c.json.holes[0].tees)[0];
  let best: { x: number; y: number } | null = null, bd = Infinity;
  for (let y = 2; y < c.json.world.height; y += 1) {
    for (let x = 2; x < c.json.world.width; x += 1) {
      if (c.terrain.surface(x, y) !== SURF.cartpath || !c.boundary.contains(x, y)) continue;
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < bd) { bd = d; best = { x, y }; }
    }
  }
  if (!best) throw new Error('no cart path');
  return best;
}

/** One stroke that comes to rest at `spot` on the cart path: what the round makes of it. */
function restOn(c: CourseRuntime, spot: { x: number; y: number }) {
  const r = new Round(c, roundCfg(c, [1]));
  r.startHole(0);
  const club = r.autoClub();
  const plan = r.plan(club.id, r.defaultAim(club, 1), meterFor(0.5, 0, club.kind === 'putter'), 0, 1);
  const sim = r.simulate(plan);
  const out = r.resolve(plan, { ...sim, holed: false, inWater: false, end: { ...sim.end, x: spot.x, y: spot.y }, restSurface: SURF.cartpath });
  return { r, out };
}

describe('integral objects', () => {
  const plain = loadCourseFiles('langston');
  const spot = pathSpot(plain);
  const box = [[spot.x - 4, spot.y - 4], [spot.x + 4, spot.y - 4], [spot.x + 4, spot.y + 4], [spot.x - 4, spot.y + 4], [spot.x - 4, spot.y - 4]];
  const road = loadCourseFiles('langston', (j) => ({ ...j, integral: [{ name: 'test road', poly: box }] }));

  it('a cart path gives free relief; the same spot inside an integral object plays as it lies', () => {
    expect(restOn(plain, spot).out.kind).toBe('cartpath');
    const { r, out } = restOn(road, spot);
    expect(out.kind).toBe('rest');
    expect(r.lie?.kind).toBe('cartpath'); // the same physics as a cart path
    expect(r.lie?.label).toBe('road');
    expect(r.integralAt(spot)).toBe(true);
    expect(r.integralAt({ x: spot.x + 10, y: spot.y })).toBe(false);
  });

  it('the unplayable-ball options are still there on the road', () => {
    const { r } = restOn(road, spot);
    expect(r.unplayable().length).toBeGreaterThanOrEqual(3);
  });

  it('courses without the list have none', () => {
    expect(plain.integral).toEqual([]);
    expect(road.integral).toHaveLength(1);
  });
});

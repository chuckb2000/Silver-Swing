// The Old Course (course chat, 2026-11-13): the 2026 card's local rule 4 makes the road crossing the
// 1st and 18th (Grannie Clark's Wynd) and the road and path behind the 17th green integral objects:
// a ball on them plays as it lies and its lie reads "road". A cart path elsewhere still gives relief.
// The wall behind the 17th is a thin building the ball strikes.
import { describe, expect, it } from 'vitest';
import { CourseRuntime } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';

const c = loadCourseFiles('st_andrews_old');

/** Cart path cells inside the boundary, inside (or outside) the named integral area. */
function pathCell(course: CourseRuntime, name: string | null): { x: number; y: number } {
  const areas = course.json.integral ?? [];
  const inArea = (x: number, y: number) => areas.some((a, i) => a.name === name && course.integral[i].contains(x, y));
  for (let y = 2; y < course.json.world.height; y += 1) {
    for (let x = 2; x < course.json.world.width; x += 1) {
      if (course.terrain.surface(x, y) !== SURF.cartpath || !course.boundary.contains(x, y)) continue;
      if (name === null ? !course.integral.some((p) => p.contains(x, y)) : inArea(x, y)) return { x, y };
    }
  }
  throw new Error(`no cart path cell for ${name}`);
}

function restOn(spot: { x: number; y: number }) {
  const r = new Round(c, roundCfg(c, [1]));
  r.startHole(0);
  const club = r.autoClub();
  const plan = r.plan(club.id, r.defaultAim(club, 1), meterFor(0.5, 0, club.kind === 'putter'), 0, 1);
  const sim = r.simulate(plan);
  const out = r.resolve(plan, { ...sim, holed: false, inWater: false, end: { ...sim.end, x: spot.x, y: spot.y }, restSurface: SURF.cartpath });
  return { r, out };
}

describe('st_andrews_old: integral roads and the wall at 17', () => {
  it('has the two integral areas', () => {
    expect((c.json.integral ?? []).map((a) => a.name).sort()).toEqual(["17th road and path", "Grannie Clark's Wynd"]);
  });
  for (const name of ["17th road and path", "Grannie Clark's Wynd"]) {
    it(`a ball on ${name} gets no relief and its lie reads "road"`, () => {
      const { r, out } = restOn(pathCell(c, name));
      expect(out.kind).toBe('rest');
      expect(r.lie?.label).toBe('road');
    });
  }
  it('a cart path elsewhere still gives free relief', () => {
    expect(restOn(pathCell(c, null)).out.kind).toBe('cartpath');
  });
  it('the wall behind the 17th green stands, in play', () => {
    const w = c.json.buildings.find((b) => b.id === 'wall17');
    expect(w).toBeTruthy();
    expect(w!.h).toBeCloseTo(1.5, 1);
  });
});

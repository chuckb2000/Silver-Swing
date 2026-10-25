// Franklin Country Club: course-specific checks of COURSE_BUILD.md 8.2, plus
// the developer's points: all water is red, Uncas Pond is a red penalty area
// across hole 14 (outside the course boundary), Uncas Brook is modelled, and
// trees must not block a drive down the centre of the fairway.
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'franklin';

describe('Franklin Country Club course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-71 course from the Blue tees, in Massachusetts, bayside theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('MA');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(71);
    expect(json.defaultTee).toBe('Blue');
    expect(json.theme).toBe('bayside');
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('all water is red (developer); Uncas Pond is a red penalty area across hole 14, not out of bounds', () => {
    expect(course.water.length).toBeGreaterThanOrEqual(10);
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    const pond = course.water.filter((w) => w.id === 'w90968191' || w.id.startsWith('w90968191:'));
    expect(pond.length).toBeGreaterThan(0);
    const cl = json.holes.find((x) => x.number === 14)!.tees.Blue.centerline;
    let inPond = 0, water = 0;
    for (let k = 0; k + 1 < cl.length; k++) {
      const [ax, ay] = cl[k], [bx, by] = cl[k + 1];
      for (let s = 0; s <= 1; s += 0.01) {
        const x = ax + (bx - ax) * s, y = ay + (by - ay) * s;
        if (!pond.some((w) => w.poly.contains(x, y))) continue;
        inPond++;
        if (course.terrain.surface(x, y) === SURF.water) water++;
      }
    }
    expect(inPond, 'hole 14 line over the pond').toBeGreaterThan(10);
    expect(water / inPond, 'painted as penalty water').toBeGreaterThan(0.97);
  });

  it('Uncas Brook and the stream across 7, 9 and 16 are red penalty areas painted as water', () => {
    const ids = ['w942611225', 'w942611227', 'w942611229', 'w942611231', 'w942611233',
      'w1263089459', 'w1263302044', 'w1263302054', 'w1263302049'].map((i) => `channel_${i}`);
    for (const id of ids) {
      const w = course.water.find((x) => x.id === id);
      expect(w, id).toBeDefined();
      expect(w!.penalty).toBe('red');
    }
    // the two ponds OSM maps only as natural=water are penalty areas too
    for (const id of ['w89790565', 'w1263089460']) expect(course.water.find((x) => x.id === id), id).toBeDefined();
  });

  it('the broadleaf left of the 18th tee is gone (course_config.json drop_trees)', () => {
    expect(course.obstacles.trees.filter((t) => Math.hypot(t.x - 543.5, t.y - 1614.5) < 2)).toEqual([]);
  });

});

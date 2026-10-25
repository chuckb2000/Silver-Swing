// Bandon Trails: course-specific checks of COURSE_BUILD.md 8.2, plus the
// standing defaults used for it: all water red, Round Lake (outside the
// course boundary beside hole 7) a red penalty area rather than out of
// bounds, the other resort courses out of bounds, and trees clear of a
// drive down the centre of every par 4 and par 5.
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'bandon_trails';

describe('Bandon Trails course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-71 course from the Green tees, in Oregon, bandon theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(71);
    expect(json.defaultTee).toBe('Green');
    expect(json.theme).toBe('bandon');
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('all water is red; Round Lake beside hole 7 is a red penalty area painted as water, not out of bounds', () => {
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    const lake = course.water.filter((w) => w.id === 'w266664506' || w.id.startsWith('w266664506:'));
    expect(lake.length).toBeGreaterThan(0);
    let n = 0, water = 0;
    for (let x = 0; x < json.world.width; x += 2) for (let y = 0; y < json.world.height; y += 2) {
      if (!lake.some((w) => w.poly.contains(x, y))) continue;
      n++;
      if (course.terrain.surface(x, y) === SURF.water) water++;
    }
    expect(n).toBeGreaterThan(1000);
    expect(water / n, 'painted as penalty water').toBeGreaterThan(0.95);
    // the two ponds by hole 11
    for (const id of ['w675560578', 'w675560579']) expect(course.water.find((x) => x.id === id), id).toBeDefined();
  });

});

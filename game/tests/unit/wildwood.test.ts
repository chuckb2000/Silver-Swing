// Wildwood Golf Course (Portland OR): course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-24):
// Black tees (the card has no Blue; Black is closest to 6,300 yd), all water red, wind 1-7 mph,
// pnw theme, out of bounds = the OSM boundary as mapped (developer), creeks from the lidar as red
// penalty areas, and lidar trees the 2024 photo no longer shows removed (trees_need_ortho).
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'wildwood';
const TEE = 'Black';
// accepted by the developer (2026-10-24: "don't worry about the discrepancies on those holes"):
// the Black tees the developer marked in the tracing desk on 6, 9, 14 and 18 measure short of the card

describe('Wildwood Golf Course course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Black tees, in Oregon, pnw theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('pnw');
    expect(json.name.length).toBeLessThanOrEqual(26);
    const black = json.teeSets.find((t) => t.name === TEE)!;
    expect(black.rating).toBe(69.1);
    expect(black.slope).toBe(127);
  });

  it('all water is red, ponds and creeks', () => {
    expect(course.water.length).toBeGreaterThanOrEqual(4);
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the creek strip between the 2nd green and the 5th tee is a penalty area, not rough', () => {
    // a point in the middle of OSM w825464987 (local metres)
    expect(course.terrain.surface(520, 527)).toBe(SURF.water);
  });

  // Hole 3 is a par 3 that drops 17.5 m from tee to green: the auto club (6-iron for 155 m, by
  // horizontal distance) flies a perfect shot 25 m past the pin into the trees behind the green.
  // That is the game's club choice, not the data (request to the design chat: let autoClub allow
  // for the height difference).

});

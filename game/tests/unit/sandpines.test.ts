// Sandpines Golf Links (Florence OR): course-specific checks of COURSE_BUILD.md 8.2
// (built 2026-10-24). Blue tees; hole 8 plays from its Black tee, longer than the card
// (developer, 2026-10-24); hole 11 from its long teeing ground; all three ponds red; open-coast
// wind 3-14 mph; the native dune-grass areas are art only (they play as rough).
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'sandpines';
const TEE = 'Blue';

describe('Sandpines course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Blue tees, in Oregon, sandpines theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('sandpines');
    expect(json.name.length).toBeLessThanOrEqual(26);
  });

  it('the three ponds (holes 2, 5 and 17/18) are red penalty areas', () => {
    expect(course.water.length).toBe(3);
  });

  it('the surface map holds only the standard surfaces (the native areas are art, played as rough)', () => {
    const allowed = new Set<number>(Object.values(SURF));
    const seen = new Set<number>();
    for (let y = 1; y < json.world.height; y += 3) for (let x = 1; x < json.world.width; x += 3) seen.add(course.terrain.surface(x, y));
    for (const s of seen) expect(allowed.has(s), `surface ${s}`).toBe(true);
    expect(seen.has(SURF.rough)).toBe(true);
  });

});

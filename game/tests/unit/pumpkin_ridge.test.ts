// Pumpkin Ridge Golf Club: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-24) for its two
// layouts, Witch Hollow and Ghost Creek, which share one world (COURSE_BUILD.md 3.5): Blue tees, all water
// red, wind 1-7 mph (inland Pacific Northwest), the course's own pumpkin_ridge theme, one OB line for both.
import { describe, expect, it } from 'vitest';
import { isOB } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const TEE = 'Blue';
const LAYOUTS = [
  { id: 'pumpkin_ridge_witch_hollow', name: 'Pumpkin Ridge Witch Hollow', par: 72, rating: 72.4, slope: 140, flagged: {} as Record<number, number> },
  // Ghost Creek 3: no box covers the card's 158 yd (one 160-169, the next 146-156); 163 yd from the nearest
  { id: 'pumpkin_ridge_ghost_creek', name: 'Pumpkin Ridge Ghost Creek', par: 71, rating: 72.0, slope: 139, flagged: { 3: 0.035 } as Record<number, number> },
];

for (const L of LAYOUTS) {
  describe(`${L.name} course data`, () => {
    const course = loadCourseFiles(L.id);
    const json = course.json;

    it('is an 18-hole course from the Blue tees, in Oregon, in the Pumpkin Ridge group, its own theme', () => {
      const reg = registry().find((c) => c.id === L.id)!;
      expect(reg.state).toBe('OR');
      expect(reg.group).toBe('pumpkin_ridge');
      expect(json.name).toBe(L.name);
      expect(json.name.length).toBeLessThanOrEqual(26);
      expect(json.holes).toHaveLength(18);
      expect(json.par).toBe(L.par);
      expect(json.defaultTee).toBe(TEE);
      expect(json.theme).toBe('pumpkin_ridge');
      const blue = json.teeSets.find((t) => t.name === TEE)!;
      expect(blue.rating).toBe(L.rating);
      expect(blue.slope).toBe(L.slope);
    });

    it('no tee or green is out of bounds', () => {
      for (const h of json.holes) {
        const t = h.tees[TEE];
        expect(isOB(course.terrain.surface(t.x, t.y)), `hole ${h.number} tee`).toBe(false);
        expect(isOB(course.terrain.surface(h.pin[0], h.pin[1])), `hole ${h.number} pin`).toBe(false);
      }
    });

  });
}

describe('Pumpkin Ridge: two courses, one world', () => {
  const wh = loadCourseFiles('pumpkin_ridge_witch_hollow');
  const gc = loadCourseFiles('pumpkin_ridge_ghost_creek');
  it('both layouts share the world and its OB line', () => {
    expect(wh.json.world).toEqual(gc.json.world);
    expect(wh.json.boundary).toEqual(gc.json.boundary);
  });
  it('each layout plays its own greens', () => {
    const a = new Set(wh.json.holes.map((h) => h.greenId));
    for (const h of gc.json.holes) expect(a.has(h.greenId), `ghost creek ${h.number}`).toBe(false);
  });
});

// Indian Island Golf Course (Riverhead, NY): course-specific checks of
// COURSE_BUILD.md 8.2, plus the developer's rules for this course: Route 105
// (Cross River Drive) is out of bounds, every penalty area is red, and the
// park buildings inside the boundary are obstructions, not out of bounds.
import { describe, expect, it } from 'vitest';
import type { CourseJson } from '../../src/data/course';
import { isOB } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'indian_island';
// holes outside 3% of the Blue card after the tee position (data/indian_island/validation_report.md)
// 1 and 5: flags since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")

describe(ID, () => {
  const course = loadCourseFiles(ID);
  const json: CourseJson = course.json;

  it('is an 18-hole par-72 course in New York, played from the Blue tees', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('NY');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(json.theme).toBe('bayside');
  });

  it('Route 105 (Cross River Drive) is out of bounds where it crosses the course', () => {
    // points on the OSM trunk ways inside the boundary, north of the bridge (local metres)
    const pts = [[853.7, 697.2], [833.8, 660.2], [813.9, 623.2], [627.1, 252.4], [653.3, 299.9], [679.4, 347.3],
      [716.0, 443.4], [675.2, 360.6], [631.3, 279.4], [786.7, 535.6], [826.2, 608.4], [865.4, 681.2],
      [788.8, 578.8], [771.8, 548.7], [754.8, 518.6], [710.5, 400.0], [729.5, 432.5], [748.1, 465.2]];
    for (const [x, y] of pts) {
      expect(course.boundary.contains(x, y), `${x},${y} inside the boundary`).toBe(true);
      expect(isOB(course.terrain.surface(x, y)), `${x},${y}`).toBe(true);
    }
  });

  it('the ranger station and park buildings inside the boundary are obstructions, not out of bounds', () => {
    const inside = json.buildings.filter((b) => b.inside);
    expect(inside.length).toBeGreaterThan(5);
    for (const b of inside) {
      const [cx, cy] = b.poly.reduce(([a, c], [x, y]) => [a + x / b.poly.length, c + y / b.poly.length], [0, 0]);
      expect(isOB(course.terrain.surface(cx, cy)), b.id).toBe(false);
    }
  });

});

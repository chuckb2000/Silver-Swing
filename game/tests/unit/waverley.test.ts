// Waverley Country Club (Milwaukie, OR): course-specific checks of
// COURSE_BUILD.md 8.2, plus the developer's rules for this course: every
// penalty area is red, the Willamette next to the course is a red penalty area
// (out of bounds beyond the strip), and the 11th green keeps its strong
// back-to-front slope (green_tilt in data/waverley/course_config.json).
import { describe, expect, it } from 'vitest';
import type { CourseJson } from '../../src/data/course';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'waverley';
// holes outside 3% of the Blue card after the tee position (data/waverley/validation_report.md)
// 6 and 11: flags since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")
// 17: the developer's new Blue tee (2026-10-21), 475 yd vs 490
// over 8%, accepted by the developer (none since hole 17's tee moved back, 2026-10-21)

describe(ID, () => {
  const course = loadCourseFiles(ID);
  const json: CourseJson = course.json;

  it('is an 18-hole par-72 course in Oregon, played from the Blue tees', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('OR');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(json.theme).toBe('pnw_club');
  });

  it('the Willamette beside the course is a red penalty area, out of bounds beyond the strip', () => {
    for (const [x, y] of [[320, 1000], [440, 700]]) {
      expect(course.boundary.contains(x, y), `${x},${y} inside the boundary`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
    }
    for (const [x, y] of [[200, 1000], [300, 700]]) expect(isOB(course.terrain.surface(x, y)), `${x},${y}`).toBe(true);
  });

  it('the 11th green tilts 3.5% (back to front) with no random undulations', () => {
    const h = json.holes.find((x) => x.number === 11)!;
    const g = json.greens.find((x) => x.id === h.greenId)!;
    expect(Math.hypot(g.gx, g.gy)).toBeCloseTo(0.035, 3);
    expect(g.bumps).toHaveLength(0);
    const t = h.tees.Blue;
    // uphill points away from the tee: the back of the green is higher
    expect(g.gx * (g.cx - t.x) + g.gy * (g.cy - t.y)).toBeGreaterThan(0);
  });

});

// Astoria Golf & Country Club: course-specific checks of COURSE_BUILD.md 8.2, plus the
// calls of 2026-10-24: OSM has no hole lines, so the routing is the course chat's
// (data/astoria/make_holes.py); all water is red (Sunset Lake, Neacoxie Creek's ponds);
// the 9th tee across the creek and the creek in front of it are in bounds, and the 5th
// and 9th play from the lake-bank and creek-side boxes (developer); hole 17 is a flag
// (-6.4 %, the back of its box); trees must not block a drive down the fairway.
import { describe, expect, it } from 'vitest';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'astoria';
const TEE = 'Silver';
const CARD_PAR = [4, 4, 4, 3, 4, 4, 4, 4, 5, 3, 5, 5, 4, 4, 4, 4, 3, 4];
// holes accepted outside 3 % of the card, with their limit (validation_report.md)

describe('Astoria Country Club course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Silver tees, in Oregon, astoria theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('astoria');
    expect(json.name).toBe('Astoria Country Club'); // the developer's short name (2026-10-24)
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('holes carry the card\'s numbers and pars', () => {
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.map((h) => h.par)).toEqual(CARD_PAR);
  });

  it('all water is red: Sunset Lake and the Neacoxie Creek ponds', () => {
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    for (const id of ['r20068414', 'w426952616', 'w426952618']) {
      expect(course.water.some((w) => w.id === id || w.id.startsWith(id + ':')), id).toBe(true);
    }
  });

  it('the 5th and 9th play from the lake-bank and creek-side boxes (developer)', () => {
    const t5 = json.holes[4].tees[TEE], t9 = json.holes[8].tees[TEE];
    expect(Math.hypot(t5.x - 360, t5.y - 601), 'hole 5 tee in the lake-bank box').toBeLessThan(30);
    expect(Math.hypot(t9.x - 934, t9.y - 844), 'hole 9 tee in the creek-side box').toBeLessThan(15);
    expect(course.boundary.contains(t9.x, t9.y)).toBe(true);
  });

  it('the creek between the 9th tee and its fairway is in bounds (developer): water or ground, never OB', () => {
    const t = json.holes[8].tees[TEE];
    const cl = json.holes[8].tees[TEE].centerline;
    const [bx, by] = cl[1];
    let water = 0;
    for (let k = 1; k <= 40; k++) {
      const f = (k / 40) * 0.5; // the first half of the way to the bend: the creek crossing
      const x = t.x + (bx - t.x) * f, y = t.y + (by - t.y) * f;
      const s = course.terrain.surface(x, y);
      expect(isOB(s), `${x.toFixed(0)},${y.toFixed(0)}`).toBe(false);
      if (s === SURF.water) water++;
    }
    expect(water, 'the drive crosses the creek').toBeGreaterThan(0);
  });

});

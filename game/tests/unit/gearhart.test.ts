// Gearhart Golf Links: course-specific checks of COURSE_BUILD.md 8.2, plus the
// developer's calls (2026-10-20): all water is red, including Neacoxie Creek;
// the card's local rule makes Gearhart Lane and the parking lots out of bounds;
// OSM's holes 15/16/16 are 14/15/16; lidar trees gone since the 2013-15 renovation
// are removed; and trees must not block a drive down the centre of the fairway.
import { describe, expect, it } from 'vitest';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'gearhart';
const TEE = 'Black';
const CARD_PAR = [4, 4, 4, 3, 4, 4, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 5];

describe('Gearhart Golf Links course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Black tees, in Oregon, gearhart theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('gearhart');
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('holes 14, 15 and 16 carry the card\'s numbers and pars (OSM had 15, 16, 16)', () => {
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.map((h) => h.par)).toEqual(CARD_PAR);
  });

  it('all water is red; Neacoxie Creek is a penalty area by the 6th and 8th tees', () => {
    expect(course.water.length).toBeGreaterThanOrEqual(4);
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    expect(course.water.some((w) => w.id === 'w422896233' || w.id.startsWith('w422896233:'))).toBe(true);
  });

  it('Gearhart Lane and the parking lots are out of bounds (card local rule)', () => {
    // Gearhart Lane between the front-nine block and the 9th/13th tees
    let ob = 0, n = 0;
    for (let x = 330; x <= 500; x += 10) {
      for (let y = 1225; y <= 1238; y += 0.5) {
        if (course.terrain.surface(x, y) === SURF.obRoad) { ob++; break; }
      }
      n++;
    }
    expect(ob, 'lane crossings painted OB').toBe(n);
    // the lot between the 1st green and the 9th tee, and the two clubhouse lots
    for (const [x, y] of [[325, 1177], [245, 912], [245, 781]]) {
      expect(isOB(course.terrain.surface(x, y)), `lot at ${x},${y}`).toBe(true);
    }
  });

  it('most lidar trees on the course are gone (2013-15 renovation; OSIP 2024 photo)', () => {
    const inside = course.obstacles.trees.filter((t) => course.boundary.contains(t.x, t.y));
    expect(inside.length).toBeLessThan(400);
    // a stretch of fescue between holes 12 and 13 that the 2009 lidar filled with trees
    expect(course.obstacles.trees.filter((t) => t.x > 455 && t.x < 470 && t.y > 900 && t.y < 1150)).toEqual([]);
  });

});

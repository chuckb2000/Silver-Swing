// Stone Creek Golf Club (Oregon City, OR): course-specific checks of
// COURSE_BUILD.md 8.2 for the Blue tees, plus the developer's calls of
// 2026-10-19 (Blue tees, every water hazard red, out of bounds = the OSM course
// boundary, the driving range not out of bounds).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, registry } from './helpers';

const ID = 'stone_creek';
// holes outside 3% until the developer decides (data/stone_creek/validation_report.md)

const course = loadCourseFiles(ID);
const json = course.json;

describe('Stone Creek: course list and tees', () => {
  it('is in the course list under OR, Blue tees, par 72, a name that fits the card', () => {
    const e = registry().find((c) => c.id === ID)!;
    expect(e.state).toBe('OR');
    expect(e.defaultTee).toBe('Blue');
    expect(e.teeSets).toEqual(['Blue']);
    expect(e.name.length).toBeLessThanOrEqual(26);
    expect(json.par).toBe(72);
    expect(json.holes).toHaveLength(18);
  });

});

describe('Stone Creek: water and out of bounds', () => {
  it('the three ponds are red penalty areas inside the boundary', () => {
    expect(json.water.map((w) => w.id).sort()).toEqual(['r18457410', 'w1214418633', 'w1214421185']);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
    for (const [x, y] of [[432.6, 706.1], [281.2, 926.5], [567.7, 676.6]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
    }
  });

  it('the driving range south-east of hole 9 is in play (not out of bounds)', () => {
    // middle of the boundary's southern lobe (the range; not mapped in OSM)
    expect(course.boundary.contains(1000, 300)).toBe(true);
    expect([SURF.rough, SURF.fairway, SURF.woods]).toContain(course.terrain.surface(1000, 300));
  });
});

describe('Stone Creek: trees and putting views', () => {

  it('pnw theme, trees from the canopy model, no flowering trees', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(json.theme).toBe('pnw');
    expect(t.c.length).toBeGreaterThan(1000);
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
  });

});


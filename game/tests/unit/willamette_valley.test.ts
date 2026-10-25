// Willamette Valley Country Club (Canby, OR): course-specific checks of
// COURSE_BUILD.md 8.2 for the Blue tees, plus the developer's calls of
// 2026-10-19 (Blue tees; hole 13's green is the one left of the pond, traced
// from the OSIP orthophoto; hole 3's Blue tee is a box on the fairway from the
// 2nd green; practice greens are wrong greens; every pond red; out of bounds = the
// OSM course boundary).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, registry } from './helpers';

const ID = 'willamette_valley';
// holes outside 3% (none: every hole passes)

const course = loadCourseFiles(ID);
const json = course.json;

describe('Willamette Valley: course list and tees', () => {
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

describe('Willamette Valley: water and out of bounds', () => {
  it('the five ponds are red penalty areas inside the boundary', () => {
    expect(json.water.map((w) => w.id).sort()).toEqual(['r19774868', 'w1053606377', 'w1053634760', 'w469789086', 'w469789087']);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
    for (const [x, y] of [[449.9, 1431.4], [459.1, 239.3], [384.1, 1594.6], [563.7, 554.1], [637.9, 1384.6]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
    }
  });

  it("OSM's golf=path lines are cart paths (free relief)", () => {
    for (const [x, y] of [[675.3, 940.5], [408.1, 201.6], [522.9, 521.5]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.cartpath);
    }
  });

  it("hole 13's green is the traced one left of the pond; the practice greens belong to no hole", () => {
    const h13 = json.holes.find((h) => h.number === 13)!;
    expect(h13.greenId).toBe('tr_green13');
    const used = new Set(json.holes.map((h) => h.greenId));
    for (const id of ['w1053644812', 'w1053594241', 'w1053644816']) expect(used.has(id), id).toBe(false);
    for (const [x, y] of [[480.7, 272.3], [455.2, 736.5], [652.7, 964.9]]) expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.green);
  });
});

describe('Willamette Valley: trees and putting views', () => {

  it('pnw theme, trees from the canopy model, no flowering trees', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(json.theme).toBe('pnw');
    expect(t.c.length).toBeGreaterThan(1000);
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
  });

});


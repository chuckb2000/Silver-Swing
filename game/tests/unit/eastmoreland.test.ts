// Eastmoreland Golf Course (Portland, OR): course-specific checks of
// COURSE_BUILD.md 8.2, plus the developer's calls of 2026-10-19 (every hazard
// red; the Crystal Springs Rhododendron Garden beside the lake in flower).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, registry } from './helpers';

/** Every canopy the ball enters counts as a hit. */

const ID = 'eastmoreland';
// outside 3% until the developer decides (data/eastmoreland/validation_report.md)
// a point in the rhododendron garden's southern lobe (local metres)
const GARDEN = { x: 555, y: 1550 };

describe(ID, () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is in the course list as an Oregon course with Blue as the default tee', () => {
    const c = registry().find((x) => x.id === ID)!;
    expect(c).toBeDefined();
    expect(c.state).toBe('OR');
    expect(c.name.length).toBeLessThanOrEqual(26);
    expect(json.defaultTee).toBe('Blue');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
  });

  it('every hazard is red (developer, 2026-10-19): the lake, the pond and the creek', () => {
    expect(json.water.length).toBeGreaterThanOrEqual(3);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
    const lake = json.water.find((w) => w.id.startsWith('lake_'))!;
    expect(lake).toBeDefined();
    // the lake is a penalty area in play, not off-course water: its centre is surface water inside the course
    const cx = lake.poly.reduce((s, p) => s + p[0], 0) / lake.poly.length;
    const cy = lake.poly.reduce((s, p) => s + p[1], 0) / lake.poly.length;
    expect(course.boundary.contains(cx, cy)).toBe(true);
    expect(course.terrain.surface(cx, cy)).toBe(SURF.water);
    expect(json.water.filter((w) => w.id.startsWith('channel_')).length).toBeGreaterThanOrEqual(3);
  });

  it('both nines are in bounds and SE Bybee Blvd between them is out of bounds', () => {
    for (const h of json.holes) {
      const t = h.tees[json.defaultTee];
      expect(course.boundary.contains(t.x, t.y), `hole ${h.number} tee`).toBe(true);
      expect(course.boundary.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
    // the road strip the OB polygon joins across (local metres, between the two OSM parts)
    for (const x of [340, 380, 420]) expect(isOB(course.terrain.surface(x, 1187)), `x ${x}`).toBe(true);
  });

  it('the rhododendron garden is out of bounds and full of flowering shrubs (c: 3) in its chosen colours', () => {
    expect(course.boundary.contains(GARDEN.x, GARDEN.y)).toBe(false);
    expect(isOB(course.terrain.surface(GARDEN.x, GARDEN.y))).toBe(true);
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { x: number[]; y: number[]; c: number[] };
    const shrubs = t.c.map((c, i) => [c, i]).filter(([c]) => c === 3).map(([, i]) => i);
    expect(shrubs.length).toBeGreaterThan(1000);
    // all outside the course, around the garden's peninsula east of the lake
    for (const i of shrubs) {
      expect(course.boundary.contains(t.x[i], t.y[i]), `shrub ${i}`).toBe(false);
      expect(t.x[i]).toBeGreaterThan(470); expect(t.x[i]).toBeLessThan(680);
      expect(t.y[i]).toBeGreaterThan(1440); expect(t.y[i]).toBeLessThan(1900);
    }
    // colour = index % 8 (0 pink, 1 magenta, 2 purple, 3 white, 4 red, 5 coral, 6 pale pink, 7 leaves):
    // every colour shows, pinks and magentas lead, bushes in leaf only are a minority
    const n = Array(8).fill(0);
    for (const i of shrubs) n[i % 8]++;
    for (let v = 0; v < 8; v++) expect(n[v], `colour ${v}`).toBeGreaterThan(0);
    expect(n[0] + n[1]).toBeGreaterThan(n[3] + n[4] + n[5]);
    expect(n[7] / shrubs.length).toBeLessThan(0.15);
    // the putting views beside the garden draw the same bushes
    const views = json.greenViews!.find((g) => g.hole === 12)!;
    const atlas = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, views.far.trees), 'utf8'));
    expect(atlas.trees.some((x: { f: string }) => x.f.startsWith('s_'))).toBe(true);
  });

});

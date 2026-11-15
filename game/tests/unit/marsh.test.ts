// Marshes drawn as marsh (developer, 2026-11-14): course_config marsh_water_osm. Inside the boundary
// they stay red penalty areas (water in the surface map) marked "marsh" in course.json; the game
// plays them as water and only shows them differently (a rustle, not a splash; "in the marsh").
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { baseWaterId, COURSES_DIR, loadCourseFiles, registry } from './helpers';

const DATA = resolve(__dirname, '../../../data');

/** Courses whose own data folder lists marsh features, with those ids. */
function marshCourses(): { id: string; marsh: string[] }[] {
  return registry().flatMap((c) => {
    const p = resolve(DATA, c.id, 'course_config.json');
    if (!existsSync(p)) return [];
    const cfg = JSON.parse(readFileSync(p, 'utf8'));
    return cfg.marsh_water_osm?.length ? [{ id: c.id, marsh: cfg.marsh_water_osm as string[] }] : [];
  });
}

describe('marsh penalty areas', () => {
  const list = marshCourses();
  it('some courses have them', () => {
    expect(list.length).toBeGreaterThan(5);
  });
  for (const { id, marsh } of list) {
    it(`${id}: its marshes are red penalty areas marked marsh, and play as water`, () => {
      const json = JSON.parse(readFileSync(resolve(COURSES_DIR, id, 'course.json'), 'utf8'));
      const marked = json.water.filter((w: { marsh?: boolean }) => w.marsh);
      expect(marked.length).toBeGreaterThan(0);
      for (const w of marked) {
        expect(w.penalty).toBe('red');
        expect(marsh.map(baseWaterId)).toContain(baseWaterId(w.id));
      }
      const c = loadCourseFiles(id);
      for (const w of c.water.filter((x) => x.marsh)) {
        // a point well inside: the polygon's vertex average nudged to a cell that is water
        const xs = Array.from(w.poly.xs), ys = Array.from(w.poly.ys);
        let hit = false;
        for (let k = 0; k < xs.length && !hit; k++) {
          const x = (xs[k] * 3 + xs.reduce((a, b) => a + b, 0) / xs.length) / 4;
          const y = (ys[k] * 3 + ys.reduce((a, b) => a + b, 0) / ys.length) / 4;
          if (w.poly.contains(x, y) && c.terrain.surface(x, y) === SURF.water) hit = true;
        }
        expect(hit, `${w.id} has water cells`).toBe(true);
      }
    });
  }
});

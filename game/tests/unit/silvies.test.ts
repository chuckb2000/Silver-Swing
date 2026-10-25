// Silvies Valley Ranch: what only Silvies needs (built 2026-10-25). Three layouts in one world
// (COURSE_BUILD.md 3.5): Craddock and Hankins (the same fairways played both ways, 27 greens
// between them) and the Chief Egan short course, from the club maps' back tees (developer
// 2026-10-25). The every-course checks (heights, pins, yardage flags, red water, wind 1-7 mph,
// inside the boundary, default aim, robot round, putting views, determinism, the creek and the
// shrub band by Craddock 9) run in course_play.test.ts from data/silvies/checks.json.
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const LAYOUTS = [
  { id: 'silvies_craddock', name: 'Silvies Valley Craddock', holes: 18, par: 71, tee: 'Challenge', rating: 0, slope: 0 },
  { id: 'silvies_hankins', name: 'Silvies Valley Hankins', holes: 18, par: 72, tee: 'White', rating: 71.8, slope: 120 },
  { id: 'silvies_chief_egan', name: 'Silvies Valley Chief Egan', holes: 9, par: 29, tee: 'White', rating: 0, slope: 0 },
];

for (const L of LAYOUTS) {
  describe(`${L.name} course data`, () => {
    const course = loadCourseFiles(L.id);
    const json = course.json;

    it(`is a ${L.holes}-hole course from the ${L.tee} tees, in Oregon, in the Silvies group, its own theme`, () => {
      const reg = registry().find((c) => c.id === L.id)!;
      expect(reg.state).toBe('OR');
      expect(reg.group).toBe('silvies');
      expect(json.name).toBe(L.name);
      expect(json.name.length).toBeLessThanOrEqual(26);
      expect(json.holes).toHaveLength(L.holes);
      expect(json.par).toBe(L.par);
      expect(json.defaultTee).toBe(L.tee);
      expect(json.theme).toBe('silvies');
      const t = json.teeSets.find((s) => s.name === L.tee)!;
      expect(t.rating).toBe(L.rating);
      expect(t.slope).toBe(L.slope);
    });

    // developer 2026-10-25: "make sure every tee is always on a tee box". The tee stands on tee
    // surface with tee surface all round it (half a metre each way), so it is never at a box's edge
    // or out in the rough.
    it('every tee stands on a tee box, and every pin on its green', () => {
      for (const h of json.holes) {
        const t = h.tees[L.tee];
        for (const [dx, dy] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
          expect(course.terrain.surface(t.x + dx, t.y + dy), `hole ${h.number} tee (${dx}, ${dy})`).toBe(SURF.tee);
        }
        expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
      }
    });
  });
}

describe('Silvies Valley Ranch: three courses, one world', () => {
  const cr = loadCourseFiles('silvies_craddock');
  const hk = loadCourseFiles('silvies_hankins');
  const eg = loadCourseFiles('silvies_chief_egan');
  it('all three layouts share the world and its OB line', () => {
    expect(hk.json.world).toEqual(cr.json.world);
    expect(eg.json.world).toEqual(cr.json.world);
    expect(hk.json.boundary).toEqual(cr.json.boundary);
    expect(eg.json.boundary).toEqual(cr.json.boundary);
  });
  it('Craddock and Hankins share nine greens and have nine of their own each (27 in all)', () => {
    const a = new Set(cr.json.holes.map((h) => h.greenId));
    const b = new Set(hk.json.holes.map((h) => h.greenId));
    const shared = [...a].filter((x) => b.has(x));
    expect(shared).toHaveLength(9);
    expect(new Set([...a, ...b]).size).toBe(27);
  });
  it('Chief Egan plays none of the big courses\' greens', () => {
    const big = new Set([...cr.json.holes, ...hk.json.holes].map((h) => h.greenId));
    for (const h of eg.json.holes) expect(big.has(h.greenId), `chief egan ${h.number}`).toBe(false);
  });
});

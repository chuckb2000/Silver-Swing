// Bandon Preserve: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-22 with
// Shorty's, one set of downloads): the 13 par 3s of Bandon Preserve (Coore & Crenshaw, 2012), the Back tees the developer approved in the desk, the boundary grown to the dunes, all fairways run up to their greens
// with no rough between (developer, 2026-10-22), wind 8-16 mph as at Bandon Dunes, gorse and shore pines.
// Moved here from the course chat's data/bandon_preserve/tests/ by the design chat (2026-10-22).
import { describe, expect, it } from 'vitest';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'bandon_preserve';
const TEE = 'Back';
const NHOLES = 13;

describe('Bandon Preserve course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is a 13-hole par-39 course of par 3s from the Back tees, in Oregon, bandon_dunes theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(NHOLES);
    expect(json.par).toBe(39);
    for (const h of json.holes) expect(h.par, `hole ${h.number}`).toBe(3);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('bandon_dunes');
    expect(json.name.length).toBeLessThanOrEqual(26);
  });

  it('the fairway runs up to every green: walking back from the green, past the fringe comes fairway or sand, never rough (developer, 2026-10-22)', () => {
    const noFairway = new Set<number>([]);
    const bad: string[] = [];
    for (const h of json.holes) {
      if (noFairway.has(h.number)) continue;
      const line = h.tees[TEE].centerline;
      const [gx, gy] = h.greenCenter;
      const [tx, ty] = line.length > 1 ? line[line.length - 2] : [h.tees[TEE].x, h.tees[TEE].y];
      const d = Math.hypot(tx - gx, ty - gy), ux = (tx - gx) / d, uy = (ty - gy) / d;
      let left = false;
      for (let s = 0; s < Math.min(d, 60); s += 0.25) {
        const v = course.terrain.surface(gx + ux * s, gy + uy * s);
        if (v === SURF.green || v === SURF.fringe) { if (left) break; continue; }
        left = true;
        if (v === SURF.rough) bad.push(`hole ${h.number}: rough ${s.toFixed(1)} m from the green centre`);
        break;
      }
    }
    expect(bad).toEqual([]);
  });

  it('every hole lies inside the grown boundary: no tee, line or green out of bounds', () => {
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(isOB(course.terrain.surface(t.x, t.y)), `hole ${h.number} tee`).toBe(false);
      for (const [x, y] of h.tees[TEE].centerline) expect(isOB(course.terrain.surface(x, y)), `hole ${h.number} line`).toBe(false);
    }
  });

  it("the gorse thickets are there: low bushes (c: 3) drawn from the theme's own bush sheet, and shore pines", () => {
    expect(json.shrubs).toBe('shrubs_bandon_dunes');
    const t = course.obstacles.trees;
    expect(t.filter((x) => x.kind === 3 && x.h <= 3.6).length).toBeGreaterThan(1000);
    expect(t.filter((x) => x.conifer).length).toBeGreaterThan(500);
  });

});

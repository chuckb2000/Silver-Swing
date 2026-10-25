// Shorty's: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-22 with
// Bandon Preserve, one set of downloads): the 19 par 3s of Shorty's (Whitman, Axland & Cutten, 2024), the double greens of 6/18 and 9/13 split per hole, hole 2's traced green, all fairways run up to their greens
// with no rough between (developer, 2026-10-22), wind 8-16 mph as at Bandon Dunes, gorse and shore pines.
// Moved here from the course chat's data/shortys/tests/ by the design chat (2026-10-22).
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'shortys';
const TEE = 'Back';
const NHOLES = 19;

describe("Shorty's course data", () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is a 19-hole par-57 course of par 3s from the Back tees, in Oregon, bandon_dunes theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(NHOLES);
    expect(json.par).toBe(57);
    for (const h of json.holes) expect(h.par, `hole ${h.number}`).toBe(3);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('bandon_dunes');
    expect(json.name.length).toBeLessThanOrEqual(26);
  });

  it('the fairway runs up to every green: walking back from the green, past the fringe comes fairway or sand, never rough (developer, 2026-10-22)', () => {
    // 7: no mown turf between tee and green (the nearest fairway is 81 m from the green); 15: the
    // 51-yd shot carries a dune, with the fairway curling round it to the green (the photo shows both)
    const noFairway = new Set([7, 15]);
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

  it('the double greens are split: 6 and 18, 9 and 13 each have their own green and pin', () => {
    for (const [a, b] of [[6, 18], [9, 13]]) {
      const ha = json.holes.find((h) => h.number === a)!, hb = json.holes.find((h) => h.number === b)!;
      expect(ha.greenId).not.toBe(hb.greenId);
      expect(course.greenPolys.get(ha.greenId)!.contains(hb.pin[0], hb.pin[1])).toBe(false);
    }
  });

  it("the gorse thickets are there: low bushes (c: 3) drawn from the theme's own bush sheet, and shore pines", () => {
    expect(json.shrubs).toBe('shrubs_bandon_dunes');
    const t = course.obstacles.trees;
    expect(t.filter((x) => x.kind === 3 && x.h <= 3.6).length).toBeGreaterThan(1000);
    expect(t.filter((x) => x.conifer).length).toBeGreaterThan(500);
  });

});

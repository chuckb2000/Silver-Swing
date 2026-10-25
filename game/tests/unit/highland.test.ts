// Highland Links course data through the round engine (COURSE_BUILD.md 8.2), no Phaser.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CourseRuntime } from '../../src/data/course';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles } from './helpers';

const ID = 'highland_links';
const base = resolve(COURSES_DIR, ID);
let course: CourseRuntime;

beforeAll(() => {
  course = loadCourseFiles(ID);
});

describe('Highland Links course data', () => {
  it('is a 9-hole par-35 course from the Blue tees, in Massachusetts, coastal theme', () => {
    const j = course.json;
    expect(j.holes).toHaveLength(9);
    expect(j.par).toBe(35);
    expect(j.defaultTee).toBe('Blue');
    expect((j as unknown as { state: string }).state).toBe('MA');
    expect(j.theme).toBe('coastal');
    expect(j.holes.map((h) => h.par)).toEqual([4, 5, 3, 4, 4, 5, 3, 4, 3]);
  });

  it('every hole has far, near and close-up putting views covering its pin, with all tree frames', () => {
    const views = course.json.greenViews ?? [];
    expect(views).toHaveLength(9);
    for (const gv of views) {
      const h = course.json.holes[gv.hole - 1];
      for (const v of [gv.far, gv.near, gv.close!]) {
        const inside = (x: number, y: number, m: number) => x > v.x0 + m && x < v.x0 + v.w - m && y < v.y1 - m && y > v.y1 - v.h + m;
        expect(inside(h.pin[0], h.pin[1], 12), `hole ${gv.hole} pin (${v.ppm} px/m)`).toBe(true);
        const art = PNG.sync.read(readFileSync(resolve(base, v.file)));
        expect(art.width).toBe(v.w * v.ppm);
        const atlas = JSON.parse(readFileSync(resolve(base, v.trees), 'utf8'));
        for (const t of atlas.trees) expect(atlas.frames[t.f], `hole ${gv.hole} frame ${t.f}`).toBeDefined();
      }
    }
  });

  it('hole 9 has a two-tier green: the right (upper) tier ~3 ft above the left, the pin on a flat spot of the upper tier', () => {
    const h = course.json.holes[8];
    const g = course.json.greens.find((gm) => gm.id === h.greenId)!;
    expect(g.tiers).toHaveLength(1);
    const t = g.tiers![0];
    const z = (d: number) => course.terrain.z(t.x + d * t.nx, t.y + d * t.ny);
    const step = z(4) - z(-4);
    expect(step).toBeGreaterThan(0.8);
    expect(step).toBeLessThan(1.3);
    const side = (h.pin[0] - t.x) * t.nx + (h.pin[1] - t.y) * t.ny;
    expect(side).toBeGreaterThan(t.w / 2 + 3); // the pin's 3 m flat zone is clear of the step
    const e = 0.25;
    const [px, py] = h.pin;
    const slope = Math.hypot(course.terrain.z(px + e, py) - course.terrain.z(px - e, py), course.terrain.z(px, py + e) - course.terrain.z(px, py - e)) / (2 * e);
    expect(slope).toBeLessThan(0.02);
  });

  it('the beach east of the course is out-of-bounds sand', () => {
    expect(course.terrain.surface(990, 300)).toBe(SURF.obSand);
    expect(isOB(course.terrain.surface(990, 300))).toBe(true);
  });

});

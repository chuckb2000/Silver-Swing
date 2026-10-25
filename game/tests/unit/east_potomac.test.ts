// East Potomac Golf Links: three courses (Blue 18, White 9, Red 9) sharing one
// world. Course-specific checks of COURSE_BUILD.md 8.2 for every layout.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { CourseJson } from '../../src/data/course';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, registry } from './helpers';

/** Every canopy the ball enters counts as a hit. */

const LAYOUTS = ['east_potomac_blue', 'east_potomac_white', 'east_potomac_red'];
// holes accepted outside 3% until the developer decides (data/east_potomac/validation_report.md)

describe('East Potomac: one world, three courses', () => {
  const jsons = LAYOUTS.map((id) => JSON.parse(readFileSync(resolve(COURSES_DIR, id, 'course.json'), 'utf8')) as CourseJson);

  it('all three are in the course list, grouped as one place', () => {
    const reg = registry().filter((c) => c.id.startsWith('east_potomac_')) as (ReturnType<typeof registry>[number] & { group?: string; layout?: string })[];
    expect(reg.map((c) => c.id).sort()).toEqual([...LAYOUTS].sort());
    for (const c of reg) expect(c.group).toBe('east_potomac');
    expect(reg.map((c) => c.layout).sort()).toEqual(['Blue', 'Red', 'White']);
    expect(Object.fromEntries(reg.map((c) => [c.layout, c.holes]))).toEqual({ Blue: 18, White: 9, Red: 9 });
  });

  it('share terrain, surface, heights and trees, so the ground plays the same in every layout', () => {
    for (const j of jsons) {
      expect(j.terrain.pattern).toBe('../east_potomac/terrain/c_{i}_{j}.png');
      expect(j.surface.file).toBe('../east_potomac/surface.png');
      expect(j.height.file).toBe('../east_potomac/height.png');
      expect(j.greens).toEqual(jsons[0].greens.map((g) => ({ ...g, hole: j.greens.find((x) => x.id === g.id)!.hole })));
    }
    const t0 = readFileSync(resolve(COURSES_DIR, 'east_potomac', 'trees.json'), 'utf8');
    for (const id of LAYOUTS) expect(readFileSync(resolve(COURSES_DIR, id, 'trees.json'), 'utf8')).toBe(t0);
  });

  it('no two layouts use the same green', () => {
    const used = jsons.flatMap((j) => j.holes.map((h) => h.greenId));
    expect(new Set(used).size).toBe(used.length);
  });

  it('no pocket of rough is left inside a fairway (joins of touching fairway pieces; developer, 2026-10-20)', () => {
    const dir = resolve(COURSES_DIR, 'east_potomac');
    const png = PNG.sync.read(readFileSync(resolve(dir, 'surface.png')));
    const ids = (JSON.parse(readFileSync(resolve(dir, 'surface_legend.json'), 'utf8')) as { ids: Record<string, number> }).ids;
    const W = png.width, H = png.height;
    const at = (i: number) => png.data[i * 4];
    const seen = new Uint8Array(W * H);
    const pockets: string[] = [];
    const inside = new Set([ids.fairway, ids.green, ids.fringe]);
    for (let start = 0; start < W * H; start++) {
      if (seen[start] || at(start) !== ids.rough) continue;
      // flood one rough patch; keep it if it is small (<= 100 m2) and nearly all its rim is fairway/green
      const stack = [start];
      seen[start] = 1;
      let n = 0, rim = 0, rimIn = 0, sx = 0, sy = 0;
      while (stack.length) {
        const k = stack.pop()!;
        n++; sx += k % W; sy += Math.floor(k / W);
        const x = k % W, y = Math.floor(k / W);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (at(q) === ids.rough) { if (!seen[q]) { seen[q] = 1; stack.push(q); } } else { rim++; if (inside.has(at(q))) rimIn++; }
        }
      }
      if (n <= 400 && rim > 0 && rimIn / rim > 0.9) pockets.push(`${(sx / n / 2).toFixed(0)},${(2048 - sy / n / 2).toFixed(0)}`);
    }
    expect(pockets).toEqual([]);
  });

  it('has flowering cherries, on the variant-2 sprite slots, along the shore outside the course', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, 'east_potomac', 'trees.json'), 'utf8')) as { x: number[]; y: number[]; c: number[] };
    const cherries = t.c.map((c, i) => [c, i]).filter(([c]) => c === 2).map(([, i]) => i);
    expect(cherries.length).toBeGreaterThan(500);
    expect(cherries.length).toBeLessThan(t.c.length / 2);
    for (const i of cherries) expect(i % 3).toBe(2);
    const course = loadCourseFiles('east_potomac_blue');
    const inside = cherries.filter((i) => course.boundary.contains(t.x[i], t.y[i])).length;
    expect(inside / cherries.length).toBeLessThan(0.05);
  });
});

for (const id of LAYOUTS) {
  describe(id, () => {
    const course = loadCourseFiles(id);
    const json = course.json;
    const tees = json.teeSets.map((t) => t.name);

    if (id === 'east_potomac_blue') it('13 plays from its tee box against the seawall (developer, 2026-10-20)', () => {
      const h = json.holes.find((x) => x.number === 13)!;
      for (const ts of tees) {
        const t = h.tees[ts];
        expect(course.terrain.surface(t.x, t.y), `13 ${ts}`).toBe(SURF.tee);
        expect(Math.hypot(t.x - 681.9, t.y - 711.8), `13 ${ts}`).toBeLessThan(30);
      }
    });

    it('the object in the left side of the Blue 10 fairway is gone (developer, 2026-10-20)', () => {
      const near = course.obstacles.trees.filter((x) => Math.hypot(x.x - 585.5, x.y - 1269.5) < 2);
      expect(near).toEqual([]);
    });

  });
}

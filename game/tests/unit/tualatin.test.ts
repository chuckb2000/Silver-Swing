// Tualatin Country Club: course-specific checks of COURSE_BUILD.md 8.2, plus
// the developer's points: the Tualatin River is a red penalty area (in play on
// holes 7, 9 and 10), and trees must not block a drive down the centre of the
// fairway (the East Potomac problem).
import { describe, expect, it } from 'vitest';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'tualatin';

describe('Tualatin Country Club course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Blue tees, in Oregon, pnw theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(json.theme).toBe('pnw');
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('the Tualatin River beside holes 7, 9 and 10 is a red penalty area, not out of bounds', () => {
    const river = course.water.find((w) => w.id === 'r1079340')!;
    expect(river.penalty).toBe('red');
    for (const n of [7, 9, 10]) {
      const h = json.holes.find((x) => x.number === n)!;
      const cl = h.tees.Blue.centerline;
      // grid points within 90 m of the hole's tee, bend and green that lie in the river
      let inRiver = 0, water = 0;
      for (const [x, y] of cl) {
        for (let dx = -90; dx <= 90; dx += 3) for (let dy = -90; dy <= 90; dy += 3) {
          const px = x + dx, py = y + dy;
          if (!river.poly.contains(px, py)) continue;
          inRiver++;
          if (course.terrain.surface(px, py) === SURF.water) water++;
        }
      }
      expect(inRiver, `hole ${n}: river within 90 m`).toBeGreaterThan(20);
      expect(water / inRiver, `hole ${n}: river painted as penalty water`).toBeGreaterThan(0.97);
    }
  });

  it('hole 13: no tree crown stands over the green, and the trees the developer removed on 13, 8 and 17 are gone', () => {
    const h = json.holes.find((x) => x.number === 13)!;
    const green = course.greenPolys.get(h.greenId)!;
    const over = course.obstacles.trees.filter((t) => {
      for (let a = 0; a < 360; a += 15) {
        const px = t.x + Math.cos((a * Math.PI) / 180) * t.r * 0.95, py = t.y + Math.sin((a * Math.PI) / 180) * t.r * 0.95;
        if (green.contains(px, py)) return true;
      }
      return green.contains(t.x, t.y);
    });
    expect(over.map((t) => `${t.x.toFixed(0)},${t.y.toFixed(0)} (${t.h.toFixed(0)} m)`)).toEqual([]);
    // the removed trees (course_config.json drop_trees; hole 17's two, in front of the tee, 2026-10-22): hole 13's two firs, front right and
    // front left of the green, and hole 8's two broadleaves right of the cart path before the green
    for (const [x, y] of [[776.5, 588.5], [753.5, 584.5], [418.5, 908.5], [412.5, 905.5], [940.5, 710.5], [957.5, 705.5]]) {
      expect(course.obstacles.trees.filter((t) => Math.hypot(t.x - x, t.y - y) < 2), `${x},${y}`).toEqual([]);
    }
  });

});

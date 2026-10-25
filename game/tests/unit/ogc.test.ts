// Oregon Golf Club: course-specific checks of COURSE_BUILD.md 8.2, plus the
// developer's points: Blue and White tees (Blue default), every water hazard is
// red, the driving range (target greens P3-P9) is out of bounds, and the power
// lines in the canopy model are not trees.
import { describe, expect, it } from 'vitest';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry } from './helpers';

const ID = 'ogc';
// flags (3-8 %) accepted for play, listed in data/ogc/validation_report.md
// 10 Blue: -5.0 %, -5.4 % since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")

describe('Oregon Golf Club course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course with Blue (default) and White tees, in Oregon, pnw theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(json.teeSets.map((t) => t.name)).toEqual(['Blue', 'White']);
    expect(json.theme).toBe('pnw');
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('every water hazard is red (developer), including the pond OSM tags yellow', () => {
    expect(course.water.length).toBeGreaterThanOrEqual(8);
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    expect(course.water.find((w) => w.id === 'w865546390')?.penalty).toBe('red');
  });

  it('the creek on 13, 14 and 15 is three red penalty areas from the lidar channel (developer, 2026-10-20)', () => {
    for (const id of ['channel_w984705476', 'channel_w866033745', 'channel_w984705479']) {
      expect(course.water.find((w) => w.id === id)?.penalty, id).toBe('red');
    }
    // it crosses the 13th and 15th hole lines (in front of 13's green, between 15's fairway and green)
    const crosses = (n: number) => {
      const h = json.holes.find((x) => x.number === n)!;
      const pts = h.tees.Blue.centerline;
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
        const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
        for (let s = 0; s <= steps; s++) {
          if (course.terrain.surface(ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps) === SURF.water) return true;
        }
      }
      return false;
    };
    expect(crosses(13)).toBe(true);
    expect(crosses(15)).toBe(true);
  });

  it('the driving range (target greens P3-P9) is out of bounds and its targets are not greens', () => {
    // centroids of the seven OSM target greens, local metres
    const targets = [[1025, 1236], [819, 1246], [848, 1201], [898, 1253], [910, 1220], [957, 1265], [985, 1227]];
    for (const [x, y] of targets) {
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.range);
      expect(isOB(course.terrain.surface(x, y))).toBe(true);
    }
    for (const id of ['w866037971', 'w866037973', 'w866037974', 'w866037975', 'w866037976', 'w866037977', 'w866037978']) {
      expect(course.greenPolys.has(id), id).toBe(false);
    }
  });

  it('the power lines in the canopy model are not trees (no row of thin trees under the line, none over 60 m)', () => {
    const under = course.obstacles.trees.filter((t) => t.y > 1166 && t.y < 1186 && t.x > 200 && t.x < 900 && t.r < 2.5);
    expect(under.map((t) => `${t.x.toFixed(0)},${t.y.toFixed(0)} h ${t.h.toFixed(0)} r ${t.r.toFixed(1)}`)).toEqual([]);
    expect(Math.max(...course.obstacles.trees.map((t) => t.h))).toBeLessThan(60);
  });

  it('hole 7: the fir in front of the green is removed (developer: it hid the pin)', () => {
    expect(course.obstacles.trees.filter((t) => Math.hypot(t.x - 1074.5, t.y - 1422.5) < 2)).toEqual([]);
    const h = json.holes.find((x) => x.number === 7)!;
    const green = course.greenPolys.get(h.greenId)!;
    const over = course.obstacles.trees.filter((t) => {
      for (let a = 0; a < 360; a += 15) {
        if (green.contains(t.x + Math.cos((a * Math.PI) / 180) * t.r * 0.95, t.y + Math.sin((a * Math.PI) / 180) * t.r * 0.95)) return true;
      }
      return green.contains(t.x, t.y);
    });
    expect(over.map((t) => `${t.x.toFixed(0)},${t.y.toFixed(0)} (${t.h.toFixed(0)} m)`)).toEqual([]);
  });

});

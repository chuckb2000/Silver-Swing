// Langdon Farms Golf Club: course-specific checks of COURSE_BUILD.md 8.2, plus
// the developer's points: OR 551 between the two parts of the course is out of
// bounds, both ponds and the creek on hole 7 (from the lidar channel) are red
// penalty areas, 9 and 18 share one green around the
// clubhouse pond with 9's pin on the east side, and the two barns stand inside
// the boundary (free relief).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { coursePins } from '../../src/systems/game/pins';
import { COURSES_DIR, loadCourseFiles, registry } from './helpers';

const ID = 'langdon';
const TEE = 'Tee 7';

describe('Langdon Farms Golf Club course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-71 course from Tee 7, in Oregon, pnw theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(71);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('pnw');
    expect(json.name.length).toBeLessThanOrEqual(26); // fits on a course card
  });

  it('the OR 551 strip between the two parts is out of bounds, and the course on either side is not', () => {
    // the strip lies about x 516-573 (local m) between y 750 and 1300; probe its middle
    for (let y = 760; y <= 1290; y += 20) {
      expect(isOB(course.terrain.surface(545, y)), `strip at y ${y}`).toBe(true);
    }
    // the tees of 10 (west part) and 16 (east part) beside it are in play
    for (const n of [10, 16]) {
      const t = json.holes.find((x) => x.number === n)!.tees[TEE];
      expect(isOB(course.terrain.surface(t.x, t.y)), `hole ${n} tee`).toBe(false);
    }
  });

  it('both ponds and the creek on hole 7 are red penalty areas painted as water', () => {
    for (const id of ['w334609000', 'w334607763', 'channel_tr_creek_7']) {
      const w = course.water.find((x) => x.id === id)!;
      expect(w, id).toBeTruthy();
      expect(w.penalty, id).toBe('red');
      const b = w.poly;
      let n = 0, water = 0;
      // points at least 0.75 m inside the outline (the surface map is 0.5 m pixels, and the
      // creek is only about 6 m wide, so points on its edge fall either side of it)
      const inside = (x: number, y: number) => [[0, 0], [0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].every(([dx, dy]) => b.contains(x + dx, y + dy));
      for (let x = b.minX; x <= b.maxX; x += 1) for (let y = b.minY; y <= b.maxY; y += 1) {
        if (!inside(x, y)) continue;
        n++;
        if (course.terrain.surface(x, y) === SURF.water) water++;
      }
      expect(water / n, id).toBeGreaterThan(0.97);
    }
  });

  it('9 and 18 share one green around the clubhouse pond: every 18 pin left (west) of it, every 9 pin right (east)', () => {
    // developer, 2026-10-20: "the pin for the 18th hole should always be on the left side of the
    // lake and the pin for the 9th hole should always be on the right side"; the green is cut by a
    // north-south line through the pond's north tip (x 714)
    const SPLIT_X = 714;
    const h9 = json.holes.find((x) => x.number === 9)!;
    const h18 = json.holes.find((x) => x.number === 18)!;
    expect(h9.greenId).not.toBe(h18.greenId); // one part each, so each hole has its own centre and pins
    const sheets = coursePins(course, json.defaultTee);
    const views = json.greenViews ?? [];
    for (const [h, west] of [[h18, true], [h9, false]] as const) {
      const spots = sheets[json.holes.indexOf(h)];
      expect(spots.length, `hole ${h.number} pins`).toBeGreaterThan(1);
      const gv = views.find((v) => v.hole === h.number)!;
      for (const p of spots) {
        expect(west ? p.x < SPLIT_X : p.x > SPLIT_X, `hole ${h.number} pin ${p.x.toFixed(0)},${p.y.toFixed(0)}`).toBe(true);
        // the putting view the game falls back to (120 m) shows every pin, well inside its edge
        const f = gv.far;
        expect(p.x > f.x0 + 12 && p.x < f.x0 + f.w - 12 && p.y < f.y1 - 12 && p.y > f.y1 - f.h + 12, `hole ${h.number} far view`).toBe(true);
      }
    }
    // the two parts touch along the split line: the green runs on from one to the other
    const g9 = course.greenPolys.get(h9.greenId)!;
    const g18 = course.greenPolys.get(h18.greenId)!;
    let touching = 0;
    for (let y = 630; y <= 670; y += 0.5) if (g9.contains(SPLIT_X + 0.5, y) && g18.contains(SPLIT_X - 0.5, y)) touching++;
    expect(touching).toBeGreaterThan(10);
  });

  it('no tree stands in either pond (developer, 2026-10-21: the lidar trees in the pond on 18 are removed)', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { x: number[]; y: number[] };
    for (const id of ['w334609000', 'w334607763']) {
      const w = course.water.find((x) => x.id === id)!;
      const wet = t.x.map((x, i) => [x, t.y[i]]).filter(([x, y]) => w.poly.contains(x, y));
      expect(wet, id).toEqual([]);
    }
  });

  it('the two red barns (8 and 18) stand inside the boundary, so they give free relief', () => {
    for (const id of ['w324295601', 'w324295657']) {
      const b = json.buildings.find((x) => x.id === id)!;
      expect(b, id).toBeTruthy();
      expect(b.inside, id).toBe(true);
    }
  });

});

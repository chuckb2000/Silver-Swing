// Indian Island Golf Course (Riverhead, NY): course-specific checks of
// COURSE_BUILD.md 8.2, plus the developer's rules for this course: Route 105
// (Cross River Drive) is out of bounds, every penalty area is red, and the
// park buildings inside the boundary are obstructions, not out of bounds.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { CourseJson, HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const ID = 'indian_island';
// holes outside 3% of the Blue card after the tee position (data/indian_island/validation_report.md)
// 1 and 5: flags since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")
const YARDAGE_FLAGS = ['1', '5', '7', '13', '15'];

describe(ID, () => {
  const course = loadCourseFiles(ID);
  const json: CourseJson = course.json;

  it('is an 18-hole par-72 course in New York, played from the Blue tees', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('NY');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(json.theme).toBe('bayside');
  });

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every Blue tee is on a tee box and every pin on its green', () => {
    for (const h of json.holes) {
      const t = h.tees.Blue;
      expect(course.terrain.surface(t.x, t.y), `hole ${h.number} tee`).toBe(SURF.tee);
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the Blue card, the flagged holes within 8%', () => {
    for (const h of json.holes) {
      const t = h.tees.Blue;
      const off = Math.abs(t.adjYd - t.cardYd) / t.cardYd;
      if (YARDAGE_FLAGS.includes(String(h.number))) {
        expect(off, `hole ${h.number}`).toBeGreaterThan(0.03);
        expect(off, `hole ${h.number}`).toBeLessThanOrEqual(0.08);
      } else expect(off, `hole ${h.number}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('Route 105 (Cross River Drive) is out of bounds where it crosses the course', () => {
    // points on the OSM trunk ways inside the boundary, north of the bridge (local metres)
    const pts = [[853.7, 697.2], [833.8, 660.2], [813.9, 623.2], [627.1, 252.4], [653.3, 299.9], [679.4, 347.3],
      [716.0, 443.4], [675.2, 360.6], [631.3, 279.4], [786.7, 535.6], [826.2, 608.4], [865.4, 681.2],
      [788.8, 578.8], [771.8, 548.7], [754.8, 518.6], [710.5, 400.0], [729.5, 432.5], [748.1, 465.2]];
    for (const [x, y] of pts) {
      expect(course.boundary.contains(x, y), `${x},${y} inside the boundary`).toBe(true);
      expect(isOB(course.terrain.surface(x, y)), `${x},${y}`).toBe(true);
    }
  });

  it('every penalty area is red (developer: no yellow on this course)', () => {
    expect(json.water.length).toBeGreaterThan(0);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the ranger station and park buildings inside the boundary are obstructions, not out of bounds', () => {
    const inside = json.buildings.filter((b) => b.inside);
    expect(inside.length).toBeGreaterThan(5);
    for (const b of inside) {
      const [cx, cy] = b.poly.reduce(([a, c], [x, y]) => [a + x / b.poly.length, c + y / b.poly.length], [0, 0]);
      expect(isOB(course.terrain.surface(cx, cy)), b.id).toBe(false);
    }
  });

  it('a robot golfer completes every hole with legal, finite scores', () => {
    for (const seed of [7, 21]) {
      const holes = json.holes.map((h) => h.number);
      const r = robotRound(course, holes, seed);
      expect(r.scores).toHaveLength(holes.length);
      for (const s of r.scores) {
        expect(s.strokes).toBeGreaterThanOrEqual(1);
        expect(s.strokes).toBeLessThan(16);
      }
    }
  });

  it('the default aim keeps a perfect tee shot out of the trees, the water and out of bounds on every hole', () => {
    for (const h of json.holes) {
      const r = new Round(course, roundCfg(course, [h.number]));
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const plan = r.plan(club.id, r.defaultAim(club, scale), meterFor(1, 0, false), 0, scale);
      const sim = r.simulate(plan);
      expect(sim.restSurface, `hole ${h.number}`).not.toBe(SURF.woods);
      expect(sim.inWater, `hole ${h.number}`).toBe(false);
      expect(isOB(sim.restSurface), `hole ${h.number}`).toBe(false);
    }
  });

  it('wind stays inside the course range', () => {
    const w = json.wind!;
    for (const seed of [1, 2, 3, 99]) {
      const r = new Round(course, roundCfg(course, json.holes.map((h) => h.number), seed));
      for (const x of r.winds) {
        expect(x.mph).toBeGreaterThanOrEqual(w.minMph);
        expect(x.mph).toBeLessThanOrEqual(w.maxMph);
      }
    }
  });

  it('far, near and close-up putting views cover every pin', () => {
    const views = json.greenViews ?? [];
    expect(views).toHaveLength(json.holes.length);
    for (const gv of views) {
      const h = json.holes.find((x) => x.number === gv.hole)!;
      for (const v of [gv.far, gv.near, gv.close!]) {
        const inside = (x: number, y: number, m: number) => x > v.x0 + m && x < v.x0 + v.w - m && y < v.y1 - m && y > v.y1 - v.h + m;
        expect(inside(h.pin[0], h.pin[1], 12), `hole ${gv.hole} pin (${v.ppm} px/m)`).toBe(true);
        const art = PNG.sync.read(readFileSync(resolve(COURSES_DIR, ID, v.file)));
        expect(art.width).toBe(v.w * v.ppm);
      }
    }
  });

  it('same seed, same inputs -> identical round', () => {
    const play = () => {
      const r = new Round(course, roundCfg(course, [json.holes[1].number], 99));
      r.startHole(0);
      const out: number[] = [];
      for (let k = 0; k < 3; k++) {
        const club = r.autoClub();
        const scale = r.autoSwingScale(club);
        const plan = r.plan(club.id, r.defaultAim(club, scale), meterFor(0.9, 2, club.kind === 'putter'), 0, scale);
        const sim = r.simulate(plan);
        r.resolve(plan, sim);
        out.push(sim.end.x, sim.end.y);
      }
      return out;
    };
    expect(play()).toEqual(play());
  });
});

// Waverley Country Club (Milwaukie, OR): course-specific checks of
// COURSE_BUILD.md 8.2, plus the developer's rules for this course: every
// penalty area is red, the Willamette next to the course is a red penalty area
// (out of bounds beyond the strip), and the 11th green keeps its strong
// back-to-front slope (green_tilt in data/waverley/course_config.json).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { CourseJson, HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const ID = 'waverley';
// holes outside 3% of the Blue card after the tee position (data/waverley/validation_report.md)
const YARDAGE_FLAGS = ['2', '4', '18'];
// over 8%: waiting on the developer's decision (hole 17, Blue tee 409 yd vs 490)
const YARDAGE_OPEN = ['17'];

describe(ID, () => {
  const course = loadCourseFiles(ID);
  const json: CourseJson = course.json;

  it('is an 18-hole par-72 course in Oregon, played from the Blue tees', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('OR');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(json.theme).toBe('pnw_club');
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
      if (YARDAGE_OPEN.includes(String(h.number))) expect(off, `hole ${h.number}`).toBeGreaterThan(0.08);
      else if (YARDAGE_FLAGS.includes(String(h.number))) {
        expect(off, `hole ${h.number}`).toBeGreaterThan(0.03);
        expect(off, `hole ${h.number}`).toBeLessThanOrEqual(0.08);
      } else expect(off, `hole ${h.number}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('the Willamette beside the course is a red penalty area, out of bounds beyond the strip', () => {
    for (const [x, y] of [[320, 1000], [440, 700]]) {
      expect(course.boundary.contains(x, y), `${x},${y} inside the boundary`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
    }
    for (const [x, y] of [[200, 1000], [300, 700]]) expect(isOB(course.terrain.surface(x, y)), `${x},${y}`).toBe(true);
  });

  it('every penalty area is red (developer)', () => {
    expect(json.water.length).toBeGreaterThan(0);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the 11th green tilts 3.5% (back to front) with no random undulations', () => {
    const h = json.holes.find((x) => x.number === 11)!;
    const g = json.greens.find((x) => x.id === h.greenId)!;
    expect(Math.hypot(g.gx, g.gy)).toBeCloseTo(0.035, 3);
    expect(g.bumps).toHaveLength(0);
    const t = h.tees.Blue;
    // uphill points away from the tee: the back of the green is higher
    expect(g.gx * (g.cx - t.x) + g.gy * (g.cy - t.y)).toBeGreaterThan(0);
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

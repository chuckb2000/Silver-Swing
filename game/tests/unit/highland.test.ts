// Highland Links course data through the round engine (COURSE_BUILD.md 8.2), no Phaser.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CourseRuntime, HeightMeta } from '../../src/data/course';
import { holesFor } from '../../src/systems/game/lengths';
import { Round } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, robotRound, roundCfg } from './helpers';

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

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(base, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee is on a tee box and every pin on its green', () => {
    for (const h of course.json.holes) {
      const t = h.tees.Blue;
      expect(course.terrain.surface(t.x, t.y), `hole ${h.number} tee`).toBe(SURF.tee);
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card (hole 1: the developer\'s tee, accepted at +3.8%, now +4.0%)', () => {
    for (const h of course.json.holes) {
      const t = h.tees.Blue;
      const lim = h.number === 1 ? 0.045 : 0.03; // hole 1: +3.8 %, +4.0 % since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")
      expect(Math.abs(t.adjYd - t.cardYd) / t.cardYd, `hole ${h.number}`).toBeLessThanOrEqual(lim);
    }
  });

  it('a robot golfer completes 9 holes and 18 twice around with legal, finite scores', () => {
    for (const len of ['9', '9x2'] as const) {
      const r = robotRound(course, holesFor(len));
      expect(r.scores).toHaveLength(len === '9' ? 9 : 18);
      for (const s of r.scores) {
        expect(s.strokes).toBeGreaterThanOrEqual(1);
        expect(s.strokes).toBeLessThan(16);
      }
    }
  });

  it('the default aim keeps a perfect tee shot out of the trees and in bounds on every hole', () => {
    for (const h of course.json.holes) {
      const r = new Round(course, roundCfg(course, [h.number]));
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const plan = r.plan(club.id, r.defaultAim(club, scale), meterFor(1, 0, false), 0, scale);
      const sim = r.simulate(plan);
      expect(sim.restSurface, `hole ${h.number}`).not.toBe(SURF.woods);
      expect(isOB(sim.restSurface), `hole ${h.number} out of bounds`).toBe(false);
      expect(sim.inWater, `hole ${h.number}`).toBe(false);
    }
  });

  it('wind stays inside the course range (3-14 mph)', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const r = new Round(course, roundCfg(course, holesFor('9x2'), seed));
      for (const w of r.winds) {
        expect(w.mph).toBeGreaterThanOrEqual(3);
        expect(w.mph).toBeLessThanOrEqual(14);
      }
    }
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

  it('same seed, same inputs -> identical round', () => {
    const play = () => {
      const r = new Round(course, roundCfg(course, [5], 99));
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

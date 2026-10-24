// Wildwood Golf Course (Portland OR): course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-24):
// Black tees (the card has no Blue; Black is closest to 6,300 yd), all water red, wind 1-7 mph,
// pnw theme, out of bounds = the OSM boundary as mapped (developer), creeks from the lidar as red
// penalty areas, and lidar trees the 2024 photo no longer shows removed (trees_need_ortho).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const ID = 'wildwood';
const TEE = 'Black';
// accepted by the developer (2026-10-24: "don't worry about the discrepancies on those holes"):
// the Black tees the developer marked in the tracing desk on 6, 9, 14 and 18 measure short of the card
const FLAGGED: Record<number, number> = { 6: 0.06, 9: 0.06, 14: 0.16, 18: 0.09 };

describe('Wildwood Golf Course course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Black tees, in Oregon, pnw theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('pnw');
    expect(json.name.length).toBeLessThanOrEqual(26);
    const black = json.teeSets.find((t) => t.name === TEE)!;
    expect(black.rating).toBe(69.1);
    expect(black.slope).toBe(127);
  });

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee is on a tee box and every pin on its green', () => {
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(course.terrain.surface(t.x, t.y), `hole ${h.number} tee`).toBe(SURF.tee);
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card (6, 9, 14 and 18 accepted by the developer)', () => {
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(Math.abs((t.adjYd - t.cardYd) / t.cardYd), `hole ${h.number}`).toBeLessThanOrEqual(FLAGGED[h.number] ?? 0.03);
    }
  });

  it('all water is red, ponds and creeks', () => {
    expect(course.water.length).toBeGreaterThanOrEqual(4);
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the creek strip between the 2nd green and the 5th tee is a penalty area, not rough', () => {
    // a point in the middle of OSM w825464987 (local metres)
    expect(course.terrain.surface(520, 527)).toBe(SURF.water);
  });

  it('a perfect tee shot at the middle of the fairway clears the trees around the tee (the every-course rule)', () => {
    class AlwaysHit extends Rng { next(): number { return 0; } }
    const blocked: string[] = [];
    for (const h of json.holes) {
      const r = new Round(course, roundCfg(course, [h.number]));
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const base = r.lineAim(club, scale);
      const b = r.ball;
      let target = { x: r.pin.x, y: r.pin.y };
      if (r.fullCarry(club) * scale < 0.92 * r.distToPin()) {
        const carry = r.fullCarry(club) * scale;
        const lx = b.x + Math.cos(base) * carry, ly = b.y + Math.sin(base) * carry;
        const px = -Math.sin(base), py = Math.cos(base);
        const fw: number[] = [];
        for (let s = -45; s <= 45; s += 0.5) if (course.terrain.surface(lx + px * s, ly + py * s) === SURF.fairway) fw.push(s);
        const runs: number[][] = [];
        for (const s of fw) { const R = runs[runs.length - 1]; if (R && s - R[R.length - 1] <= 1) R.push(s); else runs.push([s]); }
        runs.sort((a, c) => Math.min(...a.map(Math.abs)) - Math.min(...c.map(Math.abs)));
        const mid = runs.length ? (runs[0][0] + runs[0][runs[0].length - 1]) / 2 : 0;
        target = { x: lx + px * mid, y: ly + py * mid };
      }
      const plan = r.plan(club.id, Math.atan2(target.y - b.y, target.x - b.x), meterFor(1, 0, false), 0, scale);
      const sim = simulateShot(course.terrain, course.obstacles, plan.spec, new AlwaysHit(1));
      const ev = sim.events.find((e) => (e.type === 'trunk' || e.type === 'canopy') && Math.hypot(e.x - b.x, e.y - b.y) < 60);
      if (ev) blocked.push(`${h.number} (${ev.type} ${Math.hypot(ev.x - b.x, ev.y - b.y).toFixed(0)} m out)`);
    }
    expect(blocked).toEqual([]);
  });

  // Hole 3 is a par 3 that drops 17.5 m from tee to green: the auto club (6-iron for 155 m, by
  // horizontal distance) flies a perfect shot 25 m past the pin into the trees behind the green.
  // That is the game's club choice, not the data (request to the design chat: let autoClub allow
  // for the height difference).
  it('the default aim keeps a perfect tee shot out of the trees, the water and OB (hole 3: the auto club is one too long)', () => {
    const bad: string[] = [];
    for (const h of json.holes) {
      const r = new Round(course, roundCfg(course, [h.number]));
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const sim = r.simulate(r.plan(club.id, r.defaultAim(club, scale), meterFor(1, 0, false), 0, scale));
      if (sim.restSurface === SURF.woods) bad.push(`${h.number} woods`);
      if (isOB(sim.restSurface)) bad.push(`${h.number} OB`);
      if (sim.inWater) bad.push(`${h.number} water`);
    }
    expect(bad).toEqual(['3 woods']);
  });

  it('a robot golfer completes 18 holes with legal, finite scores', () => {
    for (const seed of [1, 7]) {
      const r = robotRound(course, json.holes.map((h) => h.number), seed);
      expect(r.scores).toHaveLength(18);
      for (const s of r.scores) {
        expect(s.strokes).toBeGreaterThanOrEqual(1);
        expect(s.strokes).toBeLessThan(16);
      }
    }
  });

  it('wind stays inside the course range (1-7 mph)', () => {
    expect(json.wind!.minMph).toBe(1);
    expect(json.wind!.maxMph).toBe(7);
    for (const seed of [1, 2, 3, 99]) {
      const r = new Round(course, roundCfg(course, json.holes.map((h) => h.number), seed));
      for (const x of r.winds) {
        expect(x.mph).toBeGreaterThanOrEqual(1);
        expect(x.mph).toBeLessThanOrEqual(7);
      }
    }
  });

  it('far, near and close-up putting views cover every pin', () => {
    const views = json.greenViews ?? [];
    expect(views).toHaveLength(18);
    for (const gv of views) {
      const h = json.holes.find((x) => x.number === gv.hole)!;
      for (const v of [gv.far, gv.near, gv.close!]) {
        const inside = h.pin[0] > v.x0 + 12 && h.pin[0] < v.x0 + v.w - 12 && h.pin[1] < v.y1 - 12 && h.pin[1] > v.y1 - v.h + 12;
        expect(inside, `hole ${gv.hole} (${v.ppm} px/m)`).toBe(true);
      }
    }
  });

  it('same seed, same inputs -> identical round', () => {
    const play = () => {
      const r = new Round(course, roundCfg(course, [9], 99));
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

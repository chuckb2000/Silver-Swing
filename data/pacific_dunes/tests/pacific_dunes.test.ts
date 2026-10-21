// Pacific Dunes: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-21 with Old Macdonald and
// Sheep Ranch): Green tees, all water red, wind 8-16 mph as at Bandon Dunes, gorse thickets
// (trees.json c: 3 bushes, sprites/shrubs_bandon_dunes) and shore pines.
// Kept in data/pacific_dunes/tests/ (the course chat writes only in its own
// folders); the design chat may move it to game/tests/unit/.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { CANOPY_START, TRUNK_R } from '../../src/systems/physics/obstacles';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const ID = 'pacific_dunes';
const TEE = 'Green';

describe('Pacific Dunes course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-71 course from the Green tees, in Oregon, bandon_dunes theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(71);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('bandon_dunes');
    expect(json.name.length).toBeLessThanOrEqual(26);
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

  it('measured yardages are within 3% of the card (after the tee moves of adjustments.json)', () => {
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(Math.abs((t.adjYd - t.cardYd) / t.cardYd), `hole ${h.number}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('all water is red (standing default)', () => {
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the gorse thickets are there: many low bushes (c: 3) drawn from the theme\'s own bush sheet', () => {
    expect(json.shrubs).toBe('shrubs_bandon_dunes');
    const t = course.obstacles.trees;
    const bushes = t.filter((x) => x.kind === 3 && x.h <= 3.6);
    expect(bushes.length).toBeGreaterThan(1000);
    expect(t.filter((x) => x.conifer).length).toBeGreaterThan(500);
  });

  it('a perfect drive down the centre of the hole touches no tree (developer: trees must not block the fairway line)', () => {
    const blocked: string[] = [];
    for (const h of json.holes) {
      if (h.par === 3) continue;
      const r = new Round(course, roundCfg(course, [h.number]));
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const R = r as unknown as { flightSpec: Function; perfectStrike: Function };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const spec = R.flightSpec(club, r.lineAim(club, scale), R.perfectStrike(club, scale), 0, { vx: 0, vy: 0 });
      const sim = simulateShot(course.terrain, null, spec, new Rng(1));
      for (let k = 0; k < sim.n; k++) {
        const x = sim.samples[3 * k], y = sim.samples[3 * k + 1], z = sim.samples[3 * k + 2];
        for (const ti of course.obstacles.treesNear(x, y)) {
          const t = course.obstacles.trees[ti];
          const d = Math.hypot(x - t.x, y - t.y), hz = z - t.base;
          if ((d < TRUNK_R + 0.03 && hz < t.h && hz > -0.1) || (d < t.r && hz > t.h * CANOPY_START && hz < t.h)) {
            blocked.push(`hole ${h.number}: tree at ${t.x.toFixed(0)},${t.y.toFixed(0)}`);
          }
        }
      }
    }
    expect([...new Set(blocked)]).toEqual([]);
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

  it('the default aim keeps a perfect tee shot out of the trees, the water and OB on every hole', () => {
    for (const h of json.holes) {
      const r = new Round(course, roundCfg(course, [h.number]));
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const sim = r.simulate(r.plan(club.id, r.defaultAim(club, scale), meterFor(1, 0, false), 0, scale));
      expect(sim.restSurface, `hole ${h.number}`).not.toBe(SURF.woods);
      expect(isOB(sim.restSurface), `hole ${h.number}`).toBe(false);
      expect(sim.inWater, `hole ${h.number}`).toBe(false);
    }
  });

  it('a robot golfer completes 18 holes with legal, finite scores', () => {
    const r = robotRound(course, json.holes.map((h) => h.number));
    expect(r.scores).toHaveLength(18);
    for (const s of r.scores) {
      expect(s.strokes).toBeGreaterThanOrEqual(1);
      expect(s.strokes).toBeLessThan(16);
    }
  });

  it('wind stays inside the course range (8-16 mph, as the developer set for Bandon Dunes)', () => {
    expect(json.wind!.minMph).toBe(8);
    expect(json.wind!.maxMph).toBe(16);
    for (const seed of [1, 2, 3, 99]) {
      const r = new Round(course, roundCfg(course, json.holes.map((h) => h.number), seed));
      for (const x of r.winds) {
        expect(x.mph).toBeGreaterThanOrEqual(8);
        expect(x.mph).toBeLessThanOrEqual(16);
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

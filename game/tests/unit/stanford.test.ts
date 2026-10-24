// Stanford Golf Course: course-specific checks of COURSE_BUILD.md 8.2 (course chat, 2026-10-24):
// Black tees (the card's Blue is the forward set), all water red, wind 2-10 mph, `peninsula` theme,
// the boundary's two parts joined across Fremont Road (hole 1's green and hole 2's tee in play),
// Junipero Serra Boulevard out of bounds (developer, 2026-10-24) and the practice area north of
// holes 2-3 in play with wrong greens (developer, 2026-10-24).
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

const ID = 'stanford';
const TEE = 'Black';

describe('Stanford Golf Course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-70 course from the Black tees, in California, peninsula theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('CA');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(70);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('peninsula');
    expect(json.name.length).toBeLessThanOrEqual(26);
    const black = json.teeSets.find((t) => t.name === TEE)!;
    expect(black.rating).toBe(71.0);
    expect(black.slope).toBe(131);
    expect(black.totalYd).toBe(6213);
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

  it('measured yardages are within 3% of the card', () => {
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(Math.abs((t.adjYd - t.cardYd) / t.cardYd), `hole ${h.number}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('all water is red (standing default)', () => {
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
  });

  it('San Francisquito Creek and two ditches are red penalty areas (developer, 2026-10-24: A, B, C)', () => {
    const ids = course.water.map((w) => w.id).sort();
    expect(ids).toEqual(['creek_w49231216', 'ditch_w1216390234', 'ditch_w1216390238']);
    // where each hole line crosses the creek's OSM line: water, not rough
    const crossings: Record<number, [number, number]> = {
      3: [387.6, 1468.2], 4: [265.4, 1256.7], 8: [324.0, 1019.2], 12: [526.3, 743.6], 14: [542.5, 652.1],
    };
    for (const [n, [x, y]] of Object.entries(crossings)) {
      expect(course.terrain.surface(x, y), `hole ${n}`).toBe(SURF.water);
    }
  });

  it('hole 1 green and hole 2 tee, across Fremont Road, are in bounds (boundary parts joined)', () => {
    const h1 = json.holes.find((h) => h.number === 1)!;
    const h2 = json.holes.find((h) => h.number === 2)!;
    expect(isOB(course.terrain.surface(h1.pin[0], h1.pin[1]))).toBe(false);
    expect(isOB(course.terrain.surface(h2.tees[TEE].x, h2.tees[TEE].y))).toBe(false);
  });

  it('Junipero Serra Boulevard inside the boundary is out of bounds (developer, 2026-10-24)', () => {
    // (where the road bridges the creek, the creek below wins: a penalty area)
    for (const [x, y] of [[370.5, 1059.4], [429.6, 1025.2], [505.5, 974.9], [582.0, 925.4], [644.4, 897.9]]) {
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.obRoad);
    }
  });

  it('the practice area north of holes 2-3 is in play; its greens are wrong greens, not OB', () => {
    for (const [x, y] of [[765.3, 1721.0], [663.8, 1623.6]]) {
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.green);
    }
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

  it('a perfect drive down the hole line: trees it touches are listed (report, not a rule)', () => {
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
    console.log('[stanford] drive down the line touches:', [...new Set(blocked)]);
    expect(Array.isArray(blocked)).toBe(true);
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
    for (const seed of [1, 7, 23]) {
      const r = robotRound(course, json.holes.map((h) => h.number), seed);
      expect(r.scores).toHaveLength(18);
      console.log(`[stanford] robot seed ${seed}:`, r.scores.map((s) => s.strokes).join(' '));
      for (const s of r.scores) {
        expect(s.strokes).toBeGreaterThanOrEqual(1);
        expect(s.strokes).toBeLessThan(16);
      }
    }
  });

  it('wind stays inside the course range (2-10 mph)', () => {
    expect(json.wind!.minMph).toBe(2);
    expect(json.wind!.maxMph).toBe(10);
    for (const seed of [1, 2, 3, 99]) {
      const r = new Round(course, roundCfg(course, json.holes.map((h) => h.number), seed));
      for (const x of r.winds) {
        expect(x.mph).toBeGreaterThanOrEqual(2);
        expect(x.mph).toBeLessThanOrEqual(10);
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
      const r = new Round(course, roundCfg(course, [12], 99));
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

// Tualatin Country Club: course-specific checks of COURSE_BUILD.md 8.2, plus
// the developer's points: the Tualatin River is a red penalty area (in play on
// holes 7, 9 and 10), and trees must not block a drive down the centre of the
// fairway (the East Potomac problem).
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

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee is on a tee box and every pin on its green', () => {
    for (const h of json.holes) {
      const t = h.tees.Blue;
      expect(course.terrain.surface(t.x, t.y), `hole ${h.number} tee`).toBe(SURF.tee);
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card, apart from 8 and 10 (the developer\'s back tees)', () => {
    for (const h of json.holes) {
      const t = h.tees.Blue;
      const off = (t.adjYd - t.cardYd) / t.cardYd;
      if (h.number === 8 || h.number === 10) {
        expect(off, `hole ${h.number}`).toBeGreaterThan(0.03);
        expect(off, `hole ${h.number}`).toBeLessThan(0.1);
      } else expect(Math.abs(off), `hole ${h.number}`).toBeLessThanOrEqual(0.03);
    }
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

  it('hole 13: no tree crown stands over the green (developer: the two firs in front are removed)', () => {
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
    // the two removed firs (course_config.json drop_trees), front right and front left of the green
    for (const [x, y] of [[776.5, 588.5], [753.5, 584.5]]) {
      expect(course.obstacles.trees.filter((t) => Math.hypot(t.x - x, t.y - y) < 2), `${x},${y}`).toEqual([]);
    }
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

  it('wind stays inside the course range (1-7 mph, as Oswego Lake)', () => {
    expect(json.wind).toEqual({ minMph: 1, maxMph: 7 });
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

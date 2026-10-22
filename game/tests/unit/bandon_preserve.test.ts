// Bandon Preserve: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-22 with
// Shorty's, one set of downloads): the 13 par 3s of Bandon Preserve (Coore & Crenshaw, 2012), the Back tees the developer approved in the desk, the boundary grown to the dunes, all fairways run up to their greens
// with no rough between (developer, 2026-10-22), wind 8-16 mph as at Bandon Dunes, gorse and shore pines.
// Moved here from the course chat's data/bandon_preserve/tests/ by the design chat (2026-10-22).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const ID = 'bandon_preserve';
const TEE = 'Back';
const NHOLES = 13;
const SEED_HOLE = 9;

describe('Bandon Preserve course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is a 13-hole par-39 course of par 3s from the Back tees, in Oregon, bandon_dunes theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(NHOLES);
    expect(json.par).toBe(39);
    for (const h of json.holes) expect(h.par, `hole ${h.number}`).toBe(3);
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

  it('measured yardages are within 3% of the card, every hole', () => {
    const flags = new Set<number>([]);
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(Math.abs((t.adjYd - t.cardYd) / t.cardYd), `hole ${h.number}`).toBeLessThanOrEqual(flags.has(h.number) ? 0.08 : 0.03);
    }
  });

  it('the fairway runs up to every green: walking back from the green, past the fringe comes fairway or sand, never rough (developer, 2026-10-22)', () => {
    const noFairway = new Set<number>([]);
    const bad: string[] = [];
    for (const h of json.holes) {
      if (noFairway.has(h.number)) continue;
      const line = h.tees[TEE].centerline;
      const [gx, gy] = h.greenCenter;
      const [tx, ty] = line.length > 1 ? line[line.length - 2] : [h.tees[TEE].x, h.tees[TEE].y];
      const d = Math.hypot(tx - gx, ty - gy), ux = (tx - gx) / d, uy = (ty - gy) / d;
      let left = false;
      for (let s = 0; s < Math.min(d, 60); s += 0.25) {
        const v = course.terrain.surface(gx + ux * s, gy + uy * s);
        if (v === SURF.green || v === SURF.fringe) { if (left) break; continue; }
        left = true;
        if (v === SURF.rough) bad.push(`hole ${h.number}: rough ${s.toFixed(1)} m from the green centre`);
        break;
      }
    }
    expect(bad).toEqual([]);
  });

  it('every hole lies inside the grown boundary: no tee, line or green out of bounds', () => {
    for (const h of json.holes) {
      const t = h.tees[TEE];
      expect(isOB(course.terrain.surface(t.x, t.y)), `hole ${h.number} tee`).toBe(false);
      for (const [x, y] of h.tees[TEE].centerline) expect(isOB(course.terrain.surface(x, y)), `hole ${h.number} line`).toBe(false);
    }
  });

  it('all water is red (standing default)', () => {
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
  });

  it("the gorse thickets are there: low bushes (c: 3) drawn from the theme's own bush sheet, and shore pines", () => {
    expect(json.shrubs).toBe('shrubs_bandon_dunes');
    const t = course.obstacles.trees;
    expect(t.filter((x) => x.kind === 3 && x.h <= 3.6).length).toBeGreaterThan(1000);
    expect(t.filter((x) => x.conifer).length).toBeGreaterThan(500);
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

  it('a robot golfer completes all 13 holes with legal, finite scores', () => {
    const r = robotRound(course, json.holes.map((h) => h.number));
    expect(r.scores).toHaveLength(NHOLES);
    for (const s of r.scores) {
      expect(s.strokes).toBeGreaterThanOrEqual(1);
      expect(s.strokes).toBeLessThan(10);
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
    expect(views).toHaveLength(NHOLES);
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
      const r = new Round(course, roundCfg(course, [SEED_HOLE], 99));
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

// Langdon Farms Golf Club: course-specific checks of COURSE_BUILD.md 8.2, plus
// the developer's points: OR 551 between the two parts of the course is out of
// bounds, both ponds are red penalty areas, 9 and 18 share one green around the
// clubhouse pond with 9's pin on the east side, and the two barns stand inside
// the boundary (free relief).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

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

  it('measured yardages are within 3% of the card, and the flagged holes (1, 3, 9, 15, 17) within 8%', () => {
    const flagged = new Set([1, 3, 9, 15, 17]);
    for (const h of json.holes) {
      const t = h.tees[TEE];
      const off = Math.abs((t.adjYd - t.cardYd) / t.cardYd);
      expect(off, `hole ${h.number}`).toBeLessThanOrEqual(flagged.has(h.number) ? 0.08 : 0.03);
    }
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

  it('both ponds are red penalty areas painted as water', () => {
    for (const id of ['w334609000', 'w334607763']) {
      const w = course.water.find((x) => x.id === id)!;
      expect(w, id).toBeTruthy();
      expect(w.penalty, id).toBe('red');
      const b = w.poly;
      let n = 0, water = 0;
      for (let x = b.minX; x <= b.maxX; x += 2) for (let y = b.minY; y <= b.maxY; y += 2) {
        if (!b.contains(x, y)) continue;
        n++;
        if (course.terrain.surface(x, y) === SURF.water) water++;
      }
      expect(water / n, id).toBeGreaterThan(0.97);
    }
  });

  it('9 and 18 share one green around the clubhouse pond; 9\'s pin is on the east side', () => {
    const h9 = json.holes.find((x) => x.number === 9)!;
    const h18 = json.holes.find((x) => x.number === 18)!;
    expect(h9.greenId).not.toBe(h18.greenId); // one part each, so each hole has its own centre and pin
    expect(h9.pin[0]).toBeGreaterThan(h18.pin[0] + 20);
    // the two parts touch: the green runs on from one to the other
    const g9 = course.greenPolys.get(h9.greenId)!;
    const g18 = course.greenPolys.get(h18.greenId)!;
    let touching = 0;
    for (let x = 660; x <= 770; x += 0.5) for (let y = 580; y <= 670; y += 0.5) {
      if (g9.contains(x, y) && (g18.contains(x + 1, y) || g18.contains(x - 1, y) || g18.contains(x, y + 1) || g18.contains(x, y - 1))) touching++;
    }
    expect(touching).toBeGreaterThan(10);
  });

  it('the two red barns (8 and 18) stand inside the boundary, so they give free relief', () => {
    for (const id of ['w324295601', 'w324295657']) {
      const b = json.buildings.find((x) => x.id === id)!;
      expect(b, id).toBeTruthy();
      expect(b.inside, id).toBe(true);
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

  it('a robot golfer completes 18 holes with legal, finite scores', () => {
    const r = robotRound(course, json.holes.map((h) => h.number));
    expect(r.scores).toHaveLength(18);
    for (const s of r.scores) {
      expect(s.strokes).toBeGreaterThanOrEqual(1);
      expect(s.strokes).toBeLessThan(16);
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

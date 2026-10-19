// Wannamoisett Country Club (Rumford, RI): course-specific checks of
// COURSE_BUILD.md 8.2 for both tee sets (Blue default, Black), plus the
// developer's calls of 2026-10-19: every penalty area red, and the pond by
// hole 14 (cut out of the OSM course relation) inside the boundary as a red
// penalty area, not out of bounds.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

class AlwaysHit extends Rng { next(): number { return 0; } }

const ID = 'wannamoisett';
// outside 3% of the card after the tee position (data/wannamoisett/validation_report.md): Black 12 has no
// Black box in OSM or the lidar and plays from the back of the Blue box
const YARDAGE_FLAGS = ['12 Black'];

const course = loadCourseFiles(ID);
const json = course.json;
const TEES = json.teeSets.map((t) => t.name);

describe('Wannamoisett: course list, tees and layout', () => {
  it('is an 18-hole par-69 course in Rhode Island, Blue tees by default, Black also built', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('RI');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(69);
    expect(json.defaultTee).toBe('Blue');
    expect(TEES).toEqual(['Blue', 'Black']);
    expect(json.theme).toBe('seekonk');
  });

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee of both sets is on a tee box and every pin on its green', () => {
    for (const h of json.holes) {
      for (const ts of TEES) {
        const t = h.tees[ts];
        expect(course.terrain.surface(t.x, t.y), `hole ${h.number} ${ts}`).toBe(SURF.tee);
      }
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card, apart from the listed flags, and none over 8%', () => {
    for (const h of json.holes) for (const ts of TEES) {
      const t = h.tees[ts];
      const off = Math.abs(t.adjYd - t.cardYd) / t.cardYd;
      expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.08);
      if (YARDAGE_FLAGS.includes(`${h.number} ${ts}`)) expect(off, `hole ${h.number} ${ts}`).toBeGreaterThan(0.03);
      else expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('every penalty area is red (developer)', () => {
    expect(json.water.map((w) => w.id).sort()).toEqual(['w680736432', 'w886549379']);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the pond by hole 14 is inside the boundary and plays as a penalty area, not out of bounds', () => {
    // OSM cuts it out of the course relation as an inner ring; config join_boundary fills it
    for (const [x, y] of [[654.0, 877.1], [653.1, 875.1]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
      expect(isOB(course.terrain.surface(x, y)), `${x},${y}`).toBe(false);
    }
  });

  it('a ball at rest in the hole-14 pond takes red penalty-area relief', () => {
    const r = new Round(course, roundCfg(course, [14]));
    r.startHole(0);
    r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
    r.ball = { x: 654.0, y: 877.1 };
    const plan = r.plan('pw', 0, meterFor(0.01, 0, false), 0, 1);
    const sim = r.simulate(plan);
    const out = r.resolve(plan, sim);
    expect(out.kind).toBe('water');
    if (out.kind === 'water') expect(out.penalty).toBe('red');
  });

  it('a perfect tee shot at the middle of the fairway clears the trees around the tee (both tee sets)', () => {
    const blocked: string[] = [];
    for (const h of json.holes) for (const ts of TEES) {
      const r = new Round(course, { ...roundCfg(course, [h.number]), tee: ts });
      r.startHole(0);
      r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
      const club = r.autoClub();
      const scale = r.autoSwingScale(club);
      const base = r.lineAim(club, scale);
      const b = r.ball;
      let target = { x: r.pin.x, y: r.pin.y };
      if (club.kind !== 'putter' && r.fullCarry(club) * scale < 0.92 * r.distToPin()) {
        // the middle of the fairway across the line where the drive lands
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
      const aim = Math.atan2(target.y - b.y, target.x - b.x);
      const plan = r.plan(club.id, aim, meterFor(1, 0, false), 0, scale);
      const sim = simulateShot(course.terrain, course.obstacles, plan.spec, new AlwaysHit(1));
      const ev = sim.events.find((e) => (e.type === 'trunk' || e.type === 'canopy') && Math.hypot(e.x - b.x, e.y - b.y) < 60);
      if (ev) blocked.push(`${h.number} ${ts} (${ev.type} ${Math.hypot(ev.x - b.x, ev.y - b.y).toFixed(0)} m out)`);
    }
    expect(blocked).toEqual([]);
  });

  it('has trees of both kinds from the lidar and no flowering trees (seekonk theme)', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
    expect(t.c.filter((c) => c === 0).length).toBeGreaterThan(t.c.filter((c) => c === 1).length);
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
});

for (const ts of ['Blue', 'Black']) {
  describe(`Wannamoisett from the ${ts} tees`, () => {
    const c = ts === json.defaultTee ? course : loadCourseFiles(ID, (j) => ({ ...j, defaultTee: ts }));

    it('the default aim keeps a perfect tee shot out of the trees, the water and out of bounds on every hole', () => {
      for (const h of json.holes) {
        const r = new Round(c, roundCfg(c, [h.number]));
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

    it('a robot golfer completes every hole with legal, finite scores (3 seeds)', () => {
      const holes = json.holes.map((h) => h.number);
      for (const seed of [7, 21, 42]) {
        const r = robotRound(c, holes, seed);
        expect(r.scores).toHaveLength(holes.length);
        for (const s of r.scores) {
          expect(s.strokes).toBeGreaterThanOrEqual(1);
          expect(s.strokes).toBeLessThan(16);
        }
      }
    });
  });
}

it('Wannamoisett: same seed, same inputs -> identical round', () => {
  const play = () => {
    const r = new Round(course, roundCfg(course, [4], 99));
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

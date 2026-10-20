// Willamette Valley Country Club (Canby, OR): course-specific checks of
// COURSE_BUILD.md 8.2 for the Blue tees, plus the developer's calls of
// 2026-10-19 (Blue tees; hole 13's green is the one left of the pond, traced
// from the OSIP orthophoto; hole 3's Blue tee is a box on the fairway from the
// 2nd green; practice greens are wrong greens; every pond red; out of bounds = the
// OSM course boundary).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

class AlwaysHit extends Rng { next(): number { return 0; } }

const ID = 'willamette_valley';
// holes outside 3% (none: every hole passes)
const YARDAGE_EXCEPTIONS: string[] = [];

const course = loadCourseFiles(ID);
const json = course.json;
const TEES = json.teeSets.map((t) => t.name);

describe('Willamette Valley: course list and tees', () => {
  it('is in the course list under OR, Blue tees, par 72, a name that fits the card', () => {
    const e = registry().find((c) => c.id === ID)!;
    expect(e.state).toBe('OR');
    expect(e.defaultTee).toBe('Blue');
    expect(e.teeSets).toEqual(['Blue']);
    expect(e.name.length).toBeLessThanOrEqual(26);
    expect(json.par).toBe(72);
    expect(json.holes).toHaveLength(18);
  });

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee is on a tee box and every pin on its green', () => {
    for (const h of json.holes) {
      for (const ts of TEES) expect(course.terrain.surface(h.tees[ts].x, h.tees[ts].y), `hole ${h.number} ${ts}`).toBe(SURF.tee);
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card, apart from the listed open items, and none over 8%', () => {
    for (const h of json.holes) for (const ts of TEES) {
      const t = h.tees[ts];
      const off = Math.abs(t.adjYd - t.cardYd) / t.cardYd;
      expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.08);
      if (YARDAGE_EXCEPTIONS.includes(`${h.number} ${ts}`)) expect(off, `hole ${h.number} ${ts}`).toBeGreaterThan(0.03);
      else expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.03);
    }
  });
});

describe('Willamette Valley: water and out of bounds', () => {
  it('the five ponds are red penalty areas inside the boundary', () => {
    expect(json.water.map((w) => w.id).sort()).toEqual(['r19774868', 'w1053606377', 'w1053634760', 'w469789086', 'w469789087']);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
    for (const [x, y] of [[449.9, 1431.4], [459.1, 239.3], [384.1, 1594.6], [563.7, 554.1], [637.9, 1384.6]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
    }
  });

  it('every tee, pin and centre-line point is inside the boundary', () => {
    for (const h of json.holes) {
      for (const ts of TEES) for (const [x, y] of h.tees[ts].centerline) expect(course.boundary.contains(x, y), `hole ${h.number} ${x},${y}`).toBe(true);
      expect(course.boundary.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it("OSM's golf=path lines are cart paths (free relief)", () => {
    for (const [x, y] of [[675.3, 940.5], [408.1, 201.6], [522.9, 521.5]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.cartpath);
    }
  });

  it("hole 13's green is the traced one left of the pond; the practice greens belong to no hole", () => {
    const h13 = json.holes.find((h) => h.number === 13)!;
    expect(h13.greenId).toBe('tr_green13');
    const used = new Set(json.holes.map((h) => h.greenId));
    for (const id of ['w1053644812', 'w1053594241', 'w1053644816']) expect(used.has(id), id).toBe(false);
    for (const [x, y] of [[480.7, 272.3], [455.2, 736.5], [652.7, 964.9]]) expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.green);
  });
});

describe('Willamette Valley: trees and putting views', () => {
  it('a perfect tee shot at the middle of the fairway clears the trees around the tee', () => {
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

  it('the default aim keeps a perfect tee shot out of the trees and the water on every hole', () => {
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
    }
  });

  it('pnw theme, trees from the canopy model, no flowering trees', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(json.theme).toBe('pnw');
    expect(t.c.length).toBeGreaterThan(1000);
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
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

  it('a robot golfer completes every hole with legal, finite scores (3 seeds)', () => {
    const holes = json.holes.map((h) => h.number);
    for (const seed of [7, 21, 42]) {
      const r = robotRound(course, holes, seed);
      expect(r.scores).toHaveLength(holes.length);
      for (const s of r.scores) {
        expect(s.strokes).toBeGreaterThanOrEqual(1);
        expect(s.strokes).toBeLessThan(16);
      }
    }
  });
});

it('Willamette Valley: same seed, same inputs -> identical round', () => {
  const play = () => {
    const r = new Round(course, roundCfg(course, [1], 99));
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

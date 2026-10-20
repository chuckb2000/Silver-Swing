// Eastmoreland Golf Course (Portland, OR): course-specific checks of
// COURSE_BUILD.md 8.2, plus the developer's calls of 2026-10-19 (every hazard
// red; the Crystal Springs Rhododendron Garden beside the lake in flower).
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

/** Every canopy the ball enters counts as a hit. */
class AlwaysHit extends Rng { next(): number { return 0; } }

const ID = 'eastmoreland';
// outside 3% until the developer decides (data/eastmoreland/validation_report.md)
const YARDAGE_EXCEPTIONS = ['13 Blue', '17 White'];
// a point in the rhododendron garden's southern lobe (local metres)
const GARDEN = { x: 555, y: 1550 };

describe(ID, () => {
  const course = loadCourseFiles(ID);
  const json = course.json;
  const tees = json.teeSets.map((t) => t.name);

  it('is in the course list as an Oregon course with Blue as the default tee', () => {
    const c = registry().find((x) => x.id === ID)!;
    expect(c).toBeDefined();
    expect(c.state).toBe('OR');
    expect(c.name.length).toBeLessThanOrEqual(26);
    expect(json.defaultTee).toBe('Blue');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
  });

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee is on a tee box (or the ground the OSM line starts on) and every pin on its green', () => {
    for (const h of json.holes) {
      for (const ts of tees) {
        const t = h.tees[ts];
        expect([SURF.tee, SURF.fairway, SURF.rough], `hole ${h.number} ${ts}`).toContain(course.terrain.surface(t.x, t.y));
      }
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card, apart from the listed open items', () => {
    for (const h of json.holes) for (const ts of tees) {
      const t = h.tees[ts];
      const off = Math.abs(t.adjYd - t.cardYd) / t.cardYd;
      if (YARDAGE_EXCEPTIONS.includes(`${h.number} ${ts}`)) expect(off, `hole ${h.number} ${ts}`).toBeGreaterThan(0.03);
      else expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('every hazard is red (developer, 2026-10-19): the lake, the pond and the creek', () => {
    expect(json.water.length).toBeGreaterThanOrEqual(3);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
    const lake = json.water.find((w) => w.id.startsWith('lake_'))!;
    expect(lake).toBeDefined();
    // the lake is a penalty area in play, not off-course water: its centre is surface water inside the course
    const cx = lake.poly.reduce((s, p) => s + p[0], 0) / lake.poly.length;
    const cy = lake.poly.reduce((s, p) => s + p[1], 0) / lake.poly.length;
    expect(course.boundary.contains(cx, cy)).toBe(true);
    expect(course.terrain.surface(cx, cy)).toBe(SURF.water);
    expect(json.water.filter((w) => w.id.startsWith('channel_')).length).toBeGreaterThanOrEqual(3);
  });

  it('both nines are in bounds and SE Bybee Blvd between them is out of bounds', () => {
    for (const h of json.holes) {
      const t = h.tees[json.defaultTee];
      expect(course.boundary.contains(t.x, t.y), `hole ${h.number} tee`).toBe(true);
      expect(course.boundary.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
    // the road strip the OB polygon joins across (local metres, between the two OSM parts)
    for (const x of [340, 380, 420]) expect(isOB(course.terrain.surface(x, 1187)), `x ${x}`).toBe(true);
  });

  it('the rhododendron garden is out of bounds and full of flowering shrubs (c: 3) in its chosen colours', () => {
    expect(course.boundary.contains(GARDEN.x, GARDEN.y)).toBe(false);
    expect(isOB(course.terrain.surface(GARDEN.x, GARDEN.y))).toBe(true);
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { x: number[]; y: number[]; c: number[] };
    const shrubs = t.c.map((c, i) => [c, i]).filter(([c]) => c === 3).map(([, i]) => i);
    expect(shrubs.length).toBeGreaterThan(1000);
    // all outside the course, around the garden's peninsula east of the lake
    for (const i of shrubs) {
      expect(course.boundary.contains(t.x[i], t.y[i]), `shrub ${i}`).toBe(false);
      expect(t.x[i]).toBeGreaterThan(470); expect(t.x[i]).toBeLessThan(680);
      expect(t.y[i]).toBeGreaterThan(1440); expect(t.y[i]).toBeLessThan(1900);
    }
    // colour = index % 8 (0 pink, 1 magenta, 2 purple, 3 white, 4 red, 5 coral, 6 pale pink, 7 leaves):
    // every colour shows, pinks and magentas lead, bushes in leaf only are a minority
    const n = Array(8).fill(0);
    for (const i of shrubs) n[i % 8]++;
    for (let v = 0; v < 8; v++) expect(n[v], `colour ${v}`).toBeGreaterThan(0);
    expect(n[0] + n[1]).toBeGreaterThan(n[3] + n[4] + n[5]);
    expect(n[7] / shrubs.length).toBeLessThan(0.15);
    // the putting views beside the garden draw the same bushes
    const views = json.greenViews!.find((g) => g.hole === 12)!;
    const atlas = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, views.far.trees), 'utf8'));
    expect(atlas.trees.some((x: { f: string }) => x.f.startsWith('s_'))).toBe(true);
  });

  it('a robot golfer completes every hole with legal, finite scores', () => {
    const holes = json.holes.map((h) => h.number);
    const r = robotRound(course, holes);
    expect(r.scores).toHaveLength(holes.length);
    for (const s of r.scores) {
      expect(s.strokes).toBeGreaterThanOrEqual(1);
      expect(s.strokes).toBeLessThan(16);
    }
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

  it('a perfect tee shot at the middle of the fairway clears the trees around the tee', () => {
    const blocked: string[] = [];
    for (const h of json.holes) for (const ts of tees) {
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
        const atlas = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, v.trees), 'utf8'));
        for (const t of atlas.trees) expect(atlas.frames[t.f], `hole ${gv.hole} frame ${t.f}`).toBeDefined();
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

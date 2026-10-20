// East Potomac Golf Links: three courses (Blue 18, White 9, Red 9) sharing one
// world. Course-specific checks of COURSE_BUILD.md 8.2 for every layout.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { CourseJson, HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

/** Every canopy the ball enters counts as a hit. */
class AlwaysHit extends Rng { next(): number { return 0; } }

const LAYOUTS = ['east_potomac_blue', 'east_potomac_white', 'east_potomac_red'];
// holes accepted outside 3% until the developer decides (data/east_potomac/validation_report.md)
const YARDAGE_EXCEPTIONS: Record<string, string[]> = {
  // 5, 9, 16 Blue and 11 White: flags since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")
  east_potomac_blue: ['5 Blue', '6 Blue', '9 Blue', '11 White', '13 White', '15 Blue', '16 Blue'],
  east_potomac_white: [],
  east_potomac_red: ['5 White', '6 White', '8 White'],
};

describe('East Potomac: one world, three courses', () => {
  const jsons = LAYOUTS.map((id) => JSON.parse(readFileSync(resolve(COURSES_DIR, id, 'course.json'), 'utf8')) as CourseJson);

  it('all three are in the course list, grouped as one place', () => {
    const reg = registry().filter((c) => c.id.startsWith('east_potomac_')) as (ReturnType<typeof registry>[number] & { group?: string; layout?: string })[];
    expect(reg.map((c) => c.id).sort()).toEqual([...LAYOUTS].sort());
    for (const c of reg) expect(c.group).toBe('east_potomac');
    expect(reg.map((c) => c.layout).sort()).toEqual(['Blue', 'Red', 'White']);
    expect(Object.fromEntries(reg.map((c) => [c.layout, c.holes]))).toEqual({ Blue: 18, White: 9, Red: 9 });
  });

  it('share terrain, surface, heights and trees, so the ground plays the same in every layout', () => {
    for (const j of jsons) {
      expect(j.terrain.pattern).toBe('../east_potomac/terrain/c_{i}_{j}.png');
      expect(j.surface.file).toBe('../east_potomac/surface.png');
      expect(j.height.file).toBe('../east_potomac/height.png');
      expect(j.greens).toEqual(jsons[0].greens.map((g) => ({ ...g, hole: j.greens.find((x) => x.id === g.id)!.hole })));
    }
    const t0 = readFileSync(resolve(COURSES_DIR, 'east_potomac', 'trees.json'), 'utf8');
    for (const id of LAYOUTS) expect(readFileSync(resolve(COURSES_DIR, id, 'trees.json'), 'utf8')).toBe(t0);
  });

  it('no two layouts use the same green', () => {
    const used = jsons.flatMap((j) => j.holes.map((h) => h.greenId));
    expect(new Set(used).size).toBe(used.length);
  });

  it('has flowering cherries, on the variant-2 sprite slots, along the shore outside the course', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, 'east_potomac', 'trees.json'), 'utf8')) as { x: number[]; y: number[]; c: number[] };
    const cherries = t.c.map((c, i) => [c, i]).filter(([c]) => c === 2).map(([, i]) => i);
    expect(cherries.length).toBeGreaterThan(500);
    expect(cherries.length).toBeLessThan(t.c.length / 2);
    for (const i of cherries) expect(i % 3).toBe(2);
    const course = loadCourseFiles('east_potomac_blue');
    const inside = cherries.filter((i) => course.boundary.contains(t.x[i], t.y[i])).length;
    expect(inside / cherries.length).toBeLessThan(0.05);
  });
});

for (const id of LAYOUTS) {
  describe(id, () => {
    const course = loadCourseFiles(id);
    const json = course.json;
    const tees = json.teeSets.map((t) => t.name);

    it('decodes heights exactly (pipeline samples)', () => {
      const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, id, 'height.json'), 'utf8')) as HeightMeta;
      for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
    });

    it('every tee is on a tee box (or the fairway/rough the OSM line starts on) and every pin on its green', () => {
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
        if (YARDAGE_EXCEPTIONS[id].includes(`${h.number} ${ts}`)) expect(off, `hole ${h.number} ${ts}`).toBeGreaterThan(0.03);
        else expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.03);
      }
    });

    it('every fairway runs into its green (no rough between fairway and fringe)', () => {
      const S = course.terrain;
      for (const h of json.holes) {
        const cl = h.tees[json.defaultTee].centerline;
        const [gx, gy] = cl[cl.length - 1];
        const [ax, ay] = cl[cl.length - 2];
        const L = Math.hypot(ax - gx, ay - gy);
        const ux = (ax - gx) / L, uy = (ay - gy) / L;
        const seq: number[] = [];
        for (let d = 0; d <= Math.min(60, L); d += 0.5) seq.push(S.surface(gx + ux * d, gy + uy * d));
        if (!seq.includes(SURF.fairway)) continue; // no fairway near the green (some par 3s)
        const first = seq.find((v) => v !== SURF.green && v !== SURF.fringe);
        expect([SURF.fairway, SURF.bunker, SURF.cartpath], `hole ${h.number}`).toContain(first);
      }
    });

    it('the object in the left side of the Blue 10 fairway is gone (developer, 2026-10-20)', () => {
      const near = course.obstacles.trees.filter((x) => Math.hypot(x.x - 585.5, x.y - 1269.5) < 2);
      expect(near).toEqual([]);
    });

    it('no tree stands inside a fairway', () => {
      const t = course.obstacles.trees;
      const S = course.terrain;
      const deep = t.filter((x) => [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].every(([dx, dy]) => S.surface(x.x + dx, x.y + dy) === SURF.fairway));
      expect(deep.map((x) => `${x.x.toFixed(0)},${x.y.toFixed(0)}`)).toEqual([]);
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

    it('a perfect tee shot at the middle of the fairway clears the trees around the tee (developer, 2026-10-19)', () => {
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
          const art = PNG.sync.read(readFileSync(resolve(COURSES_DIR, id, v.file)));
          expect(art.width).toBe(v.w * v.ppm);
          const atlas = JSON.parse(readFileSync(resolve(COURSES_DIR, id, v.trees), 'utf8'));
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
}

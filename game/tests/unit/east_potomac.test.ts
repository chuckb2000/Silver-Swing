// East Potomac Golf Links: three courses (Blue 18, White 9, Red 9) sharing one
// world. Course-specific checks of COURSE_BUILD.md 8.2 for every layout.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { CourseJson, HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const LAYOUTS = ['east_potomac_blue', 'east_potomac_white', 'east_potomac_red'];
// holes accepted outside 3% until the developer decides (data/east_potomac/validation_report.md)
const YARDAGE_EXCEPTIONS: Record<string, string[]> = {
  east_potomac_blue: ['6 Blue', '13 Blue', '13 White', '15 Blue'],
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

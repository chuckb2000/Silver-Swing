// Silvies Valley Ranch: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-25) for its three
// layouts in one world (COURSE_BUILD.md 3.5): Craddock and Hankins (the same fairways played both ways,
// 27 greens between them) and the Chief Egan short course. The club maps' back tees (developer
// 2026-10-25): Craddock Challenge, Hankins White, Chief Egan White. All water red, wind 1-7 mph, the
// course's own silvies theme, one OB line for all three.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const LAYOUTS = [
  // flags (3-8 %) left as the developer marked the tees in the desk (validation_report.md)
  { id: 'silvies_craddock', name: 'Silvies Valley Craddock', holes: 18, par: 71, tee: 'Challenge', rating: 0, slope: 0,
    flagged: { 8: 0.05, 14: 0.08 } as Record<number, number> },
  { id: 'silvies_hankins', name: 'Silvies Valley Hankins', holes: 18, par: 72, tee: 'White', rating: 71.8, slope: 120,
    flagged: { 8: 0.06, 18: 0.06 } as Record<number, number> },
  { id: 'silvies_chief_egan', name: 'Silvies Valley Chief Egan', holes: 9, par: 29, tee: 'White', rating: 0, slope: 0,
    flagged: { 8: 0.07, 9: 0.04 } as Record<number, number> },
];

for (const L of LAYOUTS) {
  describe(`${L.name} course data`, () => {
    const course = loadCourseFiles(L.id);
    const json = course.json;

    it(`is a ${L.holes}-hole course from the ${L.tee} tees, in Oregon, in the Silvies group, its own theme`, () => {
      const reg = registry().find((c) => c.id === L.id)!;
      expect(reg.state).toBe('OR');
      expect(reg.group).toBe('silvies');
      expect(json.name).toBe(L.name);
      expect(json.name.length).toBeLessThanOrEqual(26);
      expect(json.holes).toHaveLength(L.holes);
      expect(json.par).toBe(L.par);
      expect(json.defaultTee).toBe(L.tee);
      expect(json.theme).toBe('silvies');
      const t = json.teeSets.find((s) => s.name === L.tee)!;
      expect(t.rating).toBe(L.rating);
      expect(t.slope).toBe(L.slope);
    });

    it('decodes heights exactly (pipeline samples)', () => {
      const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, 'silvies', 'height.json'), 'utf8')) as HeightMeta;
      for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
    });

    // developer 2026-10-25: "make sure every tee is always on a tee box". The tee stands on tee
    // surface with tee surface all round it (half a metre each way), so it is never at a box's edge
    // or out in the rough.
    it('every tee stands on a tee box, and every pin on its green', () => {
      for (const h of json.holes) {
        const t = h.tees[L.tee];
        for (const [dx, dy] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
          expect(course.terrain.surface(t.x + dx, t.y + dy), `hole ${h.number} tee (${dx}, ${dy})`).toBe(SURF.tee);
        }
        expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
      }
    });

    it('measured yardages are within 3% of the card (logged flags excepted)', () => {
      for (const h of json.holes) {
        const t = h.tees[L.tee];
        expect(Math.abs((t.adjYd - t.cardYd) / t.cardYd), `hole ${h.number}`).toBeLessThanOrEqual(L.flagged[h.number] ?? 0.03);
      }
    });

    it('all water is red (standing default)', () => {
      expect(course.water.length).toBeGreaterThanOrEqual(2);
      for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    });

    it('no tee or green is out of bounds', () => {
      for (const h of json.holes) {
        const t = h.tees[L.tee];
        expect(isOB(course.terrain.surface(t.x, t.y)), `hole ${h.number} tee`).toBe(false);
        expect(isOB(course.terrain.surface(h.pin[0], h.pin[1])), `hole ${h.number} pin`).toBe(false);
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

    it(`a robot golfer completes ${L.holes} holes with legal, finite scores`, () => {
      for (const seed of [1, 7]) {
        const r = robotRound(course, json.holes.map((h) => h.number), seed);
        expect(r.scores).toHaveLength(L.holes);
        for (const s of r.scores) {
          expect(s.strokes).toBeGreaterThanOrEqual(1);
          expect(s.strokes).toBeLessThan(16);
        }
      }
    });

    it('wind stays inside the course range (1-7 mph)', () => {
      expect(json.wind!.minMph).toBe(1);
      expect(json.wind!.maxMph).toBe(7);
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
      expect(views).toHaveLength(L.holes);
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
        const r = new Round(course, roundCfg(course, [2], 99));
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

describe('Silvies Valley Ranch: three courses, one world', () => {
  const cr = loadCourseFiles('silvies_craddock');
  const hk = loadCourseFiles('silvies_hankins');
  const eg = loadCourseFiles('silvies_chief_egan');
  it('all three layouts share the world and its OB line', () => {
    expect(hk.json.world).toEqual(cr.json.world);
    expect(eg.json.world).toEqual(cr.json.world);
    expect(hk.json.boundary).toEqual(cr.json.boundary);
    expect(eg.json.boundary).toEqual(cr.json.boundary);
  });
  it('Craddock and Hankins share nine greens and have nine of their own each (27 in all)', () => {
    const a = new Set(cr.json.holes.map((h) => h.greenId));
    const b = new Set(hk.json.holes.map((h) => h.greenId));
    const shared = [...a].filter((x) => b.has(x));
    expect(shared).toHaveLength(9);
    expect(new Set([...a, ...b]).size).toBe(27);
  });
  it('Chief Egan plays none of the big courses\' greens', () => {
    const big = new Set([...cr.json.holes, ...hk.json.holes].map((h) => h.greenId));
    for (const h of eg.json.holes) expect(big.has(h.greenId), `chief egan ${h.number}`).toBe(false);
  });
});

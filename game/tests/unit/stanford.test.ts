// Stanford Golf Course: course-specific checks of COURSE_BUILD.md 8.2 (course chat, 2026-10-24):
// Black tees (the card's Blue is the forward set), all water red, wind 2-10 mph, `peninsula` theme,
// the boundary's two parts joined across Fremont Road (hole 1's green and hole 2's tee in play),
// Junipero Serra Boulevard out of bounds (developer, 2026-10-24) and the practice area north of
// holes 2-3 in play with wrong greens (developer, 2026-10-24).
import { describe, expect, it } from 'vitest';
import { Round } from '../../src/systems/game/round';
import { CANOPY_START, TRUNK_R } from '../../src/systems/physics/obstacles';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry, roundCfg } from './helpers';

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

});

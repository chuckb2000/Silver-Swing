// RedTail Golf Center: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-22): Blue tees,
// all water red, wind 1-7 mph (inland Pacific Northwest), pnw theme, and the cart-path loop that
// OSM's closed way turned into an 8.5 ha cart-path area over holes 2-7 (now a line, edits.json).
// Kept in data/redtail/tests/ (the course chat writes only in its own folders); to run it, copy it
// into game/tests/unit/. The design chat may move it there.
import { describe, expect, it } from 'vitest';
import { Round } from '../../src/systems/game/round';
import { CANOPY_START, TRUNK_R } from '../../src/systems/physics/obstacles';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, registry, roundCfg } from './helpers';

const ID = 'redtail';
const TEE = 'Blue';
// hole 3: no Blue box in OSM; the White box (w871730441) is the nearest, 306 yd vs 322 (-4.9 %)

describe('RedTail Golf Center course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;

  it('is an 18-hole par-72 course from the Blue tees, in Oregon, pnw theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('OR');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('pnw');
    expect(json.name.length).toBeLessThanOrEqual(26);
    const blue = json.teeSets.find((t) => t.name === TEE)!;
    expect(blue.rating).toBe(72.6);
    expect(blue.slope).toBe(130);
  });

  it('all water is red (standing default), seven ponds', () => {
    expect(course.water.length).toBeGreaterThanOrEqual(7);
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
  });

  it('the cart-path loop is a path, not an area: the middle of every hole line is not cart path', () => {
    for (const h of json.holes) {
      const c = h.tees[TEE].centerline;
      let len = 0;
      for (let k = 1; k < c.length; k++) len += Math.hypot(c[k][0] - c[k - 1][0], c[k][1] - c[k - 1][1]);
      let half = len / 2;
      for (let k = 1; k < c.length; k++) {
        const s = Math.hypot(c[k][0] - c[k - 1][0], c[k][1] - c[k - 1][1]);
        if (half <= s) {
          const f = half / s;
          const x = c[k - 1][0] + f * (c[k][0] - c[k - 1][0]), y = c[k - 1][1] + f * (c[k][1] - c[k - 1][1]);
          expect(course.terrain.surface(x, y), `hole ${h.number}`).not.toBe(SURF.cartpath);
          break;
        }
        half -= s;
      }
    }
  });

  // The OSM lines of 7 and 10 run along the left edge of the fairway, under two real edge trees
  // (21 m and 26 m broadleaves, 182-188 m out); a drive at the middle of the fairway clears them
  // (next test, the standing default), so they stay: validation_report open item.
  it('a perfect drive down the hole line touches no tree except the two known edge trees on 7 and 10', () => {
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
    expect([...new Set(blocked)]).toEqual(['hole 7: tree at 815,838', 'hole 10: tree at 451,465']);
  });

});

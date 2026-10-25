// Cypress Point Club: course-specific checks of COURSE_BUILD.md 8.2 (built 2026-10-24): Middle tees
// (the card has no Blue), all water red, the Pacific a red penalty area everywhere (never out of
// bounds, developer), the rocks between the clifftop and the sea part of it, the traced dune sand
// in play, wind 3-14 mph (open coast), monterey theme.
import { describe, expect, it } from 'vitest';
import { Round } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { loadCourseFiles, meterFor, registry, roundCfg } from './helpers';

const ID = 'cypress_point';
const TEE = 'Middle';

/** Point at fraction f along a polyline. */
function along(line: number[][], f: number): [number, number] {
  let len = 0;
  for (let k = 1; k < line.length; k++) len += Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
  let d = f * len;
  for (let k = 1; k < line.length; k++) {
    const s = Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
    if (d <= s) return [line[k - 1][0] + (d / s) * (line[k][0] - line[k - 1][0]), line[k - 1][1] + (d / s) * (line[k][1] - line[k - 1][1])];
    d -= s;
  }
  return [line[line.length - 1][0], line[line.length - 1][1]];
}

describe('Cypress Point Club course data', () => {
  const course = loadCourseFiles(ID);
  const json = course.json;
  const hole = (n: number) => json.holes.find((h) => h.number === n)!;

  it('is an 18-hole par-72 course from the Middle tees, in California, monterey theme', () => {
    const reg = registry().find((c) => c.id === ID)!;
    expect(reg.state).toBe('CA');
    expect(json.holes).toHaveLength(18);
    expect(json.par).toBe(72);
    expect(json.defaultTee).toBe(TEE);
    expect(json.theme).toBe('monterey');
    expect(json.name.length).toBeLessThanOrEqual(26);
    const mid = json.teeSets.find((t) => t.name === TEE)!;
    expect(mid.rating).toBe(71.3);
    expect(mid.slope).toBe(136);
  });

  it('all water is red; the Pacific and its shore are penalty areas', () => {
    for (const w of course.water) expect(w.penalty, w.id).toBe('red');
    const ids = course.water.map((w) => w.id);
    expect(ids).toContain('sea_pacific');
    expect(ids).toContain('shore_pacific');
  });

  it('the cove the 16th carries is water, not out of bounds', () => {
    const c = hole(16).tees[TEE].centerline;
    for (const f of [0.35, 0.5, 0.65]) {
      const [x, y] = along(c, f);
      expect(course.terrain.surface(x, y), `16 at ${f}`).toBe(SURF.water);
    }
  });

  it('a 16th tee shot that comes up short ends in the Pacific penalty area, never out of bounds', () => {
    const r = new Round(course, roundCfg(course, [16]));
    r.startHole(0);
    r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
    const club = r.autoClub();
    const scale = r.autoSwingScale(club);
    const sim = r.simulate(r.plan(club.id, r.lineAim(club, scale), meterFor(0.55, 0, false), 0, scale));
    expect(sim.inWater).toBe(true);
    expect(isOB(sim.restSurface)).toBe(false);
  });

  it('nothing between the clifftop and the sea is out of bounds beside 15, 16 and 17', () => {
    // walk from every point of these holes' centre lines towards the sea (west): every cell
    // passed before the water is in play or water, never OB
    const bad: string[] = [];
    for (const n of [15, 16, 17]) {
      const c = hole(n).tees[TEE].centerline;
      for (let f = 0; f <= 1.0001; f += 0.05) {
        const [x0, y0] = along(c, f);
        for (const [dx, dy] of [[-1, 0], [0, 1], [-0.7, -0.7]]) {
          for (let s = 0; s < 200; s += 1) {
            const surf = course.terrain.surface(x0 + dx * s, y0 + dy * s);
            if (surf === SURF.water) break;
            if (isOB(surf)) { bad.push(`${n} at ${f.toFixed(2)} dir ${dx},${dy}: OB ${s} m out`); break; }
          }
        }
      }
    }
    // headings that leave the course over land (17-Mile Drive, homes) are allowed to meet OB first;
    // the walk west from 15-17 crosses only cliffs and rocks
    expect(bad.filter((b) => b.includes('dir -1,0'))).toEqual([]);
  });

  it('the traced dune sand plays as waste sand (surface 18, "waste_sand": true), not as bunkers', () => {
    // a point in the big dune between the 9th and the 13th (proposed/dunes.geojson, approved)
    const c = hole(9).tees[TEE].centerline;
    let sand = 0, bunker = 0;
    for (let f = 0.05; f < 0.6; f += 0.01) {
      const [x, y] = along(c, f);
      for (const off of [-20, -10, 10, 20]) {
        const s = course.terrain.surface(x + off, y);
        if (s === SURF.waste) sand++;
        if (s === SURF.bunker) bunker++;
      }
    }
    expect(sand).toBeGreaterThan(10);
    expect(bunker).toBeLessThan(sand);
  });

  it('the cypress clump in the middle of the 17th fairway stands (keep_trees_areas)', () => {
    const clump = course.obstacles.trees.filter((t) => t.x >= 300 && t.x <= 345 && t.y >= 530 && t.y <= 595);
    expect(clump.length).toBeGreaterThanOrEqual(10);
  });

});

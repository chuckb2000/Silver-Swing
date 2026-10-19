// Langston Golf Course (Kingman Lake, Washington DC): course-specific checks of
// COURSE_BUILD.md 8.2 for both tee sets, plus the developer's calls of
// 2026-10-19 (the two OSM boundary parts joined across Kingman Lake as one red
// penalty area, the hole 10 back tee across the lake, red water everywhere,
// fairways up to the greens, no flowering trees).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const ID = 'langston';
// holes accepted outside 3% until the developer decides (data/langston/validation_report.md)
const YARDAGE_EXCEPTIONS = ['1 Royal', '6 Royal', '7 Royal', '16 Royal'];
// over 8% and waiting for the developer's decision (pull request): the Royal 6 tee box is not mapped
const OVER_8 = ['6 Royal'];

const course = loadCourseFiles(ID);
const json = course.json;
const TEES = json.teeSets.map((t) => t.name);

describe('Langston: course list and tees', () => {
  it('is in the course list under DC, Royal tees by default', () => {
    const e = registry().find((c) => c.id === ID)!;
    expect(e.state).toBe('DC');
    expect(e.defaultTee).toBe('Royal');
    expect(e.teeSets).toEqual(['Royal', 'White']);
    expect(e.name.length).toBeLessThanOrEqual(26);
    expect(json.par).toBe(72);
  });

  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee of both sets is on a tee box and every pin on its green', () => {
    for (const h of json.holes) {
      for (const ts of TEES) {
        const t = h.tees[ts];
        // a tee set without a mapped box plays from the start of the OSM line (on that hole's other tee box)
        expect(course.terrain.surface(t.x, t.y), `hole ${h.number} ${ts}`).toBe(SURF.tee);
      }
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('measured yardages are within 3% of the card, apart from the listed open items, and none over 8%', () => {
    for (const h of json.holes) for (const ts of TEES) {
      const t = h.tees[ts];
      const off = Math.abs(t.adjYd - t.cardYd) / t.cardYd;
      if (!OVER_8.includes(`${h.number} ${ts}`)) expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.08);
      if (YARDAGE_EXCEPTIONS.includes(`${h.number} ${ts}`)) expect(off, `hole ${h.number} ${ts}`).toBeGreaterThan(0.03);
      else expect(off, `hole ${h.number} ${ts}`).toBeLessThanOrEqual(0.03);
    }
  });

  it('hole 10 Royal plays from the tee across Kingman Lake, on the front-nine side', () => {
    const h10 = json.holes.find((h) => h.number === 10)!;
    const royal = h10.tees.Royal, white = h10.tees.White;
    // water lies on the straight line from the Royal tee to its first aim point
    const [ax, ay] = royal.centerline[1];
    let water = 0;
    for (let k = 1; k < 100; k++) {
      const f = k / 100;
      if (course.terrain.surface(royal.x + (ax - royal.x) * f, royal.y + (ay - royal.y) * f) === SURF.water) water++;
    }
    expect(water).toBeGreaterThan(5);
    expect(royal.x).toBeLessThan(white.x - 60); // west of the lake channel, the island tee is east
    expect(royal.cardYd).toBe(538);
  });
});

describe('Langston: one out-of-bounds line across Kingman Lake', () => {
  it('every tee, pin and centre-line point (holes 10-13 on Kingman Island too) is inside the boundary', () => {
    for (const h of json.holes) {
      for (const ts of TEES) for (const [x, y] of h.tees[ts].centerline) expect(course.boundary.contains(x, y), `hole ${h.number} ${ts} ${x},${y}`).toBe(true);
      expect(course.boundary.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
    }
  });

  it('the lake between the two parts is a red penalty area, not out of bounds', () => {
    const lake = json.water.find((w) => w.id === 'join_1')!;
    expect(lake.penalty).toBe('red');
    // middle of Kingman Lake between holes 17 and 11
    for (const [x, y] of [[860, 700], [1100, 1000], [690, 300]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
    }
  });

  it('every water hazard is red, the creek across hole 3 included', () => {
    expect(json.water.length).toBeGreaterThanOrEqual(3);
    for (const w of json.water) expect(w.penalty, w.id).toBe('red');
    expect(json.water.some((w) => w.id === 'channel_w50095952')).toBe(true);
  });

  it('a ball at rest in the lake takes red penalty-area relief, not stroke and distance for OB', () => {
    const r = new Round(course, roundCfg(course, [17]));
    r.startHole(0);
    r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
    const club = r.autoClub();
    const scale = r.autoSwingScale(club);
    // aim from the 17 tee straight out over the lake (east)
    const t = json.holes.find((h) => h.number === 17)!.tees.Royal;
    const aim = Math.atan2(700 - t.y, 860 - t.x);
    const plan = r.plan(club.id, aim, meterFor(0.6, 0, false), 0, scale);
    const sim = r.simulate(plan);
    const out = r.resolve(plan, sim);
    expect(out.kind).toBe('water');
    if (out.kind === 'water') expect(out.penalty).toBe('red');
  });
});

describe('Langston: the two-tier 13th green', () => {
  it('the small front tier is about 4-5 ft below the bigger back tier, and the pin is on the back tier', () => {
    const h = json.holes.find((x) => x.number === 13)!;
    const g = json.greens.find((x) => x.id === h.greenId)! as (typeof json.greens)[number] & { tiers?: { x: number; y: number; nx: number; ny: number; w: number; h: number }[] };
    expect(g.tiers).toHaveLength(1);
    const t = g.tiers![0];
    expect(t.h).toBeGreaterThan(1.2);
    expect(t.h).toBeLessThan(1.53);
    // the normal points from the tee towards the back of the green
    const cl = h.tees.Royal.centerline;
    const [ax, ay] = cl[cl.length - 2], [bx, by] = cl[cl.length - 1];
    expect((bx - ax) * t.nx + (by - ay) * t.ny).toBeGreaterThan(0);
    // the back tier is the bigger part of the green
    const poly = course.greenPolys.get(h.greenId)!;
    let front = 0, back = 0;
    for (let x = poly.minX; x <= poly.maxX; x += 0.5) for (let y = poly.minY; y <= poly.maxY; y += 0.5) {
      if (!poly.contains(x, y)) continue;
      if ((x - t.x) * t.nx + (y - t.y) * t.ny > 0) back++; else front++;
    }
    expect(back).toBeGreaterThan(1.5 * front);
    const Z = (x: number, y: number) => course.terrain.z(x, y);
    const step = Z(t.x + 4 * t.nx, t.y + 4 * t.ny) - Z(t.x - 4 * t.nx, t.y - 4 * t.ny);
    expect(step).toBeGreaterThan(1.2);
    const [px, py] = h.pin;
    expect((px - t.x) * t.nx + (py - t.y) * t.ny).toBeGreaterThan(t.w / 2 + 3);
  });
});

describe('Langston: playing surfaces and trees', () => {
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
      if (!seq.includes(SURF.fairway)) continue; // par 3s with no fairway (4, 13 over the water)
      const first = seq.find((v) => v !== SURF.green && v !== SURF.fringe);
      expect([SURF.fairway, SURF.bunker, SURF.cartpath, SURF.water], `hole ${h.number}`).toContain(first);
    }
  });

  it('no flowering trees (anacostia theme)', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(json.theme).toBe('anacostia');
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
});

for (const ts of ['Royal', 'White']) {
  describe(`Langston from the ${ts} tees`, () => {
    const c = ts === json.defaultTee ? course : loadCourseFiles(ID, (j) => ({ ...j, defaultTee: ts }));

    it('the default aim keeps a perfect tee shot out of the trees and the water on every hole', () => {
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

it('Langston: same seed, same inputs -> identical round', () => {
  const play = () => {
    const r = new Round(course, roundCfg(course, [10], 99));
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

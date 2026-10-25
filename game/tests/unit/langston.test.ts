// Langston Golf Course (Kingman Lake, Washington DC): course-specific checks of
// COURSE_BUILD.md 8.2 for both tee sets, plus the developer's calls of
// 2026-10-19 (the two OSM boundary parts joined across Kingman Lake as one red
// penalty area, the hole 10 back tee across the lake, red water everywhere,
// fairways up to the greens, no flowering trees).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { Round } from '../../src/systems/game/round';
import { SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, roundCfg } from './helpers';

const ID = 'langston';
// holes accepted outside 3% until the developer decides (data/langston/validation_report.md)
// 2 Royal, 13 White and 14 White: flags since the tees centred on their boxes (design chat, 2026-10-20; DECISIONS.md "Overnight requests")
// over 8%, accepted by the developer (2026-10-19): Royal 6 plays from the White box (no Royal box mapped)

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
  it('no pocket of rough is left inside a fairway (joins of the s02b approaches; developer, 2026-10-21)', () => {
    const dir = resolve(COURSES_DIR, ID);
    const png = PNG.sync.read(readFileSync(resolve(dir, 'surface.png')));
    const ids = (JSON.parse(readFileSync(resolve(dir, 'surface_legend.json'), 'utf8')) as { ids: Record<string, number> }).ids;
    const W = png.width, H = png.height;
    const at = (i: number) => png.data[i * 4];
    const seen = new Uint8Array(W * H);
    const pockets: string[] = [];
    const inside = new Set([ids.fairway, ids.green, ids.fringe]);
    for (let start = 0; start < W * H; start++) {
      if (seen[start] || at(start) !== ids.rough) continue;
      // flood one rough patch; keep it if it is small (<= 100 m2) and nearly all its rim is fairway/green
      const stack = [start];
      seen[start] = 1;
      let n = 0, rim = 0, rimIn = 0, sx = 0, sy = 0;
      while (stack.length) {
        const k = stack.pop()!;
        n++; sx += k % W; sy += Math.floor(k / W);
        const x = k % W, y = Math.floor(k / W);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (at(q) === ids.rough) { if (!seen[q]) { seen[q] = 1; stack.push(q); } } else { rim++; if (inside.has(at(q))) rimIn++; }
        }
      }
      if (n <= 400 && rim > 0 && rimIn / rim > 0.9) pockets.push(`${(sx / n / 2).toFixed(0)},${(H / 2 - sy / n / 2).toFixed(0)}`);
    }
    expect(pockets).toEqual([]);
  });

  it('no flowering trees (anacostia theme)', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(json.theme).toBe('anacostia');
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
  });

});


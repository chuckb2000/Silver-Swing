// The checks every course gets (docs/COURSE_BUILD.md 8.2), run on every course in the
// course list. A course chat writes no test code for these: what differs per course (an
// accepted yardage flag, a hole whose default aim may find the trees, points that must be
// water or in bounds, the wind band) goes in data/<data id>/checks.json (schema below and in
// COURSE_BUILD.md 8.2). Only a check that fits nowhere here gets its own <id>.test.ts.
//
// checks.json (every key optional; for a site with layouts, "courses": {"<game id>": {...}}
// overrides per layout):
//   yardage:   {"tolerance": 0.08 (default: the fail line; 3-8 % flags are in validation_report.md), "max": {"17": 0.08, "3 White": 0.05}, "range_yd": {"8": [195, 215]}, "skip": ["5 Red"]}
//   wind_mph:  [3, 14]                       the course's band (also checked against course.json)
//   water:     {"penalty": "red" | "any", "count": 3, "min_count": 1, "ids": ["channel_w1"]}
//   tees:      {"sets": ["Blue"], "surfaces": ["tee", "fairway"], "holes": {"7": ["fairway"]}}   where a tee may stand
//   tee_shot_clear: {"sets": ["Blue", "White"], "skip": [5]}   the every-course rule (default: the default tee, every hole)
//   default_aim:    {"skip": [3], "allow_ob": false}
//   centre_line_clear: {"skip": [7, 10]}     opt-in: a perfect drive down the hole line touches no tree
//   inside_boundary:   true                  opt-in: every tee, pin and centre-line point is inside the boundary
//   fairway_meets_green: {"skip": [4]}       opt-in: walking back from the green, past the fringe comes fairway/sand/path/water
//   no_tree_in_fairway: true                 opt-in: no tree trunk deep inside a fairway
//   robot_seeds: [7]
//   max_tree_h_m: 65                         the tallest tree allowed (power lines read as trees made 60 m+ "trees")
//   no_tree_in_water: true                   opt-in: no tree stands in a penalty area (a pond; creeks in ravines keep their trees)
//   points:    [{"x": 860, "y": 700, "surface": "water", "inside": true, "why": "Kingman Lake"},
//               {"x": 10, "y": 20, "ob": true}, {"x": 5, "y": 6, "not": "ob"}]
//   trees:     [{"x": 585.5, "y": 1269.5, "r": 2, "absent": true, "why": "developer, 2026-10-20"},
//               {"x": 1, "y": 2, "r": 5, "present": true}]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CourseJson, CourseRuntime, HeightMeta } from '../../src/data/course';
import { Round } from '../../src/systems/game/round';
import { CANOPY_START, TRUNK_R } from '../../src/systems/physics/obstacles';
import { Rng } from '../../src/systems/physics/rng';
import { simulateShot } from '../../src/systems/physics/sim';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, robotRound, roundCfg } from './helpers';

const DATA_DIR = resolve(__dirname, '../../../data');

interface Checks {
  yardage?: { tolerance?: number; max?: Record<string, number>; range_yd?: Record<string, [number, number]>; skip?: string[] };
  wind_mph?: [number, number];
  water?: { penalty?: 'red' | 'yellow' | 'any'; count?: number; min_count?: number; ids?: string[] };
  tees?: { sets?: string[]; surfaces?: string[]; holes?: Record<string, string[]> };
  tee_shot_clear?: { sets?: string[]; skip?: number[] } | false;
  default_aim?: { skip?: number[]; allow_ob?: boolean } | false;
  centre_line_clear?: { skip?: number[] };
  inside_boundary?: boolean;
  fairway_meets_green?: { skip?: number[] } | boolean;
  no_tree_in_fairway?: boolean;
  robot_seeds?: number[];
  max_tree_h_m?: number;
  no_tree_in_water?: boolean;
  points?: { x: number; y: number; surface?: string; not?: string; ob?: boolean; inside?: boolean; why?: string }[];
  trees?: { x: number; y: number; r: number; absent?: boolean; present?: boolean; why?: string }[];
  courses?: Record<string, Checks>;
}

/** game course id -> its data folder (a layout's folder is the site's) */
function dataIds(): Map<string, string> {
  const out = new Map<string, string>();
  for (const d of readdirSync(DATA_DIR)) {
    const f = resolve(DATA_DIR, d, 'course_config.json');
    if (!existsSync(f)) continue;
    const cfg = JSON.parse(readFileSync(f, 'utf8')) as { id?: string; layouts?: { id?: string }[] };
    out.set(cfg.id ?? d, d);
    for (const l of cfg.layouts ?? []) if (l.id) out.set(l.id, d);
  }
  return out;
}

function checksFor(id: string, dataId: string | undefined): Checks {
  const f = dataId && resolve(DATA_DIR, dataId, 'checks.json');
  const all = f && existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as Checks) : {};
  const { courses, ...base } = all;
  return { ...base, ...(courses?.[id] ?? {}) };
}

const surfId = (name: string): number => {
  const v = (SURF as Record<string, number>)[name];
  if (v === undefined) throw new Error(`checks.json: no surface "${name}" (game names: ${Object.keys(SURF).join(', ')})`);
  return v;
};

const calm = { dir: 0, mph: 0, vx: 0, vy: 0 };

/** The first tree a perfect shot along `aim` meets, or null (no wind, a sure branch hit). */
function treeOnShot(course: CourseRuntime, hole: number, tee: string, aimAt?: 'line' | 'fairway', within = 1e9) {
  const r = new Round(course, { ...roundCfg(course, [hole]), tee });
  r.startHole(0);
  r.wind = calm;
  const club = r.autoClub();
  const scale = r.autoSwingScale(club);
  const base = r.lineAim(club, scale);
  const b = r.ball;
  let aim = base;
  if (aimAt === 'fairway' && r.fullCarry(club) * scale < 0.92 * r.distToPin()) {
    // the middle of the fairway run nearest the line, where the drive lands
    const carry = r.fullCarry(club) * scale;
    const lx = b.x + Math.cos(base) * carry, ly = b.y + Math.sin(base) * carry;
    const px = -Math.sin(base), py = Math.cos(base);
    const fw: number[] = [];
    for (let s = -45; s <= 45; s += 0.5) if (course.terrain.surface(lx + px * s, ly + py * s) === SURF.fairway) fw.push(s);
    const runs: number[][] = [];
    for (const s of fw) { const R = runs[runs.length - 1]; if (R && s - R[R.length - 1] <= 1) R.push(s); else runs.push([s]); }
    runs.sort((a, c) => Math.min(...a.map(Math.abs)) - Math.min(...c.map(Math.abs)));
    const mid = runs.length ? (runs[0][0] + runs[0][runs[0].length - 1]) / 2 : 0;
    aim = Math.atan2(ly + py * mid - b.y, lx + px * mid - b.x);
  } else if (aimAt === 'fairway') {
    aim = Math.atan2(r.pin.y - b.y, r.pin.x - b.x);
  }
  class AlwaysHit extends Rng { next(): number { return 0; } }
  const plan = r.plan(club.id, aim, meterFor(1, 0, false), 0, scale);
  const sim = simulateShot(course.terrain, course.obstacles, plan.spec, new AlwaysHit(1));
  const ev = sim.events.find((e) => (e.type === 'trunk' || e.type === 'canopy') && Math.hypot(e.x - b.x, e.y - b.y) < within);
  return ev ? `${ev.type} ${Math.hypot(ev.x - b.x, ev.y - b.y).toFixed(0)} m out` : null;
}

/** Trees a perfect drive along the hole line passes through (geometric: trunk or crown at ball height). */
function treesOnLine(course: CourseRuntime, hole: number, tee: string): string[] {
  const r = new Round(course, { ...roundCfg(course, [hole]), tee });
  r.startHole(0);
  r.wind = calm;
  const R = r as unknown as { flightSpec: Function; perfectStrike: Function };
  const club = r.autoClub();
  const scale = r.autoSwingScale(club);
  const spec = R.flightSpec(club, r.lineAim(club, scale), R.perfectStrike(club, scale), 0, { vx: 0, vy: 0 });
  const sim = simulateShot(course.terrain, null, spec, new Rng(1));
  const out: string[] = [];
  for (let k = 0; k < sim.n; k++) {
    const x = sim.samples[3 * k], y = sim.samples[3 * k + 1], z = sim.samples[3 * k + 2];
    for (const ti of course.obstacles.treesNear(x, y)) {
      const t = course.obstacles.trees[ti];
      const d = Math.hypot(x - t.x, y - t.y), hz = z - t.base;
      if ((d < TRUNK_R + 0.03 && hz < t.h && hz > -0.1) || (d < t.r && hz > t.h * CANOPY_START && hz < t.h)) out.push(`${t.x.toFixed(0)},${t.y.toFixed(0)}`);
    }
  }
  return [...new Set(out)];
}

const ids = dataIds();

for (const info of registry()) {
  const id = info.id;
  const ck = checksFor(id, ids.get(id));
  describe(`${id}: the every-course checks`, () => {
    const course = loadCourseFiles(id);
    const json: CourseJson = course.json;
    const holes = json.holes.map((h) => h.number);
    const sets = ck.tees?.sets ?? json.teeSets?.map((t) => t.name) ?? [json.defaultTee];

    it('decodes heights exactly (pipeline samples)', () => {
      const hmeta = JSON.parse(readFileSync(resolve(COURSES_DIR, id, 'height.json'), 'utf8')) as HeightMeta;
      for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
    });

    it('every tee stands on its tee box and every pin on its green', () => {
      const ok = (ck.tees?.surfaces ?? ['tee']).map(surfId);
      for (const h of json.holes) {
        for (const ts of sets) {
          const t = h.tees[ts];
          if (!t) continue;
          const allowed = ck.tees?.holes?.[String(h.number)]?.map(surfId) ?? ok;
          expect(allowed, `hole ${h.number} ${ts} tee`).toContain(course.terrain.surface(t.x, t.y));
        }
        expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
      }
    });

    it('measured yardages are within tolerance of the card (accepted flags in checks.json)', () => {
      const y = ck.yardage ?? {};
      for (const h of json.holes) for (const ts of sets) {
        const t = h.tees[ts];
        if (!t || !t.cardYd) continue;
        const key = `${h.number} ${ts}`;
        if (y.skip?.includes(key) || y.skip?.includes(String(h.number))) continue;
        const range = y.range_yd?.[key] ?? y.range_yd?.[String(h.number)];
        if (range) {
          expect(t.adjYd, key).toBeGreaterThanOrEqual(range[0]);
          expect(t.adjYd, key).toBeLessThanOrEqual(range[1]);
          continue;
        }
        const tol = y.max?.[key] ?? y.max?.[String(h.number)] ?? y.tolerance ?? 0.08; // over 8% the pipeline stops and asks (CLAUDE.md 5.5)
        expect(Math.abs(t.adjYd - t.cardYd) / t.cardYd, key).toBeLessThanOrEqual(tol);
      }
    });

    it('penalty areas are as set (red by the standing default)', () => {
      const w = ck.water ?? {};
      const pen = w.penalty ?? 'red';
      if (pen !== 'any') for (const x of course.water) expect(x.penalty, x.id).toBe(pen);
      if (w.count !== undefined) expect(course.water.length).toBe(w.count);
      if (w.min_count !== undefined) expect(course.water.length).toBeGreaterThanOrEqual(w.min_count);
      for (const wid of w.ids ?? []) expect(json.water.some((x) => x.id === wid), wid).toBe(true);
    });

    if (ck.points?.length) it('the listed points are what checks.json says', () => {
      for (const p of ck.points!) {
        const s = course.terrain.surface(p.x, p.y);
        const label = `${p.x},${p.y}${p.why ? ` (${p.why})` : ''}`;
        if (p.surface) expect(s, label).toBe(surfId(p.surface));
        if (p.not === 'ob') expect(isOB(s), label).toBe(false);
        else if (p.not) expect(s, label).not.toBe(surfId(p.not));
        if (p.ob !== undefined) expect(isOB(s), label).toBe(p.ob);
        if (p.inside !== undefined) expect(course.boundary.contains(p.x, p.y), label).toBe(p.inside);
      }
    });

    if (ck.trees?.length) it('the listed trees are gone or there, as checks.json says', () => {
      for (const t of ck.trees!) {
        const n = course.obstacles.trees.filter((x) => Math.hypot(x.x - t.x, x.y - t.y) < t.r).length;
        const label = `${t.x},${t.y} r ${t.r}${t.why ? ` (${t.why})` : ''}`;
        if (t.absent) expect(n, label).toBe(0);
        if (t.present) expect(n, label).toBeGreaterThan(0);
      }
    });

    if (ck.tee_shot_clear !== false) it('a perfect tee shot at the middle of the fairway clears the trees around the tee (the every-course rule)', () => {
      const c = ck.tee_shot_clear || {};
      const blocked: string[] = [];
      for (const ts of c.sets ?? [json.defaultTee]) for (const h of json.holes) {
        if (c.skip?.includes(h.number) || !h.tees[ts]) continue;
        const ev = treeOnShot(course, h.number, ts, 'fairway', 60);
        if (ev) blocked.push(`${h.number} ${ts} (${ev})`);
      }
      expect(blocked).toEqual([]);
    });

    if (ck.centre_line_clear) it('a perfect drive down the hole line touches no tree', () => {
      const blocked: string[] = [];
      for (const h of json.holes) {
        if (h.par === 3 || ck.centre_line_clear!.skip?.includes(h.number)) continue;
        for (const t of treesOnLine(course, h.number, json.defaultTee)) blocked.push(`hole ${h.number}: tree at ${t}`);
      }
      expect(blocked).toEqual([]);
    });

    if (ck.default_aim !== false) it('the default aim keeps a perfect tee shot out of the trees, the water and OB', () => {
      const c = ck.default_aim || {};
      for (const h of json.holes) {
        if (c.skip?.includes(h.number)) continue;
        const r = new Round(course, roundCfg(course, [h.number]));
        r.startHole(0);
        r.wind = calm;
        const club = r.autoClub();
        const scale = r.autoSwingScale(club);
        const sim = r.simulate(r.plan(club.id, r.defaultAim(club, scale), meterFor(1, 0, false), 0, scale));
        expect(sim.restSurface, `hole ${h.number}`).not.toBe(SURF.woods);
        if (!c.allow_ob) expect(isOB(sim.restSurface), `hole ${h.number}`).toBe(false);
        expect(sim.inWater, `hole ${h.number}`).toBe(false);
      }
    });

    if (ck.inside_boundary) it('every tee, pin and centre-line point is inside the boundary', () => {
      for (const h of json.holes) {
        for (const ts of sets) {
          const t = h.tees[ts];
          if (!t) continue;
          for (const [x, y] of [[t.x, t.y], ...t.centerline]) expect(course.boundary.contains(x, y), `hole ${h.number} ${ts} ${x.toFixed(0)},${y.toFixed(0)}`).toBe(true);
        }
        expect(course.boundary.contains(h.pin[0], h.pin[1]), `hole ${h.number} pin`).toBe(true);
      }
    });

    if (ck.fairway_meets_green) it('every fairway runs into its green (no rough between fairway and fringe)', () => {
      const skip = typeof ck.fairway_meets_green === 'object' ? ck.fairway_meets_green.skip ?? [] : [];
      const S = course.terrain;
      for (const h of json.holes) {
        if (skip.includes(h.number)) continue;
        const cl = h.tees[json.defaultTee].centerline;
        const [gx, gy] = cl[cl.length - 1];
        const [ax, ay] = cl[cl.length - 2];
        const L = Math.hypot(ax - gx, ay - gy);
        const ux = (ax - gx) / L, uy = (ay - gy) / L;
        const seq: number[] = [];
        for (let d = 0; d <= Math.min(60, L); d += 0.5) seq.push(S.surface(gx + ux * d, gy + uy * d));
        if (!seq.includes(SURF.fairway)) continue; // no fairway near the green (some par 3s)
        const first = seq.find((v) => v !== SURF.green && v !== SURF.fringe);
        expect([SURF.fairway, SURF.bunker, SURF.cartpath, SURF.water, SURF.waste], `hole ${h.number}`).toContain(first);
      }
    });

    if (ck.no_tree_in_fairway) it('no tree stands inside a fairway', () => {
      const S = course.terrain;
      const deep = course.obstacles.trees.filter((x) => [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].every(([dx, dy]) => S.surface(x.x + dx, x.y + dy) === SURF.fairway));
      expect(deep.map((x) => `${x.x.toFixed(0)},${x.y.toFixed(0)}`)).toEqual([]);
    });

    it('no tree is implausibly tall (power lines and roofs read as trees)', () => {
      const tall = course.obstacles.trees.filter((t) => t.h > (ck.max_tree_h_m ?? 65));
      expect(tall.map((t) => `${t.x.toFixed(0)},${t.y.toFixed(0)} ${t.h.toFixed(0)} m`)).toEqual([]);
    });

    if (ck.no_tree_in_water) it('no tree stands in a penalty area inside the boundary', () => {
      const wet = course.obstacles.trees.filter((t) => course.terrain.surface(t.x, t.y) === SURF.water && course.boundary.contains(t.x, t.y));
      expect(wet.map((t) => `${t.x.toFixed(0)},${t.y.toFixed(0)}`)).toEqual([]);
    });

    it('a robot golfer completes every hole with legal, finite scores', () => {
      for (const seed of ck.robot_seeds ?? [7]) {
        const r = robotRound(course, holes, seed);
        expect(r.scores).toHaveLength(holes.length);
        for (const s of r.scores) {
          expect(s.strokes).toBeGreaterThanOrEqual(1);
          expect(s.strokes).toBeLessThan(16);
        }
      }
    });

    it('wind stays inside the course range', () => {
      if (ck.wind_mph) expect([json.wind?.minMph, json.wind?.maxMph]).toEqual(ck.wind_mph);
      const lo = json.wind?.minMph ?? 0, hi = json.wind?.maxMph ?? 99;
      for (const seed of [1, 2, 3, 99]) {
        const r = new Round(course, roundCfg(course, holes, seed));
        for (const x of r.winds) {
          expect(x.mph).toBeGreaterThanOrEqual(lo);
          expect(x.mph).toBeLessThanOrEqual(hi);
        }
      }
    });

    it('far, near and close-up putting views cover every pin', () => {
      const views = json.greenViews ?? [];
      expect(views).toHaveLength(json.holes.length);
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
        const r = new Round(course, roundCfg(course, [holes[Math.min(8, holes.length - 1)]], 99));
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

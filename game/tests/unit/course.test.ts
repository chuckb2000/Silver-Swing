// Integration: the real Oswego Lake data through the round engine (no Phaser).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildRuntime, CourseJson, CourseRuntime, decodeHeights, decodeSurface, HeightMeta } from '../../src/data/course';
import { Round, RoundConfig } from '../../src/systems/game/round';
import { FULL_MAX, PART_MAX, SwingMeter } from '../../src/systems/swing/meter';
import { SURF } from '../../src/systems/physics/surfaces';

const base = resolve(__dirname, '../../public/courses/oswego_lake');
let course: CourseRuntime;

function png(file: string) {
  const p = PNG.sync.read(readFileSync(resolve(base, file)));
  return { data: new Uint8ClampedArray(p.data.buffer, p.data.byteOffset, p.data.length), w: p.width, h: p.height };
}

beforeAll(() => {
  const json = JSON.parse(readFileSync(resolve(base, 'course.json'), 'utf8')) as CourseJson;
  const hmeta = JSON.parse(readFileSync(resolve(base, 'height.json'), 'utf8')) as HeightMeta;
  const trees = JSON.parse(readFileSync(resolve(base, 'trees.json'), 'utf8'));
  const h = png(json.height.file);
  const s = png(json.surface.file);
  course = buildRuntime(json, decodeHeights(h.data, hmeta), hmeta, decodeSurface(s.data, s.w, s.h), trees, base);
});

const cfg = (holes: number[], seed = 7): RoundConfig => ({
  courseId: 'oswego_lake', tee: 'Blue', holes, playerName: 'test', seed,
  settings: { difficulty: 'normal', lefty: false, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
  startedAt: '2026-10-18T00:00:00Z',
});

/** Meter result for a target power and a tap-3 error (in % of bar). */
function meterFor(power: number, err: number, putt: boolean) {
  const m = new SwingMeter(putt ? 'putt' : 'full', 1.6, putt ? PART_MAX : FULL_MAX);
  const speed = m.speed;
  m.tap(0);
  const t2 = (power * 100) / speed;
  m.tap(t2);
  m.tap(t2 + (power * 100 - err) / speed);
  return m.result!;
}

describe('Oswego Lake course data', () => {
  it('decodes heights exactly (pipeline samples)', () => {
    const hmeta = JSON.parse(readFileSync(resolve(base, 'height.json'), 'utf8')) as HeightMeta;
    for (const [i, j, z] of hmeta.samples) expect(course.terrain.baseZ(i, j)).toBeCloseTo(z, 2);
  });

  it('every tee is on a tee box and every pin on its green', () => {
    for (const h of course.json.holes) {
      const t = h.tees.Blue;
      if (h.number !== 3) expect([SURF.tee, SURF.fairway]).toContain(course.terrain.surface(t.x, t.y));
      expect(course.greenPolys.get(h.greenId)!.contains(h.pin[0], h.pin[1])).toBe(true);
    }
  });

  it('measured Blue yardages are within 3% of the card', () => {
    for (const h of course.json.holes) {
      const t = h.tees.Blue;
      expect(Math.abs(t.adjYd - t.cardYd) / t.cardYd).toBeLessThanOrEqual(0.03);
    }
  });

  it('a robot golfer completes all 18 holes with legal, finite scores', () => {
    const r = new Round(course, cfg(Array.from({ length: 18 }, (_, i) => i + 1)));
    r.startHole(0);
    let guard = 0;
    let down = 0; // clubs to drop after a penalty (a human would take less club too)
    let hole = r.holeNumber;
    while (!r.finished && guard++ < 400) {
      if (r.holeNumber !== hole) { hole = r.holeNumber; down = 0; }
      let club = r.autoClub();
      if (club.kind !== 'putter' && down > 0) {
        const bag = r.allowedClubs().filter((c) => c.kind !== 'putter');
        club = bag[Math.min(bag.length - 1, bag.findIndex((c) => c.id === club.id) + down)];
      }
      const putt = club.kind === 'putter';
      const scale = r.autoSwingScale(club);
      const aim = r.defaultAim(club, scale);
      const d = r.distToPin();
      const power = putt ? Math.min(1, (d * 1.1 + 0.3) / scale) : Math.max(0.15, Math.min(1, d / Math.max(1, r.fullCarry(club) * scale)));
      const plan = r.plan(club.id, aim, meterFor(power, (guard % 5) - 2, putt), 0, scale);
      const sim = r.simulate(plan);
      expect(Number.isFinite(sim.end.x) && Number.isFinite(sim.end.y)).toBe(true);
      const out = r.resolve(plan, sim);
      if (out.kind === 'holed' || out.kind === 'gimme') { r.finishHole(); r.nextHole(); continue; }
      if (out.kind === 'water' || out.kind === 'ob') { down++; r.applyRelief(out.options[0], out.options[0].center); }
      if (out.kind === 'wrong_green' || out.kind === 'cartpath') r.applyRelief(out.area, out.area.center);
      if (r.tally.strokes > 14) { r.finishHole(true); r.nextHole(); }
    }
    expect(r.scores).toHaveLength(18);
    for (const s of r.scores) {
      expect(s.strokes).toBeGreaterThanOrEqual(1);
      expect(s.strokes).toBeLessThan(16);
    }
  });

  it('the default aim keeps a perfect tee shot out of the trees on every hole', () => {
    for (const h of course.json.holes) {
      const r = new Round(course, cfg([h.number]));
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

  it('wind drifts slowly through a round and stays inside the course range (1-7 mph)', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const r = new Round(course, cfg(Array.from({ length: 18 }, (_, i) => i + 1), seed));
      for (let i = 0; i < r.winds.length; i++) {
        const w = r.winds[i];
        expect(w.mph).toBeGreaterThanOrEqual(1);
        expect(w.mph).toBeLessThanOrEqual(7);
        if (i > 0) {
          const prev = r.winds[i - 1];
          expect(Math.abs(w.mph - prev.mph)).toBeLessThanOrEqual(1.25);
          const turn = Math.abs(Math.atan2(Math.sin(w.dir - prev.dir), Math.cos(w.dir - prev.dir))) * 180 / Math.PI;
          expect(turn).toBeLessThanOrEqual(18.01);
        }
      }
    }
  });

  it('short shots get a shorter swing so the meter is not rushed', () => {
    const r = new Round(course, cfg([1]));
    r.startHole(0);
    const pin = r.pin;
    r.ball = { x: pin.x + 25, y: pin.y, teedUp: false };
    r.refreshLie();
    const club = r.autoClub();
    const scale = r.autoSwingScale(club);
    expect(scale).toBeLessThan(1);
    // the needed power lands in the comfortable part of the meter
    const need = r.distToPin() / (r.fullCarry(club) * scale);
    expect(need).toBeGreaterThan(0.45);
    expect(need).toBeLessThanOrEqual(0.9);
  });

  it('every hole has far, near and close-up putting views covering its pin, with all tree frames', () => {
    const views = course.json.greenViews ?? [];
    expect(views).toHaveLength(18);
    for (const gv of views) {
      const h = course.json.holes[gv.hole - 1];
      const green = course.greenPolys.get(h.greenId)!;
      expect(gv.close, `hole ${gv.hole} close-up`).toBeDefined();
      for (const v of [gv.far, gv.near, gv.close!]) {
        const inside = (x: number, y: number, m: number) => x > v.x0 + m && x < v.x0 + v.w - m && y < v.y1 - m && y > v.y1 - v.h + m;
        expect(inside(h.pin[0], h.pin[1], 12), `hole ${gv.hole} pin (${v.ppm} px/m)`).toBe(true);
        if (v === gv.far) expect(inside(green.minX, green.minY, 10) && inside(green.maxX, green.maxY, 10), `hole ${gv.hole} green`).toBe(true);
        const art = PNG.sync.read(readFileSync(resolve(base, v.file)));
        expect(art.width).toBe(v.w * v.ppm);
        expect(art.height).toBe(v.h * v.ppm);
        const atlas = JSON.parse(readFileSync(resolve(base, v.trees), 'utf8'));
        for (const t of atlas.trees) expect(atlas.frames[t.f], `hole ${gv.hole} frame ${t.f}`).toBeDefined();
      }
      expect(gv.near.ppm).toBe(2 * gv.far.ppm);
      expect(gv.close!.ppm).toBe(2 * gv.near.ppm);
    }
  });

  it('same seed, same inputs -> identical round', () => {
    const play = () => {
      const r = new Round(course, cfg([5], 99));
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

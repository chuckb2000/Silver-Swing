// Hole locations (systems/game/pins.ts): the developer's rules, on every course:
// keep the centre pin, add 2-3 more per green, every pin at least 10 ft from
// every edge of the green (14 ft where the green allows, after "a little too
// close to the edge"); and every round gets a mix of pin positions.
import { describe, expect, it } from 'vitest';
import { courseHoleFor, Round } from '../../src/systems/game/round';
import { coursePins, PIN_EDGE_MIN_M, PIN_EDGE_PREFERRED_M, PIN_MAX_SLOPE, PIN_MIN_SEP_M, pinSheet, roundPins, slopeAround } from '../../src/systems/game/pins';
import { loadCourseFiles, registry, roundCfg } from './helpers';

const courses = registry().map((c) => ({ id: c.id, course: loadCourseFiles(c.id) }));

describe('hole locations on every green', () => {
  for (const { id, course } of courses) {
    it(`${id}: centre pin kept, 2-3 more, 10 ft from every edge, gentle, spread out`, () => {
      const all = coursePins(course, course.json.defaultTee);
      expect(all).toHaveLength(course.json.holes.length);
      all.forEach((spots, i) => {
        const h = course.json.holes[i];
        const g = course.terrain.greens.find((m) => m.def.id === h.greenId)!;
        const tag = `${id} hole ${h.number}`;
        expect(spots[0].centre, tag).toBe(true);
        expect([spots[0].x, spots[0].y], tag).toEqual(h.pin);
        expect(spots.length, `${tag}: locations`).toBeGreaterThanOrEqual(3);
        expect(spots.length, `${tag}: locations`).toBeLessThanOrEqual(4);
        for (const s of spots) {
          expect(g.poly.contains(s.x, s.y), `${tag} on the green`).toBe(true);
          expect(g.poly.edgeDistance(s.x, s.y), `${tag} 10 ft from the edge`).toBeGreaterThanOrEqual(PIN_EDGE_MIN_M - 1e-6);
          if (!s.centre) expect(slopeAround(g, s.x, s.y), `${tag} slope`).toBeLessThanOrEqual(PIN_MAX_SLOPE + 1e-9);
        }
        for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
          expect(Math.hypot(spots[a].x - spots[b].x, spots[a].y - spots[b].y), `${tag} apart`).toBeGreaterThanOrEqual(PIN_MIN_SEP_M - 1e-6);
        }
      });
    }, 60_000);
  }

  it('extra pins sit 14 ft from the edge wherever the green has room (12 or 10 ft only on small greens)', () => {
    let extra = 0, far = 0;
    for (const { course } of courses) {
      for (const spots of coursePins(course, course.json.defaultTee)) {
        for (const s of spots) if (!s.centre) { extra++; if (s.edge >= PIN_EDGE_PREFERRED_M - 1e-6) far++; }
      }
    }
    expect(far / extra).toBeGreaterThan(0.85);
  });

  it('greens offer a mix: hard, easy and medium pins in different parts of the green', () => {
    let hard = 0, easy = 0, greens = 0, zones = 0;
    for (const { course } of courses) {
      for (const spots of coursePins(course, course.json.defaultTee)) {
        greens++;
        if (spots.some((s) => s.difficulty === 3)) hard++;
        if (spots.some((s) => s.difficulty === 1)) easy++;
        zones += new Set(spots.map((s) => s.depth)).size >= 2 ? 1 : 0;
      }
    }
    expect(hard / greens).toBeGreaterThan(0.6);
    expect(easy / greens).toBeGreaterThan(0.9);
    expect(zones / greens).toBeGreaterThan(0.95);
  });
});

describe('the pin sheet for a round', () => {
  const big = courses.filter(({ course }) => course.json.holes.length === 18);

  it('an 18-hole round mixes front, middle and back, and easy, medium and hard', () => {
    for (const { id, course } of big) {
      const spots = coursePins(course, course.json.defaultTee);
      for (const seed of [1, 2, 3, 99, 12345]) {
        const sheet = pinSheet(spots, seed);
        const picked = sheet.map((k, i) => spots[i][k]);
        const depth = { front: 0, middle: 0, back: 0 }, diff = [0, 0, 0, 0];
        for (const p of picked) { depth[p.depth]++; diff[p.difficulty]++; }
        const tag = `${id} seed ${seed}: ${JSON.stringify(depth)} ${diff.slice(1)}`;
        for (const k of ['front', 'middle', 'back'] as const) { expect(depth[k], tag).toBeGreaterThanOrEqual(4); expect(depth[k], tag).toBeLessThanOrEqual(8); }
        expect(diff[1], tag).toBeGreaterThanOrEqual(3);
        expect(diff[2], tag).toBeGreaterThanOrEqual(3);
        // small greens (Spruce Peak: seven with room for only two pins besides the centre) may need a fifth centre pin
        const tight = spots.filter((s) => s.length < 4).length >= 6;
        expect(picked.filter((p) => p.centre).length, tag).toBeLessThanOrEqual(tight ? 5 : 4);
        for (let i = 2; i < picked.length; i++) {
          const same = picked[i].depth === picked[i - 1].depth && picked[i].depth === picked[i - 2].depth;
          expect(same, `${tag}: holes ${i - 1}-${i + 1} at the same depth`).toBe(false);
        }
      }
    }
  }, 120_000);

  it('is fixed by the round seed, and different seeds give different sheets', () => {
    const { course } = big[0];
    const spots = coursePins(course, course.json.defaultTee);
    expect(pinSheet(spots, 42)).toEqual(pinSheet(spots, 42));
    const sheets = new Set([1, 2, 3, 4, 5, 6].map((s) => pinSheet(spots, s).join(',')));
    expect(sheets.size).toBeGreaterThanOrEqual(5);
  });

  it('a 9-hole course played twice uses a different pin the second time round', () => {
    const nine = courses.find(({ course }) => course.json.holes.length === 9)!;
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    for (const seed of [1, 2, 3]) {
      const pins = roundPins(nine.course, nine.course.json.defaultTee, holes.map((h) => courseHoleFor(h, 9)), seed);
      for (let i = 0; i < 9; i++) expect(pins[i + 9], `${nine.id} hole ${i + 1} seed ${seed}`).not.toEqual(pins[i]);
    }
  });

  it('the round plays the sheet: its pin, distances and intro label follow it', () => {
    const { course } = big[0];
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const cfg = { ...roundCfg(course, holes, 5), pins: roundPins(course, course.json.defaultTee, holes, 5) };
    const r = new Round(course, cfg);
    r.startHole(3);
    expect([r.pin.x, r.pin.y]).toEqual(cfg.pins[3]);
    expect(r.distToPin({ x: cfg.pins[3][0], y: cfg.pins[3][1] })).toBe(0);
    expect(r.pinLabel()).toMatch(/^(front|middle|back)( left| right)?$/);
    // a round saved before pins moved has none: the centre pin
    const old = new Round(course, roundCfg(course, holes, 5));
    old.startHole(3);
    expect([old.pin.x, old.pin.y]).toEqual(course.json.holes[3].pin);
  });
});

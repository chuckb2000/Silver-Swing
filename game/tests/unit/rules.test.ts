import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { Rng } from '../../src/systems/physics/rng';
import { SURF } from '../../src/systems/physics/surfaces';
import { flatTerrain, Polygon } from '../../src/systems/physics/terrain';
import { clubAllowed, lieModsFor, makeLie } from '../../src/systems/rules/lie';
import {
  CLUB_LENGTH, CourseCtx, freeReliefArea, obOptions, penaltyAreaOptions, suggestDrop, unplayableOptions, validDrop,
} from '../../src/systems/rules/relief';
import { compareRounds, HoleTally, scoreName, totals } from '../../src/systems/rules/scoring';

function ctx(): CourseCtx {
  const terrain = flatTerrain(SURF.rough, { width: 200, height: 200 });
  // a water strip at x 90..110, a cart path at y 50..52, a bunker 140..150 x 140..150
  const paint = (x0: number, y0: number, x1: number, y1: number, s: number) => {
    for (let y = y0 * 2; y < y1 * 2; y++) for (let x = x0 * 2; x < x1 * 2; x++) terrain.surf[(terrain.sH - 1 - y) * terrain.sW + x] = s;
  };
  paint(90, 0, 110, 200, SURF.water);
  paint(0, 50, 80, 52, SURF.cartpath);
  paint(140, 140, 150, 150, SURF.bunker);
  paint(20, 160, 30, 170, SURF.green); // a wrong (practice) green
  return {
    terrain,
    boundary: new Polygon([[1, 1], [199, 1], [199, 199], [1, 199], [1, 1]]),
    hole: { x: 180, y: 100 },
    holeGreen: new Polygon([[175, 95], [185, 95], [185, 105], [175, 105], [175, 95]]),
    otherGreens: [new Polygon([[20, 160], [30, 160], [30, 170], [20, 170], [20, 160]])],
  };
}

describe('lies (spec 7.4)', () => {
  const r = new Rng(5);
  it('rough is 80-90% (or a 105% flyer) with a 0.7 window', () => {
    for (let i = 0; i < 40; i++) {
      const l = makeLie({ surface: SURF.rough, teedUp: false, distToGreenEdge: 100, canopyBase: null }, r);
      expect(l.kind).toBe('rough');
      expect(l.windowMult).toBeCloseTo(0.7);
      expect(l.flyer ? l.distMult === 1.05 : l.distMult >= 0.8 && l.distMult <= 0.9).toBe(true);
    }
  });
  it('bunkers split into fairway and greenside at 30 m', () => {
    expect(makeLie({ surface: SURF.bunker, teedUp: false, distToGreenEdge: 31, canopyBase: null }, r).kind).toBe('fairway_bunker');
    expect(makeLie({ surface: SURF.bunker, teedUp: false, distToGreenEdge: 12, canopyBase: null }, r).kind).toBe('greenside_bunker');
  });
  it('club restrictions', () => {
    const rough = makeLie({ surface: SURF.rough, teedUp: false, distToGreenEdge: 100, canopyBase: null }, r);
    expect(clubAllowed(rough, clubById('dr'))).toBe(false);
    for (const surface of [SURF.fairway, SURF.fringe, SURF.cartpath, SURF.tee]) {
      // anywhere but teed up on the tee: no driver
      expect(clubAllowed(makeLie({ surface, teedUp: false, distToGreenEdge: 100, canopyBase: null }, new Rng(1)), clubById('dr'))).toBe(false);
    }
    expect(clubAllowed(makeLie({ surface: SURF.tee, teedUp: true, distToGreenEdge: 300, canopyBase: null }, new Rng(1)), clubById('dr'))).toBe(true);
    expect(clubAllowed(rough, clubById('3w'))).toBe(true);
    const fb = makeLie({ surface: SURF.bunker, teedUp: false, distToGreenEdge: 80, canopyBase: null }, r);
    expect(clubAllowed(fb, clubById('5w'))).toBe(false);
    expect(clubAllowed(fb, clubById('4h'))).toBe(true);
    const gb = makeLie({ surface: SURF.bunker, teedUp: false, distToGreenEdge: 5, canopyBase: null }, r);
    expect(clubAllowed(gb, clubById('pt'))).toBe(false);
  });
  it('greenside bunker: wedges splash at 45%, other clubs 50%; woods lose 20% more from rough', () => {
    const gb = makeLie({ surface: SURF.bunker, teedUp: false, distToGreenEdge: 5, canopyBase: null }, r);
    expect(lieModsFor(gb, clubById('sw')).splash).toBe(true);
    expect(lieModsFor(gb, clubById('7i')).distMult).toBeCloseTo(0.5);
    const rough = makeLie({ surface: SURF.rough, teedUp: false, distToGreenEdge: 100, canopyBase: null }, r);
    expect(lieModsFor(rough, clubById('3w')).distMult).toBeCloseTo(rough.distMult * 0.8);
  });
  it('under a canopy the apex is capped (punch shot)', () => {
    const l = makeLie({ surface: SURF.rough, teedUp: false, distToGreenEdge: 100, canopyBase: 9 }, r);
    expect(l.kind).toBe('trees');
    expect(l.apexCap).toBeCloseTo(8);
  });
});

describe('relief (spec 8)', () => {
  it('red penalty area offers three options, yellow two', () => {
    const c = ctx();
    expect(penaltyAreaOptions(c, 'red', { x: 40, y: 100 }, { x: 89, y: 100 }, null)).toHaveLength(3);
    expect(penaltyAreaOptions(c, 'yellow', { x: 40, y: 100 }, { x: 89, y: 100 }, null)).toHaveLength(2);
  });

  it('lateral relief is within 2 club-lengths, out of the water, no nearer the hole', () => {
    const c = ctx();
    const water = new Polygon([[90, 0], [110, 0], [110, 200], [90, 200], [90, 0]]);
    const opts = penaltyAreaOptions(c, 'red', { x: 40, y: 100 }, { x: 89.5, y: 100 }, water);
    const lateral = opts.find((o) => o.kind === 'lateral')!;
    const p = suggestDrop(c, lateral)!;
    expect(p).not.toBeNull();
    expect(Math.hypot(p.x - 89.5, p.y - 100)).toBeLessThanOrEqual(2 * CLUB_LENGTH + 1e-6);
    expect(c.terrain.surface(p.x, p.y)).not.toBe(SURF.water);
    expect(Math.hypot(p.x - 180, p.y - 100)).toBeGreaterThanOrEqual(Math.hypot(89.5 - 180, 0) - 1e-6);
    // a point nearer the hole is rejected
    expect(validDrop(c, lateral, { x: 89.9, y: 100 })).toBe(false);
  });

  it('back-on-the-line drops lie on the hole-reference line, behind the reference point', () => {
    const c = ctx();
    const line = penaltyAreaOptions(c, 'yellow', { x: 40, y: 100 }, { x: 89.5, y: 100 }, null)[1];
    const p = suggestDrop(c, line)!;
    expect(Math.abs(p.y - 100)).toBeLessThan(0.01);
    expect(p.x).toBeLessThan(89.5);
  });

  it('out of bounds is stroke and distance by default; E-5 adds a 2-stroke drop', () => {
    const c = ctx();
    expect(obOptions(c, { x: 10, y: 10 }, { x: 5, y: 5 }, false)).toHaveLength(1);
    const e5 = obOptions(c, { x: 10, y: 10 }, { x: 5, y: 5 }, true);
    expect(e5[1].penalty).toBe(2);
  });

  it('cart path relief: nearest point of complete relief plus one club-length, no nearer the hole', () => {
    const c = ctx();
    const cond = (x: number, y: number) => c.terrain.surface(x, y) === SURF.cartpath;
    const area = freeReliefArea(c, { x: 40, y: 51 }, cond, 'cart path')!;
    expect(area.penalty).toBe(0);
    expect(cond(area.center.x, area.center.y)).toBe(false);
    expect(Math.hypot(area.center.x - 40, area.center.y - 51)).toBeLessThan(2);
    const p = suggestDrop(c, area)!;
    expect(cond(p.x, p.y)).toBe(false);
  });

  it('unplayable in a bunker keeps two options in the bunker and offers a 2-stroke option outside', () => {
    const c = ctx();
    const opts = unplayableOptions(c, { x: 145, y: 145 }, { x: 100, y: 145 });
    expect(opts.filter((o) => o.bunker === 'in')).toHaveLength(2);
    const out = opts.find((o) => o.kind === 'unplayable_line_out')!;
    expect(out.penalty).toBe(2);
    const p = suggestDrop(c, out)!;
    expect(c.terrain.surface(p.x, p.y)).not.toBe(SURF.bunker);
  });

  it('drops on a wrong green are not allowed', () => {
    const c = ctx();
    const area = freeReliefArea(c, { x: 25, y: 165 }, (x, y) => c.otherGreens[0].contains(x, y), 'wrong green')!;
    expect(c.otherGreens[0].contains(area.center.x, area.center.y)).toBe(false);
  });
});

describe('scoring (spec 8.6 / 10.4)', () => {
  it('names scores', () => {
    expect(scoreName(3, 4)).toBe('birdie');
    expect(scoreName(1, 3)).toBe('hole in one!');
    expect(scoreName(6, 4)).toBe('double bogey');
  });
  it('tracks putts, fairways, greens in regulation and penalties', () => {
    const t = new HoleTally(1, 4);
    t.stroke(false); t.rested(false, true, true);
    t.stroke(false); t.rested(true, false, false);
    t.stroke(true); t.rested(true, false, false);
    t.penalty(1);
    const s = t.finish();
    expect(s.strokes).toBe(4);
    expect(s.putts).toBe(1);
    expect(s.fairway).toBe(true);
    expect(s.gir).toBe(true);
    expect(s.penalties).toBe(1);
    const tot = totals([s, { ...s, hole: 10, strokes: 5 }]);
    expect(tot.front).toBe(4);
    expect(tot.back).toBe(5);
  });
  it('ranks by gross, then back-nine countback, then date', () => {
    const a = { gross: 80, back: 39, date: '2026-01-02' };
    const b = { gross: 80, back: 40, date: '2026-01-01' };
    const c = { gross: 79, back: 41, date: '2026-01-03' };
    expect([a, b, c].sort(compareRounds)).toEqual([c, a, b]);
  });
});

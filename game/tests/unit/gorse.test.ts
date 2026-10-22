// Gorse (developer, 2026-10-20): "extremely penal. You should only be able to
// hit like 20-50 yards out of it and the shots should be quite erratic (so
// very small sweet spot and lots of red)."
import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { Rng } from '../../src/systems/physics/rng';
import { material, SURF, isOB } from '../../src/systems/physics/surfaces';
import { clubAllowed, GORSE, lieModsFor, makeLie } from '../../src/systems/rules/lie';
import { spinFor } from '../../src/systems/rules/lie';
import { GOOD_BAND, strikeFrom } from '../../src/systems/swing/outcome';
import { loadCourseFiles, meterFor, roundCfg } from './helpers';
import { Round } from '../../src/systems/game/round';

const YD = 0.9144;
const ctx = (surface: number) => ({ surface, teedUp: false, distToGreenEdge: 120, canopyBase: null });

describe('gorse', () => {
  it('is its own lie, in bounds, and the ball dies where it lands', () => {
    const lie = makeLie(ctx(SURF.gorse), new Rng(1));
    expect(lie.kind).toBe('gorse');
    expect(isOB(SURF.gorse)).toBe(false);
    expect(material(SURF.gorse).decel).toBeGreaterThan(material(SURF.rough).decel * 2);
    expect(material(SURF.gorse).kept).toBeLessThan(material(SURF.rough).kept);
  });

  it('caps every shot at 20-50 yd, whatever the club', () => {
    const caps = Array.from({ length: 200 }, (_, i) => makeLie(ctx(SURF.gorse), new Rng(i)).carryCap! / YD);
    expect(Math.min(...caps)).toBeGreaterThanOrEqual(20);
    expect(Math.max(...caps)).toBeLessThanOrEqual(50);
    expect(Math.max(...caps) - Math.min(...caps)).toBeGreaterThan(20); // it varies lie to lie
    const lie = makeLie(ctx(SURF.gorse), new Rng(5));
    for (const id of ['3w', '5i', '7i', 'pw', 'lw']) {
      const c = clubById(id);
      const s = strikeFrom(meterFor(1, 0, false), c, lieModsFor(lie, c), 2.5, false);
      expect(s.carry).toBeLessThanOrEqual(lie.carryCap! + 1e-9);
      expect(s.apex).toBeLessThan(c.apexM); // lower out of the bush
    }
  });

  it('has a tiny sweet spot and almost no yellow: lots of red', () => {
    const lie = makeLie(ctx(SURF.gorse), new Rng(2));
    const rough = makeLie(ctx(SURF.rough), new Rng(2));
    const c = clubById('9i');
    expect(lie.windowMult).toBeLessThan(rough.windowMult / 2);
    expect(lieModsFor(lie, c).goodBand).toBeLessThan(GOOD_BAND / 3);
    // a small miss that is "good" from the fairway is a hook or slice from the gorse
    const fair = makeLie(ctx(SURF.fairway), new Rng(2));
    const m = meterFor(0.6, 3, false);
    expect(strikeFrom(m, c, lieModsFor(fair, c), 2.5, false).quality).toBe('good');
    const g = strikeFrom(m, c, lieModsFor(lie, c), 2.5, false);
    expect(['hook', 'slice']).toContain(g.quality);
    expect(Math.abs(g.curveDeg)).toBeGreaterThan(Math.abs(strikeFrom(m, c, lieModsFor(fair, c), 2.5, false).curveDeg) * 2);
  });

  it('no driver, no putter, no spin', () => {
    const lie = makeLie(ctx(SURF.gorse), new Rng(3));
    expect(clubAllowed(lie, clubById('dr'))).toBe(false);
    expect(clubAllowed(lie, clubById('pt'))).toBe(false);
    expect(clubAllowed(lie, clubById('sw'))).toBe(true);
    expect(GORSE.minYd).toBe(20);
  });

  it('the club picked for you is a wedge to hack out, and the landing marker shows the capped carry', () => {
    const course = loadCourseFiles('oswego_lake');
    const r = new Round(course, roundCfg(course, [1, 2]));
    r.startHole(0);
    r.ball = { x: r.pin.x - 150, y: r.pin.y, teedUp: false };
    r.lie = makeLie(ctx(SURF.gorse), new Rng(9));
    const c = r.autoClub();
    expect(c.id).toBe('lw');
    expect(r.fullCarry(clubById('5i'))).toBeCloseTo(r.lie.carryCap!, 6);
  });

  it('under a canopy the lie says punch (the apex is capped automatically)', () => {
    const lie = makeLie({ surface: SURF.rough, teedUp: false, distToGreenEdge: 100, canopyBase: 5 }, new Rng(1));
    expect(lie.kind).toBe('trees');
    expect(lie.apexCap).toBe(4);
    expect(lie.label).toBe('punch');
    expect(makeLie({ surface: SURF.woods, teedUp: false, distToGreenEdge: 100, canopyBase: null }, new Rng(1)).label).toBe('under trees');
  });
});

describe('spin strength (developer, 2026-10-20: about half, and almost none from rough or sand)', () => {
  const lie = (surface: number, canopyBase: number | null = null, d = 100) => makeLie({ surface, teedUp: false, distToGreenEdge: d, canopyBase }, new Rng(3));
  it('a clean lie gives half the chosen spin, rough, trees and bunkers a twentieth', () => {
    expect(spinFor(lie(SURF.fairway), 1)).toBeCloseTo(0.5);
    expect(spinFor(lie(SURF.fairway), -1)).toBeCloseTo(-0.5);
    expect(spinFor(lie(SURF.rough), -1)).toBeCloseTo(-0.05);
    expect(spinFor(lie(SURF.rough), 1)).toBeCloseTo(0.05);
    expect(spinFor(lie(SURF.woods), 1)).toBeCloseTo(0.05);
    expect(spinFor(lie(SURF.bunker, null, 10), -1)).toBeCloseTo(-0.05);
    expect(spinFor(lie(SURF.bunker, null, 100), -1)).toBeCloseTo(-0.05);
  });
});


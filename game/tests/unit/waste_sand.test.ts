// Waste sand (Cypress Point chat, 2026-10-23): surface 18, general area, not a
// bunker. Distance x0.92, accuracy window x0.8, no splash, putter allowed,
// driver not (it never is off the deck); bounce 0.10 / 0.35, roll 4.0 m/s^2.
import { describe, expect, it } from 'vitest';
import { clubById } from '../../src/data/clubs';
import { Rng } from '../../src/systems/physics/rng';
import { isOB, isWater, material, SURF, SURFACE_LABEL } from '../../src/systems/physics/surfaces';
import { clubAllowed, lieIsPenal, lieModsFor, makeLie, SPIN_POOR, spinEffect } from '../../src/systems/rules/lie';

const ctx = (surface: number, extra: Partial<{ teedUp: boolean; distToGreenEdge: number; canopyBase: number | null }> = {}) =>
  ({ surface, teedUp: false, distToGreenEdge: 10, canopyBase: null, ...extra });

describe('waste sand', () => {
  it('is surface 18, in play, not water, with its own material', () => {
    expect(SURF.waste).toBe(18);
    expect(isOB(SURF.waste)).toBe(false);
    expect(isWater(SURF.waste)).toBe(false);
    const m = material(SURF.waste);
    expect([m.e, m.kept, m.decel]).toEqual([0.1, 0.35, 4.0]);
    expect(SURFACE_LABEL[SURF.waste]).toBe('waste sand');
  });

  it('is its own lie: x0.92 distance, x0.8 window, a bad lie', () => {
    const lie = makeLie(ctx(SURF.waste), new Rng(1));
    expect(lie.kind).toBe('waste');
    expect(lie.distMult).toBe(0.92);
    expect(lie.windowMult).toBe(0.8);
    expect(lie.label).toBe('waste sand');
    expect(lieIsPenal(lie)).toBe(true);
    expect(spinEffect(lie)).toBe(SPIN_POOR);
  });

  it('is never a bunker, even beside the green: no splash, the putter is allowed', () => {
    for (const d of [2, 10, 29, 80]) {
      const lie = makeLie(ctx(SURF.waste, { distToGreenEdge: d }), new Rng(d));
      expect(lie.kind).toBe('waste');
      for (const id of ['sw', 'lw', '7i']) {
        const mods = lieModsFor(lie, clubById(id));
        expect(mods.splash).toBe(false);
        expect(mods.distMult).toBe(0.92);
      }
      expect(clubAllowed(lie, clubById('pt'))).toBe(true);
      expect(clubAllowed(lie, clubById('3w'))).toBe(true);
      expect(clubAllowed(lie, clubById('dr'))).toBe(false);
    }
  });

  it('under a canopy it is a punch, like any other ground', () => {
    expect(makeLie(ctx(SURF.waste, { canopyBase: 5 }), new Rng(2)).kind).toBe('trees');
  });

  it('a teed-up first stroke from it is still a tee shot', () => {
    expect(makeLie(ctx(SURF.waste, { teedUp: true }), new Rng(3)).kind).toBe('tee');
  });
});

// Per-club roll-out calibration. The flight model lands the ball with the
// speed of a parametric arc; how much of that survives the first bounce is
// tuned per club (bisection on a flat fairway) so the roll-out matches the
// club table (spec 7.1 / 7.3). Deterministic and memoised.

import { CLUBS, Club, rollM } from '../../data/clubs';
import { Rng } from './rng';
import { simulateShot } from './sim';
import { SURF, material } from './surfaces';
import { flatTerrain, Terrain } from './terrain';

let flat: Terrain | null = null;
const cache = new Map<string, number>();

export function rollOutFor(club: Club, k: number, surface: number = SURF.fairway, power = 1, spin = 0): { carry: number; total: number; roll: number } {
  flat ??= flatTerrain(SURF.fairway, { width: 700, height: 200 });
  const terr = surface === SURF.fairway ? flat : flatTerrain(surface, { width: 700, height: 200 });
  const res = simulateShot(terr, null, {
    x: 10, y: 100, z: terr.z(10, 100), aim: 0, pin: null,
    flight: {
      carry: club.carryM * power, apex: club.apexM * Math.sqrt(power), hang: club.hangS * Math.sqrt(power),
      curveDeg: 0, windX: 0, windY: 0, firstBounceK: k, spin, spinBack: 0,
    },
  }, new Rng(1));
  const carry = (res.landing?.x ?? 10) - 10;
  const total = res.end.x - 10;
  return { carry, total, roll: total - carry };
}

export function firstBounceK(club: Club): number {
  const hit = cache.get(club.id);
  if (hit !== undefined) return hit;
  if (club.kind === 'putter') return 1;
  const target = Math.max(0.4, rollM(club));
  let lo = 0, hi = 1.6;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (rollOutFor(club, mid).roll < target) lo = mid; else hi = mid;
  }
  const k = (lo + hi) / 2;
  cache.set(club.id, k);
  return k;
}

/**
 * Short swings release more than the club's full-shot roll suggests: partial
 * swings keep a fairly high flight in this model and stopped almost dead
 * (third playtest: "you can basically throw a dart at the green"). Multiplies
 * the first-bounce factor; 1 at full power, about 1.4 for a short chip.
 */
export function chipRelease(fraction: number): number {
  const f = Math.max(0, Math.min(1, fraction));
  return 1 + 0.5 * (1 - f) * (1 - f);
}

export function calibrateAll(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CLUBS) out[c.id] = firstBounceK(c);
  return out;
}

/** Putt: initial speed so that `dist` metres is the roll on a flat stimp-10 green. */
export function puttSpeedFor(dist: number): number {
  return Math.sqrt(2 * material(SURF.green).decel * Math.max(0, dist));
}

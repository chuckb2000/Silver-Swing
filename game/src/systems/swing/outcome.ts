// Turn a meter result into launch parameters (spec 6.2).
// Direction follows the meter: a tap left of the zone centre sends the ball
// left (a hook for a right-hander), right of centre sends it right (a slice).

import { Club } from '../../data/clubs';
import { MeterResult } from './meter';

export interface LieMods {
  distMult: number;
  windowMult: number;
  splash?: boolean; // greenside bunker splash with a wedge
}

export type StrikeQuality = 'perfect' | 'good' | 'hook' | 'slice';

export interface Strike {
  carry: number;      // nominal carry (m)
  apex: number;
  hang: number;
  curveDeg: number;   // + curves right, - curves left
  aimOffsetDeg: number; // instant direction change, + = right (unused: kept for saved shots)
  quality: StrikeQuality;
  side: -1 | 0 | 1;   // which way the ball goes off line
  excess: number;     // % of bar outside the perfect zone
  loss: number;       // distance lost to the miss
  power: number;      // fraction 0..1.1 after the swing length
  overswing: boolean;
}

export interface PuttStrike {
  dirDeg: number;     // start-line error, + = right
  distMult: number;
  quality: 'perfect' | 'good' | 'push' | 'pull';
  side: -1 | 0 | 1;
  excess: number;
}

/** Accuracy needed to count as "good" beyond the perfect zone (% of bar). */
export const GOOD_BAND = 1.2;

/**
 * Curve (in units of the club's curveFactor) for a miss `excess` % of bar
 * outside the perfect zone. A miss in the yellow band curves noticeably
 * (playtest: "yellow should be a smidge more penal"); red misses are as before.
 */
export function missCurve(excess: number): number {
  if (excess <= 0) return 0;
  return Math.max(excess, 0.9 + 0.75 * Math.min(excess, GOOD_BAND));
}

export const powerFactor = (p: number) => (p <= 1 ? p : 1 + 0.08 * Math.min(1, (p - 1) / 0.1));

export function perfectHalfWidth(base: number, club: Club, lie: LieMods, overswing: boolean): number {
  return base * lie.windowMult * club.windowMult * (overswing ? 0.5 : 1);
}

/** Shot words for a ball that goes right (side 1) or left (-1); mirrored for left-handers. */
export function missWord(side: number, big: boolean, lefty: boolean): string {
  const right = side > 0;
  const hookSide = lefty ? right : !right; // a right-hander's hook goes left
  if (big) return hookSide ? 'hook' : 'slice';
  return hookSide ? 'draw' : 'fade';
}

export function strikeFrom(m: MeterResult, club: Club, lie: LieMods, perfectZone: number, lefty: boolean, swingScale = 1): Strike {
  const p = m.power * swingScale;
  const pf = powerFactor(p);
  const overswing = p > 1.0001;
  const splashMult = lie.splash ? 0.45 : 1;
  const baseCarry = club.carryM * pf * splashMult * lie.distMult;
  const flightScale = Math.sqrt(Math.min(pf, 1.08));
  let apex = club.apexM * flightScale;
  const hang = club.hangS * flightScale;
  const half = perfectHalfWidth(perfectZone, club, lie, overswing);
  const offset = m.offset;
  const excess = Math.max(0, Math.abs(offset) - half);
  const side = (excess === 0 ? 0 : Math.sign(offset)) as -1 | 0 | 1;
  const curveDeg = side === 0 ? 0 : side * Math.min(25, missCurve(excess) * club.curveFactor * (overswing ? 2 : 1));
  const loss = excess === 0 ? 0 : Math.min(0.15, 0.05 + 0.01 * excess);
  if (lie.splash) apex *= 0.9;
  let quality: StrikeQuality = 'perfect';
  if (excess > 0) {
    if (excess < GOOD_BAND) quality = 'good';
    else quality = missWord(side, true, lefty) as 'hook' | 'slice';
  }
  return { carry: baseCarry * (1 - loss), apex, hang, curveDeg, aimOffsetDeg: 0, quality, side, excess, loss, power: p, overswing };
}

/** Putts: the third tap sets the start line; distance suffers a little too. */
export function puttStrikeFrom(m: MeterResult, perfectZone: number, windowMult: number, lefty: boolean): PuttStrike {
  const half = perfectZone * windowMult;
  const excess = Math.max(0, Math.abs(m.offset) - half);
  const side = (excess === 0 ? 0 : Math.sign(m.offset)) as -1 | 0 | 1;
  const dirDeg = side * Math.min(6, 0.6 * excess);
  const distMult = 1 - Math.min(0.08, 0.008 * excess);
  let quality: PuttStrike['quality'] = 'perfect';
  if (excess > 0) {
    if (excess < GOOD_BAND) quality = 'good';
    else quality = (side > 0) !== lefty ? 'push' : 'pull'; // a right-hander pushes it right
  }
  return { dirDeg, distMult, quality, side, excess };
}

// Turn a meter result into launch parameters (spec 6.2).
// Direction follows the meter: a tap left of the zone centre sends the ball
// left (a hook for a right-hander), right of centre sends it right (a slice).

import { Club } from '../../data/clubs';
import { MeterResult } from './meter';

export interface LieMods {
  distMult: number;
  windowMult: number;
  splash?: boolean; // greenside bunker splash with a wedge
  /** gorse: no shot carries farther than this (m) */
  carryCap?: number;
  /** gorse: a narrower yellow band (% of bar) */
  goodBand?: number;
  /** gorse: misses curve more */
  curveMult?: number;
}

export type StrikeQuality = 'perfect' | 'great' | 'good' | 'hook' | 'slice';

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
  quality: 'perfect' | 'great' | 'good' | 'push' | 'pull';
  side: -1 | 0 | 1;
  excess: number;
}

/** Accuracy needed to count as "good" beyond the perfect zone (% of bar). */
export const GOOD_BAND = 1.2;

/**
 * Inside the green (perfect) zone only the dead centre is straight (developer,
 * 2026-10-19): a tap off centre curves the ball a little that way, growing to
 * IN_ZONE_CURVE x the club's curve factor at the zone's edge (about half the
 * smallest yellow miss: 0.8 deg, about 3 yd, for a driver). The inner
 * PERFECT_CORE of the zone still flashes "perfect".
 */
export const IN_ZONE_CURVE = 0.4;
export const PERFECT_CORE = 0.3;
/** Putts: the start line is off by up to this much at the edge of the zone. */
export const IN_ZONE_PUTT_DEG = 0.25;

/**
 * Curve (in units of the club's curveFactor) for a miss `excess` % of bar
 * outside the perfect zone. A miss in the yellow band curves noticeably
 * (playtest: "yellow should be a smidge more penal"); red misses are as before.
 */
export function missCurve(excess: number, band = GOOD_BAND): number {
  if (excess <= 0) return 0;
  return Math.max(excess, 0.9 + 0.75 * Math.min(excess, band));
}

export const powerFactor = (p: number) => (p <= 1 ? p : 1 + 0.08 * Math.min(1, (p - 1) / 0.1));

/**
 * Nominal carry (m, flat and calm, before any miss) of a club from a lie at a
 * swing length and meter power: club carry x lie x power factor of
 * (power x swing length), never past the lie's carry cap (gorse). The strike,
 * the club's carry label, the meter readout and the automatic swing length all
 * use this, so they agree.
 */
export function shotCarry(club: Club, lie: LieMods, swingScale = 1, power = 1): number {
  const full = club.carryM * powerFactor(power * swingScale) * (lie.splash ? 0.45 : 1) * lie.distMult;
  return lie.carryCap !== undefined ? Math.min(full, lie.carryCap) : full;
}

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
  const uncapped = shotCarry(club, { ...lie, carryCap: undefined }, swingScale, m.power);
  const baseCarry = shotCarry(club, lie, swingScale, m.power);
  let flightScale = Math.sqrt(Math.min(pf, 1.08));
  // gorse: the club can't get through - the ball comes out short, lower and sooner
  if (baseCarry < uncapped) flightScale *= Math.sqrt(baseCarry / uncapped);
  let apex = club.apexM * flightScale;
  const hang = club.hangS * flightScale;
  const band = lie.goodBand ?? GOOD_BAND;
  const curveMult = lie.curveMult ?? 1;
  const half = perfectHalfWidth(perfectZone, club, lie, overswing);
  const offset = m.offset;
  const excess = Math.max(0, Math.abs(offset) - half);
  const inZone = excess === 0 ? Math.min(1, Math.abs(offset) / half) : 0; // 0 at the centre, 1 at the zone's edge
  const side = (offset === 0 ? 0 : Math.sign(offset)) as -1 | 0 | 1;
  const swingMult = overswing ? 2 : 1;
  const curveDeg = side === 0 ? 0
    : excess === 0 ? side * IN_ZONE_CURVE * inZone * club.curveFactor * swingMult
      : side * Math.min(25 * curveMult, missCurve(excess, band) * club.curveFactor * swingMult * curveMult);
  const loss = excess === 0 ? 0 : Math.min(0.15, 0.05 + 0.01 * excess);
  if (lie.splash) apex *= 0.9;
  let quality: StrikeQuality = inZone <= PERFECT_CORE ? 'perfect' : 'great';
  if (excess > 0) {
    if (excess < band) quality = 'good';
    else quality = missWord(side, true, lefty) as 'hook' | 'slice';
  }
  return { carry: baseCarry * (1 - loss), apex, hang, curveDeg, aimOffsetDeg: 0, quality, side, excess, loss, power: p, overswing };
}

/** Putts: the third tap sets the start line; distance suffers a little too. */
export function puttStrikeFrom(m: MeterResult, perfectZone: number, windowMult: number, lefty: boolean): PuttStrike {
  const half = perfectZone * windowMult;
  const excess = Math.max(0, Math.abs(m.offset) - half);
  const inZone = Math.min(1, Math.abs(m.offset) / half);
  const side = (m.offset === 0 ? 0 : Math.sign(m.offset)) as -1 | 0 | 1;
  const dirDeg = side * Math.min(6, IN_ZONE_PUTT_DEG * inZone + 0.6 * excess);
  const distMult = 1 - Math.min(0.08, 0.008 * excess);
  let quality: PuttStrike['quality'] = inZone <= PERFECT_CORE ? 'perfect' : 'great';
  if (excess > 0) {
    if (excess < GOOD_BAND) quality = 'good';
    else quality = (side > 0) !== lefty ? 'push' : 'pull'; // a right-hander pushes it right
  }
  return { dirDeg, distMult, quality, side, excess };
}

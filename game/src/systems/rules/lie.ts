// Lies (spec 7.4): distance / accuracy multipliers and club restrictions.

import { Club, isWedge, isWood } from '../../data/clubs';
import { Rng } from '../physics/rng';
import { SURF } from '../physics/surfaces';

export type LieKind = 'tee' | 'fairway' | 'fringe' | 'rough' | 'trees' | 'gorse' | 'fairway_bunker' | 'greenside_bunker' | 'cartpath' | 'green';

export interface Lie {
  kind: LieKind;
  distMult: number;
  windowMult: number;
  flyer: boolean;
  apexCap?: number;   // punch shot under a canopy (m above the ball)
  /** gorse: the farthest any shot gets out (m), drawn for each lie */
  carryCap?: number;
  /** gorse: the yellow band beyond the green zone (% of bar; GOOD_BAND elsewhere) */
  goodBand?: number;
  /** gorse: misses curve this much more */
  curveMult?: number;
  label: string;      // e.g. "rough -15%"
}

/**
 * Gorse (developer, 2026-10-20: "extremely penal... only 20-50 yards out of it
 * and quite erratic, very small sweet spot and lots of red").
 */
export const GORSE = {
  minYd: 20, maxYd: 50,   // the carry cap of a lie, drawn evenly between these
  windowMult: 0.3,        // the green zone at 30 %
  goodBand: 0.35,         // the yellow band at 0.35 % of bar (1.2 elsewhere)
  curveMult: 1.8,         // misses curve 1.8 x as much
} as const;

export interface LieContext {
  surface: number;
  teedUp: boolean;            // first stroke of the hole from the teeing area
  distToGreenEdge: number;    // metres to the current hole's green
  canopyBase: number | null;  // lowest canopy overhead (m above ground) or null
}

const BASE: Record<LieKind, { dist: number; win: number; name: string }> = {
  tee: { dist: 1, win: 1.1, name: 'tee' },
  fairway: { dist: 1, win: 1, name: 'fairway' },
  fringe: { dist: 0.97, win: 0.95, name: 'fringe' },
  rough: { dist: 0.85, win: 0.7, name: 'rough' },
  trees: { dist: 0.8, win: 0.6, name: 'under trees' },
  gorse: { dist: 1, win: GORSE.windowMult, name: 'gorse' },
  fairway_bunker: { dist: 0.85, win: 0.55, name: 'fairway bunker' },
  greenside_bunker: { dist: 0.5, win: 0.6, name: 'bunker' },
  cartpath: { dist: 1, win: 0.9, name: 'cart path' },
  green: { dist: 1, win: 1, name: 'green' },
};

export function lieKindFor(ctx: LieContext): LieKind {
  const s = ctx.surface;
  if (ctx.teedUp) return 'tee';
  if (s === SURF.bunker) return ctx.distToGreenEdge <= 30 ? 'greenside_bunker' : 'fairway_bunker';
  if (s === SURF.green) return 'green';
  if (s === SURF.fringe) return 'fringe';
  if (s === SURF.cartpath || s === SURF.building) return 'cartpath';
  if (s === SURF.gorse) return 'gorse';
  if (s === SURF.woods || (ctx.canopyBase !== null && s !== SURF.fairway && s !== SURF.tee)) return 'trees';
  if (s === SURF.fairway || s === SURF.tee || s === SURF.range) return 'fairway';
  return 'rough';
}

/** Build the lie for the next stroke; rough rolls its random distance here. */
export function makeLie(ctx: LieContext, rng: Rng): Lie {
  const kind = lieKindFor(ctx);
  const b = BASE[kind];
  let dist = b.dist;
  let flyer = false;
  if (kind === 'rough') {
    if (rng.chance(0.1)) { dist = 1.05; flyer = true; } else dist = rng.range(0.8, 0.9);
  }
  const lie: Lie = { kind, distMult: dist, windowMult: b.win, flyer, label: '' };
  if (kind === 'trees' && ctx.canopyBase !== null) lie.apexCap = Math.max(2, ctx.canopyBase - 1);
  if (kind === 'gorse') {
    lie.carryCap = rng.range(GORSE.minYd, GORSE.maxYd) * 0.9144;
    lie.goodBand = GORSE.goodBand;
    lie.curveMult = GORSE.curveMult;
    lie.apexCap = 6; // a hack-out: low and short
    lie.label = 'gorse';
    return lie;
  }
  const pct = Math.round((dist - 1) * 100);
  // under a canopy the shot is a punch, played automatically: say so (developer asked how to hit one)
  const name = kind === 'trees' && lie.apexCap !== undefined ? 'punch' : b.name;
  lie.label = flyer ? `${name} flyer +5%` : pct === 0 ? name : `${name} ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
  if (kind === 'greenside_bunker') lie.label = 'bunker'; // short: fits the info panel
  return lie;
}

/** Club allowed from this lie? (spec 7.4) */
export function clubAllowed(lie: Lie, club: Club): boolean {
  // the driver is a tee club: never off the deck (playtest decision)
  if (club.kind === 'driver' && lie.kind !== 'tee') return false;
  switch (lie.kind) {
    case 'rough':
    case 'trees':
      return club.kind !== 'driver';
    case 'gorse':
      return club.kind !== 'driver' && club.kind !== 'putter';
    case 'fairway_bunker':
      return !isWood(club) && club.kind !== 'putter';
    case 'greenside_bunker':
      return club.kind !== 'putter';
    default:
      return true;
  }
}

/** Effective distance multiplier for a club from this lie (rough woods, bunker splash). */
export function lieModsFor(lie: Lie, club: Club): { distMult: number; windowMult: number; splash: boolean; carryCap?: number; goodBand?: number; curveMult?: number } {
  let distMult = lie.distMult;
  let splash = false;
  if (lie.kind === 'rough' && isWood(club)) distMult *= 0.8;
  if (lie.kind === 'greenside_bunker') {
    if (isWedge(club)) { splash = true; distMult = 1; } else distMult = 0.5;
  }
  return { distMult, windowMult: lie.windowMult, splash, ...(lie.carryCap !== undefined ? { carryCap: lie.carryCap, goodBand: lie.goodBand, curveMult: lie.curveMult } : {}) };
}

/** How much backspin survives the lie (rough -> "flyer", 30% effect). */
export function spinEffect(lie: Lie): number {
  if (lie.kind === 'gorse') return 0; // no spin out of a bush
  return lie.kind === 'rough' || lie.kind === 'trees' ? 0.3 : 1;
}

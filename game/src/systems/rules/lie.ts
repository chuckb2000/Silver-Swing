// Lies (spec 7.4): distance / accuracy multipliers and club restrictions.

import { Club, isWedge, isWood } from '../../data/clubs';
import { Rng } from '../physics/rng';
import { SURF } from '../physics/surfaces';

export type LieKind = 'tee' | 'fairway' | 'fringe' | 'rough' | 'trees' | 'fairway_bunker' | 'greenside_bunker' | 'cartpath' | 'green';

export interface Lie {
  kind: LieKind;
  distMult: number;
  windowMult: number;
  flyer: boolean;
  apexCap?: number;   // punch shot under a canopy (m above the ball)
  label: string;      // e.g. "rough -15%"
}

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
  const pct = Math.round((dist - 1) * 100);
  lie.label = flyer ? `${b.name} flyer +5%` : pct === 0 ? b.name : `${b.name} ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
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
    case 'fairway_bunker':
      return !isWood(club) && club.kind !== 'putter';
    case 'greenside_bunker':
      return club.kind !== 'putter';
    default:
      return true;
  }
}

/** Effective distance multiplier for a club from this lie (rough woods, bunker splash). */
export function lieModsFor(lie: Lie, club: Club): { distMult: number; windowMult: number; splash: boolean } {
  let distMult = lie.distMult;
  let splash = false;
  if (lie.kind === 'rough' && isWood(club)) distMult *= 0.8;
  if (lie.kind === 'greenside_bunker') {
    if (isWedge(club)) { splash = true; distMult = 1; } else distMult = 0.5;
  }
  return { distMult, windowMult: lie.windowMult, splash };
}

/** How much backspin survives the lie (rough -> "flyer", 30% effect). */
export function spinEffect(lie: Lie): number {
  return lie.kind === 'rough' || lie.kind === 'trees' ? 0.3 : 1;
}

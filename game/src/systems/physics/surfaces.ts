// Surface ids (must match pipeline/common.py SURF) and their physics
// materials (CLAUDE.md 7.3).

export const SURF = {
  ob: 0,
  rough: 1,
  fairway: 2,
  fringe: 3,
  green: 4,
  tee: 5,
  bunker: 6,
  water: 7,
  cartpath: 8,
  woods: 9,
  obRoad: 10,
  obWater: 11,
  obWoods: 12,
  obBuilding: 13,
  building: 14,
  range: 15,
  obSand: 16, // beach / dune sand outside the boundary (Highland Links)
  gorse: 17,  // under gorse thickets inside the course (Bandon Dunes): a penal lie (rules/lie.ts)
  waste: 18,  // waste sand (Cypress Point's dunes): general area, not a bunker (rules/lie.ts)
} as const;

export type SurfaceId = (typeof SURF)[keyof typeof SURF];

export interface Material {
  /** vertical restitution on a bounce */
  e: number;
  /** fraction of horizontal (tangential) speed kept on the first bounce */
  kept: number;
  /** rolling deceleration, m/s^2 */
  decel: number;
  /** static friction as a fraction of g: a ball at rest stays put on slopes below this */
  staticMu: number;
  name: string;
}

const M = (e: number, kept: number, decel: number, staticMu: number, name: string): Material => ({ e, kept, decel, staticMu, name });

const GREEN = M(0.2, 0.55, 0.55, 0.05, 'green');
const FRINGE = M(0.18, 0.5, 0.9, 0.07, 'fringe');
const FAIRWAY = M(0.25, 0.6, 1.4, 0.1, 'fairway');
const ROUGH = M(0.12, 0.35, 3.5, 0.3, 'rough');
const WOODS = M(0.15, 0.4, 2.5, 0.25, 'woods');
const BUNKER = M(0.0, 0.05, 8.0, 1.0, 'bunker');
const PATH = M(0.5, 0.8, 0.6, 0.06, 'cart path');
const LAWN = M(0.14, 0.4, 3.0, 0.25, 'out of bounds');
const WATER = M(0, 0, 50, 1, 'water');
// gorse: the ball dies where it lands in the thicket (developer, 2026-10-20: "extremely penal")
const GORSE = M(0.04, 0.12, 9.0, 0.9, 'gorse');
// waste sand: firmer than a bunker, the ball checks and rolls a little (Cypress Point chat, 2026-10-23)
const WASTE = M(0.1, 0.35, 4.0, 0.35, 'waste sand');

const TABLE: Material[] = [];
TABLE[SURF.ob] = LAWN;
TABLE[SURF.rough] = ROUGH;
TABLE[SURF.fairway] = FAIRWAY;
TABLE[SURF.fringe] = FRINGE;
TABLE[SURF.green] = GREEN;
TABLE[SURF.tee] = FAIRWAY;
TABLE[SURF.bunker] = BUNKER;
TABLE[SURF.water] = WATER;
TABLE[SURF.cartpath] = PATH;
TABLE[SURF.woods] = WOODS;
TABLE[SURF.obRoad] = PATH;
TABLE[SURF.obWater] = WATER;
TABLE[SURF.obWoods] = WOODS;
TABLE[SURF.obBuilding] = PATH;
TABLE[SURF.building] = PATH;
TABLE[SURF.range] = FAIRWAY;
TABLE[SURF.obSand] = BUNKER;
TABLE[SURF.gorse] = GORSE;
TABLE[SURF.waste] = WASTE;

export function material(id: number): Material {
  return TABLE[id] ?? ROUGH;
}

export function isOB(id: number): boolean {
  return id === SURF.ob || id === SURF.range || (id >= 10 && id <= 13) || id === SURF.obSand;
}

export function isWater(id: number): boolean {
  return id === SURF.water || id === SURF.obWater;
}

export const SURFACE_LABEL: Record<number, string> = {
  [SURF.ob]: 'out of bounds',
  [SURF.rough]: 'rough',
  [SURF.fairway]: 'fairway',
  [SURF.fringe]: 'fringe',
  [SURF.green]: 'green',
  [SURF.tee]: 'tee box',
  [SURF.bunker]: 'bunker',
  [SURF.water]: 'water',
  [SURF.cartpath]: 'cart path',
  [SURF.woods]: 'trees',
  [SURF.obRoad]: 'out of bounds',
  [SURF.obWater]: 'out of bounds',
  [SURF.obWoods]: 'out of bounds',
  [SURF.obBuilding]: 'out of bounds',
  [SURF.building]: 'building',
  [SURF.range]: 'driving range (ob)',
  [SURF.obSand]: 'out of bounds',
  [SURF.gorse]: 'gorse',
  [SURF.waste]: 'waste sand',
};

// Club table (CLAUDE.md 7.1): a solid ~5 handicap amateur's 14-club bag.
// Carry is calm air, level ground, 100% power, perfect strike. Roll-out was
// raised ~40% after the first playtest ("the ball should roll out a little more"),
// and the wedges' again after the third (an amateur's wedges release a little).

export type ClubKind = 'driver' | 'wood' | 'hybrid' | 'iron' | 'wedge' | 'putter';

export interface Club {
  id: string;
  name: string;       // short UI name
  kind: ClubKind;
  carryYd: number;
  carryM: number;
  apexM: number;
  hangS: number;
  rollYd: number;     // fairway roll-out at full power
  curveFactor: number; // degrees of curve per % of bar outside the perfect zone
  windowMult: number;  // accuracy window multiplier
}

const YD = 0.9144;

function c(id: string, name: string, kind: ClubKind, carryYd: number, carryM: number, apexM: number, hangS: number,
  rollYd: number, curveFactor: number, windowMult: number): Club {
  return { id, name, kind, carryYd, carryM, apexM, hangS, rollYd, curveFactor, windowMult };
}

export const CLUBS: Club[] = [
  c('dr', 'driver', 'driver', 245, 224.0, 28, 6.0, 28, 2.0, 0.80),
  c('3w', '3 wood', 'wood', 225, 205.7, 26, 5.8, 20, 1.8, 0.85),
  c('5w', '5 wood', 'wood', 210, 192.0, 26, 5.7, 15, 1.6, 0.88),
  c('4h', '4 hybrid', 'hybrid', 195, 178.3, 25, 5.6, 12, 1.4, 0.92),
  c('5i', '5 iron', 'iron', 180, 164.6, 25, 5.5, 10, 1.3, 0.95),
  c('6i', '6 iron', 'iron', 170, 155.4, 25, 5.4, 9, 1.2, 1.00),
  c('7i', '7 iron', 'iron', 158, 144.5, 25, 5.3, 8, 1.1, 1.00),
  c('8i', '8 iron', 'iron', 146, 133.5, 24, 5.2, 6, 1.0, 1.05),
  c('9i', '9 iron', 'iron', 134, 122.5, 24, 5.1, 5, 0.9, 1.10),
  c('pw', 'pitching w', 'wedge', 122, 111.6, 23, 5.0, 5, 0.8, 1.15),
  c('gw', 'gap wedge', 'wedge', 108, 98.8, 22, 4.8, 4, 0.7, 1.20),
  c('sw', 'sand wedge', 'wedge', 92, 84.1, 20, 4.5, 3, 0.6, 1.25),
  c('lw', 'lob wedge', 'wedge', 75, 68.6, 19, 4.2, 2, 0.6, 1.25),
  c('pt', 'putter', 'putter', 0, 0, 0, 0, 0, 0, 1.4),
];

export const PUTTER = CLUBS[CLUBS.length - 1];

export function clubById(id: string): Club {
  const k = CLUBS.find((x) => x.id === id);
  if (!k) throw new Error(`unknown club ${id}`);
  return k;
}

export const isWood = (k: Club) => k.kind === 'driver' || k.kind === 'wood';
export const isWedge = (k: Club) => k.kind === 'wedge';
export const rollM = (k: Club) => k.rollYd * YD;

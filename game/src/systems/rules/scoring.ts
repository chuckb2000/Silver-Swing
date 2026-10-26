// Stroke play scoring and round statistics (spec 8.6, 10.4).

export interface HoleScore {
  hole: number;
  par: number;
  strokes: number;     // gross, including penalty strokes
  putts: number;
  penalties: number;
  fairway: boolean | null; // null on par 3s
  gir: boolean;
  /** the holing stroke's length in metres, start to cup (rounds from 2026-10-26; none for a conceded putt) */
  made?: number;
  /** the holing stroke started off the green: a chip-in, a holed approach, an ace */
  off?: boolean;
}

export const SCORE_NAMES: Record<number, string> = {
  [-4]: 'condor',
  [-3]: 'albatross',
  [-2]: 'eagle',
  [-1]: 'birdie',
  0: 'par',
  1: 'bogey',
  2: 'double bogey',
  3: 'triple bogey',
};

export function scoreName(strokes: number, par: number): string {
  if (strokes === 1) return 'hole in one!';
  const d = strokes - par;
  return SCORE_NAMES[d] ?? `+${d}`;
}

export function toPar(n: number): string {
  return n === 0 ? 'e' : n > 0 ? `+${n}` : `${n}`;
}

export interface RoundTotals {
  strokes: number;
  par: number;
  toPar: number;
  putts: number;
  penalties: number;
  fairways: number;
  fairwayChances: number;
  gir: number;
  holes: number;
  front: number | null;
  back: number | null;
}

export function totals(scores: HoleScore[]): RoundTotals {
  const strokes = scores.reduce((a, s) => a + s.strokes, 0);
  const par = scores.reduce((a, s) => a + s.par, 0);
  const sum = (f: (s: HoleScore) => boolean) => scores.filter(f).reduce((a, s) => a + s.strokes, 0);
  const front = scores.some((s) => s.hole <= 9) ? sum((s) => s.hole <= 9) : null;
  const back = scores.some((s) => s.hole >= 10) ? sum((s) => s.hole >= 10) : null;
  return {
    strokes, par, toPar: strokes - par,
    putts: scores.reduce((a, s) => a + s.putts, 0),
    penalties: scores.reduce((a, s) => a + s.penalties, 0),
    fairways: scores.filter((s) => s.fairway === true).length,
    fairwayChances: scores.filter((s) => s.fairway !== null).length,
    gir: scores.filter((s) => s.gir).length,
    holes: scores.length,
    front, back,
  };
}

/** Leaderboard order: lowest gross, then back-9 countback, then earlier date. */
export function compareRounds(a: { gross: number; back: number | null; date: string }, b: { gross: number; back: number | null; date: string }): number {
  if (a.gross !== b.gross) return a.gross - b.gross;
  const ab = a.back ?? Infinity, bb = b.back ?? Infinity;
  if (ab !== bb) return ab - bb;
  return a.date.localeCompare(b.date);
}

/** Running tally for the hole being played. */
export class HoleTally {
  strokes = 0;
  putts = 0;
  penalties = 0;
  fairway: boolean | null;
  reachedGreenAt: number | null = null;
  /** the holing stroke: its length (m) and whether it started off the green */
  made: number | null = null;
  madeOff = false;
  readonly par: number;
  readonly hole: number;

  constructor(hole: number, par: number) {
    this.hole = hole;
    this.par = par;
    this.fairway = par >= 4 ? false : null;
  }

  stroke(fromGreen: boolean) {
    this.strokes += 1;
    if (fromGreen) this.putts += 1;
  }

  penalty(n: number) {
    this.strokes += n;
    this.penalties += n;
  }

  /** After a stroke comes to rest. */
  rested(onGreen: boolean, onFairway: boolean, isTeeShot: boolean) {
    if (isTeeShot && this.fairway !== null) this.fairway = onFairway;
    if (onGreen && this.reachedGreenAt === null) this.reachedGreenAt = this.strokes;
  }

  /** The stroke went in from `m` metres (`off`: it started off the green). */
  holed(m: number, off: boolean) {
    this.made = Math.round(m * 100) / 100;
    this.madeOff = off;
  }

  finish(): HoleScore {
    const s: HoleScore = {
      hole: this.hole, par: this.par, strokes: this.strokes, putts: this.putts, penalties: this.penalties,
      fairway: this.fairway, gir: this.reachedGreenAt !== null && this.reachedGreenAt <= this.par - 2,
    };
    if (this.made !== null) { s.made = this.made; s.off = this.madeOff; }
    return s;
  }
}

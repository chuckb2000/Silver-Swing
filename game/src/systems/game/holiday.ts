// Holiday themes (developer, 2026-11-13): the week of Thanksgiving and the run-up to Christmas
// dress the game up. Decoration only: nothing here changes how a ball flies or a round counts.
// Pure, for the tests; the drawing is ui/holidayArt.ts.

import type { HoleScore } from '../rules/scoring';

export type Holiday = 'thanksgiving' | 'christmas';
export const HOLIDAYS: Holiday[] = ['thanksgiving', 'christmas'];

/** US Thanksgiving: the fourth Thursday of November (day of the month). */
export function thanksgivingDay(year: number): number {
  const first = new Date(year, 10, 1).getDay(); // 0 Sunday .. 6 Saturday
  return 1 + ((4 - first + 7) % 7) + 21;
}

const dayStart = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

/**
 * Which holiday's dress a local date wears: Thanksgiving from the Saturday before to the Sunday after
 * (nine days), or 12-31 December (developer, 2026-11-13). Players can't turn it off (developer).
 */
export function holidayOn(d: Date): Holiday | null {
  const y = d.getFullYear();
  const t = dayStart(y, d.getMonth(), d.getDate());
  const tg = thanksgivingDay(y);
  if (t >= dayStart(y, 10, tg - 5) && t <= dayStart(y, 10, tg + 3)) return 'thanksgiving';
  if (d.getMonth() === 11 && d.getDate() >= CHRISTMAS_FROM && d.getDate() <= CHRISTMAS_TO) return 'christmas';
  return null;
}

/** The days of December dressed for Christmas. */
export const CHRISTMAS_FROM = 12;
export const CHRISTMAS_TO = 31;

/**
 * `?holiday=thanksgiving` / `christmas` shows a holiday on any day (a preview, a screenshot). There is
 * no way to turn one off (developer, 2026-11-13). undefined: the address doesn't name one.
 */
export function holidayFromQuery(search: string): Holiday | undefined {
  const v = new URLSearchParams(search).get('holiday');
  return v !== null && (HOLIDAYS as string[]).includes(v) ? (v as Holiday) : undefined;
}

/** A note for the hole just finished, in the holiday's spirit; null for most holes. */
export function holidayNote(holiday: Holiday | null, scores: HoleScore[]): { text: string; art: string } | null {
  if (!holiday || !scores.length) return null;
  const last = scores[scores.length - 1];
  if (holiday === 'thanksgiving') {
    // three birdies (or better) in a row is a "turkey" in golf, as in bowling
    let run = 0;
    for (let i = scores.length - 1; i >= 0 && scores[i].strokes < scores[i].par; i--) run++;
    if (run >= 3 && run % 3 === 0) return { text: run === 3 ? 'a turkey! three birdies in a row' : `${run} birdies in a row: ${run / 3} turkeys!`, art: 'turkey' };
    return null;
  }
  // an 8 on a hole is a "snowman"
  if (last.strokes === 8) return { text: 'you built a snowman (an 8)', art: 'snowman' };
  return null;
}

/** A small deterministic hash in [0, 1): the same decoration in the same place every time. */
export function hash01(a: number, b: number, c = 0): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483587)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(fx: number, fy: number, seed: number): number {
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash01(ix, iy, seed), b = hash01(ix + 1, iy, seed), c = hash01(ix, iy + 1, seed), d = hash01(ix + 1, iy + 1, seed);
  const n1 = a + (b - a) * sx, n2 = c + (d - c) * sx;
  return n1 + (n2 - n1) * sy;
}

/** Smooth noise in [0, 1) with features about `cell` metres across: the snow lies in patches. */
export function patchNoise(x: number, y: number, cell = 16): number {
  return valueNoise(x / cell, y / cell, 7) * 0.62 + valueNoise(x / (cell / 2.3), y / (cell / 2.3), 11) * 0.28 + valueNoise(x / (cell / 6), y / (cell / 6), 13) * 0.1;
}

/** A 4 x 4 ordered dither threshold in [0, 1) for a pixel: soft edges drawn as pixel art. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer4(px: number, py: number): number {
  return (BAYER[(py & 3) * 4 + (px & 3)] + 0.5) / 16;
}

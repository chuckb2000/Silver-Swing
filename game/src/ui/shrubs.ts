// Flowering shrubs (trees.json `c: 3`): the sprite choice, the same as
// assets-src/shrubs.py shrub_key(). Frames are `s_<w>_<h>_<variant>` in
// sprites/shrubs.png; the variant is the bush's index in trees.json % 8
// (0 pink, 1 magenta, 2 purple, 3 white, 4 red, 5 coral, 6 pale pink,
// 7 not in flower), so a course sets a bush's colour by its place in the list.

export const SHRUB_WIDTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
export const SHRUB_HEIGHTS = [4, 6, 8, 10, 12, 14, 16, 18, 20];
export const SHRUB_VARIANTS = 8;
const PX_PER_M = 2;
const HEIGHT_PX = PX_PER_M * 0.7;

const nearest = (vals: number[], v: number) => vals.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** Sprite key for a bush of crown radius r and height h (metres), index i in trees.json. */
export function shrubKey(i: number, r: number, h: number): string {
  const w = nearest(SHRUB_WIDTHS, r * 2 * PX_PER_M);
  let hh = nearest(SHRUB_HEIGHTS, 0.6 * w + h * HEIGHT_PX); // the top seen at 3/4 plus the front
  while (hh < 0.5 * w && hh < SHRUB_HEIGHTS[SHRUB_HEIGHTS.length - 1]) hh += 2;
  while (hh > w + 2 && hh > SHRUB_HEIGHTS[0]) hh -= 2;
  return `s_${w}_${hh}_${i % SHRUB_VARIANTS}`;
}

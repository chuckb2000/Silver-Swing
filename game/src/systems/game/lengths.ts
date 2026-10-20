// Round lengths: which holes a round plays, for 18- and 9-hole courses.

import type { RoundLength } from '../../save/entry';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Round lengths a course offers: 18-hole courses all, front or back; 9-hole courses 9, or 18 twice around. */
export function lengthsFor(courseHoles: number): RoundLength[] {
  return courseHoles === 9 ? ['9', '9x2'] : ['18', 'front', 'back'];
}

export function lengthLabel(len: RoundLength): string {
  return { '18': '18 holes', front: 'front 9', back: 'back 9', '9': '9 holes', '9x2': '18 (2 x 9)' }[len];
}

/** Scorecard hole numbers for a round (twice around a 9-hole course: 1-18, playing 1-9 twice). */
export function holesFor(len: RoundLength): number[] {
  if (len === 'front' || len === '9') return range(1, 9);
  if (len === 'back') return range(10, 18);
  return range(1, 18);
}

export function lengthOf(holes: number[], courseHoles: number): RoundLength {
  if (courseHoles === 9) return holes.length === 18 ? '9x2' : '9';
  if (holes.length === 18) return '18';
  return holes[0] === 1 ? 'front' : 'back';
}

/**
 * The nines a round's scorecard shows: only those it plays (a back-nine round
 * showed an empty front nine, afternoon review 2026-10-20); a 9-hole course
 * twice around shows both.
 */
export function cardBlocks(holes: number[], nCourse: number): (readonly [number, number, string])[] {
  if (nCourse === 9 && holes.length <= 9) return [[1, 9, 'tot']];
  const front = holes.some((h) => h <= 9), back = holes.some((h) => h >= 10);
  if (front && !back) return [[1, 9, 'out']];
  if (back && !front) return [[10, 18, 'in']];
  return [[1, 9, 'out'], [10, 18, 'in']];
}

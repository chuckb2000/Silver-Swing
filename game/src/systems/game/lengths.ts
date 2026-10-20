// Round lengths: which holes a round plays. 18-hole courses (all, front or
// back nine), 9-hole courses (9, or 18 twice around), courses of any other
// size (13 or 19 holes, par-3 courses: all of them at once), and clubs of three or more nines (any two nines as an 18, or
// one nine). Pure.

import type { RoundLength } from '../../save/entry';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** One nine of a club with three or more (course.json `nines`): its course holes in order. */
export interface Nine { id: string; name: string; holes: number[] }

/** What a round length depends on: the number of holes, and the nines if the club has several. */
export interface CourseShape { holes: number; nines?: Nine[] }

/** The shape of a loaded course (course.json) or of a course on the list (index.json). */
export function shapeOfCourse(c: { holes: unknown[] | number; nines?: Nine[] }): CourseShape {
  return { holes: Array.isArray(c.holes) ? c.holes.length : c.holes, ...(c.nines ? { nines: c.nines } : {}) };
}

const shapeOf = (s: CourseShape | number): CourseShape => (typeof s === 'number' ? { holes: s } : s);

/** A club whose nines are played in pairs (three or more nines). */
export const hasNines = (s: CourseShape | number) => (shapeOf(s).nines?.length ?? 0) >= 3;

/** Round lengths a course offers, the usual one first. */
export function lengthsFor(shape: CourseShape | number): RoundLength[] {
  const s = shapeOf(shape);
  if (hasNines(s)) {
    const n = s.nines!;
    // each nine with the next (a+b, b+c, c+a), then each nine alone
    const pairs = n.map((a, i) => `nines:${a.id}+${n[(i + 1) % n.length].id}` as RoundLength);
    return [...pairs, ...n.map((a) => `nines:${a.id}` as RoundLength)];
  }
  if (s.holes === 9) return ['9', '9x2'];
  if (s.holes === 18) return ['18', 'front', 'back'];
  return ['all']; // 13 or 19 holes and the like: played all at once (developer, 2026-10-20)
}

const nineOf = (s: CourseShape, id: string) => s.nines?.find((n) => n.id === id);

/** "18 holes", "front 9", "13 holes", "red / white", "blue nine" */
export function lengthLabel(len: RoundLength, shape?: CourseShape | number): string {
  const fixed: Record<string, string> = { '18': '18 holes', front: 'front 9', back: 'back 9', '9': '9 holes', '9x2': '18 (2 x 9)' };
  if (fixed[len]) return fixed[len];
  const s = shape === undefined ? undefined : shapeOf(shape);
  if (len === 'all') return s ? `${s.holes} holes` : 'all holes';
  const ids = len.slice('nines:'.length).split('+');
  const names = ids.map((id) => (s && nineOf(s, id)?.name.toLowerCase()) || id);
  return names.length === 1 ? `${names[0]} nine` : names.join(' / ');
}

/** The holes a round plays: scorecard slots (1, 2, ...) and the course hole each one is. */
export interface RoundPlan { slots: number[]; courseHoles: number[] }

export function planFor(len: RoundLength, shape: CourseShape | number): RoundPlan {
  const s = shapeOf(shape);
  if (len.startsWith('nines:')) {
    const nines = len.slice('nines:'.length).split('+').map((id) => nineOf(s, id));
    if (nines.some((n) => !n)) throw new Error(`unknown nine in ${len}`);
    const courseHoles = nines.flatMap((n) => n!.holes);
    return { slots: range(1, courseHoles.length), courseHoles };
  }
  if (len === 'all') return { slots: range(1, s.holes), courseHoles: range(1, s.holes) };
  const slots = holesFor(len);
  return { slots, courseHoles: slots.map((h) => ((h - 1) % s.holes) + 1) };
}

/** Scorecard slots of the fixed lengths (twice around a 9-hole course: 1-18, playing 1-9 twice). */
export function holesFor(len: RoundLength): number[] {
  if (len === 'front' || len === '9') return range(1, 9);
  if (len === 'back') return range(10, 18);
  return range(1, 18);
}

/** The length of a round from its slots, for rounds that don't carry it (saved before lengths were kept). */
export function lengthOf(holes: number[], courseHoles: number): RoundLength {
  if (courseHoles === 9) return holes.length === 18 ? '9x2' : '9';
  if (courseHoles !== 18 && holes.length === courseHoles) return 'all';
  if (holes.length === 18) return '18';
  return holes[0] === 1 ? 'front' : 'back';
}

/** A full round for the stats and milestones: 18 holes (an 18, 9 twice, two nines of a club). */
export function isFullRound(len: RoundLength): boolean {
  return len === '18' || len === '9x2' || (len.startsWith('nines:') && len.includes('+'));
}

/**
 * The scorecard's blocks for a round: [first slot, last slot, label of the sum column].
 * Nine holes a block; a club's nines are named.
 */
export function cardBlocks(len: RoundLength, nSlots: number, shape?: CourseShape | number): (readonly [number, number, string])[] {
  if (len === 'front') return [[1, 9, 'out']];
  if (len === 'back') return [[10, 18, 'in']];
  if (len === '9') return [[1, 9, 'tot']];
  if (len.startsWith('nines:')) {
    const s = shape === undefined ? undefined : shapeOf(shape);
    const ids = len.slice('nines:'.length).split('+');
    let at = 1;
    return ids.map((id) => {
      const n = s ? nineOf(s, id) : undefined;
      const k = n?.holes.length ?? 9;
      const b = [at, at + k - 1, (n?.name ?? id).toLowerCase().slice(0, 5)] as const;
      at += k;
      return b;
    });
  }
  if (nSlots <= 9) return [[1, nSlots, 'tot']];
  const out: (readonly [number, number, string])[] = [];
  for (let a = 1; a <= nSlots; a += 9) out.push([a, Math.min(nSlots, a + 8), a === 1 ? 'out' : a === 10 ? 'in' : 'xtra']);
  return out;
}

/**
 * The number a hole is shown by: its scorecard slot, or at a club of nines its
 * number in its own nine (1-9) with the nine's name.
 */
export function holeName(slot: number, courseHole: number, shape?: CourseShape | number): { num: number; nine?: string } {
  const s = shape === undefined ? undefined : shapeOf(shape);
  if (s && hasNines(s)) {
    const n = s.nines!.find((x) => x.holes.includes(courseHole));
    if (n) return { num: n.holes.indexOf(courseHole) + 1, nine: n.name.toLowerCase() };
  }
  return { num: slot };
}

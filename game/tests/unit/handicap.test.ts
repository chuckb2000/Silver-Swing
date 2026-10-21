// Handicaps (developer, 2026-10-20: WHS arithmetic with a quick start, Normal only).
import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../src/save/entry';
import { courseHandicap, handicapBoard, handicapOf, HcpCourse, HcpRound, indexLabel, indexOf, ownHcpRounds, strokesOn } from '../../src/systems/game/handicap';

const C18: HcpCourse = { id: 'c18', holes: 18, pars: Array(18).fill(4), si: Array.from({ length: 18 }, (_, i) => i + 1), ratings: { Blue: [72, 113] } };
const C9: HcpCourse = { id: 'c9', holes: 9, pars: Array(9).fill(4), si: [1, 2, 3, 4, 5, 6, 7, 8, 9], ratings: { White: [35, 113], Red: [0, 0] } };
const courses = new Map([[C18.id, C18], [C9.id, C9]]);

let n = 0;
function round(strokes: number[], o: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  const first = o.length === 'back' ? 10 : 1;
  const scores = strokes.map((s, i) => ({ hole: first + i, par: 4, strokes: s, putts: 2, penalties: 0, fairway: null, gir: false }));
  const gross = strokes.reduce((a, b) => a + b, 0);
  n++;
  return {
    id: `r${n}`, course: 'c18', tee: 'Blue', length: strokes.length === 18 ? '18' : 'front', difficulty: 'normal', casual: false, player: 'sam',
    date: `2026-10-${String(10 + n).padStart(2, '0')}T12:00:00Z`, gross, toPar: gross - 4 * strokes.length, back: null, scores,
    totals: { strokes: gross, par: 4 * strokes.length, toPar: 0, putts: 0, penalties: 0, fairways: 0, fairwayChances: 0, gir: 0, holes: strokes.length, front: 0, back: 0 },
    ...o,
  };
}
const all = (s: number, k = 18) => Array(k).fill(s);

describe('handicap', () => {
  it('one 18-hole round gives a provisional index: its differential minus 2.0', () => {
    const h = handicapOf([round(all(5))], courses)!; // 90 on a 72 / 113 course: differential 18.0
    expect(h.differentials.map((d) => d.value)).toEqual([18]);
    expect([h.index, h.provisional]).toEqual([16, true]);
    expect(indexLabel(h)).toBe('16.0');
  });

  it('is official from three rounds (54 holes), and follows the WHS table', () => {
    const r = [round(all(5)), round([...all(4, 17), 6]), round([...all(5, 9), ...all(4, 9)])]; // 18, 2, 9
    const h = handicapOf(r, courses)!;
    expect(h.provisional).toBe(false);
    expect(h.index).toBe(0); // lowest (2.0) minus 2.0
    const d = (v: number) => ({ value: v, date: '', rounds: [] });
    expect(indexOf(Array.from({ length: 20 }, (_, i) => d(i)))!.index).toBe(3.5); // best 8 of 20: 0..7
    expect(indexOf(Array.from({ length: 6 }, (_, i) => d(10 + i)))!.index).toBe(10.5); // lowest 2 (10, 11)
    // a few more counted than WHS in the middle (developer, 2026-10-21); the best 8 only at 20
    expect([5, 7, 8, 10, 11, 13, 14, 16, 17, 18, 19, 20].map((n) => indexOf(Array.from({ length: n }, (_, i) => d(i)))!.counted)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8]);
    expect(indexOf(Array.from({ length: 25 }, (_, i) => d(i)))!.of).toBe(20); // the latest 20 only
  });

  it('two nines (any two, oldest first) make one 18-hole differential; a lone nine waits', () => {
    const a = round(all(5, 9)); // 45 on a front nine: 9-hole differential 45 - 36 = 9
    expect(handicapOf([a], courses)).toBeNull();
    const b = round(all(4, 9), { length: 'back' }); // 36: 0
    expect(handicapOf([a, b], courses)!.differentials.map((x) => x.value)).toEqual([9]);
    const c = round(all(5, 9), { course: 'c9', tee: 'White', length: '9' }); // a 9-hole course rated 35: 45 - 35 = 10
    const d = round(all(4, 9), { course: 'c9', tee: 'White', length: '9' }); // 1
    expect(handicapOf([c, d], courses)!.differentials.map((x) => x.value)).toEqual([11]);
  });

  it('only Normal, non-casual rounds on rated tees count', () => {
    const r = [round(all(5), { difficulty: 'easy' }), round(all(5), { difficulty: 'pro' }), round(all(5), { casual: true }),
      round(all(5, 9), { course: 'c9', tee: 'Red', length: '9' }), round(all(5), { course: 'nowhere' })];
    expect(handicapOf(r, courses)).toBeNull();
  });

  it('holes are capped: par + 5 before an index, then net double bogey', () => {
    const first = round([12, ...all(4, 17)]); // a 12 counts as 9 (par + 5): 77, differential 5.0
    expect(handicapOf([first], courses)!.differentials[0].value).toBe(5);
    // index 3.0 now (5.0 - 2.0): course handicap 3 -> one stroke on stroke indexes 1-3
    expect(courseHandicap(3, C18, 'Blue', 18)).toBe(3);
    expect(strokesOn(Array.from({ length: 18 }, (_, i) => i + 1), C18, 3).slice(0, 4)).toEqual([1, 1, 1, 0]);
    // hole 1 (si 1) capped at 4 + 2 + 1 = 7, hole 4 (si 4) at 6: 77, differential 5.0 (with par + 5 it would be 82: 10.0)
    const second = round([10, 4, 4, 10, ...all(4, 14)]);
    expect(handicapOf([first, second], courses)!.differentials.map((d) => d.value)).toEqual([5, 5]);
  });

  it('the board: one row per player, lowest first, with last week', () => {
    const now = new Date('2026-10-25T12:00:00Z');
    const rows = handicapBoard([round(all(5), { date: '2026-10-01T12:00:00Z' }), round(all(4), { player: 'kim', date: '2026-10-02T12:00:00Z' }),
      round(all(6), { player: 'kim', date: '2026-10-24T12:00:00Z' })], courses, now, 0);
    expect(rows.map((r) => [r.player, r.h.index])).toEqual([['kim', -2], ['sam', 16]]);
    expect(rows[0].weekAgo).not.toBeNull();
  });

  it('the board needs 27 holes: three nines, or an 18 and a nine (developer); the index itself starts at 18', () => {
    const one18 = [round(all(5))];
    expect(handicapOf(one18, courses)!.holes).toBe(18);
    expect(handicapBoard(one18, courses)).toEqual([]);
    const plusNine = [...one18, round(all(5, 9))];
    expect(handicapBoard(plusNine, courses).map((r) => r.player)).toEqual(['sam']);
    const threeNines = [round(all(5, 9), { player: 'kim' }), round(all(5, 9), { player: 'kim', length: 'back' }), round(all(5, 9), { player: 'kim' })];
    expect(handicapBoard(threeNines, courses).map((r) => r.player)).toEqual(['kim']);
    expect(handicapBoard(threeNines.slice(0, 2), courses)).toEqual([]);
  });
});

describe('own handicap rounds (the same as the board: developer, 2026-10-20)', () => {
  const r = (id: string, player: string) => ({ id, player }) as unknown as HcpRound;
  it('leaves out rounds played as "player" once the player has a name', () => {
    const list = [r('a', 'charlie'), r('b', 'player'), r('c', 'charlieb')];
    expect(ownHcpRounds(list, 'charlie', 'player').map((e) => e.id)).toEqual(['a', 'c']);
    expect(ownHcpRounds(list, 'player', 'player').map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

// Holiday themes (design mock-up, 2026-11-13): when they show, and the notes they add.
import { describe, expect, it } from 'vitest';
import { hash01, holidayFromQuery, holidayNote, holidayOn, patchNoise, thanksgivingDay } from '../../src/systems/game/holiday';
import type { HoleScore } from '../../src/systems/rules/scoring';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('when a holiday shows', () => {
  it('Thanksgiving is the fourth Thursday of November', () => {
    expect(thanksgivingDay(2026)).toBe(26);
    expect(thanksgivingDay(2027)).toBe(25);
    expect(thanksgivingDay(2024)).toBe(28);
    for (const y of [2025, 2026, 2027, 2028, 2029, 2030]) expect(new Date(y, 10, thanksgivingDay(y)).getDay()).toBe(4);
  });

  it('Thanksgiving runs from the Saturday before to the Sunday after, into December when it must', () => {
    expect(holidayOn(day(2026, 11, 20))).toBeNull();
    expect(holidayOn(day(2026, 11, 21))).toBe('thanksgiving');
    expect(holidayOn(day(2026, 11, 26))).toBe('thanksgiving');
    expect(holidayOn(day(2026, 11, 29))).toBe('thanksgiving');
    expect(holidayOn(day(2026, 11, 30))).toBeNull();
    expect(holidayOn(day(2024, 12, 1))).toBe('thanksgiving'); // Thanksgiving on the 28th
    expect(holidayOn(day(2024, 11, 23))).toBe('thanksgiving');
    expect(holidayOn(day(2024, 11, 22))).toBeNull();
    expect(holidayOn(day(2024, 12, 2))).toBeNull();
  });

  it('Christmas runs 12 to 31 December', () => {
    expect(holidayOn(day(2026, 12, 11))).toBeNull();
    expect(holidayOn(day(2026, 12, 12))).toBe('christmas');
    expect(holidayOn(day(2026, 12, 25))).toBe('christmas');
    expect(holidayOn(day(2026, 12, 31))).toBe('christmas');
    expect(holidayOn(day(2027, 1, 1))).toBeNull();
    expect(holidayOn(day(2026, 11, 13))).toBeNull();
  });

  it('?holiday= previews one, and none can be turned off', () => {
    expect(holidayFromQuery('?holiday=christmas')).toBe('christmas');
    expect(holidayFromQuery('?a=1&holiday=thanksgiving')).toBe('thanksgiving');
    expect(holidayFromQuery('?holiday=off')).toBeUndefined();
    expect(holidayFromQuery('?holiday=none')).toBeUndefined();
    expect(holidayFromQuery('?holiday=easter')).toBeUndefined();
    expect(holidayFromQuery('')).toBeUndefined();
  });
});

describe('the holiday notes on a finished hole', () => {
  const s = (strokes: number, par = 4): HoleScore => ({ hole: 1, par, strokes, putts: 2, penalties: 0, fairway: true, gir: true });

  it('three birdies in a row is a turkey at Thanksgiving (and six is two)', () => {
    expect(holidayNote('thanksgiving', [s(3), s(3)])).toBeNull();
    expect(holidayNote('thanksgiving', [s(4), s(3), s(2), s(3)])?.art).toBe('turkey');
    expect(holidayNote('thanksgiving', [s(3), s(3), s(3), s(3)])).toBeNull();
    expect(holidayNote('thanksgiving', [s(3), s(3), s(3), s(3), s(3), s(3)])?.text).toMatch(/2 turkeys/);
    expect(holidayNote('christmas', [s(3), s(3), s(3)])).toBeNull();
    expect(holidayNote(null, [s(3), s(3), s(3)])).toBeNull();
  });

  it('an 8 is a snowman at Christmas', () => {
    expect(holidayNote('christmas', [s(8, 5)])?.art).toBe('snowman');
    expect(holidayNote('christmas', [s(7, 5)])).toBeNull();
    expect(holidayNote('thanksgiving', [s(8, 5)])).toBeNull();
  });
});

describe('the decoration is the same every time', () => {
  it('hash and patch noise are fixed functions of place', () => {
    expect(hash01(3, 4, 5)).toBe(hash01(3, 4, 5));
    expect(patchNoise(123.4, 567.8)).toBe(patchNoise(123.4, 567.8));
    let lo = 1, hi = 0;
    for (let x = 0; x < 400; x += 3.7) for (let y = 0; y < 400; y += 4.1) { const n = patchNoise(x, y); lo = Math.min(lo, n); hi = Math.max(hi, n); }
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThan(1);
    expect(hi - lo).toBeGreaterThan(0.5); // patches, not a uniform cover
  });
});

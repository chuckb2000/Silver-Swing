// Leaderboard backup round trip. In Node there is no IndexedDB or
// localStorage, so the store runs on its in-memory fallback.

import { describe, expect, it } from 'vitest';
import { backupText, importBackup, LeaderboardEntry, loadBoard, loadEagles, recordEagle, renameAllLocal, replaceBoard } from '../../src/save/store';
import type { RoundTotals } from '../../src/systems/rules/scoring';

const totals: RoundTotals = {
  strokes: 80, par: 71, toPar: 9, putts: 32, penalties: 1, fairways: 7, fairwayChances: 14, gir: 6, holes: 18, front: 40, back: 40,
};

const entry = (id: string, gross = 80): LeaderboardEntry => ({
  id, course: 'oswego_lake', tee: 'Blue', length: '18', difficulty: 'normal', casual: false,
  player: 'tester', date: '2026-10-18T12:00:00.000Z', gross, toPar: gross - 71, back: 40, scores: [], totals,
});

describe('leaderboard backup', () => {
  it('rejects text that is not a backup', async () => {
    expect(await importBackup('not json')).toBe(-1);
    expect(await importBackup('{"entries": 5}')).toBe(-1);
    expect(await importBackup('42')).toBe(-1);
    expect(await loadBoard()).toEqual([]);
  });

  it('round-trips, skips duplicates and malformed rounds', async () => {
    const a = entry('a', 78), b = entry('b', 85);
    expect(await importBackup(backupText([a, b]))).toBe(2);
    expect((await loadBoard()).map((e) => e.id)).toEqual(['a', 'b']);
    // same backup again adds nothing
    expect(await importBackup(backupText([a, b]))).toBe(0);
    // a bare array works; repeated ids and broken rounds are skipped
    const broken = { ...entry('c'), gross: 'eighty' } as unknown as LeaderboardEntry;
    expect(await importBackup(JSON.stringify([entry('d'), entry('d'), broken]))).toBe(1);
    expect((await loadBoard()).map((e) => e.id)).toEqual(['a', 'b', 'd']);
  });
});

describe('merging names on this device (developer, 2026-10-21)', () => {
  it("this device's rounds and eagles under the merged names go under the one kept", async () => {
    await replaceBoard([{ ...entry('m1'), player: 'chuck' }, { ...entry('m2'), player: 'charlie' }, { ...entry('m3'), player: 'sam' }]);
    await recordEagle({ id: 'e1', round: 'm1', player: 'chuck', course: 'oswego_lake', hole: 5, par: 5, strokes: 3, tee: 'Blue', difficulty: 'normal', date: '2026-10-18T12:00:00.000Z' });
    expect(await renameAllLocal(['charlie', 'chuck'], 'charlie')).toBe(1);
    expect((await loadBoard()).map((e) => `${e.id}:${e.player}`)).toEqual(['m1:charlie', 'm2:charlie', 'm3:sam']);
    expect((await loadEagles()).map((e) => e.player)).toEqual(['charlie']);
    await replaceBoard([]);
  });
});

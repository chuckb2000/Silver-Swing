// The default tees are the longest set (developer, 2026-10-31): a device that remembered TPC Boston or
// Wannamoisett on its old default goes to the longest set once; a choice made after that is kept.
import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from '../../src/save/store';
import { teeFor } from '../../src/data/registry';
import index from '../../public/courses/index.json';

describe('default tees', () => {
  it('a remembered old default goes to the longest set, once; a shorter set chosen later stays', async () => {
    const s0 = await loadSettings();
    await saveSettings({ ...s0, teesLongest: undefined, tees: { tpc_boston: 'Black', wannamoisett: 'Blue', newport: 'Blue' } });
    const s1 = await loadSettings();
    expect(s1.tees).toEqual({ newport: 'Blue' });
    const courses = (index as { courses: { id: string; defaultTee: string; teeSets: string[] }[] }).courses;
    const tpc = courses.find((c) => c.id === 'tpc_boston')!;
    expect(teeFor(tpc, s1.tees)).toBe('Gold');
    await saveSettings({ ...s1, tees: { ...s1.tees, wannamoisett: 'Blue' } });
    expect((await loadSettings()).tees.wannamoisett).toBe('Blue');
  });
});

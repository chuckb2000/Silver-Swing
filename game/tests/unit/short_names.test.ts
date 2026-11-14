// Course names in lists (developer, 2026-11-14: The Country Club read "the" on the recent list,
// and "the old course," / "shaughnessy golf and" were cut mid-name).
import { describe, expect, it } from 'vitest';
import { fitName, listName, shortName } from '../../src/save/milestones';

describe('short course names', () => {
  it('club words go, but never down to a bare "the"', () => {
    expect(shortName('The Country Club')).toBe('the country club');
    expect(shortName('Langston Golf Course')).toBe('langston');
    expect(shortName('Shaughnessy Golf and Country Club')).toBe('shaughnessy');
    expect(shortName('Capilano Golf and Country Club')).toBe('capilano');
    expect(shortName('Willamette Valley CC')).toBe('willamette valley');
    expect(shortName('The Sea Ranch Golf Links')).toBe('the sea ranch');
  });
  it('a place after a comma, "the course at", a dash and a trailing "course"', () => {
    expect(shortName('The Old Course, St Andrews')).toBe('the old course');
    expect(shortName('The Mountain Course at Spruce Peak')).toBe('spruce peak');
    expect(shortName('The Course at Aberdeen')).toBe('aberdeen');
    expect(shortName('Pronghorn - Nicklaus Course')).toBe('pronghorn nicklaus');
    expect(shortName('Sydney R. Marovitz Golf Course')).toBe('marovitz');
  });
  it('a course at a place with several keeps its name there', () => {
    expect(listName({ name: 'Pumpkin Ridge Witch Hollow', group: 'pumpkin_ridge', groupName: 'Pumpkin Ridge' })).toBe('witch hollow');
    expect(listName({ name: 'East Potomac White Course', group: 'east_potomac', groupName: 'East Potomac' })).toBe('east po white');
  });
  it('fits a column: "the" first, whole words when most stays, never ending on a comma or a space', () => {
    expect(fitName('the country club', 16)).toBe('the country club');
    expect(fitName('the old course', 10)).toBe('old course');
    expect(fitName('willamette valley', 12)).toBe('willamette');
    expect(fitName('bandon dunes', 10)).toBe('bandon dun');
    expect(fitName('bandon trails', 10)).toBe('bandon tra');
    for (const s of ['the country club', 'rancho san joaquin', 'pronghorn nicklaus', 'columbia edgewater'])
      for (let n = 6; n <= 20; n++) {
        const f = fitName(s, n);
        expect(f.length).toBeLessThanOrEqual(n);
        expect(f).not.toMatch(/[\s,]$/);
        expect(f.length).toBeGreaterThan(0);
      }
  });
});

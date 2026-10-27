// Places with several courses, tee choice and unrated tees (East Potomac requests).
import { describe, expect, it } from 'vitest';
import { courseEntries, CourseInfo, ratingText, teeFor } from '../../src/data/registry';

const c = (id: string, extra: Partial<CourseInfo> = {}): CourseInfo => ({
  id, name: id, location: 'Town, DC', theme: 'pnw', holes: 18, par: 72, defaultTee: 'White', totalYd: 6000, teeSets: ['White'], ...extra,
});

describe('courseEntries', () => {
  it('shows courses sharing a group once, at the first one, with all its courses', () => {
    const g = { group: 'ep', groupName: 'East Potomac Golf Links' };
    const e = courseEntries([c('a'), c('ep_blue', g), c('b'), c('ep_red', g), c('ep_white', g)]);
    expect(e.map((x) => (x.kind === 'course' ? x.course.id : `[${x.id}]`))).toEqual(['a', '[ep]', 'b']);
    const grp = e[1];
    expect(grp.kind === 'group' && grp.name).toBe('East Potomac Golf Links');
    expect(grp.kind === 'group' && grp.courses.map((x) => x.id)).toEqual(['ep_blue', 'ep_red', 'ep_white']);
  });
  it('a group of one is just a course', () => {
    expect(courseEntries([c('x', { group: 'g' })])[0].kind).toBe('course');
  });
});

describe('teeFor', () => {
  const blue = c('ep_blue', { teeSets: ['Blue', 'White'], defaultTee: 'Blue' });
  it('uses the tee last chosen for that course', () => {
    expect(teeFor(blue, { ep_blue: 'White' })).toBe('White');
    expect(teeFor(blue, { other: 'White' })).toBe('Blue');
  });
  it('ignores a remembered tee the course no longer has', () => {
    expect(teeFor(blue, { ep_blue: 'Gold' })).toBe('Blue');
  });
  it('reads course.json tee sets too', () => {
    expect(teeFor({ id: 'x', defaultTee: 'Blue', teeSets: [{ name: 'Blue' }, { name: 'White' }] }, { x: 'White' })).toBe('White');
  });
});

describe('ratingText', () => {
  it('prints rating / slope, or "not rated" for a par-3 course', () => {
    expect(ratingText({ rating: 71.4, slope: 133 })).toBe('71.4 / 133');
    expect(ratingText({ rating: 0, slope: 0 })).toBe('not rated');
  });
});

describe('Bandon Dunes Golf Resort (developer, 2026-10-27)', async () => {
  const { courseEntries: listed, groupsFile, titleMaps } = await import('../../scripts/course-lists.mjs');
  const { nameInGroup } = await import('../../src/data/registry');
  const { listName } = await import('../../src/save/milestones');
  const BANDON = ['bandon_dunes', 'bandon_preserve', 'bandon_trails', 'old_macdonald', 'pacific_dunes', 'sheep_ranch', 'shortys'];

  it('the seven Bandon courses are one place on the course list, under their own names', () => {
    const all = listed();
    const resort = all.filter((e: { group?: string }) => e.group === 'bandon_resort');
    expect(resort.map((e: { id: string }) => e.id).sort()).toEqual(BANDON);
    for (const e of resort) {
      expect(e.groupName).toBe('Bandon Dunes Golf Resort');
      expect(nameInGroup(e.name, e.groupName, e.keepName)).toBe(e.name);
      expect(listName(e)).not.toMatch(/^(dunes|trails|preserve)$/);
    }
    expect(groupsFile().bandon_resort.courses.sort()).toEqual(BANDON);
    // each course keeps its own view on the title screen (one world per course, unlike East Potomac)
    expect(titleMaps(all).filter((id: string) => BANDON.includes(id)).length).toBeGreaterThan(1);
    // a course in a group file must be a course on the list, and in one group only
    const ids = new Set(all.map((e: { id: string }) => e.id));
    const seen = new Set<string>();
    for (const g of Object.values(groupsFile()) as { courses: string[] }[]) for (const id of g.courses) {
      expect(ids.has(id), id).toBe(true);
      expect(seen.has(id), id).toBe(false);
      seen.add(id);
    }
  });

  it('the resort has its own logo', async () => {
    const { existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    expect(existsSync(resolve(__dirname, '../../public/sprites/logos/bandon_resort.png'))).toBe(true);
  });
});

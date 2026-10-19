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

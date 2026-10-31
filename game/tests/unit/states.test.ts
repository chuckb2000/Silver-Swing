// Courses grouped by state for the course-select screen.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { coursesByState, CourseInfo, OTHER_STATE, stateName, stateOf, STATES } from '../../src/data/registry';
import { registry } from './helpers';

const info = (id: string, name: string, location: string, state?: string): CourseInfo =>
  ({ id, name, location, theme: 'pnw', holes: 18, par: 72, defaultTee: 'Blue', totalYd: 6500, teeSets: ['Blue'], state });

describe('course states', () => {
  it('reads the state field, else the end of the location', () => {
    expect(stateOf(info('a', 'A', 'Lake Oswego, Clackamas County, Oregon'))).toBe('OR');
    expect(stateOf(info('b', 'B', 'Truro, Barnstable County, Massachusetts'))).toBe('MA');
    expect(stateOf(info('c', 'C', 'Somewhere, MD'))).toBe('MD');
    expect(stateOf(info('d', 'D', 'Truro', 'ma'))).toBe('MA');
    expect(stateOf(info('e', 'E', 'Nowhere'))).toBe(OTHER_STATE);
    expect(stateName('MA')).toBe('Massachusetts');
    expect(Object.keys(STATES)).toHaveLength(52);
  });

  it('groups courses by state, states and courses A-Z, unknown last', () => {
    const g = coursesByState([
      info('z', 'Zeta Links', 'X, Oregon'), info('h', 'Highland Links', 'Truro, Massachusetts'),
      info('a', 'Alpha CC', 'Y, Oregon'), info('q', 'Q', 'Mars'),
    ]);
    expect(g.map((s) => s.code)).toEqual(['MA', 'OR', OTHER_STATE]);
    expect(g[1].courses.map((c) => c.id)).toEqual(['a', 'z']);
  });

  it('every listed course has a known state', () => {
    for (const c of registry()) expect(stateOf(c), c.id).not.toBe(OTHER_STATE);
  });

  it('course cards and logos, where present, are in sprites/', () => {
    const sprites = resolve(__dirname, '../../public/sprites');
    expect(existsSync(resolve(sprites, 'cards/oswego_lake.png'))).toBe(true);
    expect(existsSync(resolve(sprites, 'logos/oswego_lake.png'))).toBe(true);
  });
});

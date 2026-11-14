// Courses grouped by state for the course-select screen.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { courseCountText, coursesByState, CourseInfo, EUROPE, OTHER_STATE, stateName, stateOf, STATES } from '../../src/data/registry';
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

  it('every course in Europe is under one "europe" button, after the states', () => {
    expect(stateOf(info('s', 'Old Course', 'St Andrews, Fife, Scotland'))).toBe(EUROPE);
    expect(stateOf(info('l', 'Lofoten Links', 'Gimsøya, Vågan, Nordland, Norway'))).toBe(EUROPE);
    expect(stateOf(info('x', 'X', 'Somewhere', 'EU'))).toBe(EUROPE);
    expect(stateOf(info('y', 'Y', 'Somewhere', 'Ireland'))).toBe(EUROPE);
    expect(stateOf(info('d', 'D', 'Wilmington', 'DE'))).toBe('DE'); // Delaware, not Germany
    expect(stateName(EUROPE)).toBe('europe');
    const g = coursesByState([
      info('s', 'Old Course', 'St Andrews, Fife, Scotland'), info('a', 'Alpha CC', 'Y, Oregon'),
      info('l', 'Lofoten Links', 'Gimsøya, Nordland, Norway'), info('q', 'Q', 'Mars'), info('v', 'Victoria', 'Oak Bay, British Columbia'),
    ]);
    expect(g.map((s) => s.code)).toEqual(['BC', 'OR', EUROPE, OTHER_STATE]);
    expect(g[2].courses.map((c) => c.id)).toEqual(['l', 's']);
  });

  it('the title counts the states and says europe', () => {
    const or = info('a', 'Alpha CC', 'Y, Oregon'), ma = info('h', 'H', 'Truro, Massachusetts'), sc = info('s', 'Old Course', 'St Andrews, Scotland');
    expect(courseCountText([or, ma])).toBe('2 courses in 2 states');
    expect(courseCountText([or, ma, sc])).toBe('3 courses in 2 states and europe');
    expect(courseCountText([or, sc])).toBe('2 courses in 1 state and europe');
    expect(courseCountText([or, { ...or, id: 'b' }])).toBe('2 courses');
    expect(courseCountText([sc])).toBe('Old Course');
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

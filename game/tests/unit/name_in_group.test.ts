// Inside a place's list a course shows only its own part of the name (developer, 2026-10-24:
// "once you open pumpkin ridge the courses should just be named ghost creek and witch hollow").
import { describe, expect, it } from 'vitest';
import { nameInGroup } from '../../src/data/registry';

describe('nameInGroup', () => {
  it('drops the words shared with the place', () => {
    expect(nameInGroup('Pumpkin Ridge Witch Hollow', 'Pumpkin Ridge Golf Club')).toBe('Witch Hollow');
    expect(nameInGroup('Pumpkin Ridge Ghost Creek', 'Pumpkin Ridge Golf Club')).toBe('Ghost Creek');
    expect(nameInGroup('East Potomac Blue Course', 'East Potomac Golf Links')).toBe('Blue Course');
  });
  it('keeps a name that shares nothing, and never empties one', () => {
    expect(nameInGroup('Old Course', 'Pumpkin Ridge Golf Club')).toBe('Old Course');
    expect(nameInGroup('Pumpkin Ridge', 'Pumpkin Ridge Golf Club')).toBe('Ridge');
  });
});

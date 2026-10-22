// The tee buttons go longest first, left to right (developer, 2026-10-22:
// Wannamoisett showed Blue left of the longer Black): the course list's tee
// sets are in that order on every course.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { entryOf, PUBLIC } from '../../scripts/course-lists.mjs';

type Tee = { name: string; totalYd: number };
const course = (id: string) => JSON.parse(readFileSync(join(PUBLIC, 'courses', id, 'course.json'), 'utf8')) as { teeSets: Tee[] };

describe('tee sets, longest first', () => {
  it('Wannamoisett: black, then blue', () => {
    expect(entryOf(course('wannamoisett')).teeSets).toEqual(['Black', 'Blue']);
  });

  it('every course on the list', () => {
    const index = JSON.parse(readFileSync(join(PUBLIC, 'courses', 'index.json'), 'utf8')) as { courses: { id: string; teeSets: string[] }[] };
    for (const c of index.courses) {
      const yd = new Map(course(c.id).teeSets.map((t) => [t.name, t.totalYd]));
      const lengths = c.teeSets.map((n) => yd.get(n) ?? 0);
      expect(lengths, c.id).toEqual([...lengths].sort((a, b) => b - a));
    }
  });
});

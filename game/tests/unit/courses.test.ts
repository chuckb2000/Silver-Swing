// Every course in the registry (game/public/courses/index.json) is complete
// and playable, and 9-hole courses work (tested with a 9-hole course made
// from Oswego Lake's front nine).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CourseJson } from '../../src/data/course';
import { initialCourseId, treeSheet } from '../../src/data/registry';
import { holesFor, lengthOf, lengthsFor } from '../../src/systems/game/lengths';
import { courseHoleFor } from '../../src/systems/game/round';
import { totals } from '../../src/systems/rules/scoring';
import { COURSES_DIR, loadCourseFiles, registry, robotRound } from './helpers';

const courses = registry();

describe('course registry', () => {
  it('Rock Creek Park is not in the game (developer, 2026-10-25: not to be merged; PR #48 closed)', () => {
    expect(courses.map((c) => c.id).filter((id) => id.startsWith('rock_creek'))).toEqual([]);
    expect(existsSync(resolve(COURSES_DIR, '..', '..', '..', 'data', 'rock_creek'))).toBe(false);
  });

  it('lists at least one course, each id once', () => {
    expect(courses.length).toBeGreaterThan(0);
    expect(new Set(courses.map((c) => c.id)).size).toBe(courses.length);
  });

  it('starts with the last course played if it still exists, else the first', () => {
    expect(initialCourseId(courses, courses[0].id)).toBe(courses[0].id);
    expect(initialCourseId(courses, 'gone')).toBe(courses[0].id);
    expect(initialCourseId([], 'x')).toBeNull();
  });

  for (const info of courses) {
    describe(info.id, () => {
      const base = resolve(COURSES_DIR, info.id);
      const json = JSON.parse(readFileSync(resolve(base, 'course.json'), 'utf8')) as CourseJson;

      it('registry entry matches course.json', () => {
        expect(json.id).toBe(info.id);
        expect(json.name).toBe(info.name);
        expect(json.holes.length).toBe(info.holes);
        expect(info.holes).toBeGreaterThan(0);
        expect(json.par).toBe(info.par);
        expect(json.defaultTee).toBe(info.defaultTee);
        expect(json.attribution.length).toBeGreaterThan(0);
      });

      it('the default tees are the longest set (developer, 2026-10-31)', () => {
        const longest = [...json.teeSets].sort((a, b) => b.totalYd - a.totalYd)[0];
        expect(json.defaultTee, `set "default_tee": "${longest.name}" in course_config.json`).toBe(longest.name);
      });

      it('has every file the game loads', () => {
        const files = [json.height.file, json.surface.file, json.trees.file, json.maps.overview, 'height.json', ...json.maps.holes.map((m) => m.file)];
        for (let j = 0; j < json.terrain.rows; j++) for (let i = 0; i < json.terrain.cols; i++) {
          files.push(json.terrain.pattern.replace('{i}', String(i)).replace('{j}', String(j)));
        }
        for (const g of json.greenViews ?? []) for (const l of [g.far, g.near, g.close]) if (l) files.push(l.file, l.trees, l.treesImage);
        for (const f of files) expect(existsSync(resolve(base, f)), f).toBe(true);
        const sheet = treeSheet(json.theme);
        expect(existsSync(resolve(COURSES_DIR, '..', `${sheet}.png`)) || json.theme !== 'pnw', `tree sprites for ${json.theme}`).toBe(true);
      });

      it('every hole has a minimap and far, near and close putting views', () => {
        for (const h of json.holes) {
          expect(json.maps.holes.some((m) => m.hole === h.number), `hole ${h.number} minimap`).toBe(true);
          const gv = json.greenViews?.find((g) => g.hole === h.number);
          expect(gv && gv.far && gv.near && gv.close, `hole ${h.number} putting views`).toBeTruthy();
        }
      });

      it('a robot golfer completes a full round', () => {
        const course = loadCourseFiles(info.id);
        const holes = holesFor(lengthsFor(info.holes)[0]);
        const r = robotRound(course, holes);
        expect(r.scores).toHaveLength(holes.length);
        for (const s of r.scores) expect(s.strokes).toBeGreaterThanOrEqual(1);
      });
    });
  }
});

describe('9-hole courses', () => {
  // Oswego Lake's front nine, presented as a 9-hole course
  const nine = loadCourseFiles('oswego_lake', (j) => ({
    ...j,
    id: 'oswego_nine',
    holes: j.holes.slice(0, 9),
    par: j.holes.slice(0, 9).reduce((a, h) => a + h.par, 0),
    maps: { ...j.maps, holes: j.maps.holes.filter((m) => m.hole <= 9) },
    greenViews: (j.greenViews ?? []).filter((g) => g.hole <= 9),
  }));

  it('offer 9 holes or 18 twice around', () => {
    expect(lengthsFor(9)).toEqual(['9', '9x2']);
    expect(lengthsFor(18)).toEqual(['18', 'front', 'back']);
    expect(holesFor('9')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(holesFor('9x2')).toHaveLength(18);
    expect(lengthOf(holesFor('9'), 9)).toBe('9');
    expect(lengthOf(holesFor('9x2'), 9)).toBe('9x2');
    expect(lengthOf(holesFor('back'), 18)).toBe('back');
  });

  it('the second time around plays the course\'s holes 1-9 again as holes 10-18', () => {
    expect(courseHoleFor(10, 9)).toBe(1);
    expect(courseHoleFor(18, 9)).toBe(9);
    expect(courseHoleFor(12, 18)).toBe(12);
    const r = robotRound(nine, holesFor('9x2'));
    expect(r.scores).toHaveLength(18);
    expect(r.scores.map((s) => s.hole)).toEqual(holesFor('9x2'));
    for (let k = 0; k < 9; k++) expect(r.scores[k + 9].par).toBe(r.scores[k].par);
    const t = totals(r.scores);
    expect(t.front).not.toBeNull();
    expect(t.back).not.toBeNull();
    expect(t.par).toBe(2 * nine.json.par);
  });

  it('a 9-hole round has no back nine', () => {
    const r = robotRound(nine, holesFor('9'));
    expect(r.scores).toHaveLength(9);
    expect(totals(r.scores).back).toBeNull();
  });
});

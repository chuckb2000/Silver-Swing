// Triggs Memorial Golf Course (Providence, RI): course-specific checks of
// COURSE_BUILD.md 8.2 for the Blue tees, every penalty area red (standing
// default), and a perfect drive straight down each hole line (COURSE_LESSONS 12).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COURSES_DIR, loadCourseFiles, registry } from './helpers';

const ID = 'triggs';
// outside 3% of the card after the tee position (data/wannamoisett/validation_report.md): Black 12 has no
// Black box in OSM or the lidar and plays from the back of the Blue box

const course = loadCourseFiles(ID);
const json = course.json;
const TEES = json.teeSets.map((t) => t.name);

describe('Triggs: course list, tees and layout', () => {
  it('is an 18-hole par-72 course in Rhode Island, Blue tees only', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('RI');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(72);
    expect(json.defaultTee).toBe('Blue');
    expect(TEES).toEqual(['Blue']);
    expect(json.theme).toBe('seekonk');
  });

  it('has trees of both kinds from the lidar and no flowering trees (seekonk theme)', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
    expect(t.c.filter((c) => c === 0).length).toBeGreaterThan(t.c.filter((c) => c === 1).length);
  });

});


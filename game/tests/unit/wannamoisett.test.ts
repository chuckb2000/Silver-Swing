// Wannamoisett Country Club (Rumford, RI): course-specific checks of
// COURSE_BUILD.md 8.2 for both tee sets (Blue default, Black), plus the
// developer's calls of 2026-10-19: every penalty area red, and the pond by
// hole 14 (cut out of the OSM course relation) inside the boundary as a red
// penalty area, not out of bounds.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Round } from '../../src/systems/game/round';
import { isOB, SURF } from '../../src/systems/physics/surfaces';
import { COURSES_DIR, loadCourseFiles, meterFor, registry, roundCfg } from './helpers';

const ID = 'wannamoisett';
// outside 3% of the card after the tee position (data/wannamoisett/validation_report.md): Black 12 has no
// Black box in OSM or the lidar and plays from the back of the Blue box

const course = loadCourseFiles(ID);
const json = course.json;
const TEES = json.teeSets.map((t) => t.name);

describe('Wannamoisett: course list, tees and layout', () => {
  it('is an 18-hole par-69 course in Rhode Island, Blue tees by default, Black also built', () => {
    expect(registry().find((c) => c.id === ID)?.state).toBe('RI');
    expect(json.holes.map((h) => h.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(json.holes.reduce((a, h) => a + h.par, 0)).toBe(69);
    expect(json.defaultTee).toBe('Blue');
    expect(TEES).toEqual(['Blue', 'Black']);
    expect(json.theme).toBe('seekonk');
  });

  it('the pond by hole 14 is inside the boundary and plays as a penalty area, not out of bounds', () => {
    // OSM cuts it out of the course relation as an inner ring; config join_boundary fills it
    for (const [x, y] of [[654.0, 877.1], [653.1, 875.1]]) {
      expect(course.boundary.contains(x, y), `${x},${y}`).toBe(true);
      expect(course.terrain.surface(x, y), `${x},${y}`).toBe(SURF.water);
      expect(isOB(course.terrain.surface(x, y)), `${x},${y}`).toBe(false);
    }
  });

  it('a ball at rest in the hole-14 pond takes red penalty-area relief', () => {
    const r = new Round(course, roundCfg(course, [14]));
    r.startHole(0);
    r.wind = { dir: 0, mph: 0, vx: 0, vy: 0 };
    r.ball = { x: 654.0, y: 877.1, teedUp: false };
    const plan = r.plan('pw', 0, meterFor(0.01, 0, false), 0, 1);
    const sim = r.simulate(plan);
    const out = r.resolve(plan, sim);
    expect(out.kind).toBe('water');
    if (out.kind === 'water') expect(out.penalty).toBe('red');
  });

  it('has trees of both kinds from the lidar and no flowering trees (seekonk theme)', () => {
    const t = JSON.parse(readFileSync(resolve(COURSES_DIR, ID, 'trees.json'), 'utf8')) as { c: number[] };
    expect(t.c.filter((c) => c === 2)).toHaveLength(0);
    expect(t.c.filter((c) => c === 1).length).toBeGreaterThan(0);
    expect(t.c.filter((c) => c === 0).length).toBeGreaterThan(t.c.filter((c) => c === 1).length);
  });

});


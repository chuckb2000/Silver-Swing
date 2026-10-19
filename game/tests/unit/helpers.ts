// Shared test helpers: load a course from game/public/courses (no Phaser) and
// play a round with a simple robot golfer.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { buildRuntime, CourseJson, CourseRuntime, decodeHeights, decodeSurface, HeightMeta } from '../../src/data/course';
import type { CourseInfo } from '../../src/data/registry';
import { Round, RoundConfig } from '../../src/systems/game/round';
import { FULL_MAX, PART_MAX, SwingMeter } from '../../src/systems/swing/meter';

export const COURSES_DIR = resolve(__dirname, '../../public/courses');

export function registry(): CourseInfo[] {
  return (JSON.parse(readFileSync(resolve(COURSES_DIR, 'index.json'), 'utf8')) as { courses: CourseInfo[] }).courses;
}

export function loadCourseFiles(id: string, edit?: (j: CourseJson) => CourseJson): CourseRuntime {
  const base = resolve(COURSES_DIR, id);
  const png = (file: string) => {
    const p = PNG.sync.read(readFileSync(resolve(base, file)));
    return { data: new Uint8ClampedArray(p.data.buffer, p.data.byteOffset, p.data.length), w: p.width, h: p.height };
  };
  let json = JSON.parse(readFileSync(resolve(base, 'course.json'), 'utf8')) as CourseJson;
  if (edit) json = edit(json);
  const hmeta = JSON.parse(readFileSync(resolve(base, 'height.json'), 'utf8')) as HeightMeta;
  const trees = JSON.parse(readFileSync(resolve(base, 'trees.json'), 'utf8'));
  const h = png(json.height.file);
  const s = png(json.surface.file);
  return buildRuntime(json, decodeHeights(h.data, hmeta), hmeta, decodeSurface(s.data, s.w, s.h), trees, base);
}

export const roundCfg = (course: CourseRuntime, holes: number[], seed = 7): RoundConfig => ({
  courseId: course.json.id, tee: course.json.defaultTee, holes, playerName: 'test', seed,
  settings: { difficulty: 'normal', lefty: false, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
  startedAt: '2026-10-18T00:00:00Z',
});

/** Meter result for a target power and a tap-3 error (in % of bar). */
export function meterFor(power: number, err: number, putt: boolean) {
  const m = new SwingMeter(putt ? 'putt' : 'full', 1.6, putt ? PART_MAX : FULL_MAX);
  const speed = m.speed;
  m.tap(0);
  const t2 = (power * 100) / speed;
  m.tap(t2);
  m.tap(t2 + (power * 100 - err) / speed);
  return m.result!;
}

/** A robot plays the round to the end (picks up at 15 strokes). */
export function robotRound(course: CourseRuntime, holes: number[], seed = 7): Round {
  const r = new Round(course, roundCfg(course, holes, seed));
  r.startHole(0);
  let guard = 0;
  let down = 0;
  let hole = r.holeNumber;
  while (!r.finished && guard++ < 50 * holes.length) {
    if (r.holeNumber !== hole) { hole = r.holeNumber; down = 0; }
    let club = r.autoClub();
    if (club.kind !== 'putter' && down > 0) {
      const bag = r.allowedClubs().filter((c) => c.kind !== 'putter');
      club = bag[Math.min(bag.length - 1, bag.findIndex((c) => c.id === club.id) + down)];
    }
    const putt = club.kind === 'putter';
    const scale = r.autoSwingScale(club);
    const aim = r.defaultAim(club, scale);
    const d = r.distToPin();
    const power = putt ? Math.min(1, (d * 1.1 + 0.3) / scale) : Math.max(0.15, Math.min(1, d / Math.max(1, r.fullCarry(club) * scale)));
    const plan = r.plan(club.id, aim, meterFor(power, (guard % 5) - 2, putt), 0, scale);
    const sim = r.simulate(plan);
    const out = r.resolve(plan, sim);
    if (out.kind === 'holed' || out.kind === 'gimme') { r.finishHole(); r.nextHole(); continue; }
    if (out.kind === 'water' || out.kind === 'ob') { down++; r.applyRelief(out.options[0], out.options[0].center); }
    if (out.kind === 'wrong_green' || out.kind === 'cartpath') r.applyRelief(out.area, out.area.center);
    if (r.tally.strokes > 14) { r.finishHole(true); r.nextHole(); }
  }
  return r;
}

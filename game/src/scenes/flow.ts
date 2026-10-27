// Round start / resume / finish helpers shared by the scenes.

import Phaser from 'phaser';
import { app } from '../app';
import { addToBoard, LeaderboardEntry, loadBoard, saveSettings } from '../save/store';
import { flushUploads } from '../save/online';
import { loadCourse, LoadProgress } from '../data/courses';
import { teeFor } from '../data/registry';
import { clearSnapshot, peekSnapshot, restoreRound } from '../save/snapshot';
import { courseHoleFor, isCasual, newSeed, Round, RoundConfig, roundId } from '../systems/game/round';
import { roundPins } from '../systems/game/pins';
import { totals } from '../systems/rules/scoring';
import type { DailyPlan } from '../systems/game/daily';
import { isTourId, tourName, TourPlan } from '../systems/game/tour';
import { PRACTICE_COURSE } from '../systems/game/practice';
import { confirmBox } from '../ui/confirm';
import { askName } from '../ui/nameInput';
import { DEFAULT_NAME } from '../save/names';
import { shortName } from '../save/milestones';

export { holesFor, lengthLabel, lengthOf, lengthsFor } from '../systems/game/lengths';
export type { RoundLength } from '../save/entry';
import { lengthOf, planFor, shapeOfCourse } from '../systems/game/lengths';
import type { RoundLength } from '../save/entry';

/** A listed course's shape (holes, nines) for round-length labels, if it is on the list. */
export function shapeById(id: string) {
  const c = app.courses.find((x) => x.id === id);
  return c ? shapeOfCourse(c) : undefined;
}

/** Start a round on the current course; `daily` fixes everything but the hand from the date (daily round). */
export function startRound(scene: Phaser.Scene, len: RoundLength, daily?: DailyPlan) {
  const s = app.settings;
  const length = daily ? daily.length : len;
  const plan = planFor(length, shapeOfCourse(app.course!.json));
  const n = app.course!.json.holes.length;
  const cfg: RoundConfig = {
    courseId: app.course!.json.id,
    tee: daily ? daily.tee : teeFor(app.course!.json, s.tees),
    holes: plan.slots,
    length,
    // the course hole of each slot, only where it isn't the usual one (a club's nines)
    ...(plan.slots.some((h, i) => plan.courseHoles[i] !== courseHoleFor(h, n)) ? { courseHoles: plan.courseHoles } : {}),
    playerName: s.playerName || 'player',
    seed: daily ? daily.seed : newSeed(),
    settings: daily
      ? { difficulty: 'normal', lefty: s.lefty, e5: false, gimmes: false, maxDoublePar: false, mulligans: false }
      : { difficulty: s.difficulty, lefty: s.lefty, e5: s.e5, gimmes: s.gimmes, maxDoublePar: s.maxDoublePar, mulligans: s.mulligans },
    startedAt: new Date().toISOString(),
    ...(daily ? { daily: daily.day } : {}),
  };
  // a pin for every hole, mixed front / middle / back and easy / medium / hard (pins.ts)
  cfg.pins = roundPins(app.course!, cfg.tee, plan.courseHoles, cfg.seed);
  app.round = new Round(app.course!, cfg);
  app.round.startHole(0);
  void clearSnapshot();
  scene.scene.start('play', { resume: false });
}

/**
 * Start today's par 3s / 4s / 5s (tour.ts) on the first hole's course, already loaded: nine
 * holes at Normal, each from its course's default tee, the wind and pins fixed by the date.
 */
export function startTour(scene: Phaser.Scene, plan: TourPlan) {
  const s = app.settings;
  const cfg: RoundConfig = {
    courseId: plan.courseId,
    tee: plan.tee,
    holes: plan.holes.map((_, i) => i + 1),
    length: plan.length,
    courseHoles: plan.holes.map((h) => h.hole),
    tour: plan.holes.map((h) => ({ ...h })),
    playerName: s.playerName || 'player',
    seed: plan.seed,
    settings: { difficulty: 'normal', lefty: s.lefty, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
    startedAt: new Date().toISOString(),
    daily: plan.day,
  };
  app.round = new Round(app.course!, cfg);
  app.round.startHole(0);
  void clearSnapshot();
  prefetchNextCourse(app.round);
  scene.scene.start('play', { resume: false });
}

/** Load a course into the browser's cache while it isn't needed yet (a tour round's next course). */
const prefetched = new Set<string>();
export function prefetchNextCourse(r: Round) {
  const here = r.course.json.id;
  const next = r.cfg.tour?.slice(r.holeIndex + 1).find((t) => t.course !== here)?.course;
  if (!next || prefetched.has(next)) return;
  prefetched.add(next);
  void (async () => {
    try {
      const base = `courses/${next}/`;
      const j = await (await fetch(`${base}course.json`)).json() as {
        terrain: { rows: number; cols: number; pattern: string }; maps: { overview: string; holes: { file: string }[] };
        height: { file: string }; surface: { file: string };
      };
      const files = ['trees.json', 'height.json', j.height.file, j.surface.file, j.maps.overview, ...j.maps.holes.map((m) => m.file)];
      for (let jj = 0; jj < j.terrain.rows; jj++) for (let i = 0; i < j.terrain.cols; i++) files.push(j.terrain.pattern.replace('{i}', String(i)).replace('{j}', String(jj)));
      // one at a time, so the round being played never waits on them
      for (const f of files) await fetch(base + f).then((res) => res.arrayBuffer()).catch(() => null);
    } catch { prefetched.delete(next); }
  })();
}

/**
 * A tour round's next hole is on another course: the hole-complete panel hands over to the
 * loading screen ('tourload'), which loads that course and opens the hole.
 */
export function toTourHole(scene: Phaser.Scene) {
  // (the round was saved as the last hole was holed: a tab closed now opens on the next hole)
  scene.scene.stop('play');
  scene.scene.start('tourload');
}

/** The course a saved round goes on with (a tour round: the course of the hole it is on). */
export function snapshotCourse(snap: Snap): string {
  if (!snap.cfg.tour) return snap.cfg.courseId;
  const i = Math.min(snap.cfg.holes.length - 1, snap.holeIndex + (snap.betweenHoles ? 1 : 0));
  return snap.cfg.tour[i]?.course ?? snap.cfg.courseId;
}

/** Where a saved round is, for a menu: "oswego lake", or "today's par 5s". */
export function snapshotWhere(snap: Snap): string {
  if (isTourId(snap.cfg.courseId)) return `${snap.cfg.daily === localDayNow() ? "today's" : 'the'} ${tourName(snap.cfg.courseId)}`;
  const c = app.courses.find((k) => k.id === snap.cfg.courseId);
  return c ? shortName(c.name) : 'another course';
}

function localDayNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Snap = NonNullable<Awaited<ReturnType<typeof peekSnapshot>>>;

/** The hole a saved round continues on, and whether only its summary is left. */
export function snapshotHole(snap: Snap): { hole: number; done: boolean } {
  const hole = snap.cfg.holes[Math.min(snap.cfg.holes.length - 1, snap.holeIndex + (snap.betweenHoles ? 1 : 0))];
  return { hole, done: snap.betweenHoles && snap.holeIndex + 1 >= snap.cfg.holes.length };
}

/**
 * Starting a round throws away the one in progress (startRound clears the
 * saved round): with one saved, ask first, like "quit round" in the round's
 * menu (afternoon review, 2026-10-20). `go` runs at once when nothing is saved.
 */
export async function confirmDiscard(scene: Phaser.Scene, parent: Phaser.GameObjects.Container | null, go: () => void): Promise<void> {
  const snap = await peekSnapshot();
  if (!scene.sys.isActive()) return;
  if (!snap) { go(); return; }
  const where = snapshotWhere(snap);
  const at = isTourId(snap.cfg.courseId) ? '' : 'at ';
  const { hole, done } = snapshotHole(snap);
  const body = done
    ? `your round ${at}${where} has every hole played but isn't on the leaderboard yet - start a new one and lose it?`
    : `you have a round in progress ${at}${where}, hole ${hole} - start a new one and lose it?`;
  confirmBox(scene, parent, 'new round?', body, 'keep it', 'start new', () => { if (scene.sys.isActive()) go(); });
}

/** Has the player a name of their own (rounds as "player" stay off the shared boards)? */
export function hasName(): boolean {
  return !!app.settings.playerName && app.settings.playerName !== DEFAULT_NAME;
}

/** Skipped the name once on this visit: not asked again before every round (the title and new-round screen still show it). */
let skippedName = false;

/**
 * A player with no name yet is asked for one before a round, with the reason
 * (they may skip it, and are asked once a visit): a new round and the daily
 * round alike (developer, 2026-10-20: "it should be more obvious that players
 * need to enter their name").
 */
export function withName(scene: Phaser.Scene, go: () => void) {
  if (hasName() || skippedName || app.settings.hideFromBoards) { go(); return; } // hidden from the boards: no need
  askName(scene, '', (name) => {
    if (name) { app.settings.playerName = name; void saveSettings(app.settings); } else skippedName = true;
    if (scene.sys.isActive()) go();
  }, 'your name for the leaderboard', { why: 'rounds without a name stay on this device and never reach the shared boards', skip: 'skip' });
}

/** Set the player's name from a menu (title, new-round screen); `then` runs after the box closes. */
export function editName(scene: Phaser.Scene, then: () => void) {
  askName(scene, app.settings.playerName, (name) => {
    if (name) { app.settings.playerName = name; void saveSettings(app.settings); }
    if (scene.sys.isActive()) then();
  }, 'your name for the leaderboard', hasName() ? {} : { why: 'your rounds go on the shared boards under it' });
}

/** Wait (up to ~1 s) until a scene has really stopped. */
async function untilStopped(scene: Phaser.Scene, key: string) {
  for (let i = 0; i < 60 && scene.scene.isActive(key); i++) await new Promise((r) => requestAnimationFrame(r));
}

/**
 * Make `id` the current course (no-op if it already is). The menu background
 * is stopped while the old course is unloaded; the caller relaunches it.
 */
export async function useCourse(scene: Phaser.Scene, id: string, progress?: LoadProgress): Promise<void> {
  if (app.course?.json.id === id) return;
  scene.scene.stop('bg');
  await untilStopped(scene, 'bg');
  await loadCourse(scene, id, progress);
  app.settings.courseId = id;
  void saveSettings(app.settings);
}

/** Make `id` the current course without remembering it as the last one chosen (a tour round's holes). */
export async function useCourseQuietly(scene: Phaser.Scene, id: string, progress?: LoadProgress): Promise<void> {
  if (app.course?.json.id === id) return;
  scene.scene.stop('bg');
  await untilStopped(scene, 'bg');
  await loadCourse(scene, id, progress);
}

export async function resumeRound(scene: Phaser.Scene, progress?: LoadProgress): Promise<boolean> {
  const snap = await peekSnapshot();
  if (!snap) return false;
  const id = snapshotCourse(snap);
  if (!app.courses.some((c) => c.id === id)) { await clearSnapshot(); return false; } // course no longer offered
  if (snap.cfg.tour) await useCourseQuietly(scene, id, progress); // a tour round's course isn't the player's last course
  else await useCourse(scene, id, progress);
  const res = await restoreRound();
  if (!res) { await clearSnapshot(); return false; } // nothing that can be played on: don't offer it again
  app.round = res.round;
  prefetchNextCourse(res.round);
  if (res.finished) { await finishRound(scene); return true; } // the last hole was holed: straight to the summary
  scene.scene.start('play', { resume: !res.betweenHoles });
  return true;
}

export async function finishRound(scene: Phaser.Scene) {
  const r = app.round!;
  const tot = totals(r.scores);
  const entry: LeaderboardEntry = {
    id: roundId(r.cfg),
    course: r.cfg.courseId,
    tee: r.cfg.tee,
    length: r.cfg.length ?? lengthOf(r.cfg.holes, r.course.json.holes.length),
    difficulty: r.cfg.settings.difficulty,
    casual: isCasual(r.cfg.settings),
    player: r.cfg.playerName,
    date: new Date().toISOString(),
    gross: tot.strokes,
    toPar: tot.toPar,
    back: tot.back,
    scores: r.scores,
    totals: tot,
    ...(r.cfg.courseHoles ? { holes: r.cfg.courseHoles } : {}),
    ...(r.cfg.tour ? { tour: r.cfg.tour.map((t) => ({ ...t })) } : {}),
  };
  // the daily round counts once a day: a second go on this device is an ordinary round (the server checks the player code too)
  // (the daily round and the day's par 3s / 4s / 5s each count once: a tour round is on its own board)
  if (r.cfg.daily && !(await loadBoard()).some((b) => b.daily === r.cfg.daily && b.player === entry.player && isTourId(b.course) === isTourId(entry.course))) entry.daily = r.cfg.daily;
  await addToBoard(entry);
  await clearSnapshot();
  // a named round goes to the shared leaderboard now (developer, 2026-10-20: a friend's 63 wasn't in
  // "recent" - it waited for him to leave the summary, and the tab was closed there). A round with no
  // name waits: it goes up when the player names it on the summary.
  if (entry.player !== DEFAULT_NAME) void flushUploads();
  scene.scene.stop('hud');
  scene.scene.stop('play');
  scene.scene.start('summary', { entry });
}

/** Open the practice ground (player improvements, item 5): range first; nothing scored or saved. */
export async function startPractice(scene: Phaser.Scene, progress?: LoadProgress): Promise<boolean> {
  if (app.course?.json.id !== PRACTICE_COURSE) {
    scene.scene.stop('bg');
    await untilStopped(scene, 'bg');
    await loadCourse(scene, PRACTICE_COURSE, progress); // not remembered as the last course played
  }
  const s = app.settings;
  const cfg: RoundConfig = {
    courseId: PRACTICE_COURSE,
    tee: app.course!.json.defaultTee,
    holes: app.course!.json.holes.map((h) => h.number),
    playerName: s.playerName || 'player',
    seed: newSeed(),
    settings: { difficulty: s.difficulty, lefty: s.lefty, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
    startedAt: new Date().toISOString(),
    practice: true,
  };
  app.round = new Round(app.course!, cfg);
  app.round.startHole(0);
  scene.scene.start('play', { resume: false });
  return true;
}

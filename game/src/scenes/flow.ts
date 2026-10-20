// Round start / resume / finish helpers shared by the scenes.

import Phaser from 'phaser';
import { app } from '../app';
import { addToBoard, LeaderboardEntry, loadBoard, saveSettings } from '../save/store';
import { loadCourse, LoadProgress } from '../data/courses';
import { teeFor } from '../data/registry';
import { clearSnapshot, peekSnapshot, restoreRound } from '../save/snapshot';
import { courseHoleFor, isCasual, newSeed, Round, RoundConfig, roundId } from '../systems/game/round';
import { roundPins } from '../systems/game/pins';
import { totals } from '../systems/rules/scoring';
import type { DailyPlan } from '../systems/game/daily';
import { PRACTICE_COURSE } from '../systems/game/practice';
import { confirmBox } from '../ui/confirm';
import { askName } from '../ui/nameInput';
import { DEFAULT_NAME } from '../save/names';
import { shortName } from '../save/milestones';

export { holesFor, lengthLabel, lengthOf, lengthsFor } from '../systems/game/lengths';
export type { RoundLength } from '../save/entry';
import { holesFor, lengthOf } from '../systems/game/lengths';
import type { RoundLength } from '../save/entry';

/** Start a round on the current course; `daily` fixes everything but the hand from the date (daily round). */
export function startRound(scene: Phaser.Scene, len: RoundLength, daily?: DailyPlan) {
  const s = app.settings;
  const cfg: RoundConfig = {
    courseId: app.course!.json.id,
    tee: daily ? daily.tee : teeFor(app.course!.json, s.tees),
    holes: holesFor(daily ? daily.length : len),
    playerName: s.playerName || 'player',
    seed: daily ? daily.seed : newSeed(),
    settings: daily
      ? { difficulty: 'normal', lefty: s.lefty, e5: false, gimmes: false, maxDoublePar: false, mulligans: false }
      : { difficulty: s.difficulty, lefty: s.lefty, e5: s.e5, gimmes: s.gimmes, maxDoublePar: s.maxDoublePar, mulligans: s.mulligans },
    startedAt: new Date().toISOString(),
    ...(daily ? { daily: daily.day } : {}),
  };
  // a pin for every hole, mixed front / middle / back and easy / medium / hard (pins.ts)
  const n = app.course!.json.holes.length;
  cfg.pins = roundPins(app.course!, cfg.tee, cfg.holes.map((h) => courseHoleFor(h, n)), cfg.seed);
  app.round = new Round(app.course!, cfg);
  app.round.startHole(0);
  void clearSnapshot();
  scene.scene.start('play', { resume: false });
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
  const c = app.courses.find((k) => k.id === snap.cfg.courseId);
  const where = c ? shortName(c.name) : 'another course';
  const { hole, done } = snapshotHole(snap);
  const body = done
    ? `your round at ${where} has every hole played but isn't on the leaderboard yet - start a new one and lose it?`
    : `you have a round in progress at ${where}, hole ${hole} - start a new one and lose it?`;
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
  if (hasName() || skippedName) { go(); return; }
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

export async function resumeRound(scene: Phaser.Scene, progress?: LoadProgress): Promise<boolean> {
  const snap = await peekSnapshot();
  if (!snap) return false;
  if (!app.courses.some((c) => c.id === snap.cfg.courseId)) { await clearSnapshot(); return false; } // course no longer offered
  await useCourse(scene, snap.cfg.courseId, progress);
  const res = await restoreRound();
  if (!res) { await clearSnapshot(); return false; } // nothing that can be played on: don't offer it again
  app.round = res.round;
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
    length: lengthOf(r.cfg.holes, r.course.json.holes.length),
    difficulty: r.cfg.settings.difficulty,
    casual: isCasual(r.cfg.settings),
    player: r.cfg.playerName,
    date: new Date().toISOString(),
    gross: tot.strokes,
    toPar: tot.toPar,
    back: tot.back,
    scores: r.scores,
    totals: tot,
  };
  // the daily round counts once a day: a second go on this device is an ordinary round (the server checks the player code too)
  if (r.cfg.daily && !(await loadBoard()).some((b) => b.daily === r.cfg.daily && b.player === entry.player)) entry.daily = r.cfg.daily;
  await addToBoard(entry);
  await clearSnapshot();
  // sent to the shared leaderboard when the player leaves the summary (they may change the name there first)
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

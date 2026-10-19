// Round start / resume / finish helpers shared by the scenes.

import Phaser from 'phaser';
import { app, COURSE_ID } from '../app';
import { addToBoard, LeaderboardEntry } from '../save/store';
import { clearSnapshot, restoreRound } from '../save/snapshot';
import { isCasual, newSeed, Round, RoundConfig } from '../systems/game/round';
import { totals } from '../systems/rules/scoring';

export type RoundLength = '18' | 'front' | 'back';

export function holesFor(len: RoundLength): number[] {
  if (len === 'front') return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (len === 'back') return [10, 11, 12, 13, 14, 15, 16, 17, 18];
  return Array.from({ length: 18 }, (_, i) => i + 1);
}

export function lengthOf(holes: number[]): RoundLength {
  if (holes.length === 18) return '18';
  return holes[0] === 1 ? 'front' : 'back';
}

export function startRound(scene: Phaser.Scene, len: RoundLength) {
  const s = app.settings;
  const cfg: RoundConfig = {
    courseId: COURSE_ID,
    tee: app.course!.json.defaultTee,
    holes: holesFor(len),
    playerName: s.playerName || 'player',
    seed: newSeed(),
    settings: { difficulty: s.difficulty, lefty: s.lefty, e5: s.e5, gimmes: s.gimmes, maxDoublePar: s.maxDoublePar, mulligans: s.mulligans },
    startedAt: new Date().toISOString(),
  };
  app.round = new Round(app.course!, cfg);
  app.round.startHole(0);
  void clearSnapshot();
  scene.scene.start('play', { resume: false });
}

export async function resumeRound(scene: Phaser.Scene): Promise<boolean> {
  const res = await restoreRound();
  if (!res) return false;
  app.round = res.round;
  scene.scene.start('play', { resume: !res.betweenHoles });
  return true;
}

export async function finishRound(scene: Phaser.Scene) {
  const r = app.round!;
  const tot = totals(r.scores);
  const entry: LeaderboardEntry = {
    id: `${r.cfg.startedAt}-${r.cfg.seed}`,
    course: r.cfg.courseId,
    tee: r.cfg.tee,
    length: lengthOf(r.cfg.holes),
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
  await addToBoard(entry);
  await clearSnapshot();
  scene.scene.stop('hud');
  scene.scene.stop('play');
  scene.scene.start('summary', { entry });
}

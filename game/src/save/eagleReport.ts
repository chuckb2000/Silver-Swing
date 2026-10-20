// An eagle (or better) goes on the shared "recent eagles" list the moment the
// ball drops, so it counts even if the round is never finished (developer,
// 2026-10-19). Kept on this device first and sent when the site is reachable;
// a player with no name yet is asked for one on the hole-complete panel.

import { app } from '../app';
import type { HoleScore } from '../systems/rules/scoring';
import { isCasual, Round, roundId } from '../systems/game/round';
import { EagleEvent, isEagleScore } from './feats';
import { flushEagles } from './online';
import { recordEagle, renameEagles, saveSettings } from './store';
import { saveSnapshot } from './snapshot';

/** Is this hole one for the eagles list? (not in a casual round) */
export const isListedEagle = (r: Round, score: HoleScore) => !isCasual(r.cfg.settings) && isEagleScore(score);

/** Keep the eagle on this device and send it on. */
export async function reportEagle(r: Round, score: HoleScore): Promise<EagleEvent | null> {
  if (!isListedEagle(r, score)) return null;
  const id = roundId(r.cfg);
  const ev: EagleEvent = {
    id: `${id}-h${score.hole}`, round: id, player: r.cfg.playerName, course: r.cfg.courseId, hole: r.courseHole,
    par: score.par, strokes: score.strokes, tee: r.cfg.tee, difficulty: r.cfg.settings.difficulty, date: new Date().toISOString(),
  };
  await recordEagle(ev);
  void flushEagles();
  return ev;
}

/** The player named themselves mid-round: the round, its eagles and the next rounds use the name. */
export async function nameRound(r: Round, name: string): Promise<void> {
  r.cfg.playerName = name;
  app.settings.playerName = name;
  await saveSettings(app.settings);
  await renameEagles(roundId(r.cfg), name);
  if (!r.finished && app.round === r) void saveSnapshot(r); // not after the round has gone to the summary
  void flushEagles();
}

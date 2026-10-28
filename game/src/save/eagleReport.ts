// An eagle (or better) goes on the shared "recent eagles" list the moment the
// ball drops, so it counts even if the round is never finished (developer,
// 2026-10-19). Kept on this device first and sent when the site is reachable;
// a player with no name yet is asked for one on the hole-complete panel.

import { app } from '../app';
import type { HoleScore } from '../systems/rules/scoring';
import { isCasual, Round, roundId } from '../systems/game/round';
import { EagleEvent, isEagleScore } from './feats';
import { flushEagles, flushHoleouts } from './online';
import type { HoleOut } from './holeouts';
import { encodePath } from '../systems/match/path';
import type { SimResult } from '../systems/physics/sim';
import type { PlannedShot } from '../systems/game/round';
import { recordEagle, recordHoleout, renameEagles, saveSettings } from './store';
import { saveSnapshot } from './snapshot';

/** Is this hole one for the eagles list? (not in a casual round) */
export const isListedEagle = (r: Round, score: HoleScore) => !isCasual(r.cfg.settings) && !r.cfg.xc && isEagleScore(score); // cross-country has no par

/** Keep the eagle on this device and send it on. */
export async function reportEagle(r: Round, score: HoleScore): Promise<EagleEvent | null> {
  if (!isListedEagle(r, score)) return null;
  const id = roundId(r.cfg);
  const ev: EagleEvent = {
    id: `${id}-h${score.hole}`, round: id, player: r.cfg.playerName, course: r.course.json.id, hole: r.courseHole,
    par: score.par, strokes: score.strokes, tee: r.teeName, difficulty: r.cfg.settings.difficulty, date: new Date().toISOString(),
  };
  await recordEagle(ev);
  void flushEagles();
  return ev;
}

const LIE_WORD: Record<string, string> = { fairway_bunker: 'bunker', greenside_bunker: 'bunker', cartpath: 'cart path', waste: 'waste sand' };

/**
 * A hole-out from off the green (a chip-in, a holed approach, an ace) goes on the shared
 * "hole-outs" list with its flight, so it can be watched again (developer, 2026-10-26).
 * Not in a casual round (like eagles); the practice ground and live matches never get here.
 */
export async function reportHoleout(r: Round, score: HoleScore, shot: PlannedShot, sim: SimResult): Promise<HoleOut | null> {
  if (isCasual(r.cfg.settings) || r.cfg.practice || r.cfg.xc || !score.off || score.made === undefined || !sim.holed) return null;
  const id = roundId(r.cfg);
  const lie = r.lie?.kind ?? 'fairway';
  const h: HoleOut = {
    id: `${id}-h${score.hole}`, round: id, player: r.cfg.playerName, course: r.course.json.id, hole: r.courseHole,
    par: score.par, n: score.strokes, club: shot.club.name,
    dist: score.made, lie: LIE_WORD[lie] ?? lie, tee: r.teeName, difficulty: r.cfg.settings.difficulty,
    date: new Date().toISOString(), path: encodePath(sim),
  };
  await recordHoleout(h);
  void flushHoleouts();
  return h;
}

/** The player named themselves mid-round: the round, its eagles and the next rounds use the name. */
export async function nameRound(r: Round, name: string): Promise<void> {
  r.cfg.playerName = name;
  app.settings.playerName = name;
  await saveSettings(app.settings);
  await renameEagles(roundId(r.cfg), name); // and its hole-outs
  if (!r.finished && app.round === r) void saveSnapshot(r); // not after the round has gone to the summary
  void flushEagles();
  void flushHoleouts();
}

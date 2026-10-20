// Round-in-progress snapshots (auto-saved after every shot) so a closed tab
// can be resumed exactly where it was.

import { app } from '../app';
import { BeforeShot, PendingRelief, Round, RoundConfig } from '../systems/game/round';
import { HoleScore } from '../systems/rules/scoring';
import { clearRoundInProgress, loadRoundInProgress, saveRoundInProgress } from './store';

interface Snapshot {
  v: 1;
  cfg: RoundConfig;
  holeIndex: number;
  scores: HoleScore[];
  tally: { strokes: number; putts: number; penalties: number; fairway: boolean | null; reachedGreenAt: number | null };
  ball: { x: number; y: number; teedUp: boolean };
  prev: { x: number; y: number; teedUp: boolean };
  shotNo: number;
  lastPower: number | null;
  lastPuttPower: number | null;
  mulliganUsed: boolean;
  history: { x: number; y: number }[];
  shotSeq: number;
  betweenHoles: boolean;
  /** a relief choice still open (water, out of bounds...): reopened on resume, so closing the tab never replays a stroke */
  pending?: PendingRelief | null;
  /** the state before the last stroke, so a mulligan after a resume also takes back its penalty (casual) */
  beforeShot?: BeforeShot | null;
  savedAt: string;
}

export async function saveSnapshot(r: Round): Promise<void> {
  if (r.cfg.practice) return; // the practice ground is never resumed
  const betweenHoles = r.scores.length > 0 && r.scores[r.scores.length - 1].hole === r.holeNumber;
  const s: Snapshot = {
    v: 1, cfg: r.cfg, holeIndex: r.holeIndex, scores: r.scores,
    tally: { strokes: r.tally.strokes, putts: r.tally.putts, penalties: r.tally.penalties, fairway: r.tally.fairway, reachedGreenAt: r.tally.reachedGreenAt },
    ball: r.ball, prev: r.prev, shotNo: r.shotNo, lastPower: r.lastPower, lastPuttPower: r.lastPuttPower,
    mulliganUsed: r.mulliganUsed, history: r.history, shotSeq: r.shotSeq, betweenHoles, pending: betweenHoles ? null : r.pending,
    beforeShot: betweenHoles ? null : r.beforeShot, savedAt: new Date().toISOString(),
  };
  await saveRoundInProgress(s);
}

export async function peekSnapshot(): Promise<{ cfg: RoundConfig; holeIndex: number; scores: HoleScore[]; savedAt: string; betweenHoles: boolean } | null> {
  const s = await loadRoundInProgress<Snapshot>();
  if (!s || s.v !== 1 || !s.cfg) return null;
  return s;
}

/**
 * Rebuild a Round from the saved snapshot. Returns null if there is none.
 * `finished`: the last hole was completed but the round never reached the
 * leaderboard (the tab closed on the hole-complete panel); the caller finishes it.
 */
export async function restoreRound(): Promise<{ round: Round; betweenHoles: boolean; finished?: boolean } | null> {
  const s = await loadRoundInProgress<Snapshot>();
  if (!s || s.v !== 1 || !app.course) return null;
  const r = new Round(app.course, s.cfg);
  if (s.betweenHoles || s.holeIndex >= s.cfg.holes.length) {
    r.scores = s.scores;
    if (s.holeIndex + 1 >= s.cfg.holes.length) {
      r.holeIndex = s.cfg.holes.length;
      return { round: r, betweenHoles: true, finished: true };
    }
    r.startHole(s.holeIndex + 1);
    return { round: r, betweenHoles: true };
  }
  r.startHole(s.holeIndex);
  r.scores = s.scores;
  Object.assign(r.tally, s.tally);
  r.ball = s.ball;
  r.prev = s.prev;
  r.shotNo = s.shotNo;
  r.lastPower = s.lastPower;
  r.lastPuttPower = s.lastPuttPower;
  r.mulliganUsed = s.mulliganUsed;
  r.history = s.history;
  r.shotSeq = s.shotSeq;
  r.pending = s.pending ?? null;
  r.beforeShot = s.beforeShot ?? null;
  r.refreshLie();
  return { round: r, betweenHoles: false };
}

export const clearSnapshot = clearRoundInProgress;

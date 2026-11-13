// Round-in-progress snapshots (auto-saved after every shot) so a closed tab
// can be resumed exactly where it was.

import { app } from '../app';
import { BeforeShot, PendingRelief, PlannedShot, Round, RoundConfig } from '../systems/game/round';
import type { SimResult } from '../systems/physics/sim';
import { HoleScore } from '../systems/rules/scoring';
import { clearRoundInProgress, loadRoundInProgress, saveRoundInProgress } from './store';
import { fixScores, slotHole } from './cardFixes';

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
  // a hole not set up yet (a cross-country leg still to choose, a tour hole's course loading): the save
  // from when the last hole was holed stands, and opens on the next one
  if (r.needsLeg || r.needsCourse) return;
  await saveRoundInProgress(snapshotOf(r));
}

/**
 * Save the round as it will be once this stroke comes to rest, the moment the
 * ball is struck: a tab closed or reloaded mid-flight resumes after the stroke
 * (with its relief choice open, or the hole finished), never before it.
 */
export async function saveStruck(r: Round, p: PlannedShot, sim: SimResult): Promise<void> {
  if (r.cfg.practice) return;
  await saveRoundInProgress(r.whenSettled(p, sim, (settled) => snapshotOf(settled)));
}

/** What a round in progress saves (structured copies: the round is changed afterwards). */
export function snapshotOf(r: Round): Snapshot {
  const betweenHoles = r.scores.length > 0 && r.scores[r.scores.length - 1].hole === r.holeNumber;
  const s: Snapshot = {
    v: 1, cfg: r.cfg, holeIndex: r.holeIndex, scores: r.scores,
    tally: { strokes: r.tally.strokes, putts: r.tally.putts, penalties: r.tally.penalties, fairway: r.tally.fairway, reachedGreenAt: r.tally.reachedGreenAt },
    ball: r.ball, prev: r.prev, shotNo: r.shotNo, lastPower: r.lastPower, lastPuttPower: r.lastPuttPower,
    mulliganUsed: r.mulliganUsed, history: r.history, shotSeq: r.shotSeq, betweenHoles, pending: betweenHoles ? null : r.pending,
    beforeShot: betweenHoles ? null : r.beforeShot, savedAt: new Date().toISOString(),
  };
  return structuredClone(s);
}

export async function peekSnapshot(): Promise<{ cfg: RoundConfig; holeIndex: number; scores: HoleScore[]; savedAt: string; betweenHoles: boolean } | null> {
  const s = await loadSnapshot();
  if (!s || s.v !== 1 || !s.cfg) return null;
  return s;
}

/** The saved round, with a course's corrected card (cardFixes.ts) applied to its holes so far and stored. */
async function loadSnapshot(): Promise<Snapshot | undefined> {
  const s = await loadRoundInProgress<Snapshot>();
  if (!s || s.v !== 1 || !s.cfg || !Array.isArray(s.scores)) return s;
  if (s.cfg.xc || s.cfg.length === 'xc') return s; // cross-country legs are not the course's holes
  const f = fixScores(s.cfg.courseId, s.scores, slotHole({ length: s.cfg.length, holes: s.cfg.courseHoles }, s.cfg.holes));
  if (!f) return s;
  const fixed = { ...s, scores: f };
  await saveRoundInProgress(fixed);
  return fixed;
}

/**
 * Rebuild a Round from the saved snapshot. Returns null if there is none.
 * `finished`: the last hole was completed but the round never reached the
 * leaderboard (the tab closed on the hole-complete panel); the caller finishes it.
 */
export async function restoreRound(): Promise<{ round: Round; betweenHoles: boolean; finished?: boolean } | null> {
  const s = await loadSnapshot();
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

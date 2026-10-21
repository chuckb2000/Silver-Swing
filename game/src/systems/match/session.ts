// A live match as one player's game holds it: the match state (rules.ts) and
// a Round per player, kept in step with the match's log. Events are applied
// one at a time when the game is ready to show them (a stroke after its
// flight has been played back), so the balls on screen never run ahead of
// the animation. Pure: no Phaser, no network (the game feeds it the log).

import type { CourseRuntime } from '../../data/course';
import { CLUBS, PUTTER } from '../../data/clubs';
import type { SimResult } from '../physics/sim';
import { courseHoleFor, PlannedShot, PlayedStroke, Round, RoundConfig } from '../game/round';
import { decodePath } from './path';
import { applyEvent, holeLive, other, toPlay } from './rules';
import { HoleResult, HoleSnap, Logged, MatchConfig, MatchPlayer, MatchState, Seat, ShotInfo } from './types';

/** A player's Round config in a match: everything but the name and the hand is the match's. */
export function matchRoundConfig(cfg: MatchConfig, p: MatchPlayer, seat: Seat): RoundConfig {
  return {
    courseId: cfg.courseId, tee: cfg.tee, holes: cfg.holes, playerName: p.name, seed: cfg.seed,
    settings: { difficulty: cfg.difficulty, lefty: p.lefty, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
    // one round id per player (eagles and the like are keyed by it); the seed (wind, lies) is shared
    startedAt: seat === 0 ? cfg.startedAt : cfg.startedAt.replace(/Z$/, '1Z'),
    pins: cfg.pins,
  };
}

/** What a Round's hole looks like now, for the match log. */
export function holeSnapOf(r: Round, holed = false): HoleSnap {
  const t = r.tally;
  return {
    hole: r.holeIndex,
    tally: { strokes: t.strokes, putts: t.putts, penalties: t.penalties, fairway: t.fairway, reachedGreenAt: t.reachedGreenAt },
    ball: { ...r.ball }, prev: { ...r.prev }, shotNo: r.shotNo, shotSeq: r.shotSeq,
    pending: holed ? null : r.pending ? structuredClone(r.pending) : null,
    holed,
  };
}

/** Put a Round's hole back to a snapshot (the other player's stroke, a move the server refused). */
export function restoreHole(r: Round, a: HoleSnap) {
  if (r.holeIndex !== a.hole || !r.tally) r.startHole(a.hole);
  // field by field: only the tally's own counts (never its hole or par, whatever the snapshot carries)
  const t = r.tally;
  t.strokes = a.tally.strokes;
  t.putts = a.tally.putts;
  t.penalties = a.tally.penalties;
  t.fairway = a.tally.fairway;
  t.reachedGreenAt = a.tally.reachedGreenAt;
  r.ball = { ...a.ball };
  r.prev = { ...a.prev };
  r.shotNo = a.shotNo;
  r.shotSeq = a.shotSeq;
  r.pending = a.pending ? structuredClone(a.pending) : null;
  r.beforeShot = null;
  const last = r.history[r.history.length - 1];
  if (!last || last.x !== a.ball.x || last.y !== a.ball.y) r.history.push({ x: a.ball.x, y: a.ball.y });
  if (a.holed) r.ball = { x: r.pin.x, y: r.pin.y, teedUp: false };
  else r.refreshLie();
}

/** The stroke the game sends (club by id). */
export function shotInfoOf(p: PlannedShot, power: number): ShotInfo {
  return {
    club: p.club.id, spec: { x: p.spec.x, y: p.spec.y, z: p.spec.z, aim: p.spec.aim }, strike: p.strike, putt: p.putt,
    puttDist: p.puttDist, gustMph: p.gustMph, scale: p.scale, power,
  };
}

/** A sent stroke as a PlannedShot, enough to show and label it (it is never simulated again). */
export function plannedOf(info: ShotInfo): PlannedShot {
  // a club this game doesn't know (sent by a newer version): the nearest kind, never a crash
  const club = CLUBS.find((c) => c.id === info.club) ?? (info.putt ? PUTTER : CLUBS[0]);
  return {
    club, spec: { ...info.spec, pin: null }, strike: info.strike, putt: info.putt,
    puttDist: info.puttDist, gustMph: info.gustMph, scale: info.scale,
  };
}

/** One stroke of the hole being played, for playback and "rewatch". */
export interface MatchStroke {
  seat: Seat;
  seq: number;
  stroke: PlayedStroke;
  shot: PlannedShot;
  power: number;
  sim: SimResult | null;
}

/** What applying an event changed, for the game to show. */
export interface Applied {
  ev: Logged;
  /** the hole that just ended, if one did */
  closed: HoleResult | null;
  /** a new hole is under way (both players at its tee) */
  started: boolean;
  /** the match is over */
  over: boolean;
}

export class MatchSession {
  readonly course: CourseRuntime;
  readonly code: string;
  /** this game's seat (null: watching) */
  me: Seat | null;
  state!: MatchState;
  readonly rounds: [Round | null, Round | null] = [null, null];
  /** events received from the server and not yet shown */
  readonly queue: Logged[] = [];
  /** the strokes of the hole being played (and of the last hole until the next one starts) */
  strokes: MatchStroke[] = [];
  /** the ids of the moves shown so far (a move still in the outbox may already be among them: its answer was on its way) */
  readonly appliedCids = new Set<string>();
  /** the hole whose play the Rounds are set up for */
  private roundHole = -1;

  constructor(course: CourseRuntime, code: string, me: Seat | null, history: Logged[] = []) {
    this.course = course;
    this.code = code;
    this.me = me;
    for (const e of history) this.apply(e);
  }

  get seq(): number {
    return this.state ? this.state.seq : 0;
  }

  /** The newest event this game knows of, shown or not. */
  get knownSeq(): number {
    return this.queue.length ? this.queue[this.queue.length - 1].seq : this.seq;
  }

  /** Take in events from the server (any order, repeats ignored); returns false if one is missing (ask again from knownSeq). */
  receive(evs: Logged[]): boolean {
    const sorted = [...evs].sort((a, b) => a.seq - b.seq);
    for (const e of sorted) {
      if (e.seq <= this.knownSeq) continue;
      if (e.seq !== this.knownSeq + 1) return false;
      this.queue.push(e);
    }
    return true;
  }

  /** Is everything received shown, so the player may act? */
  get idle(): boolean {
    return this.queue.length === 0;
  }

  /** Show the next received event (the game calls this when it is ready to). */
  applyNext(): Applied | null {
    const e = this.queue.shift();
    return e ? this.apply(e) : null;
  }

  /** Apply one event to the state and the Rounds. */
  apply(e: Logged): Applied {
    const before = this.state;
    this.state = applyEvent(before ?? null, e);
    if (e.cid) this.appliedCids.add(e.cid);
    const s = this.state;
    const out: Applied = { ev: e, closed: null, started: false, over: s.phase === 'finished' && before?.phase !== 'finished' };
    if (e.t === 'created' || e.t === 'joined') {
      const seat: Seat = e.t === 'created' ? 0 : 1;
      const r = new Round(this.course, matchRoundConfig(s.cfg, s.players[seat]!, seat));
      r.startHole(s.hole); // at the first tee (the screens read the ball and the tally before anyone plays)
      this.rounds[seat] = r;
    }
    const closed = s.results.length > (before?.results.length ?? 0);
    switch (e.t) {
      case 'stroke': {
        const r = this.rounds[e.by]!;
        const from = { x: r.ball.x, y: r.ball.y };
        const n = r.tally.strokes + 1; // its number on the card (penalties before it count)
        restoreHole(r, e.after);
        const shot = plannedOf(e.shot);
        const result: PlayedStroke['result'] = e.after.holed ? 'holed' : e.after.pending?.kind === 'water' ? 'water' : e.after.pending?.kind === 'ob' ? 'ob' : 'rest';
        this.strokes.push({
          seat: e.by, seq: e.seq, shot, power: e.shot.power, sim: decodePath(e.path),
          stroke: { shot, hole: r.holeNumber, seq: e.after.shotSeq, n, from, to: { ...e.after.ball }, result },
        });
        break;
      }
      case 'relief':
        restoreHole(this.rounds[e.by]!, e.after);
        break;
      case 'concede':
        if (e.what === 'stroke') {
          // the putt is good: one more stroke (a putt if the ball is on the green), and the ball is picked up
          const r = this.rounds[other(e.by)]!;
          r.tally.stroke(r.onHoleGreen());
          r.pending = null;
          r.ball = { x: r.pin.x, y: r.pin.y, teedUp: false };
        }
        break;
      default:
    }
    if (closed) {
      out.closed = s.results[s.results.length - 1];
      this.finishHoles(out.closed);
    }
    // both players at the next tee: the Rounds move to it
    if (holeLive(s) && this.roundHole !== s.hole && this.rounds[0] && this.rounds[1]) {
      for (const r of this.rounds) r!.startHole(s.hole); // nothing has been played on it yet
      this.roundHole = s.hole;
      this.strokes = [];
      out.started = true;
    }
    return out;
  }

  /** A hole is over: each player's card gets it, holed or not (a lost or conceded hole shows the strokes played). */
  private finishHoles(res: HoleResult) {
    for (const k of [0, 1] as Seat[]) {
      const r = this.rounds[k];
      if (!r || r.scores.length > res.hole) continue;
      r.tally.strokes = res.strokes[k];
      r.finishHole();
    }
  }

  /** The seat whose turn it is (null between holes, before both are ready, and after the match). */
  get turn(): Seat | null {
    return this.state ? toPlay(this.state) : null;
  }

  /** The other player's seat (from this game's side; seat 1 when only watching). */
  get opponent(): Seat {
    return this.me === null ? 1 : other(this.me);
  }

  /** The Round of the player to play (or this player's when nobody is). */
  activeRound(): Round | null {
    const t = this.turn;
    if (t !== null) return this.rounds[t];
    return this.rounds[this.me ?? 0];
  }

  /** Is this player's ball in the hole (or their putt conceded)? */
  holed(k: Seat): boolean {
    return !!this.state && holeLive(this.state) && this.state.p[k].holed;
  }

  /** The hole being played, on the scorecard (10-18 for the second nine). */
  get holeNumber(): number {
    return this.state.cfg.holes[Math.min(this.state.hole, this.state.cfg.holes.length - 1)];
  }

  /** The course's own hole being played. */
  get courseHole(): number {
    return courseHoleFor(this.holeNumber, this.course.json.holes.length);
  }
}

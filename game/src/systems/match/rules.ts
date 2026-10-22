// Match play (USGA Rules 3.2 and 6.4): the match's log in, its state out.
// The match server runs this to accept or refuse each move, and both games run
// the same function over the same log, so all three always agree on whose turn
// it is, who won each hole and how the match stands. Pure and deterministic:
// distances are compared squared (no Math.hypot or sqrt, whose last digit can
// differ between browsers).

import type { PendingRelief } from '../game/round';
import {
  Action, CLOCK, HoleResult, HoleSnap, Logged, MatchConfig, MatchError, MatchEvent, MatchOutcome, MatchPlayer, MatchState, MAX_EXTRA, MAX_HOLES,
  PlayerHole, PROTOCOL, Seat, ShotInfo,
} from './types';

export const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

function fail(code: string, message: string): never {
  throw new MatchError(code, message);
}

const freshHole = (): PlayerHole => ({ strokes: 0, slow: 0, x: 0, y: 0, teed: true, holed: false, conceded: false, pending: null });

/** A player's score on the hole so far: strokes and penalties as played, and penalty strokes for slow play. */
export const scoreOf = (p: PlayerHole): number => p.strokes + p.slow;

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st. */
export function ordinal(n: number): string {
  const t = n % 100;
  const suf = t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suf}`;
}

/** A time on the move clock: "4:05". */
export function clockText(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** The scorecard number of a hole of the match (an extra hole is the round's hole played again). */
export function holeNo(cfg: MatchConfig, hole: number): number {
  return cfg.holes[hole % cfg.holes.length];
}

/** Is this hole of the match an extra one (the match was all square after the last)? */
export function isExtra(cfg: MatchConfig, hole: number): boolean {
  return hole >= cfg.holes.length;
}

/** The pin of a hole of the match (extra holes keep the round's pins). */
export function pinOf(s: MatchState, hole = s.hole): [number, number] {
  return s.cfg.pins[hole % s.cfg.pins.length];
}

/** The fewest penalty strokes a relief choice still open will cost (water and out of bounds 1; free relief 0). */
export function minPenalty(p: PendingRelief): number {
  return p.kind === 'water' || p.kind === 'ob' ? 1 : 0;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCount = (v: unknown, max = 99): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

function checkPlayer(p: unknown): MatchPlayer {
  const x = p as MatchPlayer | null;
  if (!x || typeof x.name !== 'string' || !x.name.trim() || x.name.length > 40 || typeof x.lefty !== 'boolean') fail('bad_player', 'a player needs a name');
  return { name: x.name, lefty: x.lefty };
}

/**
 * The match's settings, rebuilt from their own fields with their limits (the
 * server stores and sends exactly this: nothing else a game put in rides along).
 */
function checkConfig(c: unknown): MatchConfig {
  const x = c as MatchConfig | null;
  if (!x || x.protocol !== PROTOCOL) fail('protocol', 'this match was made by another version of the game');
  const id = (v: unknown, max: number) => typeof v === 'string' && v.length >= 1 && v.length <= max && /^[A-Za-z0-9_.\-/ ]+$/.test(v);
  if (!id(x.courseId, 40) || !id(x.tee, 40)) fail('bad_config', 'no course or tees');
  if (!Array.isArray(x.holes) || x.holes.length < 1 || x.holes.length > 19 || !x.holes.every((h) => isCount(h, 36) && h >= 1)) fail('bad_config', 'bad holes');
  const coord = (v: unknown) => isNum(v) && Math.abs(v) < 1e6;
  if (!Array.isArray(x.pins) || x.pins.length !== x.holes.length || !x.pins.every((p) => Array.isArray(p) && coord(p[0]) && coord(p[1]))) fail('bad_config', 'bad pins');
  if (!['easy', 'normal', 'pro'].includes(x.difficulty) || !isCount(x.seed, 2 ** 32)) fail('bad_config', 'bad settings');
  if (typeof x.startedAt !== 'string' || x.startedAt.length > 40 || Number.isNaN(Date.parse(x.startedAt))) fail('bad_config', 'bad start time');
  if (!id(x.courseVersion, 64)) fail('bad_config', 'no course version');
  return {
    protocol: PROTOCOL, courseId: x.courseId, courseVersion: x.courseVersion, tee: x.tee, holes: [...x.holes], difficulty: x.difficulty,
    seed: x.seed, pins: x.pins.map((p) => [p[0], p[1]] as [number, number]), startedAt: x.startedAt,
  };
}

/** A hole snapshot that makes sense for this hole (the server keeps nothing else). */
function checkSnap(a: unknown, hole: number): HoleSnap {
  const x = a as HoleSnap | null;
  const ball = (b: unknown) => !!b && isNum((b as { x: number }).x) && isNum((b as { y: number }).y) && typeof (b as { teedUp: boolean }).teedUp === 'boolean';
  if (!x || x.hole !== hole || !x.tally || !isCount(x.tally.strokes) || !isCount(x.tally.putts) || !isCount(x.tally.penalties)) fail('bad_snap', 'bad hole state');
  if (!ball(x.ball) || !ball(x.prev) || !isCount(x.shotNo) || !isCount(x.shotSeq, 1e6) || typeof x.holed !== 'boolean') fail('bad_snap', 'bad hole state');
  if (x.pending !== null && (typeof x.pending !== 'object' || !['water', 'ob', 'wrong_green', 'cartpath'].includes(x.pending.kind))) fail('bad_snap', 'bad relief');
  if (x.holed && x.pending) fail('bad_snap', 'a holed ball has no relief to take');
  return x;
}

/** A player's hole after their stroke or drop (penalty strokes for slow play stay: the player's game doesn't hold them). */
function fromSnap(a: HoleSnap, slow: number): PlayerHole {
  return { strokes: a.tally.strokes, slow, x: a.ball.x, y: a.ball.y, teed: a.ball.teedUp, holed: a.holed, conceded: false, pending: a.pending };
}

/** Squared distance from a ball to the hole's pin (only compared, never shown). */
function dist2(s: MatchState, p: PlayerHole): number {
  const [px, py] = pinOf(s);
  const dx = p.x - px, dy = p.y - py;
  return dx * dx + dy * dy;
}

/** Is the hole under way (both players there, nothing decided yet)? */
export function holeLive(s: MatchState): boolean {
  return s.phase === 'playing' && s.ready[0] && s.ready[1];
}

/**
 * Whose turn it is (Rule 6.4): a relief choice left open first; on the tee
 * the player with the honour, then the other; after that the ball farther
 * from the hole (equal: the honour). A player whose ball is to be played
 * again from the teeing area waits until the other has teed off (6.4c),
 * which the "not started" rule covers. Null between holes and once the match
 * is over.
 */
export function toPlay(s: MatchState): Seat | null {
  if (!holeLive(s)) return null;
  const P = s.p;
  for (const k of [0, 1] as Seat[]) if (P[k].pending && !P[k].holed) return k;
  const live = ([0, 1] as Seat[]).filter((k) => !P[k].holed);
  if (live.length === 0) return null;
  if (live.length === 1) return live[0];
  const unstarted = live.filter((k) => P[k].strokes === 0);
  if (unstarted.length === 2) return s.honour;
  if (unstarted.length === 1) return unstarted[0];
  const d0 = dist2(s, P[0]), d1 = dist2(s, P[1]);
  if (d0 > d1) return 0;
  if (d1 > d0) return 1;
  return s.honour;
}

/** Holes won by each player so far. */
export function wins(s: MatchState): [number, number] {
  let a = 0, b = 0;
  for (const r of s.results) { if (r.winner === 0) a++; else if (r.winner === 1) b++; }
  return [a, b];
}

/** Seat 0's lead in holes (negative: seat 1 leads). */
export function lead(s: MatchState): number {
  const [a, b] = wins(s);
  return a - b;
}

/** Holes of the round still to play (0 on the last hole's result and in extra holes). */
export function holesLeft(s: MatchState): number {
  return Math.max(0, s.cfg.holes.length - s.results.length);
}

/**
 * Who the match is waiting for, and who is waiting (the move clock): the
 * player to play (a stroke or a drop), or a player not yet at the next tee
 * when the other is. Null when nobody waits on anybody.
 */
export function waitingOn(s: MatchState): { on: Seat; waiter: Seat; kind: 'shot' | 'tee' } | null {
  if (s.phase !== 'playing') return null;
  if (holeLive(s)) {
    const t = toPlay(s);
    return t === null ? null : { on: t, waiter: other(t), kind: 'shot' };
  }
  for (const k of [0, 1] as Seat[]) if (s.ready[k] && !s.ready[other(k)]) return { on: other(k), waiter: k, kind: 'tee' };
  return null;
}

/**
 * Has the hole been decided? Both holed: the lower score wins (equal: halved).
 * One holed: the other has lost once even holing their next stroke (plus any
 * penalty a relief still open must cost) can't tie. Undefined while it is open.
 */
export function decided(s: MatchState): { winner: Seat | null } | undefined {
  const [a, b] = s.p;
  const sa = scoreOf(a), sb = scoreOf(b);
  if (a.holed && b.holed) return { winner: sa < sb ? 0 : sb < sa ? 1 : null };
  if (a.holed || b.holed) {
    const h: Seat = a.holed ? 0 : 1, o = other(h);
    const best = scoreOf(s.p[o]) + (s.p[o].pending ? minPenalty(s.p[o].pending!) : 0) + 1;
    if (best > scoreOf(s.p[h])) return { winner: h };
  }
  return undefined;
}

/**
 * Is the match over? A lead bigger than the holes left ("3&2"), a lead after
 * the last hole ("1 up"), or an extra hole won ("at the 19th"). All square
 * after the last hole: extra holes (Rule 3.2a(4); developer, 2026-10-21).
 */
function outcomeOf(s: MatchState): MatchOutcome | null {
  const n = s.cfg.holes.length, played = s.results.length, up = lead(s);
  const winner: Seat = up > 0 ? 0 : 1;
  if (played < n) return Math.abs(up) > n - played ? { winner, margin: `${Math.abs(up)}&${n - played}`, how: 'holes' } : null;
  if (up !== 0) return played === n ? { winner, margin: `${Math.abs(up)} up`, how: 'holes' } : { winner, margin: `at the ${ordinal(played)}`, how: 'extra' };
  return played >= n + MAX_EXTRA ? { winner: null, margin: 'all square', how: 'holes' } : null;
}

/** Record the hole's result; then the match is over, or the next hole waits for both players. */
function closeHole(s: MatchState, winner: Seat | null, how: HoleResult['how']) {
  const [a, b] = s.p;
  s.results.push({ hole: s.hole, strokes: [scoreOf(a), scoreOf(b)], holed: [a.holed, b.holed], winner, how, slow: [a.slow, b.slow] });
  const out = outcomeOf(s);
  s.ready = [false, false];
  if (out) {
    s.phase = 'finished';
    s.outcome = out;
    return;
  }
  s.hole += 1;
  if (winner !== null) s.honour = winner; // halved: the honour stays (Rule 6.4a)
  s.p = [freshHole(), freshHole()];
}

function settle(s: MatchState) {
  const d = decided(s);
  if (d) closeHole(s, d.winner, 'played');
}

/** When an entry was logged (ms, the server's time; 0 for one that wasn't: a game trying a move out). */
function timeOf(e: MatchEvent | Logged): number {
  const t = 'at' in e && typeof e.at === 'string' ? Date.parse(e.at) : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** How long the clock had run when this entry was logged (a move on the clock must have been logged). */
function onClock(s: MatchState, e: MatchEvent | Logged): number {
  if (!('at' in e) || typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at))) fail('no_time', 'only the server can time that');
  return timeOf(e) - s.clock.at;
}

/** The state after one more entry of the log (throws MatchError for a move the rules don't allow). */
export function applyEvent(prev: MatchState | null, e: MatchEvent | Logged): MatchState {
  const s = applyOne(prev, e);
  // the move clock starts again with every move; a penalty stroke for slow play doesn't stop it (unless it ended the hole)
  if (e.t !== 'slow' || s.results.length !== prev!.results.length) s.clock = { seq: s.seq, at: timeOf(e) + CLOCK.graceMs, slow: false };
  return s;
}

function applyOne(prev: MatchState | null, e: MatchEvent | Logged): MatchState {
  const seq = 'seq' in e && typeof e.seq === 'number' ? e.seq : (prev?.seq ?? 0) + 1;
  if (e.t === 'created') {
    if (prev) fail('exists', 'this match already exists');
    const cfg = checkConfig(e.cfg);
    return {
      cfg, players: [checkPlayer(e.player), null], seq, phase: 'waiting', hole: 0, honour: 0,
      ready: [false, false], p: [freshHole(), freshHole()], results: [], outcome: null, rematch: null,
      clock: { seq, at: 0, slow: false },
    };
  }
  if (!prev) fail('no_match', 'no such match');
  const s: MatchState = structuredClone(prev);
  s.seq = seq;
  if (e.t === 'joined') {
    if (s.phase !== 'waiting' || s.players[1]) fail('full', 'this match already has two players');
    s.players[1] = checkPlayer(e.player);
    s.honour = e.honour === 1 ? 1 : 0;
    s.phase = 'playing';
    return s;
  }
  const by = e.by;
  if (by !== 0 && by !== 1) fail('bad_seat', 'not a player in this match');
  if (e.t === 'rematch') {
    if (s.phase !== 'finished') fail('not_finished', 'the match is still being played');
    if (typeof e.code !== 'string' || !/^[a-z0-9]{4,12}$/.test(e.code)) fail('bad_code', 'bad match code');
    if (s.rematch) fail('rematch_exists', 'a rematch is already on');
    s.rematch = { by, code: e.code };
    return s;
  }
  if (s.phase !== 'playing') fail(s.phase === 'finished' ? 'finished' : 'not_started', s.phase === 'finished' ? 'the match is over' : 'waiting for a second player');
  if (e.t === 'concede' && e.what === 'match') {
    s.phase = 'finished';
    s.ready = [false, false];
    s.outcome = { winner: other(by), margin: 'conceded', how: 'conceded' };
    return s;
  }
  if (e.t === 'claim') {
    // the other player hasn't moved for CLOCK.claimMs: the waiting player may take the match (developer, 2026-10-21)
    if (e.turn !== s.clock.seq) fail('moved', 'they have moved since');
    const w = waitingOn(s);
    if (!w || w.waiter !== by) fail('not_waiting', "the match isn't waiting on the other player");
    if (onClock(s, e) < CLOCK.claimMs) fail('too_soon', 'not yet');
    s.phase = 'finished';
    s.ready = [false, false];
    s.outcome = { winner: by, margin: 'by forfeit', how: 'forfeit' };
    return s;
  }
  if (e.hole !== s.hole) fail('wrong_hole', 'that hole is over');
  if (e.t === 'ready') {
    if (s.ready[by]) fail('already_ready', 'already at the hole');
    s.ready[by] = true;
    return s;
  }
  if (!holeLive(s)) fail('not_ready', 'both players must be at the hole first');
  const me = s.p[by];
  switch (e.t) {
    case 'stroke': {
      if (toPlay(s) !== by) fail('not_your_turn', "it isn't your turn");
      // a ball in a penalty area or out of bounds is dropped (with its penalty) before it is played again
      if (me.pending && (me.pending.kind === 'water' || me.pending.kind === 'ob')) fail('pending', 'take the drop first');
      const a = checkSnap(e.after, s.hole);
      if (a.tally.strokes !== me.strokes + 1) fail('bad_count', 'a stroke counts one');
      s.p[by] = fromSnap(a, me.slow);
      settle(s);
      return s;
    }
    case 'relief': {
      if (me.holed) fail('holed', 'the ball is in the hole');
      if (!me.pending && toPlay(s) !== by) fail('not_your_turn', "it isn't your turn");
      if (!me.pending && me.strokes === 0) fail('not_started', 'tee off first'); // an unplayable ball is one that has been played
      const pen = e.penalty;
      if (!isCount(pen, 2)) fail('bad_penalty', 'bad penalty');
      if (me.pending && pen < minPenalty(me.pending)) fail('bad_penalty', 'that relief costs a penalty stroke');
      const a = checkSnap(e.after, s.hole);
      if (a.pending || a.holed) fail('bad_snap', 'a drop leaves the ball at rest');
      if (a.tally.strokes !== me.strokes + pen) fail('bad_count', 'the penalty does not add up');
      s.p[by] = fromSnap(a, me.slow);
      settle(s);
      return s;
    }
    case 'slow': {
      // a penalty stroke for slow play (Rule 5.6a), once per shot, when the waiting player asks for it.
      // Kept apart from the player's own count, so a stroke they make at the same moment still counts
      if (e.turn !== s.clock.seq) fail('moved', 'they have played since');
      const w = waitingOn(s);
      if (!w || w.waiter !== by || w.kind !== 'shot') fail('not_waiting', "it isn't the other player's shot");
      if (s.clock.slow) fail('given', 'a penalty stroke has been given for this shot');
      if (onClock(s, e) < CLOCK.penaltyMs) fail('too_soon', 'not yet');
      s.p[w.on].slow += 1;
      s.clock.slow = true;
      settle(s);
      return s;
    }
    case 'concede': {
      if (e.what === 'hole') {
        closeHole(s, other(by), 'conceded');
        return s;
      }
      if (e.what !== 'stroke') fail('bad_concede', 'concede a stroke, the hole or the match');
      const t = s.p[other(by)];
      if (t.holed) fail('holed', 'the ball is already in the hole');
      if (t.pending) fail('pending', 'a drop has to be taken first');
      if (t.strokes === 0) fail('not_started', 'nothing to concede yet');
      // given for the putt that was there: a stroke played in the meantime (the moves crossed) voids it
      if (e.strokes !== undefined && e.strokes !== t.strokes) fail('moved', 'that putt has been played');
      t.strokes += 1;
      t.holed = true;
      t.conceded = true;
      settle(s);
      return s;
    }
    default:
      return fail('bad_event', 'unknown move');
  }
}

// -------------------------------------------------- what the server accepts
/** Most a stroke's flight may weigh (a 45-second simulation is ~45 KB; see path.ts). */
export const MAX_PATH = 96 * 1024;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const int = (v: unknown, lo: number, hi: number): number | null => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
const pt = (v: unknown): { x: number; y: number } | null => {
  const o = v as { x?: unknown; y?: unknown } | null;
  const x = num(o?.x), y = num(o?.y);
  return o && x !== null && y !== null ? { x, y } : null;
};
const ball = (v: unknown) => {
  const p = pt(v);
  return p && typeof (v as { teedUp?: unknown }).teedUp === 'boolean' ? { ...p, teedUp: (v as { teedUp: boolean }).teedUp } : null;
};

function cleanPending(v: unknown): PendingRelief | null | undefined {
  if (v === null) return null;
  const o = v as { kind?: unknown; cross?: unknown; wentOut?: unknown } | null;
  if (!o || typeof o !== 'object') return undefined;
  if (o.kind === 'water') { const c = pt(o.cross); return c ? { kind: 'water', cross: c } : undefined; }
  if (o.kind === 'ob') { const w = o.wentOut === null ? null : pt(o.wentOut); return w === null && o.wentOut !== null ? undefined : { kind: 'ob', wentOut: w }; }
  if (o.kind === 'wrong_green' || o.kind === 'cartpath') return { kind: o.kind };
  return undefined;
}

/** A hole snapshot with only its own fields, each checked (null: not one). */
export function cleanSnap(v: unknown): HoleSnap | null {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  const t = o.tally as Record<string, unknown> | null;
  const hole = int(o.hole, 0, MAX_HOLES - 1), shotNo = int(o.shotNo, 0, 99), shotSeq = int(o.shotSeq, 0, 1e6);
  const strokes = int(t?.strokes, 0, 99), putts = int(t?.putts, 0, 99), penalties = int(t?.penalties, 0, 99);
  const fairway = t?.fairway === null || typeof t?.fairway === 'boolean' ? (t.fairway as boolean | null) : undefined;
  const reached = t?.reachedGreenAt === null ? null : int(t?.reachedGreenAt, 0, 99);
  const b = ball(o.ball), pv = ball(o.prev), pending = cleanPending(o.pending);
  if (hole === null || shotNo === null || shotSeq === null || strokes === null || putts === null || penalties === null) return null;
  if (fairway === undefined || (reached === null && t?.reachedGreenAt !== null) || !b || !pv || pending === undefined || typeof o.holed !== 'boolean') return null;
  return { hole, tally: { strokes, putts, penalties, fairway, reachedGreenAt: reached }, ball: b, prev: pv, shotNo, shotSeq, pending, holed: o.holed };
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null);

/** A stroke as sent, with only the fields the other game shows (null: not one). */
export function cleanShot(v: unknown): ShotInfo | null {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  const club = typeof o.club === 'string' && /^[a-z0-9]{1,8}$/.test(o.club) ? o.club : null;
  const sp = o.spec as Record<string, unknown> | null;
  const spec = sp && num(sp.x) !== null && num(sp.y) !== null && num(sp.z) !== null && num(sp.aim) !== null
    ? { x: sp.x as number, y: sp.y as number, z: sp.z as number, aim: sp.aim as number } : null;
  const side = (x: unknown) => (x === -1 || x === 0 || x === 1 ? x : null);
  let strike: ShotInfo['strike'] = null;
  if (o.strike !== null) {
    const k = o.strike as Record<string, unknown> | null;
    const f = ['carry', 'apex', 'hang', 'curveDeg', 'aimOffsetDeg', 'excess', 'loss', 'power'].map((n) => num(k?.[n]));
    const q = str(k?.quality, 12), sd = side(k?.side);
    if (!k || f.some((x) => x === null) || !q || sd === null || typeof k.overswing !== 'boolean') return null;
    strike = { carry: f[0]!, apex: f[1]!, hang: f[2]!, curveDeg: f[3]!, aimOffsetDeg: f[4]!, excess: f[5]!, loss: f[6]!, power: f[7]!, quality: q as never, side: sd, overswing: k.overswing };
  }
  let putt: ShotInfo['putt'] = null;
  if (o.putt !== null) {
    const k = o.putt as Record<string, unknown> | null;
    const f = ['dirDeg', 'distMult', 'excess'].map((n) => num(k?.[n]));
    const q = str(k?.quality, 12), sd = side(k?.side);
    if (!k || f.some((x) => x === null) || !q || sd === null) return null;
    putt = { dirDeg: f[0]!, distMult: f[1]!, excess: f[2]!, quality: q as never, side: sd };
  }
  const puttDist = o.puttDist === null ? null : num(o.puttDist);
  const gust = num(o.gustMph), scale = num(o.scale), power = num(o.power);
  if (!club || !spec || (puttDist === null && o.puttDist !== null) || gust === null || scale === null || power === null) return null;
  return { club, spec, strike, putt, puttDist, gustMph: gust, scale, power };
}

/**
 * A move as a game sent it, rebuilt from its checked fields only (null: not a
 * move): a modified or buggy game can't slip extra fields into the log, send a
 * shape the other game can't show, or pose as another kind of entry.
 */
export function cleanAction(v: unknown): Action | null {
  const a = v as Record<string, unknown> | null;
  if (!a || typeof a !== 'object') return null;
  const hole = int(a.hole, 0, MAX_HOLES - 1);
  const turn = int(a.turn, 1, 1e7);
  switch (a.t) {
    case 'join': {
      const p = a.player as Record<string, unknown> | null;
      return p && typeof p.name === 'string' && p.name.length <= 40 && typeof p.lefty === 'boolean' ? { t: 'join', player: { name: p.name, lefty: p.lefty } } : null;
    }
    case 'ready': return hole === null ? null : { t: 'ready', hole };
    case 'stroke': {
      const after = cleanSnap(a.after), shot = cleanShot(a.shot), path = str(a.path, MAX_PATH);
      return hole === null || !after || !shot || path === null ? null : { t: 'stroke', hole, after, shot, path };
    }
    case 'relief': {
      const after = cleanSnap(a.after), penalty = int(a.penalty, 0, 2);
      const label = typeof a.label === 'string' ? a.label.slice(0, 40) : null;
      return hole === null || !after || penalty === null || label === null ? null : { t: 'relief', hole, after, penalty, label };
    }
    case 'concede': {
      if (a.what !== 'stroke' && a.what !== 'hole' && a.what !== 'match') return null;
      const strokes = a.strokes === undefined ? undefined : int(a.strokes, 0, 99);
      if (hole === null || strokes === null) return null;
      return strokes === undefined ? { t: 'concede', what: a.what, hole } : { t: 'concede', what: a.what, hole, strokes };
    }
    case 'rematch': return typeof a.code === 'string' && /^[a-z0-9]{4,12}$/.test(a.code) ? { t: 'rematch', code: a.code } : null;
    case 'slow': return hole === null || turn === null ? null : { t: 'slow', hole, turn };
    case 'claim': return turn === null ? null : { t: 'claim', turn };
    default: return null;
  }
}

/** The log entry a player's move becomes (the server draws the honour when the second player joins). */
export function eventOf(by: Seat, a: Action, honour: Seat = 0): MatchEvent {
  if (a.t === 'join') return { t: 'joined', player: a.player, honour };
  return { ...a, by } as MatchEvent;
}

/** The state from a whole log. */
export function stateOf(log: (MatchEvent | Logged)[]): MatchState | null {
  let s: MatchState | null = null;
  for (const e of log) s = applyEvent(s, e);
  return s;
}

/**
 * "all square", "kevin 2 up", "you're 2 up (dormie)", "charlie won 3&2", "charlie won at the 19th",
 * "charlie won by forfeit", "kevin conceded the match".
 */
export function statusText(s: MatchState, me: Seat | null = null): string {
  const name = (k: Seat) => (k === me ? 'you' : s.players[k]?.name ?? 'player 2');
  if (s.phase === 'waiting') return 'waiting for a second player';
  if (s.phase === 'finished' && s.outcome) {
    const o = s.outcome;
    if (o.winner === null) return 'match halved';
    if (o.how === 'conceded') return `${name(other(o.winner))} conceded the match`;
    return `${name(o.winner)} won ${o.margin}`;
  }
  const up = lead(s), left = holesLeft(s);
  if (up === 0) return 'all square';
  const k: Seat = up > 0 ? 0 : 1;
  const text = `${k === me ? "you're" : name(k)} ${Math.abs(up)} up`;
  return Math.abs(up) === left ? `${text} (dormie)` : text;
}

/** A hole's result for one player: 'won', 'lost' or 'halved'. */
export function resultFor(r: HoleResult, me: Seat): 'won' | 'lost' | 'halved' {
  return r.winner === null ? 'halved' : r.winner === me ? 'won' : 'lost';
}

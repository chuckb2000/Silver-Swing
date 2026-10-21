// Match play rules (src/systems/match/rules.ts): order of play, hole results,
// concessions and how the match stands, against the USGA rules (3.2, 6.4).

import { describe, expect, it } from 'vitest';
import { applyEvent, decided, holesLeft, lead, statusText, stateOf, toPlay } from '../../src/systems/match/rules';
import { HoleSnap, MatchConfig, MatchError, MatchEvent, MatchState, PROTOCOL, Seat } from '../../src/systems/match/types';
import type { PendingRelief } from '../../src/systems/game/round';

const PIN: [number, number] = [100, 300];

function cfg(holes = 18): MatchConfig {
  return {
    protocol: PROTOCOL, courseId: 'test', courseVersion: 'v1', tee: 'Blue', holes: Array.from({ length: holes }, (_, i) => i + 1),
    difficulty: 'normal', seed: 1234, pins: Array.from({ length: holes }, () => PIN), startedAt: '2026-10-21T12:00:00.000Z',
  };
}

/** A player's hole after a stroke or a drop: `strokes` so far, the ball `d` metres short of the pin. */
function snap(hole: number, strokes: number, d: number, o: { holed?: boolean; pending?: PendingRelief | null; teed?: boolean; penalties?: number } = {}): HoleSnap {
  const ball = o.holed ? { x: PIN[0], y: PIN[1], teedUp: false } : { x: PIN[0], y: PIN[1] - d, teedUp: !!o.teed };
  return {
    hole, tally: { strokes, putts: 0, penalties: o.penalties ?? 0, fairway: null, reachedGreenAt: null },
    ball, prev: ball, shotNo: strokes, shotSeq: strokes, pending: o.pending ?? null, holed: !!o.holed,
  };
}

const shot = { club: 'driver', spec: { x: 0, y: 0, z: 0, aim: 0 }, strike: null, putt: null, puttDist: null, gustMph: 0, scale: 1, power: 1 };

/** Two players at the first tee (seat `honour` has the honour), both ready. */
function started(honour: Seat = 0, holes = 18): MatchState {
  return stateOf([
    { t: 'created', cfg: cfg(holes), player: { name: 'charlie', lefty: false } },
    { t: 'joined', player: { name: 'kevin', lefty: true }, honour },
    { t: 'ready', by: 0, hole: 0 },
    { t: 'ready', by: 1, hole: 0 },
  ])!;
}

const stroke = (by: Seat, s: MatchState, strokes: number, d: number, o: Parameters<typeof snap>[3] = {}): MatchEvent =>
  ({ t: 'stroke', by, hole: s.hole, after: snap(s.hole, strokes, d, o), shot, path: '' });

const relief = (by: Seat, s: MatchState, strokes: number, d: number, penalty: number, teed = false): MatchEvent =>
  ({ t: 'relief', by, hole: s.hole, after: snap(s.hole, strokes, d, { teed }), penalty, label: 'drop' });

function play(s: MatchState, ...evs: ((s: MatchState) => MatchEvent)[]): MatchState {
  for (const f of evs) s = applyEvent(s, f(s));
  return s;
}

function code(f: () => unknown): string {
  try { f(); } catch (e) { if (e instanceof MatchError) return e.code; throw e; }
  return 'ok';
}

/** Both players at the next hole. */
const readyBoth = (s: MatchState) => play(s, (x) => ({ t: 'ready', by: 0, hole: x.hole }), (x) => ({ t: 'ready', by: 1, hole: x.hole }));

/** A hole won by `w` (null: halved) in 2 against 3 (or 2 each), then both at the next tee. */
function winHole(s: MatchState, w: Seat | null): MatchState {
  const first = toPlay(s)!;
  const second: Seat = first === 0 ? 1 : 0;
  s = play(s, (x) => stroke(first, x, 1, 150), (x) => stroke(second, x, 1, 140)); // first is farther
  if (w === second) {
    s = play(s, (x) => stroke(first, x, 2, 1), (x) => stroke(second, x, 2, 0, { holed: true })); // first lies 2, can't tie
  } else {
    s = play(s, (x) => stroke(first, x, 2, 0, { holed: true }));
    s = applyEvent(s, stroke(second, s, 2, w === null ? 0 : 1, { holed: w === null }));
  }
  if (s.results.length === 0) throw new Error('hole not decided');
  return s.phase === 'playing' ? readyBoth(s) : s;
}

describe('match play: setting up', () => {
  it('waits for a second player, then for both at the first tee', () => {
    const s0 = stateOf([{ t: 'created', cfg: cfg(), player: { name: 'charlie', lefty: false } }])!;
    expect(s0.phase).toBe('waiting');
    expect(statusText(s0)).toBe('waiting for a second player');
    const s1 = applyEvent(s0, { t: 'joined', player: { name: 'kevin', lefty: true }, honour: 1 });
    expect(s1.phase).toBe('playing');
    expect(toPlay(s1)).toBeNull(); // nobody plays before both are at the tee
    expect(code(() => applyEvent(s1, { t: 'stroke', by: 1, hole: 0, after: snap(0, 1, 150), shot, path: '' }))).toBe('not_ready');
    const s2 = applyEvent(s1, { t: 'ready', by: 0, hole: 0 });
    expect(toPlay(s2)).toBeNull();
    expect(code(() => applyEvent(s2, { t: 'ready', by: 0, hole: 0 }))).toBe('already_ready');
    expect(toPlay(applyEvent(s2, { t: 'ready', by: 1, hole: 0 }))).toBe(1); // the honour by lot
    expect(code(() => applyEvent(s1, { t: 'joined', player: { name: 'sam', lefty: false }, honour: 0 }))).toBe('full');
  });

  it('refuses a match made by another version of the game, or without a name', () => {
    expect(code(() => stateOf([{ t: 'created', cfg: { ...cfg(), protocol: PROTOCOL + 1 }, player: { name: 'a', lefty: false } }]))).toBe('protocol');
    expect(code(() => stateOf([{ t: 'created', cfg: cfg(), player: { name: ' ', lefty: false } }]))).toBe('bad_player');
    expect(code(() => stateOf([{ t: 'created', cfg: { ...cfg(), pins: [] }, player: { name: 'a', lefty: false } }]))).toBe('bad_config');
  });
});

describe('match play: order of play (Rule 6.4)', () => {
  it('honour first on the tee, then the other player, then the ball farther from the hole', () => {
    let s = started(0);
    expect(toPlay(s)).toBe(0);
    expect(code(() => applyEvent(s, stroke(1, s, 1, 150)))).toBe('not_your_turn');
    s = applyEvent(s, stroke(0, s, 1, 150));
    expect(toPlay(s)).toBe(1); // tees off even though charlie is farther
    s = applyEvent(s, stroke(1, s, 1, 120));
    expect(toPlay(s)).toBe(0); // 150 m out against 120 m
    s = applyEvent(s, stroke(0, s, 2, 10));
    expect(toPlay(s)).toBe(1);
    s = applyEvent(s, stroke(1, s, 2, 12));
    expect(toPlay(s)).toBe(1); // still farther (12 against 10)
  });

  it('a ball to be played again from the tee waits until the other player has teed off (6.4c)', () => {
    let s = started(0);
    s = applyEvent(s, stroke(0, s, 1, 400, { pending: { kind: 'ob', wentOut: null } }));
    expect(toPlay(s)).toBe(0); // the relief choice first
    s = applyEvent(s, relief(0, s, 2, 380, 1, true)); // stroke and distance: back on the tee, lying 2
    expect(toPlay(s)).toBe(1);
    s = applyEvent(s, stroke(1, s, 1, 140));
    expect(toPlay(s)).toBe(0); // now the farther ball: the one on the tee
  });

  it('equal distances: the player with the honour', () => {
    let s = started(1);
    s = play(s, (x) => stroke(1, x, 1, 100), (x) => stroke(0, x, 1, 100));
    expect(toPlay(s)).toBe(1);
  });

  it('a relief choice is taken before anyone else plays', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 200, { pending: { kind: 'water', cross: { x: 0, y: 0 } } }));
    expect(toPlay(s)).toBe(1);
    expect(code(() => applyEvent(s, stroke(0, s, 2, 10)))).toBe('not_your_turn');
    expect(code(() => applyEvent(s, relief(1, s, 1, 190, 1)))).toBe('bad_count'); // the penalty stroke must be counted
    s = applyEvent(s, relief(1, s, 2, 190, 1));
    expect(toPlay(s)).toBe(1); // 190 m out: still the farther ball
  });

  it('an unplayable ball is the player\'s own call, on their turn and after teeing off', () => {
    let s = started(0);
    expect(code(() => applyEvent(s, relief(0, s, 1, 300, 1)))).toBe('not_started');
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 100));
    expect(code(() => applyEvent(s, relief(1, s, 2, 100, 1)))).toBe('not_your_turn');
    s = applyEvent(s, relief(0, s, 2, 152, 1));
    expect(s.p[0].strokes).toBe(2);
    expect(toPlay(s)).toBe(0);
  });
});

describe('match play: winning a hole', () => {
  it('a hole is over once the other player can no longer tie', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 3), (x) => stroke(1, x, 2, 5));
    s = applyEvent(s, stroke(1, s, 3, 0, { holed: true })); // kevin holes in 3
    expect(decided(s)).toBeUndefined(); // charlie lies 2: he can still halve with his next
    expect(toPlay(s)).toBe(0);
    const s2 = applyEvent(s, stroke(0, s, 3, 0.4)); // misses
    expect(s2.results).toHaveLength(1);
    expect(s2.results[0]).toMatchObject({ winner: 1, strokes: [3, 3], holed: [false, true], how: 'played' });
    expect(s2.hole).toBe(1);
    expect(s2.honour).toBe(1);
    expect(toPlay(s2)).toBeNull(); // both have to come to the next tee
    const s3 = applyEvent(s, stroke(0, s, 3, 0, { holed: true }));
    expect(s3.results[0].winner).toBeNull();
    expect(s3.honour).toBe(0); // halved: the honour stays
  });

  it('holing out first can decide the hole at once', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 30), (x) => stroke(1, x, 2, 20));
    s = play(s, (x) => stroke(0, x, 3, 5), (x) => stroke(1, x, 3, 0, { holed: true }));
    expect(s.results[0]).toMatchObject({ winner: 1, strokes: [3, 3], holed: [false, true] }); // charlie lies 3 against a 3: no putt to play
    expect(code(() => applyEvent(s, { ...stroke(0, s, 4, 0, { holed: true }), hole: 0 } as MatchEvent))).toBe('wrong_hole');
  });

  it('a relief still open counts its penalty when deciding', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 4), (x) => stroke(1, x, 2, 5));
    s = applyEvent(s, stroke(1, s, 3, 0, { holed: true })); // kevin 3
    expect(toPlay(s)).toBe(0); // charlie lies 2: can still halve
    s = applyEvent(s, stroke(0, s, 3, 4, { pending: { kind: 'water', cross: { x: 0, y: 0 } } }));
    expect(s.results[0].winner).toBe(1); // in the water: 3 + 1 penalty + 1 can't tie a 3
  });

  it('a free drop still open costs nothing when deciding', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 10), (x) => stroke(0, x, 2, 20, { pending: { kind: 'cartpath' } }));
    s = applyEvent(s, relief(0, s, 2, 20, 0));
    s = play(s, (x) => stroke(0, x, 3, 0.5), (x) => stroke(1, x, 2, 0, { holed: true }));
    expect(s.results[0].winner).toBe(1);
  });
});

describe('match play: concessions (Rule 3.2b)', () => {
  it('a conceded putt counts as holed with the next stroke', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 1), (x) => stroke(1, x, 2, 2), (x) => stroke(1, x, 3, 1.5));
    expect(toPlay(s)).toBe(1); // kevin lies 3, 1.5 m away
    s = applyEvent(s, { t: 'concede', by: 1, what: 'stroke', hole: 0 }); // charlie's 1 m putt for 3 is good, on kevin's turn
    expect(s.results[0]).toMatchObject({ winner: 0, strokes: [3, 3], holed: [true, false] }); // kevin can't beat 3 now
  });

  it('a conceded putt halves the hole when it ties', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 1), (x) => stroke(1, x, 2, 2));
    s = applyEvent(s, stroke(1, s, 3, 0, { holed: true })); // kevin 3
    s = applyEvent(s, { t: 'concede', by: 1, what: 'stroke', hole: 0 }); // charlie's 1 m putt for 3 is good
    expect(s.results[0]).toMatchObject({ winner: null, strokes: [3, 3], how: 'played' });
  });

  it("nothing to concede before a player has teed off, nor with a drop to take; one's own stroke can't be conceded", () => {
    let s = started(0);
    expect(code(() => applyEvent(s, { t: 'concede', by: 1, what: 'stroke', hole: 0 }))).toBe('not_started');
    s = applyEvent(s, stroke(0, s, 1, 150, { pending: { kind: 'water', cross: { x: 0, y: 0 } } }));
    expect(code(() => applyEvent(s, { t: 'concede', by: 1, what: 'stroke', hole: 0 }))).toBe('pending');
  });

  it('a conceded hole goes to the other player, who takes the honour', () => {
    let s = started(0);
    s = applyEvent(s, stroke(0, s, 1, 150));
    s = applyEvent(s, { t: 'concede', by: 0, what: 'hole', hole: 0 });
    expect(s.results[0]).toMatchObject({ winner: 1, how: 'conceded' });
    expect(s.honour).toBe(1);
    expect(code(() => applyEvent(s, { t: 'concede', by: 1, what: 'hole', hole: 0 }))).toBe('wrong_hole'); // that hole is over
  });

  it('a conceded match is over at once', () => {
    let s = started(0);
    s = applyEvent(s, { t: 'concede', by: 1, what: 'match', hole: 0 });
    expect(s.phase).toBe('finished');
    expect(s.outcome).toMatchObject({ winner: 0, how: 'conceded' });
    expect(statusText(s, 0)).toBe('kevin conceded the match');
    expect(statusText(s, 1)).toBe('you conceded the match');
    expect(code(() => applyEvent(s, stroke(0, s, 1, 150)))).toBe('finished');
  });
});

describe('match play: the match', () => {
  it('ends when the lead is more than the holes left (3&2), dormie on the way', () => {
    let s = started(0);
    for (let h = 0; h < 13; h++) s = winHole(s, h % 2 === 0 ? 0 : 1); // 13 holes: charlie wins 7, kevin 6
    expect(lead(s)).toBe(1);
    expect(holesLeft(s)).toBe(5);
    s = winHole(s, 0); // 2 up with 4 to play
    s = winHole(s, 0); // 3 up with 3 to play: dormie
    expect(statusText(s, 0)).toBe("you're 3 up (dormie)");
    expect(statusText(s, 1)).toBe('charlie 3 up (dormie)');
    s = winHole(s, 0);
    expect(s.phase).toBe('finished');
    expect(s.outcome).toMatchObject({ winner: 0, margin: '4&2' });
    expect(statusText(s)).toBe('charlie won 4&2');
  });

  it('is won "1 up" on the last hole, or halved all square', () => {
    let s = started(1, 3);
    s = winHole(s, 1);
    s = winHole(s, 0);
    expect(statusText(s)).toBe('all square');
    const won = winHole(s, 1);
    expect(won.outcome).toMatchObject({ winner: 1, margin: '1 up' });
    const halved = winHole(s, null);
    expect(halved.outcome).toMatchObject({ winner: null, margin: 'all square' });
    expect(statusText(halved)).toBe('match halved');
  });

  it('a 9-hole match can end 5&4', () => {
    let s = started(0, 9);
    for (let h = 0; h < 5; h++) s = winHole(s, 0);
    expect(s.outcome).toMatchObject({ winner: 0, margin: '5&4' });
  });

  it('a rematch can be offered once the match is over', () => {
    let s = started(0, 1);
    expect(code(() => applyEvent(s, { t: 'rematch', by: 0, code: 'abc234' }))).toBe('not_finished');
    s = winHole(s, 1);
    s = applyEvent(s, { t: 'rematch', by: 0, code: 'abc234' });
    expect(s.rematch).toEqual({ by: 0, code: 'abc234' });
    expect(code(() => applyEvent(s, { t: 'rematch', by: 1, code: 'zzz234' }))).toBe('rematch_exists');
  });

  it('is the same state however the log is applied, and survives JSON', () => {
    let s = started(0, 4);
    const log: MatchEvent[] = [
      { t: 'created', cfg: cfg(4), player: { name: 'charlie', lefty: false } },
      { t: 'joined', player: { name: 'kevin', lefty: true }, honour: 0 },
      { t: 'ready', by: 0, hole: 0 }, { t: 'ready', by: 1, hole: 0 },
    ];
    const evs: ((x: MatchState) => MatchEvent)[] = [(x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 0, { holed: true }), (x) => stroke(1, x, 2, 3)];
    for (const f of evs) { const e = f(s); log.push(e); s = applyEvent(s, e); }
    expect(stateOf(log)).toEqual(s);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s.results[0].winner).toBe(0);
  });

  it('refuses a stroke that does not add up, or for a hole that is over', () => {
    const s = started(0);
    expect(code(() => applyEvent(s, stroke(0, s, 2, 150)))).toBe('bad_count');
    expect(code(() => applyEvent(s, { ...stroke(0, s, 1, 150), hole: 3 } as MatchEvent))).toBe('wrong_hole');
    expect(code(() => applyEvent(s, { ...stroke(0, s, 1, 150), after: { ...snap(0, 1, 150), ball: { x: NaN, y: 0, teedUp: false } } } as MatchEvent))).toBe('bad_snap');
    expect(code(() => applyEvent(s, stroke(0, s, 1, 0, { holed: true, pending: { kind: 'cartpath' } })))).toBe('bad_snap');
  });
});

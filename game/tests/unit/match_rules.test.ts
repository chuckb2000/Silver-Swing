// Match play rules (src/systems/match/rules.ts): order of play, hole results,
// concessions and how the match stands, against the USGA rules (3.2, 6.4).

import { describe, expect, it } from 'vitest';
import { applyEvent, cleanAction, clockText, decided, holeNo, holesLeft, isExtra, lead, MAX_PATH, ordinal, pinOf, statusText, stateOf, toPlay, waitingOn } from '../../src/systems/match/rules';
import { CLOCK, HoleSnap, Logged, MatchConfig, MatchError, MatchEvent, MatchState, MAX_EXTRA, PROTOCOL, Seat } from '../../src/systems/match/types';
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

  it('is won "1 up" on the last hole; all square after it goes to extra holes, sudden death (Rule 3.2a(4))', () => {
    let s = started(1, 3);
    s = winHole(s, 1);
    s = winHole(s, 0);
    expect(statusText(s)).toBe('all square');
    const won = winHole(s, 1);
    expect(won.outcome).toMatchObject({ winner: 1, margin: '1 up', how: 'holes' });
    // the last hole halved: the match goes on, the round's first hole again with its pin
    let x = winHole(s, null);
    expect(x.phase).toBe('playing');
    expect(x.outcome).toBeNull();
    expect(x.hole).toBe(3);
    expect(isExtra(x.cfg, x.hole)).toBe(true);
    expect(holeNo(x.cfg, x.hole)).toBe(1);
    expect(pinOf(x)).toEqual(x.cfg.pins[0]);
    expect(holesLeft(x)).toBe(0);
    expect(statusText(x)).toBe('all square'); // not "dormie"
    x = winHole(x, null); // the 4th halved too: on to the 5th (hole 2)
    expect(x.phase).toBe('playing');
    expect(holeNo(x.cfg, x.hole)).toBe(2);
    x = winHole(x, 0);
    expect(x.outcome).toMatchObject({ winner: 0, margin: 'at the 5th', how: 'extra' });
    expect(statusText(x)).toBe('charlie won at the 5th');
    expect(statusText(x, 1)).toBe('charlie won at the 5th');
    expect(statusText(x, 0)).toBe('you won at the 5th');
  });

  it('an 18-hole match tied after 18 is won at the 19th; a limit nobody reaches halves it', () => {
    let s = started(0, 18);
    for (let h = 0; h < 18; h++) s = winHole(s, null);
    expect(s.phase).toBe('playing');
    s = winHole(s, 1);
    expect(s.outcome).toMatchObject({ winner: 1, margin: 'at the 19th' });
    expect(ordinal(19)).toBe('19th');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
    let t = started(0, 1);
    for (let h = 0; h < 1 + MAX_EXTRA; h++) t = winHole(t, null);
    expect(t.outcome).toMatchObject({ winner: null, margin: 'all square' });
    expect(statusText(t)).toBe('match halved');
  });

  it('a lead after the last hole of a 9-hole match is "2 up"', () => {
    let s = started(0, 2);
    s = winHole(s, 0);
    s = winHole(s, 0);
    expect(s.outcome).toMatchObject({ winner: 0, margin: '2 up' });
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

describe('match play: drops and crossed moves (review fixes)', () => {
  it('a ball in the water or out of bounds is dropped, with its penalty, before it is played again', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150, { pending: { kind: 'water', cross: { x: 0, y: 0 } } }));
    expect(toPlay(s)).toBe(0);
    expect(code(() => applyEvent(s, stroke(0, s, 2, 140)))).toBe('pending'); // no playing it from the water
    expect(code(() => applyEvent(s, relief(0, s, 1, 150, 0)))).toBe('bad_penalty'); // the drop costs a stroke
    s = applyEvent(s, relief(0, s, 2, 150, 1));
    expect(s.p[0].pending).toBeNull();
    s = applyEvent(s, stroke(1, s, 1, 120)); // the other player tees off: charlie's dropped ball (150) is farther
    expect(toPlay(s)).toBe(0);
  });

  it('a cart path ball may be played as it lies (free relief is a choice)', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150, { pending: { kind: 'cartpath' } }));
    expect(toPlay(s)).toBe(0);
    s = applyEvent(s, { t: 'relief', by: 0, hole: 0, after: snap(0, 1, 150), penalty: 0, label: 'as it lies' });
    expect(s.p[0].pending).toBeNull();
    s = applyEvent(s, stroke(1, s, 1, 100));
    expect(toPlay(s)).toBe(0);
  });

  it('a putt given as it was being struck is void: the stroke stands, not a different putt', () => {
    let s = started(0);
    s = play(s, (x) => stroke(0, x, 1, 150), (x) => stroke(1, x, 1, 140), (x) => stroke(0, x, 2, 1), (x) => stroke(1, x, 2, 3));
    // kevin gives charlie the 1 m putt (charlie has played 2) ...
    const give: MatchEvent = { t: 'concede', by: 1, what: 'stroke', hole: 0, strokes: 2 };
    expect(code(() => applyEvent(s, give))).toBe('ok');
    // ... but charlie's putt (his 3rd) reached the server first and missed: the concession no longer fits
    const missed = applyEvent(applyEvent(s, stroke(1, s, 3, 1)), stroke(0, applyEvent(s, stroke(1, s, 3, 1)), 3, 0.6));
    expect(missed.p[0].strokes).toBe(3);
    expect(code(() => applyEvent(missed, give))).toBe('moved');
    expect(code(() => applyEvent(missed, { ...give, strokes: 3 } as MatchEvent))).toBe('ok'); // the putt as it lies now can be given
  });
});

describe('match play: what the server accepts', () => {
  const after = snap(0, 1, 150);
  it('rebuilds each move from its own fields (anything else a game sends is dropped)', () => {
    const extra = { t: 'stroke', hole: 0, after: { ...after, tally: { ...after.tally, hole: 7, par: 3 }, evil: true }, shot: { ...shot, club: 'dr', hack: 1 }, path: '', cid: 'x', by: 1 };
    const a = cleanAction(extra)!;
    expect(a).toEqual({ t: 'stroke', hole: 0, after, shot: { ...shot, club: 'dr' }, path: '' });
    expect(Object.keys((a as { after: object }).after)).not.toContain('evil');
    expect(cleanAction({ t: 'join', player: { name: 'sam', lefty: false, key: 'secret' } })).toEqual({ t: 'join', player: { name: 'sam', lefty: false } });
    expect(cleanAction({ t: 'concede', what: 'stroke', hole: 2, strokes: 4, by: 0 })).toEqual({ t: 'concede', what: 'stroke', hole: 2, strokes: 4 });
    expect(cleanAction({ t: 'relief', hole: 0, after, penalty: 1, label: 'x'.repeat(80) })).toMatchObject({ label: 'x'.repeat(40) });
  });

  it('refuses shapes no game makes', () => {
    expect(cleanAction(null)).toBeNull();
    expect(cleanAction({ t: 'created', cfg: {} })).toBeNull(); // only the server makes those
    expect(cleanAction({ t: 'joined', player: { name: 'x', lefty: false }, honour: 0 })).toBeNull();
    expect(cleanAction({ t: 'ready', hole: -1 })).toBeNull();
    expect(cleanAction({ t: 'ready', hole: 1.5 })).toBeNull();
    expect(cleanAction({ t: 'stroke', hole: 0, after: { ...after, ball: { x: 'a', y: 0, teedUp: false } }, shot, path: '' })).toBeNull();
    expect(cleanAction({ t: 'stroke', hole: 0, after, shot: { ...shot, club: '<script>' }, path: '' })).toBeNull();
    expect(cleanAction({ t: 'stroke', hole: 0, after, shot, path: 'x'.repeat(MAX_PATH + 1) })).toBeNull();
    expect(cleanAction({ t: 'stroke', hole: 0, after: { ...after, pending: { kind: 'lava' } }, shot, path: '' })).toBeNull();
    expect(cleanAction({ t: 'relief', hole: 0, after, penalty: 3, label: 'x' })).toBeNull();
    expect(cleanAction({ t: 'concede', what: 'everything', hole: 0 })).toBeNull();
    expect(cleanAction({ t: 'rematch', code: 'BAD CODE' })).toBeNull();
    expect(cleanAction({ t: 'slow', hole: 0 })).toBeNull(); // the clock it is for is needed
    expect(cleanAction({ t: 'claim', turn: 0 })).toBeNull();
    expect(cleanAction({ t: 'slow', hole: 2, turn: 7, by: 1 })).toEqual({ t: 'slow', hole: 2, turn: 7 });
    expect(cleanAction({ t: 'claim', turn: 7, hole: 3 })).toEqual({ t: 'claim', turn: 7 });
    expect(cleanAction({ t: 'ready', hole: 53 })).toEqual({ t: 'ready', hole: 53 }); // extra holes
    expect(cleanAction({ t: 'ready', hole: 54 })).toBeNull();
  });
});

describe('match play: the settings a match is made with', () => {
  const made = (c: unknown) => applyEvent(null, { t: 'created', cfg: c as MatchConfig, player: { name: 'charlie', lefty: false } });
  it('are kept field by field (nothing else rides along)', () => {
    const s = made({ ...cfg(2), extra: 'x'.repeat(3000), pins: [[1, 2, 3], [4, 5]] });
    expect(Object.keys(s.cfg).sort()).toEqual(['courseId', 'courseVersion', 'difficulty', 'holes', 'pins', 'protocol', 'seed', 'startedAt', 'tee']);
    expect(s.cfg.pins).toEqual([[1, 2], [4, 5]]);
  });
  it('refuse what no game makes', () => {
    expect(code(() => made({ ...cfg(), tee: 'x'.repeat(2000) }))).toBe('bad_config');
    expect(code(() => made({ ...cfg(), tee: '<b>' }))).toBe('bad_config');
    expect(code(() => made({ ...cfg(1), pins: [[1e300, 0]] }))).toBe('bad_config');
    expect(code(() => made({ ...cfg(), startedAt: 'yesterday' }))).toBe('bad_config');
    expect(code(() => made({ ...cfg(), courseVersion: '' }))).toBe('bad_config');
    expect(code(() => made({ ...cfg(), holes: [0] , pins: [PIN] }))).toBe('bad_config');
  });
});

// ------------------------------------------------------------- the move clock
const T0 = Date.parse('2026-10-21T18:00:00.000Z');
/** An entry as the server logs it, at `t` ms after T0. */
const at = (e: MatchEvent, t: number): Logged => ({ ...e, at: new Date(T0 + t).toISOString() } as Logged);
/** Apply a timed entry. */
const go = (s: MatchState, e: MatchEvent, t: number) => applyEvent(s, at(e, t));

/** Both players at the first tee, every entry logged at time 0. */
function startedAt(honour: Seat = 0, holes = 18): MatchState {
  let s: MatchState | null = null;
  for (const e of [
    { t: 'created', cfg: cfg(holes), player: { name: 'charlie', lefty: false } },
    { t: 'joined', player: { name: 'kevin', lefty: true }, honour },
    { t: 'ready', by: 0, hole: 0 },
    { t: 'ready', by: 1, hole: 0 },
  ] as MatchEvent[]) s = applyEvent(s, at(e, 0));
  return s!;
}

describe('match play: the move clock (developer, 2026-10-21)', () => {
  const MIN = 60_000;
  it('starts with each move, a little after it (time to watch it)', () => {
    const s = startedAt(0);
    expect(s.clock).toEqual({ seq: 4, at: T0 + CLOCK.graceMs, slow: false });
    expect(waitingOn(s)).toEqual({ on: 0, waiter: 1, kind: 'shot' });
    const s2 = go(s, stroke(0, s, 1, 150), 30_000);
    expect(s2.clock).toEqual({ seq: 5, at: T0 + 30_000 + CLOCK.graceMs, slow: false });
    expect(waitingOn(s2)).toEqual({ on: 1, waiter: 0, kind: 'shot' });
    expect(clockText(125_000)).toBe('2:05');
    expect(clockText(59_001)).toBe('1:00');
  });

  it('a penalty stroke for slow play: the waiting player, from 2:00, once per shot, for the shot it was meant for', () => {
    const s = startedAt(0); // charlie to play, kevin waiting
    const slow = (by: Seat, turn = s.clock.seq): MatchEvent => ({ t: 'slow', by, hole: 0, turn });
    const t2 = CLOCK.graceMs + CLOCK.penaltyMs;
    expect(code(() => go(s, slow(1), t2 - 1))).toBe('too_soon');
    expect(code(() => go(s, slow(0), t2))).toBe('not_waiting'); // not on oneself
    expect(code(() => go(s, slow(1, 3), t2))).toBe('moved'); // meant for an earlier clock
    expect(code(() => applyEvent(s, slow(1)))).toBe('no_time'); // only the server can time it
    const p = go(s, slow(1), t2);
    expect(p.p[0]).toMatchObject({ strokes: 0, slow: 1 });
    expect(p.clock).toEqual({ ...s.clock, slow: true }); // the clock runs on
    expect(code(() => go(p, slow(1), t2 + MIN))).toBe('given');
    // charlie plays: his own count is untouched (his game never held the penalty), the stroke counts
    const q = go(p, stroke(0, p, 1, 150), t2 + 5_000);
    expect(q.p[0]).toMatchObject({ strokes: 1, slow: 1 });
    expect(q.clock.slow).toBe(false);
    expect(q.clock.seq).toBe(q.seq);
  });

  it('a stroke struck as the penalty went still counts, whichever reached the server first', () => {
    const s = startedAt(0);
    const t2 = CLOCK.graceMs + CLOCK.penaltyMs;
    const penalty: MatchEvent = { t: 'slow', by: 1, hole: 0, turn: s.clock.seq };
    const shot1 = stroke(0, s, 1, 150);
    const a = go(go(s, penalty, t2), shot1, t2 + 1); // the penalty first
    expect(a.p[0]).toMatchObject({ strokes: 1, slow: 1 });
    const b = go(s, shot1, t2); // the stroke first: the penalty is for a clock that has stopped
    expect(code(() => go(b, penalty, t2 + 1))).toBe('moved');
  });

  it('counts in the score, and can decide the hole', () => {
    let s = startedAt(0);
    s = play(s, (x) => at(stroke(0, x, 1, 150), 1_000), (x) => at(stroke(1, x, 1, 140), 2_000), (x) => at(stroke(0, x, 2, 4), 3_000), (x) => at(stroke(1, x, 2, 5), 3_500));
    s = go(s, stroke(1, s, 3, 0, { holed: true }), 4_000); // kevin holes in 3
    expect(toPlay(s)).toBe(0); // charlie lies 2: a putt to halve
    const t = 4_000 + CLOCK.graceMs + CLOCK.penaltyMs;
    const p = go(s, { t: 'slow', by: 1, hole: 0, turn: s.clock.seq }, t);
    expect(p.results[0]).toMatchObject({ winner: 1, strokes: [3, 3], holed: [false, true], slow: [1, 0] }); // 2 + 1: he can't halve now
    expect(p.hole).toBe(1);
    expect(p.clock).toEqual({ seq: p.seq, at: T0 + t + CLOCK.graceMs, slow: false }); // a new wait: the next tee
  });

  it('claiming the match: the waiting player, from 5:00, at a shot or at the next tee', () => {
    const s = startedAt(0);
    const claim = (by: Seat, turn = s.clock.seq): MatchEvent => ({ t: 'claim', by, turn });
    const t5 = CLOCK.graceMs + CLOCK.claimMs;
    expect(code(() => go(s, claim(1), t5 - 1))).toBe('too_soon');
    expect(code(() => go(s, claim(0), t5))).toBe('not_waiting');
    expect(code(() => go(s, claim(1, 2), t5))).toBe('moved');
    const w = go(s, claim(1), t5);
    expect(w.phase).toBe('finished');
    expect(w.outcome).toEqual({ winner: 1, margin: 'by forfeit', how: 'forfeit' });
    expect(statusText(w)).toBe('kevin won by forfeit');
    expect(statusText(w, 1)).toBe('you won by forfeit');
    // between holes: the player at the next tee may claim against the one who hasn't come
    let h = startedAt(0, 3);
    h = play(h, (x) => at(stroke(0, x, 1, 150), 1_000), (x) => at(stroke(1, x, 1, 140), 2_000), (x) => at(stroke(0, x, 2, 1), 3_000), (x) => at(stroke(1, x, 2, 0, { holed: true }), 4_000));
    expect(h.results).toHaveLength(1);
    expect(waitingOn(h)).toBeNull(); // both at the result: nobody waits
    h = go(h, { t: 'ready', by: 1, hole: h.hole }, 10_000);
    expect(waitingOn(h)).toEqual({ on: 0, waiter: 1, kind: 'tee' });
    expect(code(() => go(h, { t: 'slow', by: 1, hole: h.hole, turn: h.clock.seq }, 10_000 + CLOCK.graceMs + CLOCK.penaltyMs))).toBe('not_ready'); // no penalty stroke off the course
    expect(go(h, { t: 'claim', by: 1, turn: h.clock.seq }, 10_000 + CLOCK.graceMs + CLOCK.claimMs).outcome).toMatchObject({ winner: 1, how: 'forfeit' });
    // nothing to claim before anyone has joined, or once it's over
    const lone = applyEvent(null, at({ t: 'created', cfg: cfg(), player: { name: 'charlie', lefty: false } }, 0));
    expect(code(() => go(lone, claim(0, 1), t5))).toBe('not_started');
    expect(code(() => go(w, claim(1, w.clock.seq), t5 * 3))).toBe('finished');
  });

  it('is the same state however the log is applied (server and both games), and survives JSON', () => {
    let s = startedAt(0);
    const log: Logged[] = [];
    const add = (e: MatchEvent, t: number) => { const l = { ...at(e, t), seq: s.seq + 1 } as Logged; log.push(l); s = applyEvent(s, l); };
    add(stroke(0, s, 1, 150), 1_000);
    add({ t: 'slow', by: 0, hole: 0, turn: s.clock.seq }, 1_000 + CLOCK.graceMs + CLOCK.penaltyMs);
    add(stroke(1, s, 1, 140), 200_000);
    let t = startedAt(0);
    for (const e of log) t = applyEvent(t, e);
    expect(t).toEqual(s);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

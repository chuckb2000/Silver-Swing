// Two robot golfers play whole matches through the match log, each game
// holding its own MatchSession, with a stand-in for the server that runs the
// rules (as src/server/matchRoom.ts does). Every event crosses "the wire" as
// JSON. After every event both games must agree with the server on the state,
// whose turn it is and where both balls are.

import { describe, expect, it } from 'vitest';
import { PUTTER } from '../../src/data/clubs';
import { courseHoleFor, Round } from '../../src/systems/game/round';
import { roundPins } from '../../src/systems/game/pins';
import { Rng } from '../../src/systems/physics/rng';
import { suggestDrop } from '../../src/systems/rules/relief';
import { encodePath } from '../../src/systems/match/path';
import { applyEvent, eventOf, toPlay } from '../../src/systems/match/rules';
import { holeSnapOf, MatchSession, restoreHole, shotInfoOf } from '../../src/systems/match/session';
import { Action, Logged, MatchConfig, MatchState, PROTOCOL, Seat } from '../../src/systems/match/types';
import { loadCourseFiles, meterFor } from './helpers';

const COURSE = loadCourseFiles('oswego_lake');

class FakeServer {
  log: Logged[] = [];
  state: MatchState | null = null;
  constructor(private rng: Rng) {}
  /** A move from seat `by`: added to the log (and returned) or refused (throws). */
  submit(by: Seat, a: Action, cid: string): Logged {
    const ev = { ...eventOf(by, a, this.rng.chance(0.5) ? 1 : 0), seq: this.log.length + 1, at: new Date(0).toISOString(), cid } as Logged;
    this.state = applyEvent(this.state, ev);
    this.log.push(ev);
    return JSON.parse(JSON.stringify(ev)) as Logged; // what goes over the wire
  }
}

function makeConfig(holes: number[], seed: number): MatchConfig {
  const n = COURSE.json.holes.length;
  return {
    protocol: PROTOCOL, courseId: COURSE.json.id, courseVersion: 'test', tee: COURSE.json.defaultTee, holes, difficulty: 'normal', seed,
    pins: roundPins(COURSE, COURSE.json.defaultTee, holes.map((h) => courseHoleFor(h, n)), seed), startedAt: '2026-10-21T12:00:00.000Z',
  };
}

/** The move a robot makes for its own Round when it is its turn (a stroke, or the drop its last stroke left). */
function robotMove(r: Round, rng: Rng, skill: number): Action {
  if (r.pending) {
    const out = r.reliefOutcome(r.pending);
    if (out.kind === 'rest') {
      // nothing to drop (no relief area found): play it as it lies
      return { t: 'relief', hole: r.holeIndex, after: { ...holeSnapOf(r), pending: null }, penalty: 0, label: 'as it lies' };
    }
    const options = 'options' in out ? out.options : 'area' in out ? [out.area] : [];
    const area = options[options.length - 1];
    const pt = suggestDrop(r.courseCtx(), area) ?? area.center;
    const before = holeSnapOf(r);
    r.applyRelief(area, pt);
    const after = holeSnapOf(r);
    restoreHole(r, before); // the game shows the drop once the server has it
    return { t: 'relief', hole: r.holeIndex, after, penalty: area.penalty, label: area.label };
  }
  const club = r.autoClub();
  const putt = club.kind === 'putter';
  const scale = putt ? r.autoPuttScale() : r.autoSwingScale(club);
  const aim = r.defaultAim(club, scale);
  const d = r.distToPin();
  const power = putt ? Math.min(1, (d * 1.05 + 0.25) / scale) : Math.max(0.15, Math.min(1, (d * 0.97) / Math.max(1, r.carryFor(club, scale))));
  const err = (rng.next() - 0.5) * 2 * (putt ? 2 : 4) / skill;
  const meter = meterFor(power, err, putt || scale < 1);
  const shot = r.plan(club.id, aim, meter, 0, scale);
  const sim = r.simulate(shot);
  const after = r.whenSettled(shot, sim, (settled, o) => holeSnapOf(settled, o.kind === 'holed'));
  return { t: 'stroke', hole: r.holeIndex, after, shot: shotInfoOf(shot, meter.power), path: encodePath(sim) };
}

function agree(server: FakeServer, games: MatchSession[]) {
  for (const g of games) {
    expect(g.state).toEqual(server.state);
    expect(g.turn).toBe(toPlay(server.state!));
  }
  const [a, b] = games;
  for (const k of [0, 1] as Seat[]) {
    const ra = a.rounds[k], rb = b.rounds[k];
    if (!ra || !rb) { expect(ra).toBe(rb); continue; }
    expect(ra.holeIndex).toBe(rb.holeIndex);
    expect(ra.ball).toEqual(rb.ball);
    expect(ra.tally?.strokes).toBe(rb.tally?.strokes);
    expect(ra.scores).toEqual(rb.scores);
  }
}

describe('match sessions: two robots play whole matches', () => {
  function run(holes: number[], seed: number, skills: [number, number]) {
    const rng = new Rng(seed);
    const server = new FakeServer(rng.fork(1));
    const cfg = makeConfig(holes, seed);
    const created = { t: 'created', cfg, player: { name: 'charlie', lefty: false }, seq: 1, at: new Date(0).toISOString() } as Logged;
    server.state = applyEvent(null, created);
    server.log.push(created);
    const games = [0, 1].map((k) => new MatchSession(COURSE, 'test', k as Seat, [JSON.parse(JSON.stringify(created))]));
    let cid = 0;
    const counts = { strokes: 0, drops: 0, conceded: 0, refused: 0 };
    const send = (by: Seat, a: Action) => {
      const ev = server.submit(by, a, `c${++cid}`);
      for (const g of games) {
        expect(g.receive([ev])).toBe(true);
        g.applyNext();
      }
      agree(server, games);
    };
    send(1, { t: 'join', player: { name: 'kevin', lefty: true } });
    for (let guard = 0; guard < 3000 && server.state!.phase !== 'finished'; guard++) {
      const s = server.state!;
      if (!s.ready[0] || !s.ready[1]) {
        for (const k of [0, 1] as Seat[]) if (!server.state!.ready[k] && server.state!.phase === 'playing') send(k, { t: 'ready', hole: server.state!.hole });
        continue;
      }
      const who = toPlay(s)!;
      expect(who).not.toBeNull();
      const opp: Seat = who === 0 ? 1 : 0;
      const mine = games[who].rounds[who]!;
      // the opponent gives a short putt now and then; a player far over par gives up the hole
      if (!mine.pending && mine.tally.strokes > 0 && mine.onHoleGreen() && mine.distToPin() < 1.2 && rng.chance(0.5)) {
        send(opp, { t: 'concede', what: 'stroke', hole: s.hole });
        counts.conceded++;
        continue;
      }
      if (mine.tally.strokes >= 11 && !mine.pending) {
        send(who, { t: 'concede', what: 'hole', hole: s.hole });
        counts.conceded++;
        continue;
      }
      const a = robotMove(mine, rng, skills[who]);
      if (a.t === 'relief') counts.drops++; else counts.strokes++;
      send(who, a);
    }
    if (process.env.MATCH_DEBUG) console.log(JSON.stringify({ seed, outcome: server.state!.outcome, results: server.state!.results.map((r) => `${r.strokes.join('-')}${r.winner === null ? 'h' : r.winner}${r.how === 'conceded' ? 'c' : ''}`).join(' '), counts }));
    return { server, games, counts };
  }

  it('an 18-hole match between two good players ends with a result both games agree on', () => {
    const { server, games, counts } = run(Array.from({ length: 18 }, (_, i) => i + 1), 2026, [1.6, 1.4]);
    const s = server.state!;
    expect(s.phase).toBe('finished');
    expect(s.outcome).not.toBeNull();
    expect(counts.strokes).toBeGreaterThan(40);
    // each finished hole is on both players' cards with the result's strokes
    for (const k of [0, 1] as Seat[]) {
      const r = games[0].rounds[k]!;
      expect(r.scores.map((x) => x.strokes)).toEqual(s.results.map((x) => x.strokes[k]));
    }
    // every hole's result follows from the strokes: a winner has the lower count, or the other gave it up
    for (const res of s.results) {
      if (res.how === 'conceded') continue;
      if (res.winner === null) expect(res.strokes[0]).toBe(res.strokes[1]);
      else {
        expect(res.holed[res.winner]).toBe(true);
        const loser = res.winner === 0 ? 1 : 0;
        expect(res.holed[loser] ? res.strokes[loser] > res.strokes[res.winner] : res.strokes[loser] + 1 > res.strokes[res.winner]).toBe(true);
      }
    }
  });

  it('wild players (water, out of bounds, drops, conceded holes) still agree all the way', () => {
    const { server, counts } = run(Array.from({ length: 9 }, (_, i) => i + 1), 77, [0.35, 0.3]);
    expect(server.state!.phase).toBe('finished');
    expect(counts.drops + counts.conceded).toBeGreaterThan(0);
  });

  it('several seeds, the back nine', () => {
    for (const seed of [3, 11, 19]) {
      const { server } = run(Array.from({ length: 9 }, (_, i) => i + 10), seed, [1, 0.8]);
      expect(server.state!.phase).toBe('finished');
    }
  });

  it('a game that joins late (or reloads) rebuilds the same match from the log', () => {
    const { server, games } = run([1, 2, 3, 4, 5, 6], 5, [1.2, 1.2]);
    const late = new MatchSession(COURSE, 'test', 1, JSON.parse(JSON.stringify(server.log)));
    expect(late.state).toEqual(server.state);
    for (const k of [0, 1] as Seat[]) expect(late.rounds[k]!.scores).toEqual(games[0].rounds[k]!.scores);
  });
});

describe('match sessions: receiving', () => {
  it('takes events in order, ignores repeats and reports a gap', () => {
    const cfg = makeConfig([1, 2], 9);
    const log: Logged[] = [
      { t: 'created', cfg, player: { name: 'a', lefty: false }, seq: 1, at: '' },
      { t: 'joined', player: { name: 'b', lefty: false }, honour: 0, seq: 2, at: '' },
      { t: 'ready', by: 0, hole: 0, seq: 3, at: '' },
      { t: 'ready', by: 1, hole: 0, seq: 4, at: '' },
    ];
    const g = new MatchSession(COURSE, 'x', 0, log.slice(0, 1));
    expect(g.receive([log[2]])).toBe(false); // 3 before 2: ask again
    expect(g.receive([log[1], log[0], log[1]])).toBe(true);
    expect(g.queue.map((e) => e.seq)).toEqual([2]);
    expect(g.receive([log[3], log[2]])).toBe(true); // out of order in one batch is fine
    expect(g.knownSeq).toBe(4);
    expect(g.idle).toBe(false);
    while (g.applyNext()) { /* show them */ }
    expect(g.idle).toBe(true);
    expect(g.turn).toBe(0);
    expect(g.rounds[1]!.cfg.settings.lefty).toBe(false);
    expect(g.rounds[0]!.holeIndex).toBe(0);
    expect(g.rounds[0]!.ball.teedUp).toBe(true);
  });

  it('gives each player their own round id but the same wind', () => {
    const cfg = makeConfig([1, 2, 3], 42);
    const g = new MatchSession(COURSE, 'x', 0, [
      { t: 'created', cfg, player: { name: 'a', lefty: false }, seq: 1, at: '' },
      { t: 'joined', player: { name: 'b', lefty: true }, honour: 1, seq: 2, at: '' },
    ]);
    const [a, b] = g.rounds;
    expect(a!.cfg.startedAt).not.toBe(b!.cfg.startedAt);
    expect(a!.winds).toEqual(b!.winds);
    expect(b!.cfg.settings.lefty).toBe(true);
    expect(PUTTER.kind).toBe('putter');
  });
});

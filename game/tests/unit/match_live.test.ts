// Live match play against the real thing: the match Worker's Durable Object
// and the site's Pages Functions running under wrangler (scripts/match-dev.sh),
// two games on real WebSockets, robot golfers on a real course. Skipped unless
// MATCH_URL points at the running site (e.g. MATCH_URL=http://localhost:8788).

import { describe, expect, it } from 'vitest';
import { courseHoleFor, Round } from '../../src/systems/game/round';
import { roundPins } from '../../src/systems/game/pins';
import { Rng } from '../../src/systems/physics/rng';
import { suggestDrop } from '../../src/systems/rules/relief';
import { encodePath } from '../../src/systems/match/path';
import { holeSnapOf, MatchSession, restoreHole, shotInfoOf } from '../../src/systems/match/session';
import { Action, Logged, MatchConfig, PROTOCOL, Seat } from '../../src/systems/match/types';
import { ClientDeps, KeyValue, MatchClient } from '../../src/net/matchClient';
import { toPlay } from '../../src/systems/match/rules';
import { loadCourseFiles, meterFor } from './helpers';

const URL0 = process.env.MATCH_URL ?? '';
const COURSE = URL0 ? loadCourseFiles('oswego_lake') : null;

class MemStore implements KeyValue {
  m = new Map<string, string>();
  get(k: string) { return this.m.get(k) ?? null; }
  set(k: string, v: string) { this.m.set(k, v); }
  del(k: string) { this.m.delete(k); }
}

const deps = (store: KeyValue): ClientDeps => ({ base: URL0, WebSocket: WebSocket as unknown as ClientDeps['WebSocket'], fetch: (u, i) => fetch(u, i), store });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(f: () => boolean, ms = 15_000, what = 'condition') {
  const t0 = Date.now();
  while (!f()) {
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await sleep(20);
  }
}

class LiveGame {
  client: MatchClient;
  session: MatchSession | null = null;
  bytesIn = 0;
  constructor(code: string, key: string) {
    this.client = new MatchClient(code, key, deps(new MemStore()));
    this.client.since = () => this.session?.knownSeq ?? 0;
    this.client.onEvents = (evs) => {
      this.bytesIn += JSON.stringify(evs).length;
      if (!this.session && evs.length) this.session = new MatchSession(COURSE!, code, null, []);
      if (this.session && !this.session.receive(evs)) this.client.resync();
      while (this.session?.applyNext()) { /* shown at once */ }
    };
  }
}

function robotMove(r: Round, rng: Rng): Action {
  if (r.pending) {
    const out = r.reliefOutcome(r.pending);
    if (out.kind === 'rest') return { t: 'relief', hole: r.holeIndex, after: { ...holeSnapOf(r), pending: null }, penalty: 0, label: 'as it lies' };
    const options = 'options' in out ? out.options : 'area' in out ? [out.area] : [];
    const area = options[options.length - 1];
    const pt = suggestDrop(r.courseCtx(), area) ?? area.center;
    const before = holeSnapOf(r);
    r.applyRelief(area, pt);
    const after = holeSnapOf(r);
    restoreHole(r, before);
    return { t: 'relief', hole: r.holeIndex, after, penalty: area.penalty, label: area.label };
  }
  const club = r.autoClub();
  const putt = club.kind === 'putter';
  const scale = putt ? r.autoPuttScale() : r.autoSwingScale(club);
  const d = r.distToPin();
  const power = putt ? Math.min(1, (d * 1.05 + 0.25) / scale) : Math.max(0.15, Math.min(1, (d * 0.97) / Math.max(1, r.carryFor(club, scale))));
  const meter = meterFor(power, (rng.next() - 0.5) * 3, putt || scale < 1);
  const shot = r.plan(club.id, r.defaultAim(club, scale), meter, 0, scale);
  const sim = r.simulate(shot);
  const after = r.whenSettled(shot, sim, (settled, o) => holeSnapOf(settled, o.kind === 'holed'));
  return { t: 'stroke', hole: r.holeIndex, after, shot: shotInfoOf(shot, meter.power), path: encodePath(sim) };
}

describe.skipIf(!URL0)('live match play over the real server (MATCH_URL)', () => {
  it('two games play a 4-hole match over WebSockets, one of them dropping off twice', async () => {
    const c = COURSE!;
    const holes = [1, 2, 3, 4];
    const seed = 4242;
    const cfg: MatchConfig = {
      protocol: PROTOCOL, courseId: c.json.id, courseVersion: 'live-test', tee: c.json.defaultTee, holes, difficulty: 'normal', seed,
      pins: roundPins(c, c.json.defaultTee, holes.map((h) => courseHoleFor(h, c.json.holes.length)), seed), startedAt: new Date().toISOString(),
    };
    const res = await fetch(`${URL0}/api/matches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cfg, player: { name: 'charlie', lefty: false }, key: 'livetestkeyaaaa1' }) });
    const made = (await res.json()) as { ok: boolean; code: string };
    expect(made.ok).toBe(true);
    const info = await (await fetch(`${URL0}/api/match/${made.code}/info`)).json();
    expect(info).toMatchObject({ exists: true, players: ['charlie', null] });

    const games = [new LiveGame(made.code, 'livetestkeyaaaa1'), new LiveGame(made.code, 'livetestkeybbbb2')];
    for (const g of games) g.client.start();
    await until(() => games.every((g) => g.client.status === 'online' && g.session !== null), 15_000, 'both online');
    expect(games[0].client.seat).toBe(0);
    expect((await games[1].client.send({ t: 'join', player: { name: 'kevin', lefty: true } })).ok).toBe(true);
    await until(() => games[1].client.seat === 1 && games.every((g) => g.session!.state.phase === 'playing'), 10_000, 'joined');

    const rng = new Rng(seed);
    let moves = 0, drops = 0;
    const t0 = Date.now();
    while (games[0].session!.state.phase !== 'finished') {
      if (Date.now() - t0 > 120_000) throw new Error('match took too long');
      // both games must agree before anyone moves (as the game waits until it has shown everything); the
      // state is read after that (read before, it could be one event old after a reconnect: the wrong player moved)
      await until(() => games.every((g) => g.session!.seq === Math.max(...games.map((h) => h.session!.knownSeq)) && g.session!.idle), 10_000, 'in step');
      const s = games[0].session!.state;
      if (s.phase === 'playing' && (!s.ready[0] || !s.ready[1])) {
        await Promise.all(([0, 1] as Seat[]).filter((k) => !s.ready[k]).map((k) => games[k].client.send({ t: 'ready', hole: s.hole })));
        continue;
      }
      const who = toPlay(s)!;
      const g = games[who];
      const a = robotMove(g.session!.rounds[who]!, rng);
      if (a.t === 'relief') drops++;
      const r = await g.client.send(a);
      expect(r, `move ${moves + 1} by ${who}: ${JSON.stringify(r)} (seq ${games.map((x) => x.session!.seq)})`).toMatchObject({ ok: true });
      moves++;
      // the line drops (a phone locking) twice during the match; the game reconnects and catches up
      if (moves === 5 || moves === 12) {
        const other = games[who === 0 ? 1 : 0];
        (other.client as unknown as { ws: WebSocket | null }).ws?.close();
        await until(() => other.client.status === 'online', 15_000, 'reconnect');
      }
    }
    await until(() => games.every((g) => g.session!.state.phase === 'finished' && g.session!.idle), 10_000, 'both finished');
    expect(games[0].session!.state).toEqual(games[1].session!.state);
    for (const k of [0, 1] as Seat[]) expect(games[0].session!.rounds[k]!.scores).toEqual(games[1].session!.rounds[k]!.scores);
    const final = await (await fetch(`${URL0}/api/match/${made.code}/info`)).json();
    expect(final).toMatchObject({ phase: 'finished' });
    // a late watcher gets the whole match, without the flights of finished holes
    const late = new LiveGame(made.code, 'livetestkeycccc3');
    late.client.start();
    await until(() => late.session?.state.phase === 'finished' && late.session.idle, 10_000, 'late watcher');
    expect(late.session!.state).toEqual(games[0].session!.state);
    expect(late.client.seat).toBeNull();
    console.log(JSON.stringify({ code: made.code, moves, drops, outcome: final.status, bytesIn: games.map((x) => x.bytesIn), lateBytes: late.bytesIn, ms: Date.now() - t0 }));
    for (const x of [...games, late]) x.client.stop();
  }, 180_000);

  it('the HTTP route works where WebSockets are refused (polling)', async () => {
    const c = COURSE!;
    const cfg: MatchConfig = {
      protocol: PROTOCOL, courseId: c.json.id, courseVersion: 'live-test', tee: c.json.defaultTee, holes: [1], difficulty: 'easy', seed: 7,
      pins: roundPins(c, c.json.defaultTee, [1], 7), startedAt: new Date().toISOString(),
    };
    const made = (await (await fetch(`${URL0}/api/matches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cfg, player: { name: 'ann', lefty: false }, key: 'livetestkeydddd4' }) })).json()) as { code: string };
    const act = async (key: string, cid: string, action: Action) => (await fetch(`${URL0}/api/match/${made.code}/act`, { method: 'POST', body: JSON.stringify({ key, cid, action }) })).json();
    expect(await act('livetestkeyeeee5', 'cid000001', { t: 'join', player: { name: 'bert', lefty: false } })).toMatchObject({ type: 'ack', seq: 2 });
    expect(await act('livetestkeyeeee5', 'cid000001', { t: 'join', player: { name: 'bert', lefty: false } })).toMatchObject({ type: 'ack', seq: 2 }); // the same move again
    expect(await act('livetestkeyeeee5', 'cid000002', { t: 'ready', hole: 3 })).toMatchObject({ type: 'nack', code: 'wrong_hole' });
    const evs = (await (await fetch(`${URL0}/api/match/${made.code}/events?since=0`)).json()) as { events: Logged[] };
    expect(evs.events.map((e) => e.t)).toEqual(['created', 'joined']);
    expect((await fetch(`${URL0}/api/match/${made.code}/ws`)).status).toBe(426); // not a WebSocket request
    expect((await fetch(`${URL0}/api/match/zzzzzz/info`)).status).toBe(404);
  });
});

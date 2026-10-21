// The live match server (src/server/matchRoom.ts) and the game's line to it
// (src/net/matchClient.ts), joined by a fake network that can drop
// connections, lose answers and refuse WebSockets: whatever happens on the
// line, both games end up with the server's log, each move counted once.

import { describe, expect, it } from 'vitest';
import { MatchRoomCore, RoomHost, RoomSocket, RoomStorage, SocketInfo } from '../../src/server/matchRoom';
import { createMatch, MatchEnv, newMatchCode, toMatch } from '../../src/server/matchRoutes';
import { ClientDeps, KeyValue, MatchClient, WebSocketLike } from '../../src/net/matchClient';
import { MatchSession } from '../../src/systems/match/session';
import { Action, HoleSnap, Logged, MatchConfig, PING, PONG, PROTOCOL, Seat } from '../../src/systems/match/types';
import { loadCourseFiles } from './helpers';

const COURSE = loadCourseFiles('oswego_lake');
const KEY_A = 'aaaabbbbccccdddd', KEY_B = 'eeeeffffgggghhhh', KEY_C = 'jjjjkkkkmmmmnnnn';
const PIN: [number, number] = [COURSE.json.holes[0].pin[0], COURSE.json.holes[0].pin[1]];

function cfg(holes = 2): MatchConfig {
  return {
    protocol: PROTOCOL, courseId: COURSE.json.id, courseVersion: 'v1', tee: COURSE.json.defaultTee, holes: Array.from({ length: holes }, (_, i) => i + 1),
    difficulty: 'normal', seed: 99, pins: Array.from({ length: holes }, () => PIN), startedAt: '2026-10-21T12:00:00.000Z',
  };
}

// ------------------------------------------------------------------ fakes
class FakeStorage implements RoomStorage {
  m = new Map<string, unknown>();
  alarm: number | null = null;
  writes = 0;
  async get<T>(k: string) { return structuredClone(this.m.get(k)) as T | undefined; }
  async put(e: Record<string, unknown>) { for (const [k, v] of Object.entries(e)) { this.m.set(k, structuredClone(v)); this.writes++; } }
  async list<T>(o: { prefix: string; start?: string; limit?: number }) {
    const keys = [...this.m.keys()].filter((k) => k.startsWith(o.prefix) && (!o.start || k >= o.start)).sort().slice(0, o.limit ?? Infinity);
    return new Map(keys.map((k) => [k, structuredClone(this.m.get(k)) as T]));
  }
  async deleteAll() { this.m.clear(); this.alarm = null; }
  async setAlarm(t: number) { this.alarm = t; }
}

/** The server's end of a connection. */
class ServerEnd implements RoomSocket {
  inf: SocketInfo | null = null;
  open = true;
  peer: ClientEnd | null = null;
  constructor(private net: FakeNet) {}
  send(t: string) { if (!this.open) throw new Error('closed'); this.net.deliver(() => this.peer?.receive(t)); }
  close(code = 1000) { if (!this.open) return; this.open = false; this.net.deliver(() => this.peer?.closedByServer(code)); }
  info() { return this.inf; }
  setInfo(i: SocketInfo) { this.inf = structuredClone(i); }
}

/** The game's end: a WebSocket as the browser has it. */
class ClientEnd implements WebSocketLike {
  readyState = 0;
  onopen: WebSocketLike['onopen'] = null;
  onmessage: WebSocketLike['onmessage'] = null;
  onclose: WebSocketLike['onclose'] = null;
  onerror: WebSocketLike['onerror'] = null;
  server: ServerEnd | null = null;
  constructor(private net: FakeNet, readonly url: string) { net.dial(this); }
  send(d: string) {
    if (this.readyState !== 1) throw new Error('not open');
    this.net.sentByClients.push(d);
    if (this.net.dropNextAct && d.includes('"type":"act"')) { this.net.dropNextAct = false; this.net.deliver(() => this.net.cut(this)); return; }
    const s = this.server!;
    if (d === PING) { this.net.deliver(() => this.receive(PONG)); return; } // the auto-response
    this.net.deliver(() => this.net.core.message(s, d));
    if (this.net.cutAfterAct && d.includes('"type":"act"')) { this.net.cutAfterAct = false; this.net.deliver(() => this.net.cut(this), 1); }
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    const s = this.server;
    if (s && s.open) { s.open = false; this.net.deliver(() => this.net.core.closed(s)); }
    this.net.deliver(() => this.onclose?.({ code }));
  }
  receive(t: string) { if (this.readyState === 1) this.onmessage?.({ data: t }); }
  closedByServer(code: number) { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({ code }); }
}

class FakeNet {
  core!: MatchRoomCore;
  storage = new FakeStorage();
  servers: ServerEnd[] = [];
  queue: { at: number; f: () => void }[] = [];
  timers: { at: number; f: () => void; id: number }[] = [];
  now = 1_000_000;
  nextId = 1;
  refuseWs = false;
  dropNextAct = false;   // the next move is lost on the way (and the line goes down)
  cutAfterAct = false;   // the line goes down just after a move reaches the server (its answer is lost)
  sentByClients: string[] = [];
  host: RoomHost;
  constructor() {
    let rnd = 0.3;
    this.host = {
      storage: this.storage,
      sockets: () => this.servers.filter((s) => s.open),
      accept: (info) => { const s = new ServerEnd(this); s.inf = info; this.servers.push(s); this.pendingServer = s; return new Response(null, { status: 200 }); },
      now: () => this.now,
      random: () => (rnd = (rnd * 9301 + 0.49297) % 1),
    };
    this.core = new MatchRoomCore(this.host);
  }
  private pendingServer: ServerEnd | null = null;
  deliver(f: () => void, delay = 0) { this.queue.push({ at: delay, f }); }
  dial(c: ClientEnd) {
    this.deliver(async () => {
      if (this.refuseWs) { c.readyState = 3; c.onclose?.({ code: 1006 }); return; }
      const code = c.url.split('/api/match/')[1].split('/')[0];
      const res = await toMatch(this.env, new Request(`http://x/api/match/${code}/ws`, { headers: { Upgrade: 'websocket' } }), [code, 'ws']);
      if (res.status !== 200 || !this.pendingServer) { c.readyState = 3; c.onclose?.({ code: 1006 }); return; }
      const s = this.pendingServer;
      this.pendingServer = null;
      s.peer = c;
      c.server = s;
      c.readyState = 1;
      c.onopen?.({});
    });
  }
  /** The line between a game and the server goes down (both ends see it close). */
  cut(c: ClientEnd) {
    const s = c.server;
    if (s && s.open) { s.open = false; this.core.closed(s); }
    if (c.readyState !== 3) { c.readyState = 3; c.onclose?.({ code: 1006 }); }
  }
  /** One match room behind a MATCH binding (every code reaches this one object). */
  get env(): MatchEnv {
    return { MATCH: { idFromName: (n) => n, get: () => ({ fetch: (input: Request | string, init?: RequestInit) => this.core.fetch(typeof input === 'string' ? new Request(input, init) : input) }) } };
  }
  fetch = async (url: string, init?: RequestInit) => {
    const u = new URL(url, 'http://x');
    const parts = u.pathname.replace(/^\/api\/match\//, '').split('/');
    return toMatch(this.env, new Request(u, init), parts);
  };
  /** Run everything queued (messages, then due timers) until nothing is left before `ms` from now. */
  async run(ms = 0) {
    const end = this.now + ms;
    const flush = () => new Promise<void>((r) => setImmediate(r)); // let fetches and other promises finish
    for (let guard = 0; guard < 100_000; guard++) {
      await flush();
      if (this.queue.length) {
        const { f } = this.queue.shift()!;
        await f();
        continue;
      }
      this.timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const t = this.timers[0];
      if (!t || t.at > end) break;
      this.timers.shift();
      this.now = Math.max(this.now, t.at);
      t.f();
      await flush();
    }
    this.now = Math.max(this.now, end);
  }
  deps(store?: KeyValue): ClientDeps {
    return {
      base: 'http://x', WebSocket: class { constructor(url: string) { return new ClientEnd(net(), url); } } as unknown as ClientDeps['WebSocket'],
      fetch: this.fetch, store,
      setTimeout: (f, ms) => { const id = this.nextId++; this.timers.push({ at: this.now + ms, f, id }); return id; },
      clearTimeout: (h) => { this.timers = this.timers.filter((t) => t.id !== h); },
      now: () => this.now,
      random: () => 0.5,
    };
  }
}
let current: FakeNet;
const net = () => current;

class MemStore implements KeyValue {
  m = new Map<string, string>();
  get(k: string) { return this.m.get(k) ?? null; }
  set(k: string, v: string) { this.m.set(k, v); }
  del(k: string) { this.m.delete(k); }
}

/** A game: a client and the session it feeds (moves are synthetic: no physics needed here). */
class Game {
  client: MatchClient;
  session: MatchSession | null = null;
  log: Logged[] = [];
  refused: string[] = [];
  constructor(n: FakeNet, readonly code: string, key: string, readonly store = new MemStore()) {
    this.client = new MatchClient(code, key, n.deps(store));
    this.client.since = () => (this.session ? this.session.knownSeq : this.log.length);
    this.client.onEvents = (evs) => {
      for (const e of evs) if (e.seq === this.log.length + 1) this.log.push(e);
      if (!this.session && this.log.length) this.session = new MatchSession(COURSE, code, null, []);
      if (this.session && !this.session.receive(evs)) this.client.resync();
      while (this.session?.applyNext()) { /* shown at once */ }
    };
    this.client.onRefused = (_a, code2) => this.refused.push(code2);
  }
}

function snap(hole: number, strokes: number, d: number, holed = false): HoleSnap {
  const ball = holed ? { x: PIN[0], y: PIN[1], teedUp: false } : { x: PIN[0], y: PIN[1] - d, teedUp: false };
  return { hole, tally: { strokes, putts: 0, penalties: 0, fairway: null, reachedGreenAt: null }, ball, prev: ball, shotNo: strokes, shotSeq: strokes, pending: null, holed };
}
const shot = { club: 'dr', spec: { x: 0, y: 0, z: 0, aim: 0 }, strike: null, putt: null, puttDist: null, gustMph: 0, scale: 1, power: 1 };
const strokeA = (hole: number, n: number, d: number, holed = false): Action => ({ t: 'stroke', hole, after: snap(hole, n, d, holed), shot, path: '' });

async function newMatch(n: FakeNet, holes = 2): Promise<string> {
  const res = await createMatch(n.env, JSON.stringify({ cfg: cfg(holes), player: { name: 'charlie', lefty: false }, key: KEY_A }), () => 0.42);
  const j = (await res.json()) as { ok: boolean; code: string };
  expect(j.ok).toBe(true);
  return j.code;
}

// ------------------------------------------------------------------ tests
describe('match server: making and joining a match', () => {
  it('makes a match under a code, tells anyone about it, and refuses a second one with the same code', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    expect(code).toMatch(/^[a-km-np-z2-9]{6}$/);
    expect(newMatchCode(() => 0.42)).toBe(code);
    const info = await (await current.fetch(`http://x/api/match/${code}/info`)).json();
    expect(info).toMatchObject({ exists: true, players: ['charlie', null], phase: 'waiting', courseId: COURSE.json.id });
    // the same code again (a clash): the route tries another
    const again = await createMatch(current.env, JSON.stringify({ cfg: cfg(), player: { name: 'sam', lefty: false }, key: KEY_C }), (() => { let k = 0; return () => (k++ < 6 ? 0.42 : 0.9); })());
    expect(((await again.json()) as { code: string }).code).not.toBe(code);
    expect(current.storage.alarm).toBeGreaterThan(current.now);
  });

  it('needs a name (not "player") and a well-formed match', async () => {
    current = new FakeNet();
    const bad = async (body: unknown) => (await createMatch(current.env, JSON.stringify(body))).status;
    expect(await bad({ cfg: cfg(), player: { name: 'player', lefty: false }, key: KEY_A })).toBe(400);
    expect(await bad({ cfg: { ...cfg(), protocol: 99 }, player: { name: 'charlie', lefty: false }, key: KEY_A })).toBe(400);
    expect(await bad({ cfg: cfg(), player: { name: 'charlie', lefty: false }, key: 'short' })).toBe(400);
    expect((await createMatch({}, '{}')).status).toBe(503); // not set up on this site
    expect((await toMatch(current.env, new Request('http://x/api/match/LLLL/info'), ['LLLL'])).status).toBe(400);
  });

  it('a friend joins over the WebSocket; the creator cannot join their own match; a third person only watches', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    const a = new Game(current, code, KEY_A), b = new Game(current, code, KEY_B), c = new Game(current, code, KEY_C);
    for (const g of [a, b, c]) g.client.start();
    await current.run(10);
    expect(a.client.seat).toBe(0);
    expect(b.client.seat).toBeNull();
    expect(a.client.status).toBe('online');
    const own = a.client.send({ t: 'join', player: { name: 'charlie', lefty: false } });
    await current.run(5);
    expect(await own).toMatchObject({ ok: false, code: 'own_match' });
    const pending = b.client.send({ t: 'join', player: { name: 'kevin', lefty: true } });
    await current.run(10);
    expect(await pending).toMatchObject({ ok: true, seq: 2 });
    expect(b.client.seat).toBe(1);
    expect(a.client.online).toEqual([true, true]);
    const third = c.client.send({ t: 'join', player: { name: 'sam', lefty: false } });
    await current.run(5);
    expect(await third).toMatchObject({ ok: false, code: 'full' });
    for (const g of [a, b, c]) expect(g.session!.state.players.map((p) => p?.name)).toEqual(['charlie', 'kevin']);
    const r = c.client.send({ t: 'ready', hole: 0 });
    await current.run(1);
    expect(await r).toMatchObject({ ok: false, code: 'not_player' });
  });
});

describe('match server: playing over a line that drops', () => {
  async function twoPlayers(holes = 2) {
    current = new FakeNet();
    const code = await newMatch(current, holes);
    const a = new Game(current, code, KEY_A), b = new Game(current, code, KEY_B);
    a.client.start(); b.client.start();
    await current.run(10);
    void b.client.send({ t: 'join', player: { name: 'kevin', lefty: false } });
    await current.run(10);
    void a.client.send({ t: 'ready', hole: 0 }); void b.client.send({ t: 'ready', hole: 0 });
    await current.run(10);
    return { code, a, b };
  }
  const honourOf = (g: Game) => g.session!.state.honour;
  const gameOf = (seat: Seat, a: Game, b: Game) => (seat === 0 ? a : b);

  it('every move reaches both games once; a refused move is answered with the reason', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b), second = first === a ? b : a;
    const wrong = await (async () => { const p = second.client.send(strokeA(0, 1, 150)); await current.run(5); return p; })();
    expect(wrong).toMatchObject({ ok: false, code: 'not_your_turn' });
    void first.client.send(strokeA(0, 1, 150));
    await current.run(5);
    void second.client.send(strokeA(0, 1, 120));
    await current.run(5);
    expect(a.session!.state).toEqual(b.session!.state);
    expect(a.session!.state.p.map((p) => p.strokes)).toEqual([1, 1]);
    expect(a.log.map((e) => e.seq)).toEqual(a.log.map((_, i) => i + 1));
  });

  it('a game that drops off mid-hole catches up when it comes back, and sees the moves it missed', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b), second = first === a ? b : a;
    void first.client.send(strokeA(0, 1, 150));
    await current.run(5);
    current.cut(current.servers.find((s) => s.open && s.peer === (second.client as unknown as { ws: ClientEnd }).ws)!.peer!);
    await current.run(1);
    expect(second.client.status).toBe('connecting');
    expect(first.client.online).toEqual(second === b ? [true, false] : [false, true]); // the other game sees it go
    // the line is down while the second player plays: the move waits, kept, and goes when the line is back
    const p = second.client.send(strokeA(0, 1, 140));
    expect(second.store.m.get(`golf:match:${second.client.code}:outbox`)).toContain('"stroke"');
    await current.run(3000); // the reconnect (backoff) and the catch-up
    expect(second.client.status).toBe('online');
    expect(await p).toMatchObject({ ok: true });
    expect(second.store.m.has(`golf:match:${second.client.code}:outbox`)).toBe(false);
    expect(a.session!.state).toEqual(b.session!.state);
    expect(a.session!.state.p.map((x) => x.strokes)).toEqual([1, 1]);
  });

  it('a move whose answer is lost is sent again and still counts once', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    current.cutAfterAct = true;
    const p = first.client.send(strokeA(0, 1, 150));
    await current.run(3000);
    expect(await p).toMatchObject({ ok: true });
    const acts = current.sentByClients.filter((d) => d.includes('"type":"act"') && d.includes('"stroke"'));
    expect(acts.length).toBe(2); // sent twice
    expect(a.session!.state.p[honourOf(a)].strokes).toBe(1); // counted once
    expect(a.log.filter((e) => e.t === 'stroke')).toHaveLength(1);
    expect(a.session!.state).toEqual(b.session!.state);
  });

  it('a move lost on the way is sent again after the reconnect', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    current.dropNextAct = true;
    const p = first.client.send(strokeA(0, 1, 150));
    await current.run(3000);
    expect(await p).toMatchObject({ ok: true });
    expect(b.session!.state.p[honourOf(a)].strokes).toBe(1);
  });

  it('a move made just before a reload is sent by the reloaded page', async () => {
    const { code, a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    const key = first === a ? KEY_A : KEY_B;
    current.dropNextAct = true;
    void first.client.send(strokeA(0, 1, 150));
    await current.run(1);
    first.client.stop(); // the tab closes
    const again = new Game(current, code, key, first.store); // the page again, with its storage
    again.client.start();
    await current.run(100);
    expect(again.session!.state.p[honourOf(a)].strokes).toBe(1);
    expect(again.client.unanswered).toEqual([]);
  });

  it('with no WebSocket at all, the game plays over HTTP', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    current.refuseWs = true;
    const a = new Game(current, code, KEY_A), b = new Game(current, code, KEY_B);
    a.client.start(); b.client.start();
    await current.run(8000);
    expect(a.client.status).toBe('polling');
    void b.client.send({ t: 'join', player: { name: 'kevin', lefty: false } });
    await current.run(3000);
    void a.client.send({ t: 'ready', hole: 0 }); void b.client.send({ t: 'ready', hole: 0 });
    await current.run(3000);
    expect(a.session!.state.ready).toEqual([true, true]);
    expect(b.session!.state).toEqual(a.session!.state);
    // the WebSocket comes back: the games go back to it
    current.refuseWs = false;
    await current.run(61_000);
    expect(a.client.status).toBe('online');
  });

  it('a quiet line is dropped and opened again; keep-alives are answered without the room', async () => {
    const { a } = await twoPlayers();
    const before = current.sentByClients.filter((d) => d === '{"type":"ping"}').length;
    await current.run(16_000);
    expect(current.sentByClients.filter((d) => d === '{"type":"ping"}').length).toBeGreaterThan(before);
    expect(a.client.status).toBe('online');
  });

  it('catching up late in a match leaves out the flights of holes already over', async () => {
    const { code, a, b } = await twoPlayers(3);
    const playHole = async (h: number) => {
      const s = a.session!.state;
      const first = gameOf(s.honour, a, b), second = first === a ? b : a;
      void first.client.send({ ...strokeA(h, 1, 150), path: 'x'.repeat(100) } as Action); await current.run(5);
      void second.client.send({ ...strokeA(h, 1, 140), path: 'x'.repeat(100) } as Action); await current.run(5);
      void first.client.send(strokeA(h, 2, 0, true)); await current.run(5);
      void second.client.send(strokeA(h, 2, 0, true)); await current.run(5);
      void a.client.send({ t: 'ready', hole: h + 1 }); void b.client.send({ t: 'ready', hole: h + 1 });
      await current.run(5);
    };
    await playHole(0);
    await playHole(1);
    const late = new Game(current, code, KEY_C);
    late.client.start();
    await current.run(50);
    expect(late.session!.state).toEqual(a.session!.state);
    const strokes = late.log.filter((e): e is Extract<Logged, { t: 'stroke' }> => e.t === 'stroke');
    expect(strokes.every((e) => e.path === '')).toBe(true);
  });

  it('two moves arriving at the same moment are both counted, in turn', async () => {
    const { a } = await twoPlayers();
    const first: Seat = a.session!.state.honour;
    const keyOf = (k: Seat) => (k === 0 ? KEY_A : KEY_B);
    const [r1, r2] = await Promise.all([
      current.core.act(keyOf(first), 'm1aaaa', strokeA(0, 1, 150)),
      current.core.act(keyOf(first === 0 ? 1 : 0), 'm2aaaa', strokeA(0, 1, 140)),
    ]);
    expect([r1.type, r2.type]).toEqual(['ack', 'ack']);
    expect([(r1 as { seq: number }).seq, (r2 as { seq: number }).seq]).toEqual([5, 6]);
    const ids = [...(await current.storage.list<Logged>({ prefix: 'e:' })).values()].map((e) => e.seq);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('a match nobody plays for two weeks is deleted, and its games are told', async () => {
    const { a } = await twoPlayers();
    expect(current.storage.alarm! - current.now).toBeGreaterThan(13 * 86_400_000);
    await current.core.alarm();
    await current.run(10);
    expect(current.storage.m.size).toBe(0);
    expect(a.client.status).toBe('gone');
  });
});

// The live match server (src/server/matchRoom.ts) and the game's line to it
// (src/net/matchClient.ts), joined by a fake network that can drop
// connections, lose answers and refuse WebSockets: whatever happens on the
// line, both games end up with the server's log, each move counted once.

import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { MatchRoomCore, RoomHost, RoomSocket, RoomStorage, SocketInfo } from '../../src/server/matchRoom';
import { createMatch, MatchEnv, newMatchCode, toMatch } from '../../src/server/matchRoutes';
import { D1Like, D1Statement, handleHide, handlePost, handleRecentGet, resetFeedCache, resetSchemaCache } from '../../src/server/scores';
import { ClientDeps, KeyValue, MatchClient, WebSocketLike } from '../../src/net/matchClient';
import { MatchSession } from '../../src/systems/match/session';
import { waitingOn } from '../../src/systems/match/rules';
import { Action, CHAT, CLOCK, CLOSE, HoleSnap, Logged, MatchConfig, MatchState, PING, PONG, PROTOCOL, RULES, Seat } from '../../src/systems/match/types';
import { matchFeedText, MatchFeedRow } from '../../src/save/feed';
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
  failPuts = 0; // the next writes fail (a storage error)
  async get<T>(k: string) { return structuredClone(this.m.get(k)) as T | undefined; }
  async put(e: Record<string, unknown>) {
    if (this.failPuts > 0) { this.failPuts--; throw new Error('storage unavailable'); }
    for (const [k, v] of Object.entries(e)) { this.m.set(k, structuredClone(v)); this.writes++; }
  }
  alarmsSet = 0;
  async deleteAll() { this.m.clear(); this.alarm = null; }
  async getAlarm() { return this.alarm; }
  async setAlarm(t: number) { this.alarm = t; this.alarmsSet++; }
}

/** The server's end of a connection. */
class ServerEnd implements RoomSocket {
  inf: SocketInfo | null = null;
  open = true;
  peer: ClientEnd | null = null;
  /** when the platform last answered a keep-alive on it (Cloudflare's auto-response timestamp) */
  pinged: number | null = null;
  constructor(private net: FakeNet) {}
  send(t: string) { if (!this.open) throw new Error('closed'); this.net.deliver(() => this.peer?.receive(t)); }
  /** closed by the server: gone once the game's end answers; a socket with nobody at the other end lingers (as dead ones do) */
  close(code = 1000) {
    if (!this.open) return;
    if (!this.peer) return;
    this.open = false;
    this.net.deliver(() => this.peer?.closedByServer(code));
  }
  info() { return this.inf; }
  setInfo(i: SocketInfo) { this.inf = structuredClone(i); }
  pingedAt() { return this.pinged; }
}

/** The game's end: a WebSocket as the browser has it. */
class ClientEnd implements WebSocketLike {
  readyState = 0;
  onopen: WebSocketLike['onopen'] = null;
  onmessage: WebSocketLike['onmessage'] = null;
  onclose: WebSocketLike['onclose'] = null;
  onerror: WebSocketLike['onerror'] = null;
  server: ServerEnd | null = null;
  /** this line is dead while it looks open (a phone back from sleep): nothing gets through either way */
  deaf = false;
  constructor(private net: FakeNet, readonly url: string) { net.dial(this); }
  send(d: string) {
    if (this.readyState !== 1) throw new Error('not open');
    this.net.sentByClients.push(d);
    if (this.net.dropNextAct && d.includes('"type":"act"')) { this.net.dropNextAct = false; this.net.deliver(() => this.net.cut(this)); return; }
    if (this.net.swallowNextAct && d.includes('"type":"act"')) { this.net.swallowNextAct = false; return; } // lost, the line stays up
    const s = this.server!;
    if (this.deaf || this.net.deaf) return;
    if (this.net.swallowHello && d.includes('"type":"hello"')) return; // a proxy that lets the socket open and nothing through
    if (d === PING) { s.pinged = this.net.now; this.net.deliver(() => this.receive(PONG)); return; } // the auto-response
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
  receive(t: string) { if (this.readyState === 1 && !this.deaf && !this.net.deaf) this.onmessage?.({ data: t }); }
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
  deaf = false;          // every socket looks open and nothing gets through (a phone back from sleep)
  swallowNextAct = false; // the next move over a WebSocket is lost, and the line stays up
  swallowHello = false;  // sockets open, but their hello never arrives
  loseActAnswers = 0;    // the next HTTP moves reach the server, and their answers are lost
  throttle = 0;          // timers run only on multiples of this (a background tab: once a minute)
  dials = 0;             // WebSockets opened by the games
  hidden = false;        // the games' pages are out of sight
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
    this.dials++;
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
  /** the leaderboard's database, when a test gives one */
  db: D1Like | undefined = undefined;
  /** One match room behind a MATCH binding (every code reaches this one object). */
  get env(): MatchEnv {
    return { DB: this.db, MATCH: { idFromName: (n) => n, get: () => ({ fetch: (input: Request | string, init?: RequestInit) => this.core.fetch(typeof input === 'string' ? new Request(input, init) : input) }) } };
  }
  /** The match's object is evicted from memory and starts again from its storage (its sockets stay, as with hibernation). */
  restart() {
    this.core = new MatchRoomCore(this.host);
  }
  /** What the object has stored (one record). */
  get stored(): { state: MatchState; log: Logged[] } & Record<string, unknown> {
    return this.storage.m.get('m') as never;
  }
  fetch = async (url: string, init?: RequestInit) => {
    const u = new URL(url, 'http://x');
    const parts = u.pathname.replace(/^\/api\/match\//, '').split('/');
    const res = await toMatch(this.env, new Request(u, init), parts);
    if (this.loseActAnswers > 0 && parts[1] === 'act') { this.loseActAnswers--; throw new TypeError('network error'); }
    return res;
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
      setTimeout: (f, ms) => {
        const id = this.nextId++;
        const at = this.throttle ? Math.ceil((this.now + ms) / this.throttle) * this.throttle : this.now + ms;
        this.timers.push({ at, f, id });
        return id;
      },
      clearTimeout: (h) => { this.timers = this.timers.filter((t) => t.id !== h); },
      now: () => this.now,
      random: () => 0.5,
      hidden: () => this.hidden,
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
  /** The move clock as the game shows it (as src/match/live.ts works it out): how long the move waited on has taken. */
  clock(): { elapsed: number } | null {
    const s = this.session?.state;
    return s && waitingOn(s) ? { elapsed: this.client.serverNow() - s.clock.at } : null;
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

/** A new match on a fresh network, both players in it and at the first tee. */
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
/** A game's current WebSocket (the fake's end of it). */
const endOf = (g: Game) => (g.client as unknown as { ws: ClientEnd | null }).ws!;
const upgrade = () => new Request('https://match/ws', { headers: { Upgrade: 'websocket' } });

describe('match server: playing over a line that drops', () => {

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
    current.cut(endOf(second));
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
    // the first hole's flights are left out; the hole just finished keeps them (its result panel's "rewatch")
    expect(strokes.filter((e) => e.hole === 0).every((e) => e.path === '')).toBe(true);
    expect(strokes.filter((e) => e.hole === 1 && e.after.tally.strokes === 1).every((e) => e.path.length === 100)).toBe(true);
    // and they aren't stored either (the record stays small)
    const kept = current.stored.log.filter((e): e is Extract<Logged, { t: 'stroke' }> => e.t === 'stroke');
    expect(kept.filter((e) => e.hole === 0).every((e) => e.path === '')).toBe(true);
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
    expect(current.stored.log.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('a match nobody plays for two weeks is deleted, and its games are told', async () => {
    const { a } = await twoPlayers();
    expect(current.storage.alarm! - current.now).toBeGreaterThan(13 * 86_400_000);
    // its alarm (a storage write each time) was set once for the four entries, not on every move
    expect(current.storage.alarmsSet).toBe(1);
    await current.core.alarm();
    await current.run(10);
    expect(current.storage.m.size).toBe(0);
    expect(a.client.status).toBe('gone');
  });
});

describe('match server: review fixes', () => {
  it('over HTTP a game learns its seat, counts as there, and sends a move again when its answer is lost', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    current.refuseWs = true;
    const a = new Game(current, code, KEY_A), b = new Game(current, code, KEY_B);
    a.client.start(); b.client.start();
    await current.run(8000);
    expect(a.client.status).toBe('polling');
    expect(a.client.seat).toBe(0); // the HTTP hello
    const seats: Seat[] = [];
    b.client.onSeat = (k) => seats.push(k);
    void b.client.send({ t: 'join', player: { name: 'kevin', lefty: false } });
    await current.run(3000);
    expect(b.client.seat).toBe(1); // the move's answer says it
    expect(seats).toEqual([1]);
    expect(a.client.online).toEqual([true, true]); // both asking: both there
    void a.client.send({ t: 'ready', hole: 0 }); void b.client.send({ t: 'ready', hole: 0 });
    await current.run(3000);
    const h = honourOf(a);
    current.loseActAnswers = 1; // the stroke reaches the server; its answer is lost on the way back
    const p = gameOf(h, a, b).client.send(strokeA(0, 1, 150));
    await current.run(6000);
    expect(await p).toMatchObject({ ok: true });
    expect(a.log.filter((e) => e.t === 'stroke')).toHaveLength(1); // sent again, counted once
    expect(b.session!.state).toEqual(a.session!.state);
    // a game that stops asking is soon not "there"
    a.client.stop();
    await current.run(15_000);
    expect(b.client.online).toEqual([false, true]);
  });

  it('sockets that never say who they are make room for a game', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    for (let i = 0; i < 12; i++) await current.core.fetch(upgrade()); // twelve that open and say nothing
    expect(current.host.sockets()).toHaveLength(12);
    expect((await current.core.fetch(upgrade())).status).toBe(429); // no room yet
    current.now += 11_000;
    const a = new Game(current, code, KEY_A);
    a.client.start();
    await current.run(10);
    expect(a.client.status).toBe('online');
    expect(current.host.sockets().filter((x) => !x.info()?.closing)).toHaveLength(1); // the silent ones were closed (they linger: nobody answers)
  });

  it('the same player opening the match in another tab takes it over; the first tab waits until it is looked at', async () => {
    const { code, a, b } = await twoPlayers();
    const a2 = new Game(current, code, KEY_A, a.store); // the same device (same storage), another tab
    a2.client.start();
    await current.run(50);
    expect(a2.client.status).toBe('online');
    expect(a.client.status).toBe('elsewhere');
    const dials = current.dials;
    await current.run(60_000);
    expect(current.dials).toBe(dials); // no tug of war
    current.hidden = true; a.client.poke(); await current.run(50);
    expect(a.client.status).toBe('elsewhere'); // a background tab doesn't take it back
    current.hidden = false; a.client.poke(); await current.run(50);
    expect(a.client.status).toBe('online');
    expect(a2.client.status).toBe('elsewhere');
    expect(b.client.online).toEqual([true, true]);
  });

  it('a game running other rules than the server is told what to do, and stops trying', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    // the server's side: a hello with newer rules
    await current.core.fetch(upgrade());
    const ws = current.servers[current.servers.length - 1];
    const got: string[] = [];
    ws.peer = { receive: (t: string) => got.push(t), closedByServer: (c: number) => got.push(`closed ${c}`) } as unknown as ClientEnd;
    await current.core.message(ws, JSON.stringify({ type: 'hello', key: KEY_A, since: 0, rules: RULES + 1 }));
    await current.run(5);
    expect(got[0]).toContain('"code":"version"');
    expect(got[0]).toContain('needs deploying');
    expect(got).toContain(`closed ${CLOSE.version}`);
    const r = await current.fetch(`http://x/api/match/${code}/act`, { method: 'POST', body: JSON.stringify({ key: KEY_A, cid: 'abcdefg', action: { t: 'ready', hole: 0 }, rules: RULES - 1 }) });
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ type: 'nack', code: 'version' });
    // a game whose rules are older than the server's
    const orig = current.core.message.bind(current.core);
    current.core.message = (sock, raw) => orig(sock, typeof raw === 'string' ? raw.replace(`"rules":${RULES}`, `"rules":${RULES - 1}`) : raw);
    const g = new Game(current, code, KEY_A);
    g.client.start();
    await current.run(100);
    expect(g.client.status).toBe('version');
    expect(g.client.problem).toContain('reload');
    const dials = current.dials;
    await current.run(120_000);
    expect(current.dials).toBe(dials);
  });

  it('a line that dies while looking open is found by its keep-alive and opened again, the missed moves caught up', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b), second = first === a ? b : a;
    const dials = current.dials;
    endOf(second).deaf = true;
    void first.client.send(strokeA(0, 1, 150)); // made while the other game's line is dead
    await current.run(31_000);
    expect(current.dials).toBe(dials + 1);
    expect(second.client.status).toBe('online');
    expect(second.session!.state).toEqual(first.session!.state);
    // back to the page after a sleep: checked at once, found dead within seconds
    endOf(second).deaf = true;
    second.client.poke();
    await current.run(4_500);
    expect(current.dials).toBe(dials + 2);
  });

  it('a background tab whose timers run once a minute keeps its line (it is quiet, not dead)', async () => {
    const { a, b } = await twoPlayers();
    const dials = current.dials;
    current.throttle = 60_000;
    await current.run(5 * 60_000);
    expect(current.dials).toBe(dials);
    expect([a.client.status, b.client.status]).toEqual(['online', 'online']);
  });

  it('a WebSocket that opens and is never answered is given up after 10 s; after three, HTTP', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    current.swallowHello = true;
    const a = new Game(current, code, KEY_A);
    a.client.start();
    await current.run(9_000);
    expect(a.client.status).toBe('connecting');
    await current.run(40_000);
    expect(a.client.status).toBe('polling');
    expect(a.client.seat).toBe(0);
    current.swallowHello = false;
    await current.run(20_000);
    expect(a.client.status).toBe('online');
  });

  it('a move the server could not store is refused with a reason, and can be made again', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    current.storage.failPuts = 1;
    const p = first.client.send(strokeA(0, 1, 150));
    await current.run(10);
    expect(await p).toMatchObject({ ok: false, code: 'server' });
    expect(a.session!.state.p[honourOf(a)].strokes).toBe(0);
    const p2 = first.client.send(strokeA(0, 1, 150));
    await current.run(10);
    expect(await p2).toMatchObject({ ok: true });
    expect(b.session!.state).toEqual(a.session!.state);
  });

  it('a move lost while the line stays up goes again when the game nudges', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    current.swallowNextAct = true;
    const p = first.client.send(strokeA(0, 1, 150));
    await current.run(1000);
    expect(first.client.unanswered).toHaveLength(1); // nothing came back
    first.client.nudge(); // the play scene does this after 8 s in "sending..."
    await current.run(10);
    expect(await p).toMatchObject({ ok: true });
    expect(b.session!.state.p[honourOf(a)].strokes).toBe(1);
  });

  it('a joining game hears its seat before the news of the join (it never sees the match as full)', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    const b = new Game(current, code, KEY_B);
    const order: string[] = [];
    const onEvents = b.client.onEvents;
    b.client.onEvents = (evs, last) => { for (const e of evs) order.push(e.t); onEvents(evs, last); };
    b.client.onSeat = (k) => order.push(`seat ${k}`);
    b.client.start();
    await current.run(10);
    void b.client.send({ t: 'join', player: { name: 'kevin', lefty: false } });
    await current.run(10);
    expect(order).toEqual(['created', 'seat 1', 'joined']);
  });

  it('a move rebuilt by the server carries only its own fields to the other game', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b), second = first === a ? b : a;
    const dirty = { ...strokeA(0, 1, 150), extra: 'x'.repeat(50), by: honourOf(a) === 0 ? 1 : 0 } as unknown as Action;
    void first.client.send(dirty);
    await current.run(10);
    const ev = second.log[second.log.length - 1] as Logged & { extra?: string };
    expect(ev.t).toBe('stroke');
    expect(ev.extra).toBeUndefined();
    expect('by' in ev && ev.by).toBe(honourOf(a)); // the server says who played it, not the game
    const bad = first.client.send({ t: 'stroke', hole: 0, after: { nope: 1 }, shot: {}, path: 1 } as unknown as Action);
    await current.run(10);
    expect(await bad).toMatchObject({ ok: false, code: 'bad_move' });
  });
});

describe('match server: second review fixes', () => {
  it('sockets the server has closed no longer count: the first game after 10 s gets in', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    for (let i = 0; i < 12; i++) await current.core.fetch(upgrade()); // twelve with nobody behind them: they never finish closing
    current.now += 11_000;
    expect((await current.core.fetch(upgrade())).status).toBe(200); // (the fake accepts with 200; Cloudflare's is 101)
    expect(current.host.sockets().length).toBeGreaterThan(12); // the silent ones linger...
    const a = new Game(current, code, KEY_A);
    a.client.start();
    await current.run(10);
    expect(a.client.status).toBe('online'); // ...and don't count
  });

  it('background tabs (timers once a minute) stay "there" for each other, and a third socket closes nobody', async () => {
    const { code, a, b } = await twoPlayers();
    current.throttle = 60_000;
    const seen = new Set<string>();
    const dials = current.dials;
    let opened = 0;
    for (let t = 0; t < 60; t++) {
      await current.run(5_000);
      seen.add(`${a.client.online}|${b.client.online}`);
      // someone opens the link late in a minute, 50-60 s after the tabs' last keep-alive (45 s closed them)
      if (opened < 2 && t > 12 && current.now % 60_000 > 50_000) { new Game(current, code, opened ? KEY_C : 'ppppqqqqrrrrssss').client.start(); opened++; }
    }
    expect(opened).toBe(2);
    expect([...seen]).toEqual(['true,true|true,true']);
    expect(current.dials).toBe(dials + 2); // only the watchers'
  });

  it('a phone that went to sleep (its socket just goes quiet) is shown as gone within about two minutes', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    const a = new Game(current, code, KEY_A);
    a.client.start();
    await current.run(10);
    // kevin joins and opens a socket, which then goes silent (no keep-alives: the phone is asleep)
    const j = await (await current.fetch(`http://x/api/match/${code}/act`, { method: 'POST', body: JSON.stringify({ key: KEY_B, cid: 'joinkevin', action: { t: 'join', player: { name: 'kevin', lefty: false } }, rules: RULES }) })).json();
    expect(j).toMatchObject({ type: 'ack', seat: 1 });
    await current.core.fetch(upgrade());
    const sleeper = current.servers[current.servers.length - 1];
    sleeper.peer = { receive: () => undefined, closedByServer: () => undefined } as unknown as ClientEnd;
    await current.core.message(sleeper, JSON.stringify({ type: 'hello', key: KEY_B, since: 0, rules: RULES }));
    await current.run(1_000);
    expect(a.client.online).toEqual([true, true]);
    await current.run(140_000);
    expect(a.client.online).toEqual([true, false]);
  });

  it('a game whose line stopped for good makes no moves (a swing run out under the panel is not kept for later)', async () => {
    const { code, a, b } = await twoPlayers();
    const a2 = new Game(current, code, KEY_A, a.store); // another tab: the first one steps aside
    a2.client.start();
    await current.run(50);
    expect(a.client.status).toBe('elsewhere');
    const r = await a.client.send(strokeA(0, 1, 150));
    expect(r).toMatchObject({ ok: false, code: 'elsewhere' });
    expect(a.client.unanswered).toEqual([]);
    expect(a.store.m.get(`golf:match:${code}:outbox`)).toBeUndefined();
    void b;
  });
});

// ------------------------------------------------------------------ storage, the clock, results
/** The SQLite stand-in for D1 (as tests/unit/online.test.ts). */
function fakeD1(): D1Like {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): D1Statement => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: (sql: string) => stmt(sql) };
}

const MIN = 60_000;
const keyOf = (k: Seat) => (k === 0 ? KEY_A : KEY_B);
/** The game of the player the match waits on, and of the one waiting. */
function onClock(a: Game, b: Game) {
  const s = a.session!.state;
  const on = s.p && toPlayOf(s);
  return { on: gameOf(on, a, b), waiter: gameOf(on === 0 ? 1 : 0, a, b), onSeat: on, waiterSeat: (on === 0 ? 1 : 0) as Seat };
}
function toPlayOf(s: MatchState): Seat {
  // (the honour on the tee in these tests)
  return s.p[0].strokes === 0 && s.p[1].strokes === 0 ? s.honour : s.p[0].strokes > s.p[1].strokes ? 1 : 0;
}

describe('match server: storage', () => {
  it('a move is one storage write (the whole match is one record); the alarm is set once', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    const w0 = current.storage.writes;
    void first.client.send(strokeA(0, 1, 150));
    await current.run(5);
    expect(current.storage.writes - w0).toBe(1);
    expect([...current.storage.m.keys()]).toEqual(['m']);
    expect(current.stored.state).toEqual(a.session!.state);
    expect(current.storage.alarmsSet).toBe(1);
  });

  it('after the object restarts (evicted from memory), it carries on from its record: a move sent again still counts once', async () => {
    const { a, b } = await twoPlayers();
    const first = gameOf(honourOf(a), a, b);
    const key = keyOf(honourOf(a));
    const r1 = await current.core.act(key, 'samemove1', strokeA(0, 1, 150));
    current.restart();
    const r2 = await current.core.act(key, 'samemove1', strokeA(0, 1, 150));
    expect(r2).toMatchObject({ type: 'ack', seq: (r1 as { seq: number }).seq });
    expect(current.stored.log.filter((e) => e.t === 'stroke')).toHaveLength(1);
    // the games, still connected (hibernation keeps the sockets), go on playing
    void gameOf(honourOf(a) === 0 ? 1 : 0, a, b).client.send(strokeA(0, 1, 140));
    await current.run(10);
    expect(b.session!.state).toEqual(a.session!.state);
    expect(a.session!.state.p.map((p) => p.strokes)).toEqual([1, 1]);
    void first;
  });
});

describe('match server: the move clock (developer, 2026-10-21)', () => {
  it('2:00: the waiting player may add a penalty stroke; 5:00: claim the match; both games see it', async () => {
    const { a, b } = await twoPlayers();
    const { on, waiter, onSeat } = onClock(a, b);
    const turn = () => waiter.session!.state.clock.seq;
    const early = waiter.client.send({ t: 'slow', hole: 0, turn: turn() });
    await current.run(10);
    expect(await early).toMatchObject({ ok: false, code: 'too_soon' });
    expect((await early as { wait?: number }).wait).toBeGreaterThan(CLOCK.penaltyMs - 1000);
    await current.run(CLOCK.graceMs + CLOCK.penaltyMs);
    expect(waiter.client.serverNow()).toBe(current.now); // the server's clock, learned from its messages
    const pen = waiter.client.send({ t: 'slow', hole: 0, turn: turn() });
    await current.run(10);
    expect(await pen).toMatchObject({ ok: true });
    expect(on.session!.state.p[onSeat].slow).toBe(1);
    expect(a.session!.state).toEqual(b.session!.state);
    const again = waiter.client.send({ t: 'slow', hole: 0, turn: turn() });
    await current.run(10);
    expect(await again).toMatchObject({ ok: false, code: 'given' });
    // the player on the clock can't claim against the one waiting
    const wrong = on.client.send({ t: 'claim', turn: turn() });
    await current.run(10);
    expect(await wrong).toMatchObject({ ok: false, code: 'not_waiting' });
    await current.run(CLOCK.claimMs - CLOCK.penaltyMs);
    const claim = waiter.client.send({ t: 'claim', turn: turn() });
    await current.run(10);
    expect(await claim).toMatchObject({ ok: true });
    for (const g of [a, b]) expect(g.session!.state.outcome).toMatchObject({ winner: onSeat === 0 ? 1 : 0, how: 'forfeit', margin: 'by forfeit' });
  });

  it('a stroke made as the penalty goes counts too; a claim made as the other player moves is void', async () => {
    const { a, b } = await twoPlayers();
    const { on, waiter } = onClock(a, b);
    await current.run(CLOCK.graceMs + CLOCK.claimMs);
    const t = waiter.session!.state.clock.seq;
    const [pen, hit] = [waiter.client.send({ t: 'slow', hole: 0, turn: t }), on.client.send(strokeA(0, 1, 150))];
    await current.run(10);
    expect([(await pen).ok, (await hit).ok]).toEqual([true, true]);
    const claim = waiter.client.send({ t: 'claim', turn: t }); // meant for the shot just played
    await current.run(10);
    expect(await claim).toMatchObject({ ok: false, code: 'moved' });
    expect(a.session!.state.phase).toBe('playing');
  });

  it('the clock runs while the waiting player is away (developer, 2026-10-21): back after a long break, they can claim at once', async () => {
    const { code, a, b } = await twoPlayers();
    const { on, waiter, waiterSeat } = onClock(a, b);
    const store = waiter.store;
    const t = waiter.session!.state.clock.seq;
    const writes = current.storage.writes;
    waiter.client.stop(); // the waiting player leaves (closes the game)
    await current.run(30 * MIN); // a long break; the object may be evicted meanwhile
    expect(current.storage.writes).toBe(writes); // coming and going isn't stored
    expect(Object.keys(current.stored).sort()).toEqual(['keys', 'log', 'state']);
    current.restart();
    const back = new Game(current, code, keyOf(waiterSeat), store);
    back.client.start();
    await current.run(100);
    const c = back.clock();
    expect(c?.elapsed).toBeGreaterThan(29 * MIN); // the clock shown counts the time away too
    const claim = back.client.send({ t: 'claim', turn: t });
    await current.run(10);
    expect(await claim).toMatchObject({ ok: true });
    for (const g of [on, back]) expect(g.session!.state.outcome).toMatchObject({ how: 'forfeit' });
  });

  it('the clock runs while the player on it is away too, and the one waiting sees it', async () => {
    const { a, b } = await twoPlayers();
    const { on, waiter } = onClock(a, b);
    on.client.stop(); // the slow player's phone dies
    await current.run(CLOCK.graceMs + CLOCK.penaltyMs + 1000);
    expect(waiter.clock()?.elapsed).toBeGreaterThanOrEqual(CLOCK.penaltyMs);
    const pen = waiter.client.send({ t: 'slow', hole: 0, turn: waiter.session!.state.clock.seq });
    await current.run(10);
    expect(await pen).toMatchObject({ ok: true });
  });

  it('a short absence (another app, a lost signal) does not stop the clock', async () => {
    const { code, a, b } = await twoPlayers();
    const { waiter, waiterSeat } = onClock(a, b);
    const t = waiter.session!.state.clock.seq;
    await current.run(2 * MIN);
    waiter.client.stop();
    await current.run(3 * MIN); // away for three minutes
    const back = new Game(current, code, keyOf(waiterSeat), waiter.store);
    back.client.start();
    await current.run(CLOCK.graceMs + 1000); // five minutes from the move's clock (it starts 15 s after the move)
    const claim = back.client.send({ t: 'claim', turn: t });
    await current.run(10);
    expect(await claim).toMatchObject({ ok: true });
  });

  it('a game asking over HTTP counts as there (and its stay survives the object restarting)', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    current.refuseWs = true;
    const a = new Game(current, code, KEY_A), b = new Game(current, code, KEY_B);
    a.client.start(); b.client.start();
    await current.run(8000);
    void b.client.send({ t: 'join', player: { name: 'kevin', lefty: false } });
    await current.run(3000);
    void a.client.send({ t: 'ready', hole: 0 }); void b.client.send({ t: 'ready', hole: 0 });
    await current.run(3000);
    const s = a.session!.state;
    const waiter = gameOf(s.honour === 0 ? 1 : 0, a, b);
    for (let i = 0; i < 6; i++) { await current.run(MIN); current.restart(); } // evicted between questions
    const claim = waiter.client.send({ t: 'claim', turn: s.clock.seq });
    await current.run(3000);
    expect(await claim).toMatchObject({ ok: true });
  });
});

describe('match server: results on the "recent" list', () => {
  it('a finished match is recorded once, from the server, and listed as "kevin def. charlie ..."', async () => {
    resetSchemaCache(); resetFeedCache();
    const { code, a, b } = await twoPlayers();
    current.db = fakeD1();
    const report = async () => (await (await current.fetch(`http://x/api/match/${code}/report`, { method: 'POST' })).json()) as { ok: boolean; finished: boolean; recorded: boolean; result?: string };
    expect(await report()).toMatchObject({ ok: true, finished: false }); // not over yet
    expect((await current.fetch(`http://x/api/match/${code}/result`)).status).toBe(404); // the object's own route isn't reachable
    const { waiter } = onClock(a, b);
    await current.run(CLOCK.graceMs + CLOCK.claimMs);
    const claimed = waiter.client.send({ t: 'claim', turn: waiter.session!.state.clock.seq });
    await current.run(10);
    expect(await claimed).toMatchObject({ ok: true });
    expect(await report()).toMatchObject({ ok: true, finished: true, recorded: true });
    expect(await report()).toMatchObject({ recorded: false, result: 'exists' }); // the other game's report changes nothing
    resetFeedCache();
    const feed = (await (await handleRecentGet(current.db, new URL('https://x/api/recent'))).json()) as { matches: MatchFeedRow[] };
    expect(feed.matches).toHaveLength(1);
    const m = feed.matches[0];
    const w = waiter === a ? 'charlie' : 'kevin', l = waiter === a ? 'kevin' : 'charlie';
    expect(matchFeedText(m)).toBe(`${w} def. ${l} by forfeit`);
    expect(m).toMatchObject({ course: COURSE.json.id, holes: 2, how: 'forfeit' });
    expect(m).not.toHaveProperty('winner_owner'); // the players' keys stay on the server
    // a player who hides from the shared lists takes their matches off it too
    await handleHide(current.db, JSON.stringify({ owner: KEY_B, hidden: true }));
    const hid = (await (await handleRecentGet(current.db, new URL('https://x/api/recent'))).json()) as { matches: MatchFeedRow[] };
    expect(hid.matches).toHaveLength(0);
  });

  it('a name another device holds on the boards is not listed', async () => {
    resetSchemaCache(); resetFeedCache();
    const { code, a, b } = await twoPlayers();
    current.db = fakeD1();
    // "kevin" is someone else's name on the boards (their round came first)
    await handlePost(current.db, JSON.stringify({ id: 'r1', course: 'oswego_lake', tee: 'Blue', length: '18', difficulty: 'normal', casual: false, player: 'kevin', owner: 'zzzzyyyyxxxxwwww',
      date: '2026-10-18T20:00:00Z', gross: 80, toPar: 9, back: 40, scores: [], totals: { strokes: 80, par: 71, toPar: 9, putts: 30, penalties: 0, fairways: 7, fairwayChances: 13, gir: 10, holes: 18, front: 40, back: 40 } }));
    const loser = gameOf(honourOf(a), a, b);
    const gave = loser.client.send({ t: 'concede', what: 'match', hole: 0 });
    await current.run(10);
    expect(await gave).toMatchObject({ ok: true });
    const j = await (await current.fetch(`http://x/api/match/${code}/report`, { method: 'POST' })).json();
    expect(j).toMatchObject({ finished: true, recorded: false, result: 'name' });
  });
});

describe('match client: polling less when nothing happens or nobody looks', () => {
  async function polling() {
    current = new FakeNet();
    const code = await newMatch(current);
    current.refuseWs = true;
    const a = new Game(current, code, KEY_A);
    a.client.start();
    await current.run(8000);
    expect(a.client.status).toBe('polling');
    const asks = () => current.sentByClients.length; // (HTTP isn't in there: counted below)
    void asks;
    let n = 0;
    const f = current.fetch;
    current.fetch = async (url, init) => { if (url.includes('/events')) n++; return f(url, init); };
    (a.client as unknown as { deps: ClientDeps }).deps.fetch = current.fetch;
    return { a, count: () => n };
  }

  it('2 s while things happen, 5 s after two quiet minutes', async () => {
    const { count } = await polling();
    const n0 = count();
    await current.run(MIN);
    expect(count() - n0).toBeGreaterThanOrEqual(28); // every 2 s
    await current.run(2 * MIN);
    const n1 = count();
    await current.run(MIN);
    expect(count() - n1).toBeLessThanOrEqual(13); // every 5 s
    expect(count() - n1).toBeGreaterThanOrEqual(11);
  });

  it('out of sight: 8 s, once a minute after five minutes, none after half an hour; looking again starts it', async () => {
    const { a, count } = await polling();
    current.hidden = true;
    await current.run(5 * MIN + 10_000);
    const n1 = count();
    await current.run(10 * MIN);
    expect(count() - n1).toBeLessThanOrEqual(11); // once a minute
    expect(count() - n1).toBeGreaterThanOrEqual(9);
    await current.run(20 * MIN);
    const n2 = count();
    await current.run(30 * MIN);
    expect(count() - n2).toBe(0); // stopped
    const dials = current.dials;
    current.hidden = false;
    a.client.poke(); // the page is looked at again
    await current.run(10_000);
    expect(count() - n2).toBeGreaterThanOrEqual(4);
    expect(current.dials).toBeGreaterThan(dials); // and a WebSocket is tried again
  });
});

describe('match server: chat (developer, 2026-10-22: typed messages)', () => {
  const texts = (g: Game) => g.client.chat.map((c) => `${c.by}:${c.text}`);

  it('a message reaches both players, numbered and filtered; it is one storage write, apart from the match', async () => {
    const { a, b } = await twoPlayers();
    // b said hello before it joined (no chat then): it has the catch-up now, so what comes is news
    expect(a.client.chatSynced && b.client.chatSynced).toBe(true);
    let news: string[] = [];
    b.client.onChat = (fresh) => { news.push(...fresh.map((c) => c.text)); };
    const w0 = current.storage.writes;
    const sent = a.client.say('nice   drive, what the fuck  ');
    await current.run(10);
    expect(await sent).toMatchObject({ ok: true, id: 1 });
    expect(texts(a)).toEqual(['0:nice drive, what the ****']);
    expect(texts(b)).toEqual(['0:nice drive, what the ****']);
    expect(news).toEqual(['nice drive, what the ****']);
    expect(current.storage.writes - w0).toBe(1); // the message only (key "c"); the match's record is untouched
    expect(current.stored.log.some((e) => (e as { t: string }).t === 'chat')).toBe(false);
    const reply = b.client.say('thanks');
    await current.run(10);
    expect(await reply).toMatchObject({ ok: true, id: 2 });
    expect(texts(a)).toEqual(['0:nice drive, what the ****', '1:thanks']);
    news = [];
  });

  it('refuses an empty message, a burst, and a message from someone not in the match; a lost answer counts once', async () => {
    const { code, a, b } = await twoPlayers();
    expect(await (async () => { const r = a.client.say('   '); await current.run(10); return r; })()).toMatchObject({ ok: false, code: 'empty' });
    const burst = [1, 2, 3, 4, 5, 6].map((i) => a.client.say(`msg ${i}`));
    await current.run(10);
    const rs = await Promise.all(burst);
    expect(rs.filter((r) => r.ok)).toHaveLength(5);
    expect(rs[5]).toMatchObject({ ok: false, code: 'too_fast' });
    await current.run(11_000);
    expect(await (async () => { const r = a.client.say('again'); await current.run(10); return r; })()).toMatchObject({ ok: true });
    // a third person opening the link: can't chat, and hears none of it
    const c = new Game(current, code, KEY_C);
    c.client.start();
    await current.run(100);
    expect(c.client.chat).toEqual([]);
    expect(await current.core.say(KEY_C, 'abcdefgh', 'hello')).toMatchObject({ type: 'unsaid', code: 'not_player' });
    // the same message twice (its answer lost): one message
    const n = b.client.chat.length;
    const r1 = await current.core.say(KEY_B, 'samecid1', 'hi');
    const r2 = await current.core.say(KEY_B, 'samecid1', 'hi');
    expect(r1).toMatchObject({ type: 'said' });
    expect(r2).toEqual(r1);
    await current.run(10);
    expect(b.client.chat.length).toBe(n + 1);
  });

  it('a game that comes back (and an object restarted from storage) gets the messages it missed, once', async () => {
    const { code, a, b } = await twoPlayers();
    void a.client.say('first');
    await current.run(10);
    const store = b.store;
    b.client.stop();
    void a.client.say('while you were away');
    void a.client.say('and again');
    await current.run(10);
    current.restart(); // evicted meanwhile
    const back = new Game(current, code, KEY_B, store);
    back.client.chat = [...b.client.chat]; // what this page had (a new page starts empty, and gets all three)
    let fresh: string[] = [];
    let caught = false;
    back.client.onChat = (f, c) => { fresh.push(...f.map((m) => m.text)); caught = c; };
    back.client.start();
    await current.run(100);
    expect(fresh).toEqual(['while you were away', 'and again']);
    expect(caught).toBe(true);
    expect(texts(back)).toEqual(['0:first', '0:while you were away', '0:and again']);
    fresh = [];
    const page = new Game(current, code, KEY_B, new MemStore());
    page.client.start();
    await current.run(100);
    expect(texts(page)).toEqual(['0:first', '0:while you were away', '0:and again']);
  });

  it('over HTTP (WebSockets refused) messages go both ways', async () => {
    current = new FakeNet();
    const code = await newMatch(current);
    current.refuseWs = true;
    const a = new Game(current, code, KEY_A), b = new Game(current, code, KEY_B);
    a.client.start(); b.client.start();
    await current.run(8000);
    void b.client.send({ t: 'join', player: { name: 'kevin', lefty: false } });
    await current.run(3000);
    expect(a.client.status).toBe('polling');
    const r = b.client.say('can you hear me');
    await current.run(3000);
    expect(await r).toMatchObject({ ok: true, id: 1 });
    expect(texts(a)).toEqual(['1:can you hear me']);
    expect(a.client.chatOn).toBe(true);
  });

  it('a message the storage fails to keep is refused and goes nowhere; the chat is capped per match', async () => {
    const { a, b } = await twoPlayers();
    current.storage.failPuts = 1;
    const r = a.client.say('lost');
    await current.run(10);
    expect(await r).toMatchObject({ ok: false, code: 'server' });
    expect(b.client.chat).toEqual([]);
    // the cap: as if the match had had its fill
    current.storage.m.set('c', { msgs: [], n: CHAT.maxPerMatch });
    current.restart();
    expect(await current.core.say(KEY_A, 'abcdefgh', 'one more')).toMatchObject({ type: 'unsaid', code: 'full' });
  });

  it('a server without chat: a message fails at once instead of waiting', async () => {
    const { a } = await twoPlayers();
    a.client.chatOn = false; // as the welcome of an older server leaves it
    (a.client as unknown as { welcomed: boolean }).welcomed = true;
    expect(await a.client.say('hello?')).toMatchObject({ ok: false, code: 'unavailable' });
  });
});

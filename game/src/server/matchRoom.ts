// The live match server: one Durable Object per match (game/match-worker),
// reached through the Pages Functions in functions/api/matches.ts and
// functions/api/match/[[path]].ts. It keeps the match's log, checks every move
// against the rules (src/systems/match/rules.ts, the same code the games run)
// and sends each new entry to both players' games over a WebSocket (or by
// HTTP when a WebSocket can't be had).
//
// Written against the small interfaces below so it runs in the unit tests
// with fakes; game/match-worker/src/index.ts fits it to Cloudflare's API.

import { DEFAULT_NAME, nameAllowed, tidyName } from '../save/names';
import { applyEvent, cleanAction, eventOf, statusText } from '../systems/match/rules';
import { Action, CLOSE, Logged, MatchConfig, MatchError, MatchPlayer, MatchState, PING, PONG, PROTOCOL, RULES, Seat } from '../systems/match/types';

/** The parts of a Durable Object's storage used here (its key-value API). */
export interface RoomStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(entries: Record<string, unknown>): Promise<void>;
  list<T>(opts: { prefix: string; start?: string; limit?: number }): Promise<Map<string, T>>;
  deleteAll(): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(at: number): Promise<void>;
}

/** Who is on a WebSocket, kept with it (survives the object hibernating). */
export interface SocketInfo {
  /** the player key it said hello with ('' until it has) */
  key: string;
  /** null: watching (or not yet joined) */
  seat: Seat | null;
  /** when it opened or said hello (ms) */
  at: number;
  /** the server has closed it (it may take a while to go: it no longer counts) */
  closing?: boolean;
}

export interface RoomSocket {
  send(text: string): void;
  close(code?: number, reason?: string): void;
  info(): SocketInfo | null;
  setInfo(i: SocketInfo): void;
  /** when the platform last answered this socket's keep-alive (ms), null if never or unknown */
  pingedAt(): number | null;
}

export interface RoomHost {
  storage: RoomStorage;
  /** every open socket of this match */
  sockets(): RoomSocket[];
  /** accept a WebSocket upgrade (hibernatable), returning the response to send */
  accept(info: SocketInfo): Response;
  now(): number;
  random(): number;
}

export { CLOSE, PING, PONG };

const MAX_MESSAGE = 256 * 1024;   // a stroke with its path is ~10-40 KB
const MAX_EVENTS = 4000;          // a 36-hole match of wild golf is well under 1,000
const MAX_SOCKETS = 12;
const HELLO_MS = 10_000;          // a socket that hasn't said who it is by then is closed (to make room)
// a game pings every 15 s, but a background tab's timers may run once a minute: one silent this long is
// gone (a phone that slept); 45 s made background tabs flicker "offline" and get closed for nothing
const ALIVE_MS = 100_000;
const POLLED_MS = 12_000;         // a game asking over HTTP counts as there this long after it asked
const BATCH = 40;                 // events per message when catching a game up
const LIVE_DAYS = 14;             // a match nobody touches for two weeks is deleted
const DONE_DAYS = 3;              // a finished one after three days (time for a rematch)

const ekey = (seq: number) => `e:${String(seq).padStart(8, '0')}`;
export const isMatchCode = (c: unknown): c is string => typeof c === 'string' && /^[a-km-np-z2-9]{6}$/.test(c);
const isKey = (k: unknown): k is string => typeof k === 'string' && /^[a-z0-9]{8,64}$/.test(k);

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

/** A player as the server keeps them: the name tidied and checked. */
function cleanPlayer(p: unknown): MatchPlayer | null {
  const x = p as MatchPlayer | null;
  if (!x || typeof x.name !== 'string' || typeof x.lefty !== 'boolean') return null;
  const name = tidyName(x.name);
  if (!name || name === DEFAULT_NAME || !nameAllowed(name)) return null;
  return { name, lefty: x.lefty };
}

/** A game running other rules than this server: refused, with what to do about it. */
function versionProblem(rules: unknown): string | null {
  if (rules === RULES) return null;
  return typeof rules === 'number' && rules > RULES
    ? 'the match server is older than this game (the match Worker needs deploying)'
    : 'this game is older than the match server - reload to update it';
}

export type Reply =
  | { type: 'welcome'; protocol: number; rules: number; seat: Seat | null; seq: number; online: [boolean, boolean] }
  | { type: 'events'; events: Logged[]; last: boolean }
  | { type: 'ack'; cid: string; seq: number; seat: Seat | null }
  | { type: 'nack'; cid: string; code: string; message: string; seq: number }
  | { type: 'presence'; online: [boolean, boolean] }
  | { type: 'seat'; seat: Seat }
  | { type: 'error'; code: string; message: string };

export class MatchRoomCore {
  private state: MatchState | null | undefined = undefined; // undefined: not read yet
  private keys: [string, string | null] | null = null;
  /** games asking over HTTP: when each seat last asked (kept in memory: a guess at who is there, not a record) */
  private polled: [number, number] = [0, 0];
  /** who was there in the last presence sent to everyone */
  private lastOnline = '';
  /**
   * Moves are taken one at a time. A Durable Object already holds other events
   * back while it waits on its storage (input gates), but two moves read
   * between awaits would both be numbered after the same entry; the queue
   * makes that impossible whatever the platform does (found by the tests:
   * two "ready"s sent at once over HTTP, one was lost).
   */
  private lock: Promise<unknown> = Promise.resolve();

  constructor(private host: RoomHost) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.lock.then(work, work);
    this.lock = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<MatchState | null> {
    if (this.state === undefined) {
      this.state = (await this.host.storage.get<MatchState>('state')) ?? null;
      this.keys = (await this.host.storage.get<[string, string | null]>('keys')) ?? null;
    }
    return this.state;
  }

  /** The sockets that count: not the ones this server has closed (a dead line may never finish closing). */
  private live(): RoomSocket[] {
    return this.host.sockets().filter((ws) => !ws.info()?.closing);
  }

  private seatOf(key: string): Seat | null {
    if (!this.keys) return null;
    return this.keys[0] === key ? 0 : this.keys[1] === key ? 1 : null;
  }

  /**
   * The match is deleted `days` after now (its last move). Setting an alarm is a storage write, and the
   * free plan allows 100,000 a day, so it is moved only when it is more than half a day off (it used to
   * be set on every move: ~200 writes per match for nothing).
   */
  private async keepFor(days: number) {
    try {
      const want = this.host.now() + days * 86_400_000;
      const cur = await this.host.storage.getAlarm();
      if (cur === null || Math.abs(cur - want) > 43_200_000) await this.host.storage.setAlarm(want);
    } catch { /* the next move sets it again */ }
  }

  // ----------------------------------------------------------------- HTTP
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    try {
      if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') return await this.upgrade();
      if (req.method === 'POST' && path === 'create') { const body = await req.text(); return await this.serial(() => this.create(body)); }
      if (req.method === 'GET' && path === 'info') return await this.info();
      if (req.method === 'GET' && path === 'events') return await this.eventsHttp(url, req.headers.get('x-match-key'));
      if (req.method === 'POST' && path === 'hello') return await this.helloHttp(await req.text());
      if (req.method === 'POST' && path === 'act') return await this.actHttp(await req.text());
      return jsonResponse({ error: 'not found' }, 404);
    } catch (e) {
      return jsonResponse({ error: String(e) }, 500);
    }
  }

  private async create(body: string): Promise<Response> {
    if (body.length > MAX_MESSAGE) return jsonResponse({ error: 'too big' }, 413);
    if (await this.load()) return jsonResponse({ error: 'exists' }, 409);
    let b: { cfg?: MatchConfig; player?: MatchPlayer; key?: string; rules?: number };
    try { b = JSON.parse(body); } catch { return jsonResponse({ error: 'bad json' }, 400); }
    if (b.rules !== undefined) { const v = versionProblem(b.rules); if (v) return jsonResponse({ error: 'version', message: v }, 400); }
    const player = cleanPlayer(b.player);
    if (!player) return jsonResponse({ error: 'name', message: 'a match needs your name (not "player")' }, 400);
    if (!isKey(b.key)) return jsonResponse({ error: 'key' }, 400);
    const ev = { t: 'created', cfg: b.cfg, player, seq: 1, at: new Date(this.host.now()).toISOString() } as Logged;
    let s: MatchState;
    try { s = applyEvent(null, ev); } catch (e) {
      if (e instanceof MatchError) return jsonResponse({ error: e.code, message: e.message }, 400);
      throw e;
    }
    // the log keeps the config as the rules read it (nothing a client added rides along)
    const logged = { ...ev, cfg: s.cfg };
    this.state = s;
    this.keys = [b.key, null];
    await this.host.storage.put({ state: s, keys: this.keys, [ekey(1)]: logged });
    await this.keepFor(LIVE_DAYS);
    return jsonResponse({ ok: true, seq: 1 });
  }

  private async info(): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ exists: false }, 404);
    const c = s.cfg;
    return jsonResponse({
      exists: true, protocol: c.protocol, rules: RULES, courseId: c.courseId, courseVersion: c.courseVersion, tee: c.tee, holes: c.holes, difficulty: c.difficulty,
      players: s.players.map((p) => (p ? p.name : null)), phase: s.phase, status: statusText(s), seq: s.seq, online: this.online(),
    });
  }

  /** A game asking over HTTP (no WebSocket to be had): the log after `since`. Its key comes in a header (addresses get logged). */
  private async eventsHttp(url: URL, key: string | null): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ error: 'no match' }, 404);
    const seat = isKey(key) ? this.seatOf(key) : null;
    if (seat !== null) this.polled[seat] = this.host.now();
    const since = Math.max(0, Number(url.searchParams.get('since') ?? 0) | 0);
    const events = await this.eventsSince(since, s, 400);
    const more = events.length > 0 && events[events.length - 1].seq < s.seq;
    return jsonResponse({ events, more, seq: s.seq, online: this.online(), seat });
  }

  /** A game that can only ask over HTTP says who it is: its seat, and who is there. */
  private async helloHttp(body: string): Promise<Response> {
    let b: { key?: string; rules?: number };
    try { b = JSON.parse(body); } catch { return jsonResponse({ type: 'error', code: 'bad_json', message: 'bad message' }, 400); }
    const v = versionProblem(b.rules);
    if (v) return jsonResponse({ type: 'error', code: 'version', message: v }, 409);
    const s = await this.load();
    if (!s) return jsonResponse({ type: 'error', code: 'no_match', message: 'this match no longer exists' }, 404);
    if (!isKey(b.key)) return jsonResponse({ type: 'error', code: 'key', message: 'no player key' }, 400);
    const seat = this.seatOf(b.key);
    if (seat !== null) this.polled[seat] = this.host.now();
    const r: Reply = { type: 'welcome', protocol: PROTOCOL, rules: RULES, seat, seq: s.seq, online: this.online() };
    return jsonResponse(r);
  }

  private async actHttp(body: string): Promise<Response> {
    if (body.length > MAX_MESSAGE) return jsonResponse({ type: 'error', code: 'too_big', message: 'move too big' }, 413);
    let b: { key?: string; cid?: string; action?: Action; rules?: number };
    try { b = JSON.parse(body); } catch { return jsonResponse({ type: 'error', code: 'bad_json', message: 'bad message' }, 400); }
    if (b.rules !== undefined) { const v = versionProblem(b.rules); if (v) return jsonResponse({ type: 'nack', cid: String(b.cid ?? ''), code: 'version', message: v, seq: 0 }, 409); }
    if (!isKey(b.key)) return jsonResponse({ type: 'error', code: 'key', message: 'no player key' }, 400);
    const seat = this.seatOf(b.key);
    if (seat !== null) this.polled[seat] = this.host.now();
    const r = await this.act(b.key, b.cid, b.action);
    return jsonResponse(r, r.type === 'ack' ? 200 : 409);
  }

  // ------------------------------------------------------------ WebSocket
  private async upgrade(): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ error: 'no match' }, 404);
    const now = this.host.now();
    // make room: sockets that never said who they are, then ones gone quiet (closed ones no longer count)
    for (const ws of this.live()) {
      const i = ws.info();
      if ((!i || !i.key) && now - (i?.at ?? 0) > HELLO_MS) this.drop(ws, CLOSE.noHello, 'no hello');
      else if (i?.key && !this.alive(ws, now)) this.drop(ws, 1001, 'gone quiet');
    }
    if (this.live().length >= MAX_SOCKETS) return jsonResponse({ error: 'busy' }, 429);
    return this.host.accept({ key: '', seat: null, at: now }); // who it is comes in its first message (not in the address, which gets logged)
  }

  private drop(ws: RoomSocket, code: number, reason: string) {
    try { ws.setInfo({ ...(ws.info() ?? { key: '', seat: null, at: 0 }), closing: true }); } catch { /* gone */ }
    try { ws.close(code, reason); } catch { /* gone */ }
  }

  /** Has this socket been heard from lately (its keep-alive answered, or its hello)? */
  private alive(ws: RoomSocket, now = this.host.now()): boolean {
    const last = Math.max(ws.pingedAt() ?? 0, ws.info()?.at ?? 0);
    return now - last < ALIVE_MS;
  }

  async message(ws: RoomSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return;
    if (raw.length > MAX_MESSAGE) { this.send(ws, { type: 'error', code: 'too_big', message: 'move too big' }); return; }
    let m: { type?: string; key?: string; since?: number; cid?: string; action?: Action; rules?: number };
    try { m = JSON.parse(raw); } catch { this.send(ws, { type: 'error', code: 'bad_json', message: 'bad message' }); return; }
    if (m.type === 'ping') { ws.send(PONG); return; } // the auto-response normally answers it
    try {
      const s = await this.load();
      if (!s) { this.send(ws, { type: 'error', code: 'no_match', message: 'this match no longer exists' }); this.drop(ws, CLOSE.noMatch, 'no match'); return; }
      if (m.type === 'hello') { await this.hello(ws, m.key, m.since, m.rules); return; }
      const who = ws.info();
      if (!who?.key) { this.send(ws, { type: 'error', code: 'hello', message: 'say hello first' }); return; }
      ws.setInfo({ ...who, at: this.host.now() }); // heard from
      if (m.type === 'who') {
        // who is there: to the one asking, and to everyone if it changed (a phone that slept just goes quiet)
        const online = this.online();
        this.send(ws, { type: 'presence', online });
        if (online.join() !== this.lastOnline) this.broadcast({ type: 'presence', online }, ws);
        return;
      }
      if (m.type === 'sync') { await this.serial(async () => this.catchUp(ws, Math.max(0, Number(m.since) | 0), (await this.load())!)); return; }
      if (m.type === 'act') {
        const joining = m.action?.t === 'join';
        // a joining game learns its seat before the news of it (else it thinks the match is full)
        const r = await this.act(who.key, m.cid, m.action, joining ? () => {
          ws.setInfo({ ...who, seat: 1, at: this.host.now() });
          this.send(ws, { type: 'seat', seat: 1 });
        } : undefined);
        this.send(ws, r);
        if (joining && r.type === 'ack') this.broadcast({ type: 'presence', online: this.online() });
        return;
      }
      this.send(ws, { type: 'error', code: 'unknown', message: 'unknown message' });
    } catch (e) {
      // the move (if it was one) didn't go in: say so, so the game doesn't wait on it
      if (m.type === 'act') this.send(ws, { type: 'nack', cid: String(m.cid ?? ''), code: 'server', message: 'the server had a problem - try again', seq: this.state?.seq ?? 0 });
      else this.send(ws, { type: 'error', code: 'server', message: String(e) });
    }
  }

  private async hello(ws: RoomSocket, key: unknown, since: unknown, rules: unknown) {
    if (!isKey(key)) { this.send(ws, { type: 'error', code: 'key', message: 'no player key' }); return; }
    const v = versionProblem(rules);
    if (v) { this.send(ws, { type: 'error', code: 'version', message: v }); this.drop(ws, CLOSE.version, 'version'); return; }
    // in turn with the moves: a move can't be broadcast between this game's catch-up and its first live event
    await this.serial(async () => {
      const now = (await this.load())!;
      const seat = this.seatOf(key);
      // one line per player key: an older one (another tab, a phone that slept and woke up) is closed
      for (const other of this.live()) {
        if (other !== ws && other.info()?.key === key) this.drop(other, CLOSE.replaced, 'opened elsewhere');
      }
      ws.setInfo({ key, seat, at: this.host.now() });
      const online = this.online();
      this.send(ws, { type: 'welcome', protocol: PROTOCOL, rules: RULES, seat, seq: now.seq, online });
      await this.catchUp(ws, Math.max(0, Number(since) | 0), now);
      this.broadcast({ type: 'presence', online }, ws);
    });
  }

  /** A socket closed (or broke): the other player sees who is still there. */
  closed(ws: RoomSocket) {
    this.broadcast({ type: 'presence', online: this.online(ws) }, ws);
  }

  alarm(): Promise<void> {
    return this.serial(() => this.expire());
  }

  private async expire(): Promise<void> {
    for (const ws of this.live()) this.drop(ws, CLOSE.expired, 'match expired');
    await this.host.storage.deleteAll();
    this.state = null;
    this.keys = null;
  }

  // ----------------------------------------------------------------- moves
  /** A move from the player with this key: added to the log and sent to everyone, or refused. */
  act(key: string, cid: unknown, action: unknown, beforeBroadcast?: () => void): Promise<Reply> {
    return this.serial(() => this.actNow(key, cid, action, beforeBroadcast));
  }

  private async actNow(key: string, cid: unknown, raw: unknown, beforeBroadcast?: () => void): Promise<Reply> {
    const s = await this.load();
    const id = typeof cid === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(cid) ? cid : null;
    if (!id) return { type: 'nack', cid: String(cid ?? ''), code: 'cid', message: 'no move id', seq: s?.seq ?? 0 };
    if (!s) return { type: 'nack', cid: id, code: 'no_match', message: 'this match no longer exists', seq: 0 };
    // the same move again (sent twice over a flaky line): it already counted
    const seen = await this.host.storage.get<number>(`cid:${key}:${id}`);
    if (seen !== undefined) return { type: 'ack', cid: id, seq: seen, seat: this.seatOf(key) };
    const action = cleanAction(raw);
    if (!action) return { type: 'nack', cid: id, code: 'bad_move', message: 'not a move this server knows', seq: s.seq };
    if (s.seq >= MAX_EVENTS) return { type: 'nack', cid: id, code: 'full', message: 'this match is too long', seq: s.seq };
    let by: Seat | null = this.seatOf(key);
    let player: MatchPlayer | null = null;
    if (action.t === 'join') {
      if (this.keys && this.keys[0] === key) return { type: 'nack', cid: id, code: 'own_match', message: 'this is your own match: send the link to a friend', seq: s.seq };
      if (by === 1) return { type: 'ack', cid: id, seq: s.seq, seat: 1 }; // already in it
      player = cleanPlayer(action.player);
      if (!player) return { type: 'nack', cid: id, code: 'name', message: "that name can't be used - try another", seq: s.seq };
      by = 1;
    }
    if (by === null) return { type: 'nack', cid: id, code: 'not_player', message: "you're watching this match", seq: s.seq };
    const honour: Seat = this.host.random() < 0.5 ? 0 : 1; // by lot (Rule 6.4a)
    const ev = { ...eventOf(by, action.t === 'join' ? { t: 'join', player: player! } : action, honour), seq: s.seq + 1, at: new Date(this.host.now()).toISOString(), cid: id } as Logged;
    let next: MatchState;
    try { next = applyEvent(s, ev); } catch (e) {
      if (e instanceof MatchError) return { type: 'nack', cid: id, code: e.code, message: e.message, seq: s.seq };
      throw e;
    }
    const writes: Record<string, unknown> = { state: next, [ekey(ev.seq)]: ev, [`cid:${key}:${id}`]: ev.seq };
    if (action.t === 'join') { this.keys = [this.keys![0], key]; writes.keys = this.keys; }
    await this.host.storage.put(writes);
    this.state = next;
    beforeBroadcast?.();
    this.broadcast({ type: 'events', events: [ev], last: true });
    await this.keepFor(next.phase === 'finished' ? DONE_DAYS : LIVE_DAYS);
    return { type: 'ack', cid: id, seq: ev.seq, seat: by };
  }

  // -------------------------------------------------------------- helpers
  /**
   * The log after `since`. A stroke on a hole before the last one goes without
   * its flight (a game catching up shows where the balls are, not every shot
   * of the round again), which keeps a reload late in a match small; the hole
   * just finished keeps them, for its result panel's "rewatch".
   */
  private async eventsSince(since: number, s: MatchState, limit = 10_000): Promise<Logged[]> {
    if (since >= s.seq) return [];
    const m = await this.host.storage.list<Logged>({ prefix: 'e:', start: ekey(since + 1), limit });
    return [...m.values()].map((e) => (e.t === 'stroke' && e.hole < s.hole - 1 ? { ...e, path: '' } : e));
  }

  private async catchUp(ws: RoomSocket, since: number, s: MatchState) {
    const evs = await this.eventsSince(since, s);
    if (!evs.length) { this.send(ws, { type: 'events', events: [], last: true }); return; }
    for (let i = 0; i < evs.length; i += BATCH) this.send(ws, { type: 'events', events: evs.slice(i, i + BATCH), last: i + BATCH >= evs.length });
  }

  /** Which players have a game there: a live socket, or a recent question over HTTP (`gone`: a socket that is closing). */
  private online(gone?: RoomSocket): [boolean, boolean] {
    const now = this.host.now();
    const on: [boolean, boolean] = [now - this.polled[0] < POLLED_MS, now - this.polled[1] < POLLED_MS];
    for (const ws of this.live()) {
      if (ws === gone) continue;
      const i = ws.info();
      if (i && i.key && i.seat !== null && this.alive(ws, now)) on[i.seat] = true;
    }
    return on;
  }

  private send(ws: RoomSocket, r: Reply) {
    try { ws.send(JSON.stringify(r)); } catch { /* closed */ }
  }

  private broadcast(r: Reply, except?: RoomSocket) {
    if (r.type === 'presence') this.lastOnline = r.online.join();
    const text = JSON.stringify(r);
    for (const ws of this.live()) {
      if (ws === except || !ws.info()?.key) continue;
      try { ws.send(text); } catch { /* closed */ }
    }
  }
}

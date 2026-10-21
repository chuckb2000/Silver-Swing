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
import { applyEvent, eventOf, statusText } from '../systems/match/rules';
import { Action, Logged, MatchConfig, MatchError, MatchPlayer, MatchState, PING, PONG, PROTOCOL, Seat } from '../systems/match/types';

/** The parts of a Durable Object's storage used here (its key-value API). */
export interface RoomStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(entries: Record<string, unknown>): Promise<void>;
  list<T>(opts: { prefix: string; start?: string; limit?: number }): Promise<Map<string, T>>;
  deleteAll(): Promise<void>;
  setAlarm(at: number): Promise<void>;
}

/** Who is on a WebSocket, kept with it (survives the object hibernating). */
export interface SocketInfo {
  key: string;
  /** null: watching (or not yet joined) */
  seat: Seat | null;
}

export interface RoomSocket {
  send(text: string): void;
  close(code?: number, reason?: string): void;
  info(): SocketInfo | null;
  setInfo(i: SocketInfo): void;
}

export interface RoomHost {
  storage: RoomStorage;
  /** every open socket of this match */
  sockets(): RoomSocket[];
  /** accept a WebSocket upgrade (hibernatable), returning the response to send */
  accept(info: SocketInfo | null): Response;
  now(): number;
  random(): number;
}

export { PING, PONG };

const MAX_MESSAGE = 256 * 1024;   // a stroke with its path is ~10-40 KB
const MAX_EVENTS = 4000;          // a 36-hole match of wild golf is well under 1,000
const MAX_SOCKETS = 12;
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

export type Reply =
  | { type: 'welcome'; protocol: number; seat: Seat | null; seq: number; online: [boolean, boolean] }
  | { type: 'events'; events: Logged[]; last: boolean }
  | { type: 'ack'; cid: string; seq: number }
  | { type: 'nack'; cid: string; code: string; message: string; seq: number }
  | { type: 'presence'; online: [boolean, boolean] }
  | { type: 'seat'; seat: Seat }
  | { type: 'error'; code: string; message: string };

export class MatchRoomCore {
  private state: MatchState | null | undefined = undefined; // undefined: not read yet
  private keys: [string, string | null] | null = null;
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

  private seatOf(key: string): Seat | null {
    if (!this.keys) return null;
    return this.keys[0] === key ? 0 : this.keys[1] === key ? 1 : null;
  }

  private async keepFor(days: number) {
    await this.host.storage.setAlarm(this.host.now() + days * 86_400_000);
  }

  // ----------------------------------------------------------------- HTTP
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    try {
      if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') return await this.upgrade();
      if (req.method === 'POST' && path === 'create') { const body = await req.text(); return await this.serial(() => this.create(body)); }
      if (req.method === 'GET' && path === 'info') return await this.info();
      if (req.method === 'GET' && path === 'events') return await this.eventsHttp(url);
      if (req.method === 'POST' && path === 'act') return await this.actHttp(await req.text());
      return jsonResponse({ error: 'not found' }, 404);
    } catch (e) {
      return jsonResponse({ error: String(e) }, 500);
    }
  }

  private async create(body: string): Promise<Response> {
    if (body.length > MAX_MESSAGE) return jsonResponse({ error: 'too big' }, 413);
    if (await this.load()) return jsonResponse({ error: 'exists' }, 409);
    let b: { cfg?: MatchConfig; player?: MatchPlayer; key?: string };
    try { b = JSON.parse(body); } catch { return jsonResponse({ error: 'bad json' }, 400); }
    const player = cleanPlayer(b.player);
    if (!player) return jsonResponse({ error: 'name', message: 'a match needs your name (not "player")' }, 400);
    if (!isKey(b.key)) return jsonResponse({ error: 'key' }, 400);
    const ev = { t: 'created', cfg: b.cfg, player, seq: 1, at: new Date(this.host.now()).toISOString() } as Logged;
    let s: MatchState;
    try { s = applyEvent(null, ev); } catch (e) {
      if (e instanceof MatchError) return jsonResponse({ error: e.code, message: e.message }, 400);
      throw e;
    }
    this.state = s;
    this.keys = [b.key, null];
    await this.host.storage.put({ state: s, keys: this.keys, [ekey(1)]: ev });
    await this.keepFor(LIVE_DAYS);
    return jsonResponse({ ok: true, seq: 1 });
  }

  private async info(): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ exists: false }, 404);
    const c = s.cfg;
    return jsonResponse({
      exists: true, protocol: c.protocol, courseId: c.courseId, courseVersion: c.courseVersion, tee: c.tee, holes: c.holes, difficulty: c.difficulty,
      players: s.players.map((p) => (p ? p.name : null)), phase: s.phase, status: statusText(s), seq: s.seq, online: this.online(),
    });
  }

  private async eventsHttp(url: URL): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ error: 'no match' }, 404);
    const since = Math.max(0, Number(url.searchParams.get('since') ?? 0) | 0);
    return jsonResponse({ events: await this.eventsSince(since, s, 400), seq: s.seq });
  }

  private async actHttp(body: string): Promise<Response> {
    if (body.length > MAX_MESSAGE) return jsonResponse({ type: 'error', code: 'too_big', message: 'move too big' }, 413);
    let b: { key?: string; cid?: string; action?: Action };
    try { b = JSON.parse(body); } catch { return jsonResponse({ type: 'error', code: 'bad_json', message: 'bad message' }, 400); }
    if (!isKey(b.key)) return jsonResponse({ type: 'error', code: 'key', message: 'no player key' }, 400);
    const r = await this.act(b.key, b.cid, b.action);
    return jsonResponse(r, r.type === 'ack' ? 200 : 409);
  }

  // ------------------------------------------------------------ WebSocket
  private async upgrade(): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ error: 'no match' }, 404);
    if (this.host.sockets().length >= MAX_SOCKETS) return jsonResponse({ error: 'busy' }, 429);
    return this.host.accept(null); // who it is comes in its first message (not in the address, which gets logged)
  }

  async message(ws: RoomSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return;
    if (raw.length > MAX_MESSAGE) { this.send(ws, { type: 'error', code: 'too_big', message: 'move too big' }); return; }
    let m: { type?: string; key?: string; since?: number; cid?: string; action?: Action };
    try { m = JSON.parse(raw); } catch { this.send(ws, { type: 'error', code: 'bad_json', message: 'bad message' }); return; }
    if (m.type === 'ping') { ws.send(PONG); return; } // the auto-response normally answers it
    const s = await this.load();
    if (!s) { this.send(ws, { type: 'error', code: 'no_match', message: 'this match no longer exists' }); ws.close(4004, 'no match'); return; }
    if (m.type === 'hello') {
      const key = m.key;
      if (!isKey(key)) { this.send(ws, { type: 'error', code: 'key', message: 'no player key' }); return; }
      // in turn with the moves: a move can't be broadcast between this game's catch-up and its first live event
      await this.serial(async () => {
        const now = (await this.load())!;
        ws.setInfo({ key, seat: this.seatOf(key) });
        const online = this.online();
        this.send(ws, { type: 'welcome', protocol: PROTOCOL, seat: this.seatOf(key), seq: now.seq, online });
        await this.catchUp(ws, Math.max(0, Number(m.since) | 0), now);
        this.broadcast({ type: 'presence', online }, ws);
      });
      return;
    }
    const who = ws.info();
    if (!who) { this.send(ws, { type: 'error', code: 'hello', message: 'say hello first' }); return; }
    if (m.type === 'sync') { await this.serial(async () => this.catchUp(ws, Math.max(0, Number(m.since) | 0), (await this.load())!)); return; }
    if (m.type === 'act') {
      const r = await this.act(who.key, m.cid, m.action);
      const joined = r.type === 'ack' && m.action?.t === 'join' && this.seatOf(who.key) === 1;
      if (joined) ws.setInfo({ key: who.key, seat: 1 });
      this.send(ws, r);
      if (joined) {
        this.send(ws, { type: 'seat', seat: 1 });
        this.broadcast({ type: 'presence', online: this.online() });
      }
      return;
    }
    this.send(ws, { type: 'error', code: 'unknown', message: 'unknown message' });
  }

  /** A socket closed (or broke): the other player sees who is still there. */
  closed(ws: RoomSocket) {
    this.broadcast({ type: 'presence', online: this.online(ws) }, ws);
  }

  alarm(): Promise<void> {
    return this.serial(() => this.expire());
  }

  private async expire(): Promise<void> {
    for (const ws of this.host.sockets()) { try { ws.close(4010, 'match expired'); } catch { /* gone */ } }
    await this.host.storage.deleteAll();
    this.state = null;
    this.keys = null;
  }

  // ----------------------------------------------------------------- moves
  /** A move from the player with this key: added to the log and sent to everyone, or refused. */
  act(key: string, cid: unknown, action: Action | undefined): Promise<Reply> {
    return this.serial(() => this.actNow(key, cid, action));
  }

  private async actNow(key: string, cid: unknown, action: Action | undefined): Promise<Reply> {
    const s = await this.load();
    const id = typeof cid === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(cid) ? cid : null;
    if (!id) return { type: 'nack', cid: String(cid ?? ''), code: 'cid', message: 'no move id', seq: s?.seq ?? 0 };
    if (!s) return { type: 'nack', cid: id, code: 'no_match', message: 'this match no longer exists', seq: 0 };
    // the same move again (sent twice over a flaky line): it already counted
    const seen = await this.host.storage.get<number>(`cid:${key}:${id}`);
    if (seen !== undefined) return { type: 'ack', cid: id, seq: seen };
    if (!action || typeof action !== 'object' || typeof action.t !== 'string') return { type: 'nack', cid: id, code: 'bad_move', message: 'unknown move', seq: s.seq };
    if (s.seq >= MAX_EVENTS) return { type: 'nack', cid: id, code: 'full', message: 'this match is too long', seq: s.seq };
    let by: Seat | null = this.seatOf(key);
    let player: MatchPlayer | null = null;
    if (action.t === 'join') {
      if (this.keys && this.keys[0] === key) return { type: 'nack', cid: id, code: 'own_match', message: "this is your own match: send the link to a friend", seq: s.seq };
      if (by === 1) return { type: 'ack', cid: id, seq: s.seq }; // already in it
      player = cleanPlayer(action.player);
      if (!player) return { type: 'nack', cid: id, code: 'name', message: 'enter your name to join (not "player")', seq: s.seq };
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
    await this.keepFor(next.phase === 'finished' ? DONE_DAYS : LIVE_DAYS);
    this.broadcast({ type: 'events', events: [ev], last: true });
    return { type: 'ack', cid: id, seq: ev.seq };
  }

  // -------------------------------------------------------------- helpers
  /**
   * The log after `since`. A stroke on a hole already over goes without its
   * flight (a game catching up shows where the balls are, not every shot of
   * the round again), which keeps a reload late in a match small.
   */
  private async eventsSince(since: number, s: MatchState, limit = 10_000): Promise<Logged[]> {
    if (since >= s.seq) return [];
    const m = await this.host.storage.list<Logged>({ prefix: 'e:', start: ekey(since + 1), limit });
    return [...m.values()].map((e) => (e.t === 'stroke' && e.hole < s.hole ? { ...e, path: '' } : e));
  }

  private async catchUp(ws: RoomSocket, since: number, s: MatchState) {
    const evs = await this.eventsSince(since, s);
    if (!evs.length) { this.send(ws, { type: 'events', events: [], last: true }); return; }
    for (let i = 0; i < evs.length; i += BATCH) this.send(ws, { type: 'events', events: evs.slice(i, i + BATCH), last: i + BATCH >= evs.length });
  }

  /** Which players have a game connected (`gone`: a socket that is closing). */
  private online(gone?: RoomSocket): [boolean, boolean] {
    const on: [boolean, boolean] = [false, false];
    for (const ws of this.host.sockets()) {
      if (ws === gone) continue;
      const i = ws.info();
      if (i && i.seat !== null) on[i.seat] = true;
    }
    return on;
  }

  private send(ws: RoomSocket, r: Reply) {
    try { ws.send(JSON.stringify(r)); } catch { /* closed */ }
  }

  private broadcast(r: Reply, except?: RoomSocket) {
    const text = JSON.stringify(r);
    for (const ws of this.host.sockets()) {
      if (ws === except || !ws.info()) continue;
      try { ws.send(text); } catch { /* closed */ }
    }
  }
}

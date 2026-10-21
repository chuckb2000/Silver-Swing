// The live match server: one Durable Object per match (game/match-worker),
// reached through the Pages Functions in functions/api/matches.ts and
// functions/api/match/[[path]].ts. It keeps the match's log, checks every move
// against the rules (src/systems/match/rules.ts, the same code the games run)
// and sends each new entry to both players' games over a WebSocket (or by
// HTTP when a WebSocket can't be had).
//
// The whole match is one stored record (the state, the players' keys and the
// log), written once per move: the free plan allows 100,000 writes a day, and
// a match is about 200 moves. Flights are kept for the hole being played and
// the one before (catch-up and "rewatch"); older strokes keep where they went.
//
// Written against the small interfaces below so it runs in the unit tests
// with fakes; game/match-worker/src/index.ts fits it to Cloudflare's API.

import { DEFAULT_NAME, nameAllowed, tidyName } from '../save/names';
import { applyEvent, cleanAction, clockText, eventOf, statusText } from '../systems/match/rules';
import { Action, CLOCK, CLOSE, Logged, MatchConfig, MatchError, MatchPlayer, MatchState, PING, PONG, PROTOCOL, RULES, Seat } from '../systems/match/types';

/** The parts of a Durable Object's storage used here (its key-value API). */
export interface RoomStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(entries: Record<string, unknown>): Promise<void>;
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
  /** when it opened, said hello or last sent a message (ms) */
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
  /** development only (scripts/match-dev.sh): the match's clock can be moved on, to test the move clock */
  debug?: boolean;
}

export { CLOSE, PING, PONG };

const MAX_MESSAGE = 256 * 1024;   // a stroke with its flight is ~10-40 KB
const MAX_EVENTS = 1500;          // an 18-hole match is ~250; 54 holes of wild golf stay well under (the record's size)
const MAX_SOCKETS = 12;
const HELLO_MS = 10_000;          // a socket that hasn't said who it is by then is closed (to make room)
// a game pings every 15 s, but a background tab's timers may run once a minute: one silent this long is
// gone (a phone that slept); 45 s made background tabs flicker "offline" and get closed for nothing
const ALIVE_MS = 100_000;
const POLLED_MS = 12_000;         // a game asking over HTTP counts as there this long after it asked
const POLLED_HIDDEN_MS = 75_000;  // a background tab asks once a minute (net/matchClient.ts)
const BATCH = 40;                 // events per message when catching a game up
const LIVE_DAYS = 14;             // a match nobody touches for two weeks is deleted
const DONE_DAYS = 3;              // a finished one after three days (time for a rematch)
const MAX_RECORD = 1_500_000;     // the stored match stays under the storage's 2 MB a record

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

/** Who made an entry of the log. */
const authorOf = (e: Logged): Seat => (e.t === 'created' ? 0 : e.t === 'joined' ? 1 : e.by);

/** The match as it is stored: one record, written once per move. */
interface Stored {
  state: MatchState;
  keys: [string, string | null];
  log: Logged[];
}

/** A finished match as the site's leaderboard keeps it (the "recent" list; functions/api/match/[[path]].ts "report"). */
export interface MatchResult {
  finished: true;
  courseId: string;
  tee: string;
  /** holes in the round (9 or 18) */
  holes: number;
  /** holes played (19: won at the 19th) */
  played: number;
  winner: Seat;
  players: [string, string];
  /** the players' keys (their leaderboard owners: a hidden player's matches aren't listed) */
  owners: [string, string];
  margin: string;
  how: string;
  /** when it ended (the server's time) */
  date: string;
}

export type Reply =
  | { type: 'welcome'; protocol: number; rules: number; seat: Seat | null; seq: number; online: [boolean, boolean]; now: number }
  | { type: 'events'; events: Logged[]; last: boolean }
  | { type: 'ack'; cid: string; seq: number; seat: Seat | null; now: number }
  | { type: 'nack'; cid: string; code: string; message: string; seq: number; now: number; wait?: number }
  | { type: 'presence'; online: [boolean, boolean]; now: number }
  | { type: 'seat'; seat: Seat }
  | { type: 'error'; code: string; message: string };

export class MatchRoomCore {
  private state: MatchState | null | undefined = undefined; // undefined: not read yet
  private keys: [string, string | null] | null = null;
  private log: Logged[] = [];
  /** the moves in the log by player and id (`seat:cid` -> seq): a move sent twice counts once */
  private cids = new Map<string, number>();
  private loading: Promise<MatchState | null> | null = null;
  /** games asking over HTTP: when each seat last asked, and how long that counts (kept in memory: a guess at who is there) */
  private polled: [number, number] = [0, 0];
  private pollWindow: [number, number] = [POLLED_MS, POLLED_MS];
  /** who was there in the last presence sent to everyone */
  private lastOnline = '';
  /** development only: how far the match's clock has been moved on */
  private skew = 0;
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

  /** The match's time: the server's (moved on in development to test the move clock). Moves are stamped with it. */
  private clock(): number {
    return this.host.now() + this.skew;
  }

  private load(): Promise<MatchState | null> {
    if (this.state !== undefined) return Promise.resolve(this.state);
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const m = await this.host.storage.get<Stored>('m');
          if (this.host.debug) this.skew = (await this.host.storage.get<number>('skew')) ?? 0;
          this.state = m?.state ?? null;
          this.keys = m?.keys ?? null;
          this.log = m?.log ?? [];
          this.cids = new Map();
          for (const e of this.log) if (e.cid) this.cids.set(`${authorOf(e)}:${e.cid}`, e.seq);
          return this.state;
        } finally {
          this.loading = null;
        }
      })();
    }
    return this.loading;
  }

  /** Write the match (one record). Flights older than the last hole go first; the record keeps under its size limit. */
  private async save() {
    const s = this.state!;
    let bytes = 2000;
    for (let i = 0; i < this.log.length; i++) {
      const e = this.log[i];
      if (e.t === 'stroke' && e.path && e.hole < s.hole - 1) this.log[i] = { ...e, path: '' };
      const f = this.log[i];
      bytes += 1000 + (f.t === 'stroke' ? f.path.length : 0);
    }
    // never expected (a flight is ~6 KB): the oldest flights go until it fits
    for (let i = 0; bytes > MAX_RECORD && i < this.log.length; i++) {
      const e = this.log[i];
      if (e.t === 'stroke' && e.path) { bytes -= e.path.length; this.log[i] = { ...e, path: '' }; }
    }
    const rec: Stored = { state: s, keys: this.keys!, log: this.log };
    await this.host.storage.put({ m: rec });
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

  // ------------------------------------------------------------- presence
  /** When this socket was last heard from (its keep-alive answered, a message, its hello). */
  private heard(ws: RoomSocket): number {
    return Math.max(ws.pingedAt() ?? 0, ws.info()?.at ?? 0);
  }

  /** Has this socket been heard from lately? */
  private alive(ws: RoomSocket, now = this.host.now()): boolean {
    return now - this.heard(ws) < ALIVE_MS;
  }

  /** Is a player here now: a live line, or a recent question over HTTP (`except`: a socket not to count)? */
  private present(seat: Seat, now = this.host.now(), except?: RoomSocket): boolean {
    if (now - this.polled[seat] < this.pollWindow[seat]) return true;
    return this.live().some((ws) => {
      if (ws === except) return false;
      const i = ws.info();
      return !!i?.key && i.seat === seat && this.alive(ws, now);
    });
  }

  /** Which players have a game there (`gone`: a socket that is closing). */
  private online(gone?: RoomSocket): [boolean, boolean] {
    const now = this.host.now();
    return [this.present(0, now, gone), this.present(1, now, gone)];
  }

  private presence(gone?: RoomSocket): Reply {
    return { type: 'presence', online: this.online(gone), now: this.clock() };
  }

  // ----------------------------------------------------------------- HTTP
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    try {
      if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') return await this.upgrade();
      if (req.method === 'POST' && path === 'create') { const body = await req.text(); return await this.serial(() => this.create(body)); }
      if (req.method === 'GET' && path === 'info') return await this.info();
      if (req.method === 'GET' && path === 'result') return await this.result();
      if (req.method === 'GET' && path === 'events') return await this.eventsHttp(url, req.headers.get('x-match-key'), req.headers.get('x-match-hidden') === '1');
      if (req.method === 'POST' && path === 'hello') return await this.helloHttp(await req.text());
      if (req.method === 'POST' && path === 'act') return await this.actHttp(await req.text());
      if (req.method === 'POST' && path === 'skip' && this.host.debug) return await this.serial(() => this.skip(url));
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
    const ev = { t: 'created', cfg: b.cfg, player, seq: 1, at: new Date(this.clock()).toISOString() } as Logged;
    let s: MatchState;
    try { s = applyEvent(null, ev); } catch (e) {
      if (e instanceof MatchError) return jsonResponse({ error: e.code, message: e.message }, 400);
      throw e;
    }
    // the log keeps the config as the rules read it (nothing a client added rides along)
    this.state = s;
    this.keys = [b.key, null];
    this.log = [{ ...ev, cfg: s.cfg } as Logged];
    this.cids = new Map();
    await this.save();
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

  /**
   * A finished match for the site's leaderboard (its "recent" list). Not
   * reachable from outside: the Pages Function asks for it when a game reports
   * the match over (src/server/matchRoutes.ts), so the result is the server's.
   */
  private async result(): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ exists: false }, 404);
    const o = s.outcome;
    if (s.phase !== 'finished' || !o || o.winner === null || !s.players[1] || !this.keys?.[1]) return jsonResponse({ exists: true, finished: false });
    // when it ended: the entry that finished it (a rematch offer may come after)
    const end = [...this.log].reverse().find((e) => e.t !== 'rematch') ?? this.log[this.log.length - 1];
    const r: MatchResult = {
      finished: true, courseId: s.cfg.courseId, tee: s.cfg.tee, holes: s.cfg.holes.length, played: s.results.length, winner: o.winner,
      players: [s.players[0].name, s.players[1].name], owners: [this.keys[0], this.keys[1]], margin: o.margin, how: o.how, date: end.at,
    };
    return jsonResponse({ exists: true, ...r });
  }

  /** Development only: move the match's clock on (the two-browser test of the move clock). */
  private async skip(url: URL): Promise<Response> {
    const ms = Math.max(0, Math.min(86_400_000, Number(url.searchParams.get('ms')) || 0));
    if (!(await this.load())) return jsonResponse({ error: 'no match' }, 404);
    this.skew += ms;
    await this.host.storage.put({ skew: this.skew });
    this.broadcast(this.presence());
    return jsonResponse({ ok: true, skew: this.skew });
  }

  /** A game asking over HTTP (no WebSocket to be had): the log after `since`. Its key comes in a header (addresses get logged). */
  private async eventsHttp(url: URL, key: string | null, hidden: boolean): Promise<Response> {
    const s = await this.load();
    if (!s) return jsonResponse({ error: 'no match' }, 404);
    const seat = isKey(key) ? this.seatOf(key) : null;
    if (seat !== null) await this.polledBy(seat, hidden);
    const since = Math.max(0, Number(url.searchParams.get('since') ?? 0) | 0);
    const events = this.eventsSince(since, 400);
    const more = events.length > 0 && events[events.length - 1].seq < s.seq;
    return jsonResponse({ events, more, seq: s.seq, online: this.online(), now: this.clock(), seat });
  }

  /** A game asked over HTTP: it is there for a while (nothing is stored); the others hear when that changes who is. */
  private polledBy(seat: Seat, hidden = false): Promise<void> {
    return this.serial(async () => {
      this.polled[seat] = this.host.now();
      this.pollWindow[seat] = hidden ? POLLED_HIDDEN_MS : POLLED_MS;
      const p = this.presence();
      if (this.state && p.type === 'presence' && p.online.join() !== this.lastOnline) this.broadcast(p);
    });
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
    if (seat !== null) await this.polledBy(seat);
    const r: Reply = { type: 'welcome', protocol: PROTOCOL, rules: RULES, seat, seq: s.seq, online: this.online(), now: this.clock() };
    return jsonResponse(r);
  }

  private async actHttp(body: string): Promise<Response> {
    if (body.length > MAX_MESSAGE) return jsonResponse({ type: 'error', code: 'too_big', message: 'move too big' }, 413);
    let b: { key?: string; cid?: string; action?: Action; rules?: number };
    try { b = JSON.parse(body); } catch { return jsonResponse({ type: 'error', code: 'bad_json', message: 'bad message' }, 400); }
    if (b.rules !== undefined) { const v = versionProblem(b.rules); if (v) return jsonResponse({ type: 'nack', cid: String(b.cid ?? ''), code: 'version', message: v, seq: 0, now: this.clock() }, 409); }
    if (!isKey(b.key)) return jsonResponse({ type: 'error', code: 'key', message: 'no player key' }, 400);
    await this.load();
    const seat = this.seatOf(b.key);
    if (seat !== null) await this.polledBy(seat);
    const r = await this.act(b.key, b.cid, b.action);
    // a player who joined over HTTP is here from now
    if (r.type === 'ack' && seat === null && r.seat === 1) await this.polledBy(1);
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
        const p = this.presence();
        this.send(ws, p);
        if (p.type === 'presence' && p.online.join() !== this.lastOnline) this.broadcast(p, ws);
        return;
      }
      if (m.type === 'sync') { await this.serial(async () => this.catchUp(ws, Math.max(0, Number(m.since) | 0))); return; }
      if (m.type === 'act') {
        const joining = m.action?.t === 'join';
        // a joining game learns its seat before the news of it (else it thinks the match is full)
        const r = await this.act(who.key, m.cid, m.action, joining ? () => {
          ws.setInfo({ ...who, seat: 1, at: this.host.now() });
          this.send(ws, { type: 'seat', seat: 1 });
        } : undefined);
        this.send(ws, r);
        if (joining && r.type === 'ack') this.broadcast(this.presence());
        return;
      }
      this.send(ws, { type: 'error', code: 'unknown', message: 'unknown message' });
    } catch (e) {
      // the move (if it was one) didn't go in: say so, so the game doesn't wait on it
      if (m.type === 'act') this.send(ws, { type: 'nack', cid: String(m.cid ?? ''), code: 'server', message: 'the server had a problem - try again', seq: this.state?.seq ?? 0, now: this.clock() });
      else this.send(ws, { type: 'error', code: 'server', message: String(e) });
    }
  }

  private async hello(ws: RoomSocket, key: unknown, since: unknown, rules: unknown) {
    if (!isKey(key)) { this.send(ws, { type: 'error', code: 'key', message: 'no player key' }); return; }
    const v = versionProblem(rules);
    if (v) { this.send(ws, { type: 'error', code: 'version', message: v }); this.drop(ws, CLOSE.version, 'version'); return; }
    // in turn with the moves: a move can't be broadcast between this game's catch-up and its first live event
    await this.serial(async () => {
      const s = (await this.load())!;
      const seat = this.seatOf(key);
      // one line per player key: an older one (another tab, a phone that slept and woke up) is closed
      for (const other of this.live()) {
        if (other !== ws && other.info()?.key === key) this.drop(other, CLOSE.replaced, 'opened elsewhere');
      }
      ws.setInfo({ key, seat, at: this.host.now() });
      const p = this.presence();
      this.send(ws, { type: 'welcome', protocol: PROTOCOL, rules: RULES, seat, seq: s.seq, online: this.online(), now: this.clock() });
      await this.catchUp(ws, Math.max(0, Number(since) | 0));
      this.broadcast(p, ws);
    });
  }

  /** A socket closed (or broke): the other player sees who is still there (nothing is stored). */
  closed(ws: RoomSocket): Promise<void> {
    if (!ws.info()?.key) return Promise.resolve();
    return this.serial(async () => {
      await this.load();
      this.broadcast(this.presence(ws), ws);
    });
  }

  alarm(): Promise<void> {
    return this.serial(() => this.expire());
  }

  private async expire(): Promise<void> {
    for (const ws of this.live()) this.drop(ws, CLOSE.expired, 'match expired');
    await this.host.storage.deleteAll();
    this.state = null;
    this.keys = null;
    this.log = [];
    this.cids = new Map();
  }

  // ----------------------------------------------------------------- moves
  /** A move from the player with this key: added to the log and sent to everyone, or refused. */
  act(key: string, cid: unknown, action: unknown, beforeBroadcast?: () => void): Promise<Reply> {
    return this.serial(() => this.actNow(key, cid, action, beforeBroadcast));
  }

  private nack(cid: string, code: string, message: string, wait?: number): Reply {
    const r: Reply = { type: 'nack', cid, code, message, seq: this.state?.seq ?? 0, now: this.clock() };
    if (wait !== undefined) r.wait = wait;
    return r;
  }

  /**
   * How long before the waiting player may add a penalty stroke or claim the
   * match: the clock counts from the move before (and its grace), whether or
   * not either player is in the match (developer, 2026-10-21: "have the move
   * clock run while the waiting player is away").
   */
  private clockLeft(s: MatchState, what: 'slow' | 'claim'): number {
    return s.clock.at + (what === 'claim' ? CLOCK.claimMs : CLOCK.penaltyMs) - this.clock();
  }

  private async actNow(key: string, cid: unknown, raw: unknown, beforeBroadcast?: () => void): Promise<Reply> {
    const s = await this.load();
    const id = typeof cid === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(cid) ? cid : null;
    if (!id) return this.nack(String(cid ?? ''), 'cid', 'no move id');
    if (!s) return this.nack(id, 'no_match', 'this match no longer exists');
    // the same move again (sent twice over a flaky line): it already counted
    const known = this.seatOf(key);
    const seen = known !== null ? this.cids.get(`${known}:${id}`) : undefined;
    if (seen !== undefined) return { type: 'ack', cid: id, seq: seen, seat: known, now: this.clock() };
    const action = cleanAction(raw);
    if (!action) return this.nack(id, 'bad_move', 'not a move this server knows');
    if (s.seq >= MAX_EVENTS) return this.nack(id, 'full', 'this match is too long');
    let by: Seat | null = known;
    let player: MatchPlayer | null = null;
    if (action.t === 'join') {
      if (this.keys && this.keys[0] === key) return this.nack(id, 'own_match', 'this is your own match: send the link to a friend');
      if (by === 1) return { type: 'ack', cid: id, seq: s.seq, seat: 1, now: this.clock() }; // already in it
      player = cleanPlayer(action.player);
      if (!player) return this.nack(id, 'name', "that name can't be used - try another");
      by = 1;
    }
    if (by === null) return this.nack(id, 'not_player', "you're watching this match");
    const honour: Seat = this.host.random() < 0.5 ? 0 : 1; // by lot (Rule 6.4a)
    const ev = { ...eventOf(by, action.t === 'join' ? { t: 'join', player: player! } : action, honour), seq: s.seq + 1, at: new Date(this.clock()).toISOString(), cid: id } as Logged;
    let next: MatchState;
    try { next = applyEvent(s, ev); } catch (e) {
      if (!(e instanceof MatchError)) throw e;
      if (e.code === 'too_soon' && (action.t === 'slow' || action.t === 'claim')) {
        const left = this.clockLeft(s, action.t);
        return this.nack(id, 'too_soon', `not yet: ${clockText(left)} to go`, Math.max(0, left));
      }
      return this.nack(id, e.code, e.message);
    }
    const before = { state: this.state, keys: this.keys, log: this.log.length };
    this.state = next;
    this.log.push(ev);
    if (action.t === 'join') this.keys = [this.keys![0], key];
    try {
      await this.save();
    } catch (e) {
      // not stored: as if it never came (the game is told, and sends it again)
      this.state = before.state;
      this.keys = before.keys;
      this.log.length = before.log;
      throw e;
    }
    this.cids.set(`${by}:${id}`, ev.seq);
    beforeBroadcast?.();
    this.broadcast({ type: 'events', events: [ev], last: true });
    await this.keepFor(next.phase === 'finished' ? DONE_DAYS : LIVE_DAYS);
    return { type: 'ack', cid: id, seq: ev.seq, seat: by, now: this.clock() };
  }

  // -------------------------------------------------------------- helpers
  /** The log after `since` (flights older than the last hole are no longer kept: a game catching up shows where the balls are). */
  private eventsSince(since: number, limit = 10_000): Logged[] {
    const out: Logged[] = [];
    for (const e of this.log) {
      if (e.seq <= since) continue;
      out.push(e);
      if (out.length >= limit) break;
    }
    return out;
  }

  private async catchUp(ws: RoomSocket, since: number) {
    const evs = this.eventsSince(since);
    if (!evs.length) { this.send(ws, { type: 'events', events: [], last: true }); return; }
    for (let i = 0; i < evs.length; i += BATCH) this.send(ws, { type: 'events', events: evs.slice(i, i + BATCH), last: i + BATCH >= evs.length });
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

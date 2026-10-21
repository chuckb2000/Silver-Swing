// The game's line to a live match (src/server/matchRoom.ts): a WebSocket that
// says who it is, catches up from the last event the game has, sends moves
// and hears everything that happens. It reconnects by itself (a phone that
// slept, a train tunnel), checks the line with keep-alives, and falls back to
// asking over HTTP every couple of seconds when a WebSocket can't be had
// (less often when nothing is happening or the page is out of sight, and not
// at all after half an hour out of sight: each question costs the site a
// request, from the same daily allowance as the leaderboards).
//
// A move is kept (in localStorage) from the moment it is made until the server
// answers it, and sent again after any reconnect or reload: the server knows
// each move by its id, so a move is never counted twice and never lost once
// made (a stroke is locked in the moment it is hit).
//
// No Phaser; the browser parts (WebSocket, fetch, storage, timers) come in
// through ClientDeps so the tests can drive it.

import { Action, CLOSE, Logged, PING, RULES, Seat } from '../systems/match/types';

/**
 * connecting: no line yet (or getting it back); online: a WebSocket; polling:
 * asking over HTTP; offline: stopped; gone: the match no longer exists;
 * elsewhere: the same player opened it in another tab or on another device
 * (this page waits until it is looked at again); version: this game and the
 * match server run different rules (a reload, or a deploy, is needed).
 */
export type LinkStatus = 'connecting' | 'online' | 'offline' | 'polling' | 'gone' | 'elsewhere' | 'version';

export interface KeyValue {
  get(k: string): string | null;
  set(k: string, v: string): void;
  del(k: string): void;
}

export interface ClientDeps {
  /** the site's address ('' in the browser: the same site) */
  base: string;
  WebSocket: { new(url: string): WebSocketLike };
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  store?: KeyValue;
  setTimeout?: (f: () => void, ms: number) => unknown;
  clearTimeout?: (h: unknown) => void;
  now?: () => number;
  random?: () => number;
  /** is the page out of sight (a background tab)? It polls less often and doesn't take the match back from another tab. */
  hidden?: () => boolean;
}

/** The parts of a WebSocket used here (the browser's and Node's both fit). */
export interface WebSocketLike {
  readyState: number;
  onopen: ((e: unknown) => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: ((e: { code?: number; reason?: string }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/** `wait`: a move on the clock refused as too early, how long until it isn't (ms). */
export type SendResult = { ok: true; seq: number } | { ok: false; code: string; message: string; wait?: number };

interface Outgoing { cid: string; action: Action; at: number }

const BACKOFF = [400, 1000, 2000, 4000, 8000, 15000];
const CONNECT_MS = 10_000;     // a WebSocket not welcomed by then (a proxy that swallows it) counts as failed
const TICK_MS = 5_000;         // the keep-alive clock
const PING_MS = 15_000;        // a keep-alive this often
const ANSWER_MS = 10_000;      // a keep-alive not answered in this long: the line is dead
const POKE_ANSWER_MS = 4_000;  // the page came back to view: the line is checked at once, and quickly
const WHO_MS = 30_000;         // who is there, asked this often
const POLL_MS = 2_000;
const POLL_QUIET_MS = 5_000;          // nothing has happened for QUIET_MS: asked less often
const QUIET_MS = 120_000;
const POLL_HIDDEN_MS = 8_000;         // a background tab asks less often (it still counts as there: the server allows 75 s)
const POLL_HIDDEN_LONG_MS = 60_000;   // out of sight for HIDDEN_LONG_MS: once a minute
const HIDDEN_LONG_MS = 5 * 60_000;
const HIDDEN_STOP_MS = 30 * 60_000;   // out of sight for half an hour: no more questions until the page is looked at
// WebSockets that never worked here (a network that blocks them) give way to HTTP after three tries; ones that
// did (a phone that lost its signal for a moment) after six, about 15 s of trying
const FAILS_BEFORE_POLL = 3;
const FAILS_BEFORE_POLL_SEEN = 6;
const RETRY_WS_MS = [5_000, 15_000, 30_000, 60_000]; // while polling, a WebSocket is tried again after these
const CID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const JSON_HEADERS = { 'content-type': 'application/json' };

export class MatchClient {
  status: LinkStatus = 'offline';
  /** this game's seat, once the server has said (null: watching, or not joined yet; a seat once had is kept) */
  seat: Seat | null = null;
  online: [boolean, boolean] = [false, false];
  /** why the line stopped, for a person ('version': what to do about it) */
  problem: string | null = null;
  /**
   * The newest entry the server's log is known to have (from its welcome, answers and events). A
   * game whose session is behind it has events still to come and offers no move until they have.
   */
  serverSeq = 0;
  /** the newest event the game has (it tells the client; the client asks for what comes after) */
  since: () => number = () => 0;
  onEvents: (evs: Logged[], caughtUp: boolean) => void = () => {};
  onStatus: (s: LinkStatus) => void = () => {};
  onPresence: (online: [boolean, boolean]) => void = () => {};
  /** the server said which seat this game has */
  onSeat: (seat: Seat) => void = () => {};
  /** a move refused by the server that no one was waiting for (made before a reload) */
  onRefused: (action: Action, code: string, message: string) => void = () => {};
  /** since when each player has been in the match, on the server's clock (the move clock counts from then at the earliest) */
  here: [number, number] = [0, 0];
  /** the server's clock less this device's (ms), from the last message that said the time */
  offset = 0;
  /** the server said the time, or who has been here since when */
  onClock: () => void = () => {};

  private ws: WebSocketLike | null = null;
  private welcomed = false;
  private stopped = true;
  private fails = 0;
  private timers = new Set<unknown>();
  private tickTimer: unknown = null;
  private connectTimer: unknown = null;
  private reconnectTimer: unknown = null;
  private pollTimer: unknown = null;
  private retryTimer: unknown = null;
  /** a keep-alive is out: the line is dead if nothing is heard by then */
  private deadline: number | null = null;
  private lastPingAt = 0;
  private whoAt = 0;
  private waiting = new Map<string, (r: SendResult) => void>();
  private outbox: Outgoing[] = [];
  private polling = false;
  private inFlight = new Set<string>();
  private everWelcomed = false;
  private wsRetries = 0;
  /** when something last happened on the match (an event came, this game made a move): polling slows when nothing does */
  private lastNews = 0;
  /** since when the page has been out of sight (0: in sight), as polling saw it */
  private hiddenSince = 0;
  /** polling stopped while the page was out of sight; looking at it again starts it */
  private parked = false;

  constructor(readonly code: string, private key: string, private deps: ClientDeps) {
    this.outbox = this.loadOutbox();
  }

  private get T() {
    return {
      set: this.deps.setTimeout ?? ((f: () => void, ms: number) => setTimeout(f, ms)),
      clear: this.deps.clearTimeout ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>)),
      now: this.deps.now ?? (() => Date.now()),
    };
  }

  private hidden(): boolean {
    try { return !!this.deps.hidden?.(); } catch { return false; }
  }

  /** The server's clock now (ms), as well as this device can tell. */
  serverNow(): number {
    return this.T.now() + this.offset;
  }

  /** A message said the server's time (`now`) and who has been here since when (`here`). */
  private learnClock(now: unknown, here?: unknown) {
    let changed = false;
    if (typeof now === 'number' && Number.isFinite(now)) {
      const o = now - this.T.now();
      if (Math.abs(o - this.offset) > 250) changed = true;
      this.offset = o;
    }
    if (Array.isArray(here) && here.length === 2 && here.every((v) => typeof v === 'number' && Number.isFinite(v)) && (here[0] !== this.here[0] || here[1] !== this.here[1])) {
      this.here = [here[0], here[1]];
      changed = true;
    }
    if (changed) this.onClock();
  }

  private later(f: () => void, ms: number): unknown {
    const h = this.T.set(() => { this.timers.delete(h); f(); }, Math.max(0, ms));
    this.timers.add(h);
    return h;
  }

  private cancel(h: unknown) {
    if (h === null || h === undefined) return;
    this.T.clear(h);
    this.timers.delete(h);
  }

  private setStatus(s: LinkStatus) {
    if (this.status === s) return;
    this.status = s;
    this.onStatus(s);
  }

  // ------------------------------------------------------------- outbox
  private get outboxKey() { return `golf:match:${this.code}:outbox`; }

  private loadOutbox(): Outgoing[] {
    try {
      const raw = this.deps.store?.get(this.outboxKey);
      const list = raw ? (JSON.parse(raw) as Outgoing[]) : [];
      return Array.isArray(list) ? list.filter((o) => o && typeof o.cid === 'string' && o.action && typeof o.action === 'object') : [];
    } catch { return []; }
  }

  private saveOutbox() {
    try {
      if (this.outbox.length) this.deps.store?.set(this.outboxKey, JSON.stringify(this.outbox));
      else this.deps.store?.del(this.outboxKey);
    } catch { /* storage full or blocked: the move still goes while this page is open */ }
  }

  /** Moves made but not yet answered (made on this page or before a reload). */
  get unanswered(): Action[] {
    return this.outbox.map((o) => o.action);
  }

  /** The same, with their ids (a page reloaded while a stroke was on its way waits for that stroke). */
  pendingMoves(): { cid: string; action: Action }[] {
    return this.outbox.map((o) => ({ cid: o.cid, action: o.action }));
  }

  /** The answer to a move still waiting for one (made before this page loaded); null if it isn't waiting. */
  waitFor(cid: string): Promise<SendResult> | null {
    if (!this.outbox.some((o) => o.cid === cid)) return null;
    return new Promise<SendResult>((res) => this.waiting.set(cid, res));
  }

  private cidCount = 0;

  /** A move's id: random, plus the time and a count (two moves never share one, whatever the random numbers do). */
  private newCid(): string {
    const r = this.deps.random ?? Math.random;
    let s = '';
    for (let i = 0; i < 10; i++) s += CID_CHARS[Math.floor(r() * CID_CHARS.length) % CID_CHARS.length];
    return `${s}${this.T.now().toString(36).slice(-6)}${(this.cidCount++).toString(36)}`.slice(0, 40);
  }

  // --------------------------------------------------------- connection
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.halt('offline');
  }

  /** Stop everything (timers, the socket, polling) and say why. */
  private halt(s: LinkStatus) {
    this.stopped = true;
    for (const h of [...this.timers]) this.cancel(h);
    this.tickTimer = this.connectTimer = this.reconnectTimer = this.pollTimer = this.retryTimer = null;
    this.polling = false;
    this.deadline = null;
    const ws = this.ws;
    this.ws = null;
    this.welcomed = false;
    if (ws) { ws.onclose = ws.onmessage = ws.onerror = ws.onopen = null; try { ws.close(1000, 'bye'); } catch { /* closed */ } }
    this.setStatus(s);
  }

  /** The page came back (tab shown, network back): check the line now instead of waiting. */
  poke() {
    if (this.status === 'elsewhere') { if (!this.hidden()) this.takeBack(); return; }
    if (this.stopped) return;
    if (this.ws && this.welcomed) {
      // a phone that slept keeps a socket that looks open but is dead: a keep-alive, and a quick verdict
      this.sendPing(POKE_ANSWER_MS);
      this.tick(POKE_ANSWER_MS);
      return;
    }
    if (this.polling) {
      // the network may be back: a WebSocket too. Polling stopped out of sight starts again, quickly (the
      // player is back: a move is likely)
      this.parked = false;
      this.lastNews = this.T.now();
      void this.pollOnce();
      if (!this.ws) this.connect();
      if (this.retryTimer === null) this.scheduleWsRetry();
      return;
    }
    if (!this.ws) { this.fails = 0; this.connect(); }
  }

  /** Play the match on this page again (it was opened elsewhere, which now stops). */
  takeBack() {
    if (this.status !== 'elsewhere') return;
    // moves another tab made meanwhile (they share the storage): this page answers for them too
    const seen = new Set(this.outbox.map((o) => o.cid));
    for (const o of this.loadOutbox()) if (!seen.has(o.cid)) this.outbox.push(o);
    this.fails = 0;
    this.problem = null;
    this.setStatus('offline');
    this.start();
  }

  private wsUrl(): string {
    const b = this.deps.base || (typeof location !== 'undefined' ? location.origin : '');
    return `${b.replace(/^http/, 'ws')}/api/match/${this.code}/ws`;
  }

  private connect() {
    if (this.stopped || this.ws) return;
    this.cancel(this.reconnectTimer); this.reconnectTimer = null;
    if (!this.polling) this.setStatus('connecting');
    let ws: WebSocketLike;
    try { ws = new this.deps.WebSocket(this.wsUrl()); } catch { this.lost(); return; }
    this.ws = ws;
    this.welcomed = false;
    // a socket that never opens, or opens and never hears the welcome: give up on it
    this.cancel(this.connectTimer);
    this.connectTimer = this.later(() => {
      this.connectTimer = null;
      if (this.ws === ws && !this.welcomed) this.dropLine(ws, 'no welcome');
    }, CONNECT_MS);
    ws.onopen = () => {
      try { ws.send(JSON.stringify({ type: 'hello', key: this.key, since: this.since(), rules: RULES })); } catch { /* onclose follows */ }
    };
    ws.onmessage = (e) => { if (this.ws === ws) this.onMessage(typeof e.data === 'string' ? e.data : String(e.data)); };
    ws.onerror = () => { /* onclose follows */ };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.welcomed = false;
      this.deadline = null;
      this.cancel(this.tickTimer); this.tickTimer = null;
      this.cancel(this.connectTimer); this.connectTimer = null;
      const code = e?.code;
      if (code === CLOSE.noMatch || code === CLOSE.expired) { this.gone(); return; }
      if (code === CLOSE.replaced) { this.halt('elsewhere'); return; }
      if (code === CLOSE.version) { this.versionProblem(this.problem ?? 'this game and the match server differ - reload'); return; }
      this.lost();
    };
  }

  /** Close a socket that is no use (dead, or never welcomed) and get another line. */
  private dropLine(ws: WebSocketLike, reason: string) {
    if (this.ws !== ws) return;
    this.ws = null;
    this.welcomed = false;
    this.deadline = null;
    this.cancel(this.tickTimer); this.tickTimer = null;
    this.cancel(this.connectTimer); this.connectTimer = null;
    ws.onclose = ws.onmessage = ws.onerror = ws.onopen = null;
    try { ws.close(4000, reason); } catch { /* gone */ }
    this.lost();
  }

  private gone() {
    this.halt('gone');
    for (const [, res] of this.waiting) res({ ok: false, code: 'no_match', message: 'this match no longer exists' });
    this.waiting.clear();
  }

  /** This game and the server run different rules: nothing more can be played until one is updated. */
  private versionProblem(message: string) {
    this.problem = message;
    this.halt('version'); // moves stay in the outbox: the updated page sends them
  }

  /** The WebSocket failed or dropped: try again after a pause, or ask over HTTP. */
  private lost() {
    if (this.stopped) return;
    this.fails++;
    if (this.polling) return; // polling carries on; a WebSocket is tried again later
    if (this.fails >= (this.everWelcomed ? FAILS_BEFORE_POLL_SEEN : FAILS_BEFORE_POLL)) { this.startPolling(); return; }
    this.setStatus('connecting');
    const base = BACKOFF[Math.min(this.fails - 1, BACKOFF.length - 1)];
    const jitter = (this.deps.random ?? Math.random)() * 0.3 * base;
    this.cancel(this.reconnectTimer);
    this.reconnectTimer = this.later(() => { this.reconnectTimer = null; this.connect(); }, base + jitter);
  }

  private seen(seq: unknown) {
    if (typeof seq === 'number' && Number.isInteger(seq) && seq > this.serverSeq) this.serverSeq = seq;
  }

  private onMessage(raw: string) {
    this.deadline = null; // anything heard: the line is alive
    let m: { type?: string; [k: string]: unknown };
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'welcome' || m.type === 'ack' || m.type === 'nack') this.seen(m.seq);
    if (m.type === 'events' && Array.isArray(m.events)) {
      for (const e of m.events) this.seen((e as Logged).seq);
      if (m.events.length) this.lastNews = this.T.now();
    }
    if (m.type === 'welcome' || m.type === 'presence' || m.type === 'ack' || m.type === 'nack') this.learnClock(m.now, m.here);
    switch (m.type) {
      case 'pong': return;
      case 'welcome': {
        this.welcomed = true;
        this.everWelcomed = true;
        this.fails = 0;
        this.cancel(this.connectTimer); this.connectTimer = null;
        if (this.polling) this.stopPolling();
        this.learnSeat(m.seat);
        this.setOnline(m.online);
        this.setStatus('online');
        this.lastPingAt = this.whoAt = this.T.now();
        this.tick();
        for (const o of this.outbox) this.sendRaw(JSON.stringify({ type: 'act', cid: o.cid, action: o.action }));
        return;
      }
      case 'events': this.onEvents(Array.isArray(m.events) ? (m.events as Logged[]) : [], m.last !== false); return;
      case 'ack': this.learnSeat(m.seat); this.answered(String(m.cid), { ok: true, seq: Number(m.seq) }); return;
      case 'nack': this.answered(String(m.cid), nackOf(m as { code?: unknown; message?: unknown; wait?: unknown })); return;
      case 'seat': this.learnSeat(m.seat); return;
      case 'presence': this.setOnline(m.online); return;
      case 'error':
        if (m.code === 'no_match') this.gone();
        else if (m.code === 'version') this.versionProblem(String(m.message ?? ''));
        return;
      default:
    }
  }

  /** The seat the server gave this game (never taken away: a player stays in their match). */
  private learnSeat(seat: unknown) {
    if (seat !== 0 && seat !== 1) return;
    if (this.seat === seat) return;
    this.seat = seat;
    this.onSeat(seat);
  }

  private setOnline(o: unknown) {
    if (!Array.isArray(o) || o.length !== 2 || typeof o[0] !== 'boolean' || typeof o[1] !== 'boolean') return;
    if (o[0] === this.online[0] && o[1] === this.online[1]) return;
    this.online = [o[0], o[1]];
    this.onPresence(this.online);
  }

  private answered(cid: string, r: SendResult) {
    const i = this.outbox.findIndex((o) => o.cid === cid);
    const o = i >= 0 ? this.outbox.splice(i, 1)[0] : null;
    if (i >= 0) this.saveOutbox();
    const res = this.waiting.get(cid);
    this.waiting.delete(cid);
    if (res) res(r);
    else if (!r.ok && o) this.onRefused(o.action, r.code, r.message);
  }

  private sendPing(answerMs: number) {
    if (!this.sendRaw(PING)) return;
    const now = this.T.now();
    this.lastPingAt = now;
    this.deadline = this.deadline === null ? now + answerMs : Math.min(this.deadline, now + answerMs);
  }

  /**
   * The keep-alive clock. A keep-alive goes every 15 s; the line is dead when
   * one goes unanswered for 10 s. Judged from when the keep-alive went, not
   * from the last message: a background tab's timers may run once a minute,
   * and a quiet line there is not a dead one.
   */
  private tick(ms = TICK_MS) {
    this.cancel(this.tickTimer);
    this.tickTimer = this.later(() => {
      this.tickTimer = null;
      const ws = this.ws;
      if (!ws || !this.welcomed) return;
      const now = this.T.now();
      if (this.deadline !== null && now >= this.deadline) { this.dropLine(ws, 'no answer'); return; }
      if (this.deadline === null && now - this.lastPingAt >= PING_MS) this.sendPing(ANSWER_MS);
      // who is there, now and then: the server tells only when someone comes or goes cleanly, and a phone
      // that slept just goes quiet
      if (now - this.whoAt >= WHO_MS) { this.whoAt = now; this.sendRaw('{"type":"who"}'); }
      this.tick(this.deadline !== null ? Math.max(50, Math.min(TICK_MS, this.deadline - now)) : TICK_MS);
    }, ms);
  }

  private sendRaw(text: string): boolean {
    if (!this.ws || this.ws.readyState !== 1) return false;
    try { this.ws.send(text); return true; } catch { return false; }
  }

  /** Ask again for everything after `since` (the game found a gap). */
  resync() {
    if (this.ws && this.welcomed) this.sendRaw(JSON.stringify({ type: 'sync', since: this.since() }));
    else if (this.polling) void this.pollOnce();
  }

  /** A move has waited long for its answer: the unanswered moves go again (each counts once), and the log is asked for. */
  nudge() {
    if (this.ws && this.welcomed) for (const o of this.outbox) this.sendRaw(JSON.stringify({ type: 'act', cid: o.cid, action: o.action }));
    else if (this.polling) for (const o of this.outbox) void this.postAct(o);
    this.resync();
  }

  // ----------------------------------------------------------------- moves
  /** An id for the next move (to tell its event from the others when it comes back). */
  moveId(): string {
    return this.newCid();
  }

  /** Make a move: kept until the server answers (through any reconnects), then resolved with its place in the log or the reason it was refused. */
  send(action: Action, cid: string = this.newCid()): Promise<SendResult> {
    // a line stopped for good (the match gone, opened elsewhere, the versions differ): no move is made.
    // Kept, it would go later as a move nobody meant (a swing that ran out under the panel)
    if (this.status === 'gone' || this.status === 'elsewhere' || this.status === 'version') {
      const why = this.status === 'gone' ? 'this match no longer exists' : this.status === 'elsewhere' ? 'the match is open elsewhere' : this.problem ?? 'reload to update';
      return Promise.resolve({ ok: false, code: this.status === 'gone' ? 'no_match' : this.status, message: why });
    }
    const o = { cid, action, at: this.T.now() };
    this.lastNews = o.at;
    this.outbox.push(o);
    this.saveOutbox(); // before it goes: a reload a moment later still sends it
    const p = new Promise<SendResult>((res) => this.waiting.set(cid, res));
    if (this.welcomed) this.sendRaw(JSON.stringify({ type: 'act', cid, action }));
    else if (this.polling) void this.postAct(o);
    return p;
  }

  // ------------------------------------------------------------ HTTP polling
  private startPolling() {
    this.polling = true;
    this.setStatus('polling');
    void this.helloHttp();
    void this.pollOnce();
    for (const o of this.outbox) void this.postAct(o);
    this.wsRetries = 0;
    this.scheduleWsRetry();
  }

  private stopPolling() {
    this.polling = false;
    this.cancel(this.pollTimer); this.pollTimer = null;
    this.cancel(this.retryTimer); this.retryTimer = null;
  }

  private scheduleWsRetry() {
    this.cancel(this.retryTimer);
    this.retryTimer = this.later(() => this.retryWs(), RETRY_WS_MS[Math.min(this.wsRetries++, RETRY_WS_MS.length - 1)]);
  }

  private retryWs() {
    this.retryTimer = null;
    if (this.stopped || !this.polling || this.parked) return; // out of sight for long: tried again when looked at
    this.connect(); // stays polling until a welcome arrives
    this.scheduleWsRetry();
  }

  private url(what: string) {
    return `${this.deps.base}/api/match/${this.code}/${what}`;
  }

  /** Over HTTP: which seat this game has, and who is there (the WebSocket's welcome says the same). */
  private async helloHttp() {
    try {
      const res = await this.deps.fetch(this.url('hello'), { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ key: this.key, rules: RULES }) });
      const j = (await res.json().catch(() => null)) as { type?: string; code?: string; message?: string; seat?: unknown; online?: unknown } | null;
      if (this.stopped) return;
      if (res.status === 404 || j?.code === 'no_match') { this.gone(); return; }
      if (j?.code === 'version') { this.versionProblem(String(j.message ?? '')); return; }
      if (j?.type === 'welcome') {
        this.learnSeat(j.seat);
        this.setOnline(j.online);
        this.seen((j as { seq?: unknown }).seq);
        this.learnClock((j as { now?: unknown }).now, (j as { here?: unknown }).here);
      }
    } catch { /* offline: the next poll tries */ }
  }

  private async pollOnce() {
    if (this.stopped || !this.polling) return;
    this.cancel(this.pollTimer); this.pollTimer = null;
    let more = false;
    try {
      // the key in a header, not the address (addresses get logged); the server's answers say no-store. A
      // background tab says so: it asks once a minute and still counts as there
      const headers: Record<string, string> = { 'x-match-key': this.key };
      if (this.hidden()) headers['x-match-hidden'] = '1';
      const res = await this.deps.fetch(`${this.url('events')}?since=${this.since()}`, { headers });
      if (this.stopped || !this.polling) return;
      if (res.status === 404) { this.gone(); return; }
      if (res.ok) {
        const j = (await res.json()) as { events?: Logged[]; more?: boolean; online?: unknown; seat?: unknown; seq?: unknown; now?: unknown; here?: unknown };
        if (this.stopped || !this.polling) return;
        this.setStatus('polling');
        this.seen(j.seq);
        this.learnSeat(j.seat);
        this.setOnline(j.online);
        this.learnClock(j.now, j.here);
        more = !!j.more;
        const evs = Array.isArray(j.events) ? j.events : [];
        if (evs.length) this.lastNews = this.T.now();
        this.onEvents(evs, !more);
        // moves still unanswered (an answer lost on the way): again; each counts once
        for (const o of this.outbox) void this.postAct(o);
      } else this.setStatus('connecting');
    } catch { if (!this.stopped && this.polling) this.setStatus('connecting'); /* offline: try again */ }
    if (this.stopped || !this.polling) return;
    const wait = more ? 0 : this.pollDelay();
    if (wait === null) { this.parked = true; return; } // out of sight for half an hour: poke() starts it again
    this.pollTimer = this.later(() => void this.pollOnce(), wait);
  }

  /**
   * How long until the next question: 2 s, 5 s when nothing has happened for
   * two minutes, 8 s out of sight, a minute after five minutes out of sight,
   * and none after half an hour (null) until the page is looked at again.
   */
  private pollDelay(): number | null {
    const now = this.T.now();
    if (this.hidden()) {
      if (!this.hiddenSince) this.hiddenSince = now;
      const h = now - this.hiddenSince;
      if (h >= HIDDEN_STOP_MS) return null;
      return h >= HIDDEN_LONG_MS ? POLL_HIDDEN_LONG_MS : POLL_HIDDEN_MS;
    }
    this.hiddenSince = 0;
    return now - this.lastNews >= QUIET_MS ? POLL_QUIET_MS : POLL_MS;
  }

  private async postAct(o: Outgoing) {
    if (this.inFlight.has(o.cid)) return;
    this.inFlight.add(o.cid);
    let answered = false;
    try {
      const res = await this.deps.fetch(this.url('act'), {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ key: this.key, cid: o.cid, action: o.action, rules: RULES }),
      });
      const j = (await res.json().catch(() => null)) as { type?: string; cid?: string; seq?: number; seat?: unknown; code?: string; message?: string; now?: unknown; wait?: unknown } | null;
      if (j?.type === 'ack' || j?.type === 'nack') { this.seen(j.seq); this.learnClock(j.now); }
      if (j?.type === 'nack' && j.code === 'version') this.versionProblem(String(j.message ?? ''));
      else if (j?.type === 'ack') { this.learnSeat(j.seat); this.answered(o.cid, { ok: true, seq: Number(j.seq) }); answered = true; }
      else if (j?.type === 'nack') { this.answered(o.cid, nackOf(j)); answered = true; }
      else if (res.status === 404) this.gone();
    } catch { /* offline: sent again on the next poll or connection */ } finally {
      this.inFlight.delete(o.cid);
    }
    if (answered && this.polling) void this.pollOnce(); // the move's event at once
  }
}

/** A refusal as the game reads it (`wait`: a move on the clock made too early, how long until it isn't). */
function nackOf(m: { code?: unknown; message?: unknown; wait?: unknown }): SendResult {
  const r: SendResult = { ok: false, code: String(m.code), message: String(m.message ?? '') };
  if (typeof m.wait === 'number' && Number.isFinite(m.wait)) r.wait = m.wait;
  return r;
}

/** localStorage as the client's store (blocked storage: nothing kept). */
export const browserStore: KeyValue = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* full or blocked */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

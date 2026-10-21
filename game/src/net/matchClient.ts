// The game's line to a live match (src/server/matchRoom.ts): a WebSocket that
// says who it is, catches up from the last event the game has, sends moves
// and hears everything that happens. It reconnects by itself (a phone that
// slept, a train tunnel), answers keep-alives, and falls back to asking over
// HTTP every couple of seconds when a WebSocket can't be had.
//
// A move is kept (in localStorage) from the moment it is made until the server
// answers it, and sent again after any reconnect or reload: the server knows
// each move by its id, so a move is never counted twice and never lost once
// made (developer, 2026-10-20: a stroke is locked in the moment it is hit).
//
// No Phaser; the browser parts (WebSocket, fetch, storage, timers) come in
// through ClientDeps so the tests can drive it.

import { Action, Logged, PING, Seat } from '../systems/match/types';

export type LinkStatus = 'connecting' | 'online' | 'offline' | 'polling' | 'gone';

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

export type SendResult = { ok: true; seq: number } | { ok: false; code: string; message: string };

interface Outgoing { cid: string; action: Action; at: number }

const BACKOFF = [400, 1000, 2000, 4000, 8000, 15000];
const PING_MS = 15_000;
const DEAD_MS = 35_000;       // nothing heard for this long: the line is dead, start again
const POLL_MS = 2_000;
const WS_FAILS_BEFORE_POLL = 3;
const RETRY_WS_MS = 60_000;   // while polling, try a WebSocket again this often
const CID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export class MatchClient {
  status: LinkStatus = 'offline';
  /** this game's seat, once the server has said (null: watching) */
  seat: Seat | null = null;
  online: [boolean, boolean] = [false, false];
  /** the newest event the game has (it tells the client; the client asks for what comes after) */
  since: () => number = () => 0;
  onEvents: (evs: Logged[], caughtUp: boolean) => void = () => {};
  onStatus: (s: LinkStatus) => void = () => {};
  onPresence: (online: [boolean, boolean]) => void = () => {};
  onWelcome: (seat: Seat | null, seq: number) => void = () => {};
  /** a move refused by the server that no one was waiting for (made before a reload) */
  onRefused: (action: Action, code: string, message: string) => void = () => {};

  private ws: WebSocketLike | null = null;
  private welcomed = false;
  private stopped = true;
  private fails = 0;
  private everOpened = false;
  private lastHeard = 0;
  private timers = new Set<unknown>();
  private pingTimer: unknown = null;
  private pollTimer: unknown = null;
  private retryTimer: unknown = null;
  private waiting = new Map<string, (r: SendResult) => void>();
  private outbox: Outgoing[] = [];
  private polling = false;

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

  private later(f: () => void, ms: number): unknown {
    const h = this.T.set(() => { this.timers.delete(h); f(); }, ms);
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
      return Array.isArray(list) ? list.filter((o) => o && typeof o.cid === 'string' && o.action) : [];
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
    this.stopped = true;
    for (const h of [...this.timers]) this.cancel(h);
    this.pingTimer = this.pollTimer = this.retryTimer = null;
    this.polling = false;
    const ws = this.ws;
    this.ws = null;
    this.welcomed = false;
    if (ws) { ws.onclose = ws.onmessage = ws.onerror = ws.onopen = null; try { ws.close(1000, 'bye'); } catch { /* closed */ } }
    this.setStatus('offline');
  }

  /** The page came back (tab shown, network back): check the line now instead of waiting. */
  poke() {
    if (this.stopped) return;
    if (this.ws && this.welcomed) { this.sendRaw(PING); return; }
    if (!this.ws) { this.fails = 0; this.connect(); }
  }

  private wsUrl(): string {
    const b = this.deps.base || (typeof location !== 'undefined' ? location.origin : '');
    return `${b.replace(/^http/, 'ws')}/api/match/${this.code}/ws`;
  }

  private connect() {
    if (this.stopped || this.ws) return;
    this.setStatus(this.polling ? 'polling' : 'connecting');
    let ws: WebSocketLike;
    try { ws = new this.deps.WebSocket(this.wsUrl()); } catch { this.lost(); return; }
    this.ws = ws;
    this.welcomed = false;
    ws.onopen = () => {
      this.everOpened = true;
      this.lastHeard = this.T.now();
      ws.send(JSON.stringify({ type: 'hello', key: this.key, since: this.since() }));
    };
    ws.onmessage = (e) => this.onMessage(typeof e.data === 'string' ? e.data : String(e.data));
    ws.onerror = () => { /* onclose follows */ };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.welcomed = false;
      this.cancel(this.pingTimer); this.pingTimer = null;
      if (e?.code === 4004 || e?.code === 4010) { this.gone(); return; }
      this.lost();
    };
  }

  private gone() {
    this.stopped = true;
    for (const h of [...this.timers]) this.cancel(h);
    this.setStatus('gone');
    for (const [, res] of this.waiting) res({ ok: false, code: 'no_match', message: 'this match no longer exists' });
    this.waiting.clear();
  }

  /** The WebSocket failed or dropped: try again after a pause, or ask over HTTP. */
  private lost() {
    if (this.stopped) return;
    this.fails++;
    if (!this.everOpened && this.fails >= WS_FAILS_BEFORE_POLL && !this.polling) { this.startPolling(); return; }
    if (this.polling) return; // polling carries on; a WebSocket is tried again later
    this.setStatus('connecting');
    const base = BACKOFF[Math.min(this.fails - 1, BACKOFF.length - 1)];
    const jitter = (this.deps.random ?? Math.random)() * 0.3 * base;
    this.later(() => this.connect(), base + jitter);
  }

  private onMessage(raw: string) {
    this.lastHeard = this.T.now();
    let m: { type?: string; [k: string]: unknown };
    try { m = JSON.parse(raw); } catch { return; }
    switch (m.type) {
      case 'pong': return;
      case 'welcome': {
        this.welcomed = true;
        this.fails = 0;
        if (this.polling) this.stopPolling();
        this.seat = (m.seat as Seat | null) ?? null;
        this.online = (m.online as [boolean, boolean]) ?? [false, false];
        this.setStatus('online');
        this.onWelcome(this.seat, Number(m.seq) || 0);
        this.onPresence(this.online);
        this.heartbeat();
        for (const o of this.outbox) this.sendRaw(JSON.stringify({ type: 'act', cid: o.cid, action: o.action }));
        return;
      }
      case 'events': this.onEvents((m.events as Logged[]) ?? [], m.last !== false); return;
      case 'ack': this.answered(String(m.cid), { ok: true, seq: Number(m.seq) }); return;
      case 'nack': this.answered(String(m.cid), { ok: false, code: String(m.code), message: String(m.message ?? '') }); return;
      case 'seat': this.seat = (m.seat as Seat | null) ?? null; this.onWelcome(this.seat, Number(m.seq) || 0); return;
      case 'presence': this.online = (m.online as [boolean, boolean]) ?? this.online; this.onPresence(this.online); return;
      case 'error':
        if (m.code === 'no_match') this.gone();
        return;
      default:
    }
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

  private heartbeat() {
    this.cancel(this.pingTimer);
    this.pingTimer = this.later(() => {
      this.pingTimer = null;
      if (!this.ws || !this.welcomed) return;
      if (this.T.now() - this.lastHeard > DEAD_MS) {
        // the line went quiet (a phone asleep, a dead Wi-Fi): drop it and start again
        const ws = this.ws;
        this.ws = null;
        this.welcomed = false;
        ws.onclose = ws.onmessage = ws.onerror = ws.onopen = null;
        try { ws.close(4000, 'no answer'); } catch { /* gone */ }
        this.lost();
        return;
      }
      this.sendRaw(PING);
      this.heartbeat();
    }, PING_MS);
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

  // ----------------------------------------------------------------- moves
  /** An id for the next move (to tell its event from the others when it comes back). */
  moveId(): string {
    return this.newCid();
  }

  /** Make a move: kept until the server answers (through any reconnects), then resolved with its place in the log or the reason it was refused. */
  send(action: Action, cid: string = this.newCid()): Promise<SendResult> {
    this.outbox.push({ cid, action, at: this.T.now() });
    this.saveOutbox(); // before it goes: a reload a moment later still sends it
    const p = new Promise<SendResult>((res) => this.waiting.set(cid, res));
    if (this.welcomed) this.sendRaw(JSON.stringify({ type: 'act', cid, action }));
    else if (this.polling) void this.postAct({ cid, action, at: 0 });
    return p;
  }

  // ------------------------------------------------------------ HTTP polling
  private startPolling() {
    this.polling = true;
    this.setStatus('polling');
    for (const o of this.outbox) void this.postAct(o);
    void this.pollOnce();
    this.retryTimer = this.later(() => this.retryWs(), RETRY_WS_MS);
  }

  private stopPolling() {
    this.polling = false;
    this.cancel(this.pollTimer); this.pollTimer = null;
    this.cancel(this.retryTimer); this.retryTimer = null;
  }

  private retryWs() {
    this.retryTimer = null;
    if (this.stopped || !this.polling) return;
    this.everOpened = false;
    this.connect(); // stays polling until a welcome arrives
    this.retryTimer = this.later(() => this.retryWs(), RETRY_WS_MS);
  }

  private async pollOnce() {
    if (this.stopped || !this.polling) return;
    this.cancel(this.pollTimer); this.pollTimer = null;
    try {
      const res = await this.deps.fetch(`${this.deps.base}/api/match/${this.code}/events?since=${this.since()}`); // the server's answers say no-store
      if (res.status === 404) { this.gone(); return; }
      if (res.ok) {
        const j = (await res.json()) as { events?: Logged[] };
        this.setStatus('polling');
        this.onEvents(j.events ?? [], true);
      }
    } catch { /* offline: try again */ }
    if (!this.stopped && this.polling) this.pollTimer = this.later(() => void this.pollOnce(), POLL_MS);
  }

  private async postAct(o: Outgoing) {
    try {
      const res = await this.deps.fetch(`${this.deps.base}/api/match/${this.code}/act`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: this.key, cid: o.cid, action: o.action }),
      });
      const j = (await res.json().catch(() => null)) as { type?: string; cid?: string; seq?: number; code?: string; message?: string } | null;
      if (j?.type === 'ack') this.answered(o.cid, { ok: true, seq: Number(j.seq) });
      else if (j?.type === 'nack') this.answered(o.cid, { ok: false, code: String(j.code), message: String(j.message ?? '') });
      void this.pollOnce();
    } catch { /* offline: sent again on the next connection */ }
  }
}

/** localStorage as the client's store (blocked storage: nothing kept). */
export const browserStore: KeyValue = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* full or blocked */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

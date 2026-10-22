// The game's line to the challenge lobby (src/server/lobby.ts): one WebSocket
// kept open while the game is, said hello on with the player key. It keeps the
// lobby's picture (the open posts, this player's own post, the offers to it and
// the offers this player has out) and tells its listeners what changed and
// what just happened. A line that drops is opened again (sooner when the tab
// comes back into sight). Written against small interfaces so the unit tests
// can run it against the lobby with a fake network.

import type { WebSocketLike } from './matchClient';
import { ChallengeOffer, ChallengePost, LOBBY, LobbyAction, LobbyNews } from '../systems/match/lobby';
import { PING } from '../systems/match/types';

export interface LobbyDeps {
  /** the site's address ('' in the browser: the same site) */
  base: string;
  WebSocket: { new(url: string): WebSocketLike };
  setTimeout?: (f: () => void, ms: number) => unknown;
  clearTimeout?: (h: unknown) => void;
  setInterval?: (f: () => void, ms: number) => unknown;
  clearInterval?: (h: unknown) => void;
  now?: () => number;
}

/** What just happened, for the popups (the picture itself is read from the client). */
export type LobbyEvent =
  | { kind: 'posted'; post: ChallengePost; mine: boolean }
  | { kind: 'offer'; offer: ChallengeOffer }
  | { kind: 'reply'; offer: ChallengeOffer | null; id: string; accepted: boolean; why?: string }
  | { kind: 'error'; code: string; message: string };

const PING_MS = 25_000;
const RETRY_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

export class LobbyClient {
  posts: ChallengePost[] = [];
  /** this player's open post (its id), if any */
  mine: string | null = null;
  /** offers to this player's post */
  offers: ChallengeOffer[] = [];
  /** offers this player has out */
  sent: ChallengeOffer[] = [];
  online = 0;
  /** the lobby's clock minus this game's (ms): post times are the lobby's */
  skew = 0;
  /** the line is open and the lobby has said welcome */
  ready = false;
  /** the lobby runs another version: stopped for good (a reload fixes it) */
  stale = false;

  private ws: WebSocketLike | null = null;
  private key = '';
  private stopped = true;
  private tries = 0;
  private retry: unknown = null;
  private pinger: unknown = null;
  private changed = new Set<() => void>();
  private events = new Set<(e: LobbyEvent) => void>();

  constructor(private deps: LobbyDeps) {}

  private now() { return (this.deps.now ?? Date.now)(); }
  /** the lobby's time now */
  lobbyNow() { return this.now() + this.skew; }

  /** Open the line (again) for this player key. */
  start(key: string) {
    if (!this.stopped && key === this.key) return;
    this.key = key;
    this.stopped = false;
    this.tries = 0;
    this.drop();
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.drop();
  }

  /** Back in sight: a line that dropped meanwhile is opened at once. */
  wake() {
    if (this.stopped || this.stale || this.ws) return;
    this.tries = 0;
    this.connect();
  }

  onChange(f: () => void): () => void { this.changed.add(f); return () => this.changed.delete(f); }
  onEvent(f: (e: LobbyEvent) => void): () => void { this.events.add(f); return () => this.events.delete(f); }

  private changedNow() { for (const f of [...this.changed]) { try { f(); } catch (e) { console.error(e); } } }
  private emit(e: LobbyEvent) { for (const f of [...this.events]) { try { f(e); } catch (err) { console.error(err); } } }

  /** Send an action; false when the line isn't open (the caller says so). */
  send(a: Exclude<LobbyAction, { type: 'hello' }>): boolean {
    if (!this.ws || !this.ready || this.ws.readyState !== 1) return false;
    try { this.ws.send(JSON.stringify(a)); return true; } catch { return false; }
  }

  /** The posts still open by the lobby's clock (a post past its time may not have been closed yet). */
  openPosts(): ChallengePost[] {
    const t = this.lobbyNow();
    return this.posts.filter((p) => p.until > t);
  }

  // ---------------------------------------------------------------- line
  private url(): string {
    const b = this.deps.base || (typeof location !== 'undefined' ? location.origin : '');
    return `${b.replace(/^http/, 'ws')}/api/lobby/ws`;
  }

  private connect() {
    if (this.stopped || this.stale || this.ws) return;
    let ws: WebSocketLike;
    try { ws = new this.deps.WebSocket(this.url()); } catch { this.later(); return; }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      try { ws.send(JSON.stringify({ type: 'hello', key: this.key, v: LOBBY.version })); } catch { /* closes */ }
    };
    ws.onmessage = (e) => { if (this.ws === ws && typeof e.data === 'string') this.receive(e.data); };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.ready = false;
      this.stopPing();
      if (e.code === 4012) { this.stale = true; this.changedNow(); return; }
      this.changedNow();
      this.later();
    };
    ws.onerror = () => { /* onclose follows */ };
  }

  private later() {
    if (this.stopped || this.stale) return;
    const ms = RETRY_MS[Math.min(this.tries, RETRY_MS.length - 1)];
    this.tries++;
    const st = this.deps.setTimeout ?? ((f: () => void, t: number) => setTimeout(f, t));
    this.retry = st(() => { this.retry = null; this.connect(); }, ms);
  }

  private drop() {
    if (this.retry !== null) { (this.deps.clearTimeout ?? ((h: unknown) => clearTimeout(h as number)))(this.retry); this.retry = null; }
    this.stopPing();
    const ws = this.ws;
    this.ws = null;
    this.ready = false;
    if (ws) { try { ws.close(1000, 'bye'); } catch { /* closed */ } }
  }

  private startPing() {
    this.stopPing();
    const si = this.deps.setInterval ?? ((f: () => void, t: number) => setInterval(f, t));
    this.pinger = si(() => { try { this.ws?.send(PING); } catch { /* closes */ } }, PING_MS);
  }

  private stopPing() {
    if (this.pinger !== null) { (this.deps.clearInterval ?? ((h: unknown) => clearInterval(h as number)))(this.pinger); this.pinger = null; }
  }

  // ---------------------------------------------------------------- news
  private receive(raw: string) {
    let n: LobbyNews;
    try { n = JSON.parse(raw); } catch { return; }
    switch (n.type) {
      case 'welcome':
        this.ready = true;
        this.tries = 0;
        this.skew = n.now - this.now();
        this.posts = n.posts;
        this.mine = n.mine;
        this.offers = n.offers;
        this.sent = n.sent;
        this.online = n.online;
        this.startPing();
        break;
      case 'posted': {
        this.skew = n.now - this.now();
        this.posts = [...this.posts.filter((p) => p.id !== n.post.id), n.post];
        const mine = n.mine === true; // this player's own (from this game or another of theirs)
        if (mine) { this.mine = n.post.id; this.offers = []; }
        this.emit({ kind: 'posted', post: n.post, mine });
        break;
      }
      case 'closed':
        this.posts = this.posts.filter((p) => p.id !== n.post);
        if (this.mine === n.post) { this.mine = null; this.offers = []; }
        break;
      case 'offer':
        this.offers = [...this.offers.filter((o) => o.id !== n.offer.id), n.offer];
        this.emit({ kind: 'offer', offer: n.offer });
        break;
      case 'offerGone':
        this.offers = this.offers.filter((o) => o.id !== n.offer);
        break;
      case 'sent':
        this.sent = [...this.sent.filter((o) => o.id !== n.offer.id), n.offer];
        break;
      case 'reply': {
        const o = this.sent.find((x) => x.id === n.offer) ?? null;
        this.sent = this.sent.filter((x) => x.id !== n.offer);
        this.emit({ kind: 'reply', offer: o, id: n.offer, accepted: n.accepted, why: n.why });
        break;
      }
      case 'online':
        this.online = n.n;
        break;
      case 'error':
        this.emit({ kind: 'error', code: n.code, message: n.message });
        break;
    }
    this.changedNow();
  }

  // ------------------------------------------------------------- actions
  post(name: string, course: string | null): boolean { return this.send({ type: 'post', name, course }); }

  cancel(): boolean { return this.send({ type: 'cancel' }); }

  offer(name: string, post: string, code: string, course: string, line: string): boolean {
    return this.send({ type: 'offer', name, post, code, course, line });
  }

  withdraw(offer: string): boolean { return this.send({ type: 'withdraw', offer }); }

  answer(offer: string, accept: boolean): boolean { return this.send({ type: 'answer', offer, accept }); }
}

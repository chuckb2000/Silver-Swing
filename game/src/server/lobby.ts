// The lobby for "open to a challenge" (src/systems/match/lobby.ts): one
// Durable Object (the match Worker's object named "lobby") that every open game
// keeps a WebSocket to. It holds the open posts and the offers to them, and
// passes the news on: a new post to everyone, an offer to its poster, the
// answer to the one who offered. The matches themselves are ordinary live
// matches (src/server/matchRoom.ts); the lobby only carries their codes.
//
// Posts and offers are stored (one record, written on each change: a few a day)
// so the object can sleep between them; who is online is the open sockets.
// Written against the same small interfaces as the match room, so it runs in
// the unit tests with fakes; game/match-worker/src/index.ts fits it to Cloudflare.

import { DEFAULT_NAME, nameAllowed, tidyName } from '../save/names';
import { isMatchCode, jsonResponse, RoomStorage } from './matchRoom';
import { ChallengeOffer, ChallengePost, isCourseId, isPostId, LOBBY, LobbyNews, OfferEnd } from '../systems/match/lobby';
import { PONG } from '../systems/match/types';

/** Who is on a lobby socket, kept with it (survives the object sleeping). */
export interface LobbyInfo {
  lobby: true;
  /** the player key it said hello with ('' until then) */
  key: string;
  /** when it opened, said hello or last sent a message (ms) */
  at: number;
  closing?: boolean;
}

export interface LobbySocket {
  send(text: string): void;
  close(code?: number, reason?: string): void;
  info(): LobbyInfo | null;
  setInfo(i: LobbyInfo): void;
  /** when the platform last answered this socket's keep-alive (ms), null if never or unknown */
  pingedAt(): number | null;
}

export interface LobbyHost {
  storage: Pick<RoomStorage, 'get' | 'put'>;
  sockets(): LobbySocket[];
  accept(info: LobbyInfo): Response;
  now(): number;
  random(): number;
}

/** Close codes the lobby uses (a game acts on them; others mean "connect again"). */
export const LOBBY_CLOSE = { noHello: 4008, version: 4012 } as const;

const HELLO_MS = 10_000;
/** a game pings every 25 s, a background tab maybe once a minute: one silent this long is gone */
const ALIVE_MS = 100_000;

const isKey = (k: unknown): k is string => typeof k === 'string' && /^[a-z0-9]{8,64}$/.test(k);

/** A post as stored: with its poster's key (never sent to anyone). */
interface StoredPost extends ChallengePost { key: string }
/** An offer as stored: with both players' keys. */
interface StoredOffer extends ChallengeOffer { key: string; toKey: string }
interface Stored { posts: StoredPost[]; offers: StoredOffer[]; lastPost: Record<string, number> }

const publicPost = ({ key: _k, ...p }: StoredPost): ChallengePost => p;
const publicOffer = ({ key: _k, toKey: _t, ...o }: StoredOffer): ChallengeOffer => o;

/** A name others see: tidied, allowed, and not the default one. */
function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const n = tidyName(raw);
  return n && n !== DEFAULT_NAME && nameAllowed(n) ? n : null;
}

/** The match line that goes with an offer: plain text, short. */
function cleanLine(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LOBBY.maxLine);
  return s || null;
}

export class LobbyCore {
  private data: Stored | null = null;
  private loading: Promise<Stored> | null = null;
  private lock: Promise<unknown> = Promise.resolve();
  private lastOnline = -1;

  constructor(private host: LobbyHost) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.lock.then(work, work);
    this.lock = next.catch(() => undefined);
    return next;
  }

  private load(): Promise<Stored> {
    if (this.data) return Promise.resolve(this.data);
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const s = await this.host.storage.get<Stored>('L');
          this.data = { posts: s?.posts ?? [], offers: s?.offers ?? [], lastPost: s?.lastPost ?? {} };
          return this.data;
        } finally { this.loading = null; }
      })();
    }
    return this.loading;
  }

  private async save() {
    if (this.data) await this.host.storage.put({ L: this.data });
  }

  private id(): string {
    let s = '';
    for (let i = 0; i < 10; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(this.host.random() * 32) % 32];
    return s;
  }

  // ------------------------------------------------------------- sockets
  private live(): LobbySocket[] {
    return this.host.sockets().filter((ws) => !ws.info()?.closing);
  }

  private alive(ws: LobbySocket, now = this.host.now()): boolean {
    return now - Math.max(ws.pingedAt() ?? 0, ws.info()?.at ?? 0) < ALIVE_MS;
  }

  /** Players with the game open: their keys, each once. */
  private onlineCount(gone?: LobbySocket): number {
    const now = this.host.now();
    const keys = new Set<string>();
    for (const ws of this.live()) {
      const k = ws.info()?.key;
      if (ws !== gone && k && this.alive(ws, now)) keys.add(k);
    }
    return keys.size;
  }

  private send(ws: LobbySocket, n: LobbyNews) {
    try { ws.send(JSON.stringify(n)); } catch { /* closed */ }
  }

  /** To every game that has said hello (`only`: the games of this player key; `notKey`: all but that player's). */
  private tell(n: LobbyNews, only?: string, except?: LobbySocket, notKey?: string) {
    const text = JSON.stringify(n);
    for (const ws of this.live()) {
      const k = ws.info()?.key;
      if (!k || ws === except || (only !== undefined && k !== only) || (notKey !== undefined && k === notKey)) continue;
      try { ws.send(text); } catch { /* closed */ }
    }
  }

  private drop(ws: LobbySocket, code: number, reason: string) {
    try { ws.setInfo({ ...(ws.info() ?? { lobby: true, key: '', at: 0 }), closing: true }); } catch { /* gone */ }
    try { ws.close(code, reason); } catch { /* gone */ }
  }

  /** The count of players online, to everyone, when it has changed. */
  private sayOnline(gone?: LobbySocket) {
    const n = this.onlineCount(gone);
    if (n === this.lastOnline) return;
    this.lastOnline = n;
    this.tell({ type: 'online', n }, undefined, gone);
  }

  // ---------------------------------------------------------------- HTTP
  async fetch(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    try {
      if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') return this.upgrade();
      if (req.method === 'GET' && path === 'list') {
        return await this.serial(async () => {
          const d = await this.load();
          if (await this.prune(d)) await this.save();
          return jsonResponse({ ok: true, v: LOBBY.version, now: this.host.now(), online: this.onlineCount(), posts: d.posts.map(publicPost) });
        });
      }
      return jsonResponse({ error: 'not found' }, 404);
    } catch (e) {
      return jsonResponse({ error: String(e) }, 500);
    }
  }

  private upgrade(): Response {
    const now = this.host.now();
    for (const ws of this.live()) {
      const i = ws.info();
      if ((!i || !i.key) && now - (i?.at ?? 0) > HELLO_MS) this.drop(ws, LOBBY_CLOSE.noHello, 'no hello');
      else if (i?.key && !this.alive(ws, now)) this.drop(ws, 1001, 'gone quiet');
    }
    if (this.live().length >= LOBBY.maxSockets) return jsonResponse({ error: 'busy' }, 429);
    return this.host.accept({ lobby: true, key: '', at: now });
  }

  // ------------------------------------------------------------ messages
  async message(ws: LobbySocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return;
    if (raw.length > LOBBY.maxMessage) { this.send(ws, { type: 'error', code: 'too_big', message: 'message too big' }); return; }
    let m: Record<string, unknown>;
    try { m = JSON.parse(raw); } catch { this.send(ws, { type: 'error', code: 'bad_json', message: 'bad message' }); return; }
    if (!m || typeof m !== 'object') { this.send(ws, { type: 'error', code: 'bad_json', message: 'bad message' }); return; }
    if (m.type === 'ping') { ws.send(PONG); return; } // the auto-response normally answers it
    await this.serial(async () => {
      try {
        const d = await this.load();
        let changed = await this.prune(d);
        if (m.type === 'hello') { this.hello(ws, d, m); if (changed) await this.save(); return; }
        const who = ws.info();
        if (!who?.key) { this.send(ws, { type: 'error', code: 'hello', message: 'say hello first' }); return; }
        ws.setInfo({ ...who, at: this.host.now() });
        const key = who.key;
        if (m.type === 'post') changed = this.post(ws, d, key, m) || changed;
        else if (m.type === 'cancel') changed = this.cancel(d, key) || changed;
        else if (m.type === 'offer') changed = this.offer(ws, d, key, m) || changed;
        else if (m.type === 'withdraw') changed = this.withdraw(d, key, m.offer) || changed;
        else if (m.type === 'answer') changed = this.answer(ws, d, key, m.offer, m.accept === true) || changed;
        else this.send(ws, { type: 'error', code: 'unknown', message: 'unknown message' });
        if (changed) await this.save();
      } catch (e) {
        this.send(ws, { type: 'error', code: 'server', message: String(e) });
      }
    });
  }

  /** A socket closed: the others see one fewer online. */
  closed(ws: LobbySocket): Promise<void> {
    if (!ws.info()?.key) return Promise.resolve();
    return this.serial(async () => { this.sayOnline(ws); });
  }

  private hello(ws: LobbySocket, d: Stored, m: Record<string, unknown>) {
    if (m.v !== LOBBY.version) {
      this.send(ws, { type: 'error', code: 'version', message: typeof m.v === 'number' && m.v > LOBBY.version ? 'the lobby is older than this game' : 'reload the game to update it' });
      this.drop(ws, LOBBY_CLOSE.version, 'version');
      return;
    }
    if (!isKey(m.key)) { this.send(ws, { type: 'error', code: 'key', message: 'no player key' }); return; }
    const key = m.key;
    ws.setInfo({ lobby: true, key, at: this.host.now() });
    const mine = d.posts.find((p) => p.key === key) ?? null;
    this.send(ws, {
      type: 'welcome', v: LOBBY.version, now: this.host.now(), online: this.onlineCount(),
      posts: d.posts.map(publicPost), mine: mine?.id ?? null,
      offers: d.offers.filter((o) => o.toKey === key).map(publicOffer),
      sent: d.offers.filter((o) => o.key === key).map(publicOffer),
    });
    this.sayOnline();
  }

  /** Posts past their time go, with their offers. Returns whether anything changed. */
  private async prune(d: Stored): Promise<boolean> {
    const now = this.host.now();
    let changed = false;
    for (const p of d.posts.filter((x) => x.until <= now)) {
      this.closePost(d, p, 'expired');
      changed = true;
    }
    // stray offers (their post gone some other way) and old ones
    const before = d.offers.length;
    d.offers = d.offers.filter((o) => d.posts.some((p) => p.id === o.post) && now - o.at < LOBBY.postMs);
    if (d.offers.length !== before) changed = true;
    for (const [k, t] of Object.entries(d.lastPost)) if (now - t > LOBBY.postEveryMs) { delete d.lastPost[k]; changed = true; }
    return changed;
  }

  /** A post goes (cancelled, taken or expired): everyone hears, and every offer to it is answered (`except`: the accepted one). */
  private closePost(d: Stored, p: StoredPost, why: 'cancelled' | 'taken' | 'expired', except?: string) {
    d.posts = d.posts.filter((x) => x.id !== p.id);
    for (const o of d.offers.filter((x) => x.post === p.id)) {
      if (o.id === except) continue;
      this.tell({ type: 'reply', offer: o.id, accepted: false, why: why === 'taken' ? 'taken' : 'closed' }, o.key);
    }
    d.offers = d.offers.filter((x) => x.post !== p.id);
    this.tell({ type: 'closed', post: p.id, why });
  }

  private post(ws: LobbySocket, d: Stored, key: string, m: Record<string, unknown>): boolean {
    const name = cleanName(m.name);
    if (!name) { this.send(ws, { type: 'error', code: 'name', message: 'a name is needed (others see it)' }); return false; }
    const course = m.course === null || m.course === undefined ? null : isCourseId(m.course) ? m.course : undefined;
    if (course === undefined) { this.send(ws, { type: 'error', code: 'course', message: 'no such course' }); return false; }
    const now = this.host.now();
    if (now - (d.lastPost[key] ?? 0) < LOBBY.postEveryMs) { this.send(ws, { type: 'error', code: 'too_fast', message: 'wait a moment before posting again' }); return false; }
    const old = d.posts.find((p) => p.key === key);
    if (old) this.closePost(d, old, 'cancelled');
    if (d.posts.length >= LOBBY.maxPosts) { this.send(ws, { type: 'error', code: 'full', message: 'too many players are looking right now' }); return !!old; }
    const p: StoredPost = { id: this.id(), by: name, course, at: now, until: now + LOBBY.postMs, key };
    d.posts.push(p);
    d.lastPost[key] = now;
    const pub = publicPost(p);
    this.tell({ type: 'posted', post: pub, now }, undefined, undefined, key);
    this.tell({ type: 'posted', post: pub, now, mine: true }, key);
    return true;
  }

  private cancel(d: Stored, key: string): boolean {
    const p = d.posts.find((x) => x.key === key);
    if (!p) return false;
    this.closePost(d, p, 'cancelled');
    return true;
  }

  private offer(ws: LobbySocket, d: Stored, key: string, m: Record<string, unknown>): boolean {
    const name = cleanName(m.name);
    if (!name) { this.send(ws, { type: 'error', code: 'name', message: 'a name is needed (the other player sees it)' }); return false; }
    const p = isPostId(m.post) ? d.posts.find((x) => x.id === m.post) : undefined;
    if (!p) { this.send(ws, { type: 'error', code: 'no_post', message: 'that player is no longer looking' }); return false; }
    if (p.key === key) { this.send(ws, { type: 'error', code: 'own', message: "that's your own post" }); return false; }
    const line = cleanLine(m.line);
    if (!isMatchCode(m.code) || !isCourseId(m.course) || !line) { this.send(ws, { type: 'error', code: 'bad_offer', message: 'bad offer' }); return false; }
    if (p.course !== null && m.course !== p.course) { this.send(ws, { type: 'error', code: 'course', message: `${p.by} wants another course` }); return false; }
    // one offer per post from a player (a second one replaces the first), and a few posts at once
    const prev = d.offers.find((o) => o.key === key && o.post === p.id);
    if (prev) this.endOffer(d, prev, 'withdrawn');
    if (d.offers.filter((o) => o.key === key).length >= LOBBY.maxOffers) { this.send(ws, { type: 'error', code: 'too_many', message: 'you have offers out already: wait for an answer' }); return !!prev; }
    if (d.offers.length >= LOBBY.maxAllOffers) { this.send(ws, { type: 'error', code: 'full', message: 'the lobby is busy - try again' }); return !!prev; }
    const o: StoredOffer = { id: this.id(), post: p.id, to: p.by, from: name, code: m.code, course: m.course, line, at: this.host.now(), key, toKey: p.key };
    d.offers.push(o);
    this.tell({ type: 'offer', offer: publicOffer(o) }, p.key);
    this.tell({ type: 'sent', offer: publicOffer(o) }, key);
    return true;
  }

  /** An offer goes before its answer (withdrawn by the one who made it): the poster's games drop it. */
  private endOffer(d: Stored, o: StoredOffer, why: OfferEnd) {
    d.offers = d.offers.filter((x) => x.id !== o.id);
    this.tell({ type: 'offerGone', offer: o.id, why }, o.toKey);
  }

  private withdraw(d: Stored, key: string, id: unknown): boolean {
    const o = d.offers.find((x) => x.id === id && x.key === key);
    if (!o) return false;
    this.endOffer(d, o, 'withdrawn');
    this.tell({ type: 'reply', offer: o.id, accepted: false, why: 'withdrawn' }, key);
    return true;
  }

  private answer(ws: LobbySocket, d: Stored, key: string, id: unknown, accept: boolean): boolean {
    const o = d.offers.find((x) => x.id === id && x.toKey === key);
    if (!o) { this.send(ws, { type: 'error', code: 'no_offer', message: 'that offer is no longer there' }); return false; }
    if (!accept) {
      d.offers = d.offers.filter((x) => x.id !== o.id);
      this.tell({ type: 'reply', offer: o.id, accepted: false, why: 'declined' }, o.key);
      this.tell({ type: 'offerGone', offer: o.id, why: 'declined' }, key);
      return true;
    }
    // the first offer accepted wins: the post goes, the other offers to it hear "taken"
    const p = d.posts.find((x) => x.id === o.post);
    if (p) this.closePost(d, p, 'taken', o.id);
    d.offers = d.offers.filter((x) => x.id !== o.id);
    this.tell({ type: 'reply', offer: o.id, accepted: true }, o.key);
    this.tell({ type: 'offerGone', offer: o.id, why: 'accepted' }, key);
    return true;
  }
}

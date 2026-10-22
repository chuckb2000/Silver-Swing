// A live match in this browser: the line to the match server (net/matchClient)
// feeding the match session (systems/match/session), plus the list of this
// device's matches for the title and match screens. The play scene shows the
// session; everything here is plumbing.

import { app } from '../app';
import { browserStore, LinkStatus, MatchClient, SayResult } from '../net/matchClient';
import { roundPins } from '../systems/game/pins';
import { courseHoleFor, newSeed } from '../systems/game/round';
import { MatchSession } from '../systems/match/session';
import { applyEvent, clockText, holeLive, holeNo, other, resultFor, statusText, toPlay, waitingOn } from '../systems/match/rules';
import { Action, ChatMsg, CLOCK, Logged, MatchConfig, MatchPlayer, PROTOCOL, RULES, Seat } from '../systems/match/types';
import type { Difficulty } from '../data/difficulty';

/** What the server tells anyone about a match (its info page). */
export interface MatchInfo {
  exists: boolean;
  protocol: number;
  /** the rules the match server runs (types.ts RULES); missing from a server older than the check */
  rules?: number;
  courseId: string;
  courseVersion: string;
  tee: string;
  holes: number[];
  difficulty: Difficulty;
  players: (string | null)[];
  phase: 'waiting' | 'playing' | 'finished';
  status: string;
  seq: number;
  online: [boolean, boolean];
}

let up: Promise<boolean> | null = null;
let upAt = 0;

/** Are live matches set up on this site? (asked once a minute at most) */
export function liveMatchesAvailable(): Promise<boolean> {
  if (!up || Date.now() - upAt > 60_000) {
    upAt = Date.now();
    up = fetch('api/matches?ping=1')
      .then(async (r) => r.ok && (r.headers.get('content-type') ?? '').includes('json') && (await r.json()).ok === true)
      .catch(() => false);
  }
  return up;
}

/** The version of a course's files this game has (courses/versions.json; 'dev' without one). */
export async function courseVersion(id: string): Promise<string> {
  try {
    const r = await fetch('courses/versions.json', { cache: 'no-cache' });
    if (!r.ok) return 'dev';
    const v = (await r.json()) as Record<string, string>;
    return v[id] ?? 'dev';
  } catch { return 'dev'; }
}

/** A new match on the loaded course: its settings, pins and wind fixed now. */
export async function newMatchConfig(tee: string, holes: number[], difficulty: Difficulty): Promise<MatchConfig> {
  const c = app.course!;
  const seed = newSeed();
  return {
    protocol: PROTOCOL, courseId: c.json.id, courseVersion: await courseVersion(c.json.id), tee, holes, difficulty, seed,
    pins: roundPins(c, tee, holes.map((h) => courseHoleFor(h, c.json.holes.length)), seed), startedAt: new Date().toISOString(),
  };
}

export async function createLiveMatch(cfg: MatchConfig, player: MatchPlayer): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const key = app.settings.playerKey;
  try {
    const r = await fetch('api/matches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cfg, player, key, rules: RULES }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; message?: string; error?: string };
    if (r.ok && j.ok && j.code) {
      // on this device's list at once, with the key it was made with (a player code changed later doesn't lock it)
      rememberMatch({ code: j.code, vs: '', courseId: cfg.courseId, at: new Date().toISOString(), key });
      return { ok: true, code: j.code };
    }
    return { ok: false, message: j.message ?? j.error ?? `the server said ${r.status}` };
  } catch {
    return { ok: false, message: "can't reach the server - check the connection" };
  }
}

export async function matchInfo(code: string): Promise<MatchInfo | null> {
  try {
    const r = await fetch(`api/match/${code}/info`);
    if (r.status === 404) return { exists: false } as MatchInfo;
    if (!r.ok) return null;
    return (await r.json()) as MatchInfo;
  } catch { return null; }
}

// ------------------------------------------------------------ attention
// A match in a background tab: the game's loop is paused there (the browser
// stops its frames), but the line still hears the other player. The tab's
// title says when something needs this player ("● your shot"), and goes back
// when the tab is looked at again.
const BASE_TITLE = typeof document !== 'undefined' ? document.title : '';
let flagged = false;

export function flagTab(text: string) {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
  document.title = `● ${text} · ${BASE_TITLE}`;
  if (!flagged) {
    flagged = true;
    const back = () => {
      if (document.visibilityState !== 'visible') return;
      document.title = BASE_TITLE;
      flagged = false;
      document.removeEventListener('visibilitychange', back);
    };
    document.addEventListener('visibilitychange', back);
  }
}

/** The newest chat message seen on this device, per match. */
function readMark(code: string): number {
  try { return Number(localStorage.getItem(`golf:match:${code}:chatread`)) || 0; } catch { return 0; }
}

function writeMark(code: string, id: number) {
  try { localStorage.setItem(`golf:match:${code}:chatread`, String(id)); } catch { /* blocked */ }
}

/** A typed or pasted match code (or a link with one) back to a code, or null. */
export function parseMatchCode(text: string): string | null {
  const m = text.toLowerCase().match(/match=([a-z0-9]+)/);
  const c = (m ? m[1] : text.toLowerCase()).replace(/[^a-z0-9]/g, '');
  return /^[a-km-np-z2-9]{6}$/.test(c) ? c : null;
}

/** The link that opens a match in a friend's game. */
export function matchLink(code: string): string {
  const base = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '';
  return `${base}?match=${code}`;
}

// ----------------------------------------------------------- my matches
/**
 * A match on this device's list. `key`: the player key it is played with (kept: the player code can change in
 * settings). `reported`: its result is on the leaderboard's "recent" list.
 */
export interface MyMatch { code: string; vs: string; courseId: string; at: string; done?: boolean; key?: string; reported?: boolean }
const LIST_KEY = 'golf:matches';

export function myMatches(): MyMatch[] {
  try {
    const l = JSON.parse(localStorage.getItem(LIST_KEY) ?? '[]') as MyMatch[];
    return Array.isArray(l) ? l.filter((m) => m && typeof m.code === 'string') : [];
  } catch { return []; }
}

export function rememberMatch(m: MyMatch) {
  const old = myMatches().find((x) => x.code === m.code);
  const keep = { ...m, key: m.key ?? old?.key, reported: m.reported ?? old?.reported };
  const l = [keep, ...myMatches().filter((x) => x.code !== m.code)].slice(0, 12);
  try { localStorage.setItem(LIST_KEY, JSON.stringify(l)); } catch { /* blocked */ }
}

/** The player key this device plays a match with: the one it was made or joined with, else the current one. */
export function keyFor(code: string): string {
  const k = myMatches().find((m) => m.code === code)?.key;
  return typeof k === 'string' && /^[a-z0-9]{8,64}$/.test(k) ? k : app.settings.playerKey;
}

export function forgetMatch(code: string) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(myMatches().filter((m) => m.code !== code))); } catch { /* blocked */ }
}

const reporting = new Set<string>();

/**
 * A match this device saw end goes on the leaderboard's "recent" list (the
 * site takes the result from the match's server, once; both players' games
 * report it). Tried again from the match list until it has gone.
 */
export async function reportMatch(code: string): Promise<void> {
  if (reporting.has(code) || myMatches().find((m) => m.code === code)?.reported) return;
  reporting.add(code);
  try {
    const r = await fetch(`api/match/${code}/report`, { method: 'POST', keepalive: true });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; finished?: boolean } | null;
    // on the list, or never to be (a name another device holds, the match gone): not asked again
    if ((r.ok && j?.ok && j.finished) || r.status === 404) {
      const m = myMatches().find((x) => x.code === code);
      if (m) rememberMatch({ ...m, reported: true });
    }
  } catch { /* offline: the match list tries again */ } finally {
    reporting.delete(code);
  }
}

/** The move clock as this game shows it (CLOCK; null: nobody is waiting on anybody). */
export interface ClockView {
  /** the player the match waits for */
  on: Seat;
  /** the player waiting */
  waiter: Seat;
  /** 'shot': a stroke or a drop; 'tee': coming to the next tee */
  kind: 'shot' | 'tee';
  /** how long the clock has run (ms; it starts CLOCK.graceMs after the move before, or when the waiting player came back) */
  elapsed: number;
  /** a penalty stroke for slow play has been given on this clock */
  slowGiven: boolean;
  /** the clock's id (the move that started it): a penalty or a claim names it */
  turn: number;
}

// ------------------------------------------------------------ the match
export class LiveMatch {
  readonly client: MatchClient;
  /** the player key this device plays the match with */
  readonly key: string;
  session: MatchSession | null = null;
  status: LinkStatus = 'offline';
  online: [boolean, boolean] = [false, false];
  seat: Seat | null = null;
  /** the first catch-up is in: everything until now is shown at once (later events are played back) */
  caughtUp = false;
  /** moves refused after a reload (nobody was waiting for them) */
  refused: { action: Action; code: string; message: string }[] = [];
  /** bumped when the session is replaced by one rebuilt from the server's log (the play scene starts its view again) */
  swaps = 0;
  /** this game can't follow the match (a rebuild failed too): what to tell the player */
  broken: string | null = null;
  /** a session being rebuilt from the whole log, shown once it has caught up */
  private fresh: MatchSession | null = null;
  private rebuilds = 0;
  private listeners = new Set<() => void>();
  private onVisible = () => { if (document.visibilityState === 'visible') this.client.poke(); };
  private onOnline = () => this.client.poke();
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private reported = false;
  /** messages from the other player this device hasn't seen (the chat panel open counts as seen) */
  chatUnread = 0;
  /** the chat panel is open (new messages are read as they come) */
  chatOpen = false;
  /** the newest message seen on this device (kept per match: a reload doesn't bring old ones up again) */
  private chatRead = 0;
  private chatNews = new Set<(m: ChatMsg) => void>();

  constructor(readonly code: string) {
    this.key = keyFor(code);
    this.client = new MatchClient(code, this.key, {
      base: '', WebSocket: WebSocket as never, fetch: (u, i) => fetch(u, i), store: browserStore,
      hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    });
    this.client.since = () => (this.fresh ?? this.session)?.knownSeq ?? 0;
    this.client.onEvents = (evs, last) => this.onEvents(evs, last);
    this.client.onStatus = (s) => { this.status = s; this.changed(); };
    this.client.onPresence = (o) => { this.online = o; this.changed(); };
    this.client.onSeat = (seat) => {
      this.seat = seat;
      if (this.session) this.session.me = seat;
      if (this.fresh) this.fresh.me = seat;
      this.remember();
      this.changed();
    };
    this.client.onRefused = (action, code, message) => { this.refused.push({ action, code, message }); this.changed(); };
    this.client.onClock = () => this.changed();
    this.chatRead = readMark(code);
    this.client.onChat = (fresh) => this.onChat(fresh);
  }

  /** Is the session being rebuilt (the play scene waits)? */
  get rebuilding(): boolean {
    return !!this.fresh;
  }

  start() {
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('online', this.onOnline);
    this.client.start();
    // the move clock in a background tab (the game's loop is paused there): its title says when it matters
    this.clockTimer = setInterval(() => this.clockAttention(), 10_000);
  }

  stop() {
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('online', this.onOnline);
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = null;
    this.client.stop();
    this.listeners.clear();
  }

  /**
   * The move clock of the match as shown (null while nobody waits, or while
   * moves are still to be shown: the clock that matters is the one after them).
   */
  clock(): ClockView | null {
    const ms = this.session;
    if (!ms || !ms.idle || this.client.serverSeq > ms.knownSeq) return null;
    const s = ms.state;
    const w = waitingOn(s);
    if (!w) return null;
    // from the move before (and its grace), whoever is in the match (developer, 2026-10-21)
    return { ...w, elapsed: this.client.serverNow() - s.clock.at, slowGiven: s.clock.slow, turn: s.clock.seq };
  }

  /** Is this player in the match now, as far as the server knows (the other player: their game is open)? */
  isHere(k: Seat): boolean {
    return k === this.seat ? this.status === 'online' || this.status === 'polling' : this.online[k];
  }

  private clockFlag = '';

  /** In a background tab: the title says when the clock matters (this player's shot running long, a claim to be had). */
  private clockAttention() {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden' || this.seat === null) return;
    const c = this.clock();
    if (!c) return;
    const s = this.session!.state;
    const me = this.seat;
    let key = '', text = '';
    if (c.on === me) {
      const waiter = s.players[c.waiter]?.name ?? 'your friend';
      if (c.elapsed >= CLOCK.claimMs) { key = 'claim'; text = `${waiter} can claim the match`; }
      else if (c.elapsed >= CLOCK.warnMs) { key = 'warn'; text = `play now: ${clockText(CLOCK.claimMs - c.elapsed)} left`; }
      else if (c.elapsed >= CLOCK.penaltyMs && c.kind === 'shot' && !c.slowGiven) { key = 'slow'; text = 'your shot: running long'; }
    } else if (c.waiter === me && c.elapsed >= CLOCK.claimMs) { key = 'claimable'; text = 'you can claim the match'; }
    if (!key) return;
    key = `${c.turn}:${key}`;
    if (key === this.clockFlag) return;
    this.clockFlag = key;
    flagTab(text);
  }

  // ------------------------------------------------------------------ chat
  /** The chat this game has, oldest first. */
  get chat(): ChatMsg[] {
    return this.client.chat;
  }

  /** Does the match server have chat (and is there someone to talk to)? */
  get chatReady(): boolean {
    return this.client.chatOn && !!this.session?.state.players[1];
  }

  say(text: string): Promise<SayResult> {
    return this.client.say(text);
  }

  /** A new message from the other player, as it comes (not the ones caught up on when the page opens). */
  onChatNews(f: (m: ChatMsg) => void): () => void {
    this.chatNews.add(f);
    return () => this.chatNews.delete(f);
  }

  /** Everything up to the newest message has been seen. */
  markChatRead() {
    const last = this.client.chatLast();
    if (last > this.chatRead) { this.chatRead = last; writeMark(this.code, last); }
    if (this.chatUnread) { this.chatUnread = 0; this.changed(); }
  }

  private onChat(fresh: ChatMsg[]) {
    const news = this.client.chatSynced; // the first catch-up of a page is history; after it (a reconnect too) it is news
    if (this.chatOpen) this.markChatRead();
    const mine = this.seat;
    this.chatUnread = this.client.chat.filter((m) => m.by !== mine && m.id > this.chatRead).length;
    const last = [...fresh].reverse().find((m) => m.by !== mine && m.id > this.chatRead);
    if (news && last && !this.chatOpen) {
      for (const f of [...this.chatNews]) { try { f(last); } catch (e) { console.error(e); } }
      const who = this.session?.state.players[last.by]?.name ?? 'your friend';
      flagTab(`${who}: ${last.text}`.slice(0, 60));
    }
    this.changed();
  }

  /** The match is over: its result goes on the leaderboard's "recent" list (once per page; the match list tries again). */
  report() {
    if (this.reported || this.session?.state.phase !== 'finished') return;
    this.reported = true;
    void reportMatch(this.code);
  }

  /** Called on every change (events, line, presence). */
  listen(f: () => void): () => void {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  private changed() {
    for (const f of [...this.listeners]) { try { f(); } catch (e) { console.error(e); } }
  }

  private onEvents(evs: Logged[], last: boolean) {
    if (this.fresh) {
      // a rebuild: the whole log goes to the new session. Live events that came before its catch-up
      // leave a gap there and are left out (the catch-up has them); it is shown once caught up
      this.fresh.receive(evs);
      if (last && this.fresh.knownSeq > 0) this.finishRebuild();
      return;
    }
    if (!this.session) {
      if (!evs.length) return;
      if (!app.course) return; // the match screen loads the course first
      this.session = new MatchSession(app.course, this.code, this.seat, []);
    }
    if (!this.session.receive(evs)) this.client.resync();
    if (this.caughtUp && evs.length) this.attention();
    if (!this.caughtUp && last) {
      try {
        while (this.session.applyNext()) { /* shown at once: it happened before this page opened */ }
      } catch (e) {
        console.error('match: could not apply the log', e);
        this.rebuild();
      }
      this.caughtUp = true;
      this.remember();
    }
    this.changed();
  }

  private flaggedFor = '';

  /** Something in the events just received needs this player (their turn, a hole's result, the match over): the tab says so. */
  private attention() {
    const ms = this.session;
    if (!ms || this.seat === null || typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
    let s = ms.state;
    try { for (const e of ms.queue) s = applyEvent(s, e); } catch { return; } // where the match will stand once shown
    const me = this.seat;
    const opp = s.players[other(me)]?.name ?? 'your friend';
    let key = '', text = '';
    if (s.phase === 'finished') { key = 'over'; text = statusText(s, me); }
    else if (s.phase === 'waiting') return;
    else if (holeLive(s) && toPlay(s) === me) { key = `turn:${s.hole}:${s.p[me].strokes}`; text = 'your shot'; }
    else if (!holeLive(s) && s.results.length && !s.ready[me]) {
      const r = s.results[s.results.length - 1];
      key = `hole:${r.hole}`;
      const n = holeNo(s.cfg, r.hole);
      text = { won: `you won hole ${n}`, lost: `${opp} won hole ${n}`, halved: `hole ${n} halved` }[resultFor(r, me)];
    } else if (!holeLive(s) && s.ready[other(me)] && !s.ready[me]) { key = `tee:${s.hole}`; text = `${opp} is on the tee`; }
    if (!key || key === this.flaggedFor) return;
    this.flaggedFor = key;
    flagTab(text);
  }

  /** On this device's list of matches (for "continue"), with the key it is played with. */
  remember() {
    const s = this.session?.state;
    if (!s || this.seat === null) return;
    const vs = s.players[this.seat === 0 ? 1 : 0]?.name ?? '';
    rememberMatch({ code: this.code, vs, courseId: s.cfg.courseId, at: new Date().toISOString(), done: s.phase === 'finished', key: this.key });
    this.report();
  }

  /**
   * The game lost step with the server's log (never expected: both run the
   * same rules): a new session is built from the whole log behind the one on
   * screen, and swapped in once it has caught up. Tried twice; after that the
   * game says it can't follow the match (a reload, which fetches the latest
   * game, is what helps).
   */
  rebuild() {
    if (!app.course || this.fresh || this.broken) return;
    if (++this.rebuilds > 2) { this.broken = "this game can't follow the match - reload the page"; this.changed(); return; }
    this.fresh = new MatchSession(app.course, this.code, this.seat, []);
    this.changed();
    this.client.resync(); // since() is the new session's: everything (a reconnect's hello asks the same)
  }

  private finishRebuild() {
    const fresh = this.fresh!;
    this.fresh = null;
    try {
      while (fresh.applyNext()) { /* shown at once */ }
    } catch (e) {
      console.error('match: the log could not be read', e);
      this.broken = "this game can't follow the match - reload the page";
      this.changed();
      return;
    }
    this.session = fresh;
    this.swaps++;
    this.changed();
  }
}

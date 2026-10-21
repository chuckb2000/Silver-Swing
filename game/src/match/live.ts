// A live match in this browser: the line to the match server (net/matchClient)
// feeding the match session (systems/match/session), plus the list of this
// device's matches for the title and match screens. The play scene shows the
// session; everything here is plumbing.

import { app } from '../app';
import { browserStore, LinkStatus, MatchClient } from '../net/matchClient';
import { roundPins } from '../systems/game/pins';
import { courseHoleFor, newSeed } from '../systems/game/round';
import { MatchSession } from '../systems/match/session';
import { Action, Logged, MatchConfig, MatchPlayer, PROTOCOL, Seat } from '../systems/match/types';
import type { Difficulty } from '../data/difficulty';

/** What the server tells anyone about a match (its info page). */
export interface MatchInfo {
  exists: boolean;
  protocol: number;
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
  try {
    const r = await fetch('api/matches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cfg, player, key: app.settings.playerKey }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string; message?: string; error?: string };
    if (r.ok && j.ok && j.code) return { ok: true, code: j.code };
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
export interface MyMatch { code: string; vs: string; courseId: string; at: string; done?: boolean }
const LIST_KEY = 'golf:matches';

export function myMatches(): MyMatch[] {
  try {
    const l = JSON.parse(localStorage.getItem(LIST_KEY) ?? '[]') as MyMatch[];
    return Array.isArray(l) ? l.filter((m) => m && typeof m.code === 'string') : [];
  } catch { return []; }
}

export function rememberMatch(m: MyMatch) {
  const l = [m, ...myMatches().filter((x) => x.code !== m.code)].slice(0, 12);
  try { localStorage.setItem(LIST_KEY, JSON.stringify(l)); } catch { /* blocked */ }
}

export function forgetMatch(code: string) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(myMatches().filter((m) => m.code !== code))); } catch { /* blocked */ }
}

// ------------------------------------------------------------ the match
export class LiveMatch {
  readonly client: MatchClient;
  session: MatchSession | null = null;
  status: LinkStatus = 'offline';
  online: [boolean, boolean] = [false, false];
  seat: Seat | null = null;
  /** the first catch-up is in: everything until now is shown at once (later events are played back) */
  caughtUp = false;
  /** moves refused after a reload (nobody was waiting for them) */
  refused: { action: Action; code: string; message: string }[] = [];
  private listeners = new Set<() => void>();
  private onVisible = () => { if (document.visibilityState === 'visible') this.client.poke(); };
  private onOnline = () => this.client.poke();

  constructor(readonly code: string) {
    this.client = new MatchClient(code, app.settings.playerKey, { base: '', WebSocket: WebSocket as never, fetch: (u, i) => fetch(u, i), store: browserStore });
    this.client.since = () => this.session?.knownSeq ?? 0;
    this.client.onEvents = (evs, last) => this.onEvents(evs, last);
    this.client.onStatus = (s) => { this.status = s; this.changed(); };
    this.client.onPresence = (o) => { this.online = o; this.changed(); };
    this.client.onWelcome = (seat) => {
      this.seat = seat;
      if (this.session) this.session.me = seat;
      this.changed();
    };
    this.client.onRefused = (action, code, message) => { this.refused.push({ action, code, message }); this.changed(); };
  }

  start() {
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('online', this.onOnline);
    this.client.start();
  }

  stop() {
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('online', this.onOnline);
    this.client.stop();
    this.listeners.clear();
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
    if (!this.session) {
      if (!evs.length) return;
      if (!app.course) return; // the match screen loads the course first
      this.session = new MatchSession(app.course, this.code, this.seat, []);
    }
    if (!this.session.receive(evs)) this.client.resync();
    if (!this.caughtUp && last) {
      try {
        while (this.session.applyNext()) { /* shown at once: it happened before this page opened */ }
      } catch (e) {
        console.error('match: could not apply the log', e);
      }
      this.caughtUp = true;
      this.remember();
    }
    this.changed();
  }

  /** On this device's list of matches (for "continue"). */
  remember() {
    const s = this.session?.state;
    if (!s || this.seat === null) return;
    const vs = s.players[this.seat === 0 ? 1 : 0]?.name ?? '';
    rememberMatch({ code: this.code, vs, courseId: s.cfg.courseId, at: new Date().toISOString(), done: s.phase === 'finished' });
  }

  /** Start again from the server's whole log (the game lost step with it). */
  rebuild() {
    if (!app.course) return;
    this.session = new MatchSession(app.course, this.code, this.seat, []);
    this.caughtUp = false;
    this.client.resync();
  }
}

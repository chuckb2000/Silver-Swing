// Shared leaderboard: the site's server keeps every friend's finished rounds
// (Cloudflare Pages Function at /api/scores, see game/functions). This
// device's leaderboard stays the offline copy; rounds not yet sent are sent
// at start-up, after each round and after an import. Where there is no
// server (local dev, the claude.ai preview) everything here quietly does nothing.

import { isEntry, LeaderboardEntry } from './entry';
import { EagleEvent, isEagle } from './feats';
import { DEFAULT_NAME } from './names';
import { loadBoard, loadEagles, loadUploaded, saveEagles, saveUploaded } from './store';
import { app } from '../app';

/** fetch with a time limit: a stalled phone connection must not hang a screen (8 s, 15 s for uploads). */
function timed(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  if (!ctl) return fetch(url, init);
  const timer = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}


const API = 'api/scores'; // relative to the page
const EAGLES = 'api/eagles';
const RECORDS = 'api/records';
const NAMES = 'api/names';
let available: Promise<boolean> | null = null;
let flushing: Promise<number> | null = null;

let failedAt = 0;

/** Is the shared leaderboard reachable? (checked once per session; a failed check is tried again after a minute) */
export function onlineAvailable(): Promise<boolean> {
  if (available && failedAt && Date.now() - failedAt > 60_000) { available = null; failedAt = 0; }
  if (!available) {
    available = (async () => {
      try {
        const res = await timed(`${API}?ping=1`, { cache: 'no-store' });
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) { failedAt = Date.now(); return false; }
        const j = (await res.json()) as { ok?: boolean };
        if (j.ok !== true) failedAt = Date.now();
        return j.ok === true;
      } catch {
        failedAt = Date.now();
        return false;
      }
    })();
  }
  return available;
}

/** Every round for a course on the shared leaderboard (null when unreachable). */
export async function fetchBoard(course: string): Promise<LeaderboardEntry[] | null> {
  if (!(await onlineAvailable())) return null;
  try {
    const res = await timed(`${API}?course=${encodeURIComponent(course)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { entries?: unknown[] };
    return (j.entries ?? []).filter(isEntry);
  } catch {
    return null;
  }
}

/** Send every local round the server hasn't got yet. Returns how many were sent. */
export function flushUploads(): Promise<number> {
  if (!flushing) {
    flushing = (async () => {
      if (!(await onlineAvailable())) return 0;
      const [all, sent] = await Promise.all([loadBoard(), loadUploaded()]);
      // a round with no name of its own stays on this device (developer: nobody on the board as "player")
      const todo = all.filter((e) => !sent.has(e.id) && isEntry(e) && e.player !== DEFAULT_NAME);
      const owner = app.settings.playerKey;
      let n = 0;
      for (let i = 0; i < todo.length; i += 5) {
        const batch = todo.slice(i, i + 5); // a few per request: the server's free plan allows 50 database queries per request
        try {
          const res = await timed(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(batch.map((e) => ({ ...e, owner }))) }, 15_000);
          if (!res.ok) break;
          const j = (await res.json().catch(() => ({}))) as { taken?: string[] };
          const taken = new Set(j.taken ?? []);
          for (const e of batch) {
            if (taken.has(e.id)) nameConflicts.add(e.player);
            else sent.add(e.id);
          }
          n += batch.length - taken.size;
        } catch {
          break;
        }
      }
      if (n) await saveUploaded(sent);
      await flushEagles();
      return n;
    })().finally(() => { flushing = null; });
  }
  return flushing;
}

/** Names this device used that another device already holds (its rounds were not added). */
export const nameConflicts = new Set<string>();

let eagling: Promise<void> | null = null;

/** Send this device's eagles the shared list hasn't got yet (named ones only). */
export function flushEagles(): Promise<void> {
  if (!eagling) {
    eagling = (async () => {
      if (!(await onlineAvailable())) return;
      const list = await loadEagles();
      const todo = list.filter((e) => !e.sent && e.player !== DEFAULT_NAME).slice(0, 8);
      if (!todo.length) return;
      try {
        const body = todo.map(({ sent: _s, ...e }) => ({ ...e, owner: app.settings.playerKey }));
        const res = await timed(EAGLES, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, 15_000);
        if (!res.ok) return;
        const j = (await res.json().catch(() => ({}))) as { taken?: string[] };
        const taken = new Set(j.taken ?? []);
        for (const e of todo) {
          if (taken.has(e.id)) nameConflicts.add(e.player);
          else e.sent = true;
        }
        await saveEagles(list);
      } catch { /* try again later */ }
    })().finally(() => { eagling = null; });
  }
  return eagling;
}

/** The most recent eagles on the shared list (null when unreachable). */
export async function fetchEagles(limit = 30): Promise<EagleEvent[] | null> {
  if (!(await onlineAvailable())) return null;
  try {
    const res = await timed(`${EAGLES}?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { eagles?: unknown[] };
    return (j.eagles ?? []).filter(isEagle);
  } catch {
    return null;
  }
}

export interface BirdieRow { id: string; player: string; course: string; birdies: number; length: string; tee: string; date: string }

/** Most birdies (or better) in a round on the shared board (null when unreachable). */
export async function fetchBirdieRecords(limit = 20, course?: string): Promise<BirdieRow[] | null> {
  if (!(await onlineAvailable())) return null;
  try {
    const res = await timed(`${RECORDS}?kind=birdies&limit=${limit}${course ? `&course=${encodeURIComponent(course)}` : ''}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { records?: BirdieRow[] };
    return (j.records ?? []).filter((r) => r && typeof r.player === 'string' && Number.isFinite(r.birdies));
  } catch {
    return null;
  }
}

export type NameCheck = 'ok' | 'taken' | 'invalid' | 'too_many' | 'offline';

/**
 * Claim a name for this device on the shared boards. 'ok' if it is free or
 * already this device's; 'offline' when there is no shared board to ask.
 */
export async function claimName(name: string): Promise<NameCheck> {
  if (!(await onlineAvailable())) return 'offline';
  try {
    const res = await timed(NAMES, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, owner: app.settings.playerKey }) });
    if (!res.ok) return 'offline';
    const j = (await res.json()) as { result?: NameCheck };
    if (j.result === 'ok') nameConflicts.delete(name);
    return j.result ?? 'offline';
  } catch {
    return 'offline';
  }
}

/**
 * The names a player code holds on the shared boards ([] for a code no name
 * uses yet, null when the shared board can't be reached).
 */
export async function namesOfKey(key: string): Promise<string[] | null> {
  if (!(await onlineAvailable())) return null;
  try {
    const res = await timed(`${NAMES}?owner=${encodeURIComponent(key)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { names?: unknown };
    return Array.isArray(j.names) ? j.names.filter((n): n is string => typeof n === 'string') : null;
  } catch {
    return null;
  }
}

// Local persistence (spec 10.4): IndexedDB via idb-keyval, with a
// localStorage fallback and an in-memory last resort. Every access is
// wrapped so a blocked storage never breaks the game.

import { createStore, del, get, set, UseStore } from 'idb-keyval';
import { fixEagle, fixEntry } from './cardFixes';
import type { HoleOut } from './holeouts';
import type { Difficulty } from '../data/difficulty';
import { isEntry, LeaderboardEntry } from './entry';
import type { EagleEvent } from './feats';
import { isPlayerKey, newPlayerKey } from './identity';

export type { LeaderboardEntry, RoundLength } from './entry';
export { isEntry } from './entry';

export interface Settings {
  difficulty: Difficulty;
  lefty: boolean;
  units: 'yd' | 'm';
  latencyMs: number;
  volume: number;   // 0..1
  muted: boolean;
  e5: boolean;
  gimmes: boolean;
  maxDoublePar: boolean;
  mulligans: boolean;
  viewScale: number; // -1 bigger pixels / 0 auto / +1 smaller pixels
  playerName: string;
  showTips: boolean;
  courseId: string;  // last course chosen on the new-round screen
  tees: Record<string, string>; // tee set last chosen, per course id
  /** the remembered old default tees have gone to the longest set (2026-10-31), once */
  teesLongest?: boolean;
  playerKey: string; // this device's private key for its names on the shared boards (save/identity.ts)
  hideFromBoards: boolean; // keep this player off every shared leaderboard (server /api/hide; developer, 2026-10-20)
  hideSent: boolean | null; // the hide choice the server last confirmed (null: never sent)
  challengePopups: boolean; // show a note when someone is looking for a match ("open to a challenge"; developer, 2026-10-22)
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal', lefty: false, units: 'yd', latencyMs: 0, volume: 0.7, muted: false,
  e5: false, gimmes: false, maxDoublePar: false, mulligans: false, viewScale: 0, playerName: 'player', showTips: true, courseId: '',
  tees: {},
  playerKey: '',
  hideFromBoards: false,
  hideSent: null,
  challengePopups: true,
};

const mem = new Map<string, unknown>();
let idb: UseStore | null = null;
let idbOk = true;

function store(): UseStore | null {
  if (!idbOk) return null;
  try {
    if (!idb) idb = createStore('local-golf', 'kv');
    return idb;
  } catch {
    idbOk = false;
    return null;
  }
}

// Every value is kept twice, in IndexedDB and in localStorage, each with the time it was written
// (`<key>:t`). A read takes the newer copy. Before, IndexedDB's copy always won: after one failed
// IndexedDB write (a private window, a full disk, Safari reclaiming storage) the session wrote to
// localStorage only, and the next visit read IndexedDB's old copy: a finished round gone from the
// board, a cleared round in progress back again. A removal leaves its time too, so a copy the other
// store still holds is known to be older than the removal.

const lsGet = (k: string): string | null => { try { return window.localStorage.getItem(`local-golf:${k}`); } catch { return null; } };
const lsSet = (k: string, v: string): boolean => { try { window.localStorage.setItem(`local-golf:${k}`, v); return true; } catch { return false; } };
const lsDel = (k: string) => { try { window.localStorage.removeItem(`local-golf:${k}`); } catch { /* blocked */ } };
const stampOf = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** IndexedDB failed: after three in a row it is left alone for this visit; one success clears the count. */
let idbErrors = 0;
const idbFailed = () => { if (++idbErrors >= 3) idbOk = false; };

async function read<T>(key: string): Promise<T | undefined> {
  const s = store();
  let dbVal: T | undefined, dbT = 0, dbRead = false;
  if (s) {
    try {
      dbVal = await get<T>(key, s);
      dbT = stampOf(await get<number>(`${key}:t`, s));
      dbRead = true;
      idbErrors = 0;
    } catch {
      idbFailed();
    }
  }
  let lsVal: T | undefined;
  const raw = lsGet(key);
  if (raw) { try { lsVal = JSON.parse(raw) as T; } catch { /* a cut-off value: as if it wasn't there */ } }
  const lsT = stampOf(lsGet(`${key}:t`));
  if (dbVal !== undefined && (lsT <= dbT)) return dbVal;
  if (lsVal !== undefined && (dbVal === undefined || lsT > dbT)) {
    // localStorage has the newer copy: IndexedDB is brought up to date for the next visit
    if (s && dbRead && lsT > dbT) { try { await set(key, lsVal, s); await set(`${key}:t`, lsT, s); } catch { idbFailed(); } }
    return lsVal;
  }
  if (dbVal !== undefined) {
    // removed after IndexedDB's copy was written (the removal reached localStorage only)
    if (s) { try { await del(key, s); await set(`${key}:t`, lsT, s); } catch { idbFailed(); } }
    return undefined;
  }
  return mem.get(key) as T | undefined;
}

async function write(key: string, value: unknown): Promise<void> {
  mem.set(key, value);
  const t = Date.now();
  const s = store();
  if (s) {
    try { await set(key, value, s); await set(`${key}:t`, t, s); idbErrors = 0; } catch { idbFailed(); }
  }
  // (the time only with the value: a value too big for localStorage keeps its old, older-stamped copy)
  let json: string | undefined;
  try { json = JSON.stringify(value); } catch { /* not serialisable */ }
  if (json !== undefined && lsSet(key, json)) lsSet(`${key}:t`, String(t));
}

async function remove(key: string): Promise<void> {
  mem.delete(key);
  const t = Date.now();
  const s = store();
  if (s) { try { await del(key, s); await set(`${key}:t`, t, s); idbErrors = 0; } catch { idbFailed(); } }
  lsDel(key);
  lsSet(`${key}:t`, String(t));
}

/** Courses whose default tees changed to their longest set on 2026-10-31, and the old default. */
const OLD_DEFAULT_TEES: Record<string, string> = { tpc_boston: 'Black', wannamoisett: 'Blue' };

export async function loadSettings(): Promise<Settings> {
  const s = await read<Partial<Settings>>('settings');
  const out = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  if (!out.tees || typeof out.tees !== 'object') out.tees = {};
  // the default tees became the longest set (developer, 2026-10-31): a course remembered on its old,
  // shorter default goes to the longest; a set the player chose stays
  if (!out.teesLongest) {
    for (const [id, old] of Object.entries(OLD_DEFAULT_TEES)) if (out.tees[id] === old) delete out.tees[id];
    out.teesLongest = true; // once: a shorter set chosen from now on is kept
    if (s) await write('settings', out);
  }
  // no longer settings (developer, 2026-10-20): yards, no latency offset, stroke-and-distance OB
  out.units = 'yd';
  out.latencyMs = 0;
  out.e5 = false;
  if (!isPlayerKey(out.playerKey)) {
    out.playerKey = newPlayerKey();
    await write('settings', out);
  }
  return out;
}

export const saveSettings = (s: Settings) => write('settings', s);

export async function loadBoard(): Promise<LeaderboardEntry[]> {
  const all = (await read<LeaderboardEntry[]>('leaderboard')) ?? [];
  // a course's corrected card (cardFixes.ts): rewritten here once, then stored
  let changed = false;
  const out = all.map((e) => { const f = isEntry(e) ? fixEntry(e) : null; if (f) changed = true; return f ?? e; });
  if (changed) await write('leaderboard', out);
  return out;
}

export async function addToBoard(e: LeaderboardEntry): Promise<void> {
  const all = await loadBoard();
  all.push(e);
  await write('leaderboard', all);
}

/** Change the player name on a round already on this device's board (before it is sent). */
export async function renameEntry(id: string, player: string): Promise<LeaderboardEntry | null> {
  const all = await loadBoard();
  const e = all.find((x) => x.id === id);
  if (!e) return null;
  e.player = player;
  await write('leaderboard', all);
  return e;
}

export async function replaceBoard(entries: LeaderboardEntry[]): Promise<void> {
  await write('leaderboard', entries);
}

/** Ids of rounds already sent to the shared leaderboard. */
export async function loadUploaded(): Promise<Set<string>> {
  return new Set((await read<string[]>('uploaded')) ?? []);
}

export const saveUploaded = (ids: Set<string>) => write('uploaded', [...ids]);

/** A round changed after it was sent (its player's name): it goes up again with the next upload. */
export async function sendAgain(id: string): Promise<void> {
  const ids = await loadUploaded();
  if (ids.delete(id)) await saveUploaded(ids);
}

export const loadRoundInProgress = <T>() => read<T>('round-in-progress');
export const saveRoundInProgress = (snap: unknown) => write('round-in-progress', snap);
export const clearRoundInProgress = () => remove('round-in-progress');

/** The leaderboard as backup text (JSON) for copying to another device. */
export function backupText(entries: LeaderboardEntry[]): string {
  return JSON.stringify({ app: 'local-golf', version: 1, entries });
}

/**
 * Merge backup text into the leaderboard, skipping rounds already present
 * (same id). Returns the number of rounds added, or -1 if the text is not a
 * backup.
 */
export async function importBackup(text: string): Promise<number> {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return -1; }
  const incoming = Array.isArray(data) ? data : (data as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(incoming)) return -1;
  const all = await loadBoard();
  const ids = new Set(all.map((e) => e.id));
  const add: LeaderboardEntry[] = [];
  for (const e of incoming) {
    if (!isEntry(e) || ids.has(e.id)) continue;
    ids.add(e.id);
    add.push(e);
  }
  if (add.length) await replaceBoard([...all, ...add]);
  return add.length;
}

/** Eagles made on this device: kept for the device's own list, `sent` once the shared list has them. */
export interface LocalEagle extends EagleEvent { sent: boolean }

export async function loadEagles(): Promise<LocalEagle[]> {
  const all = (await read<LocalEagle[]>('eagles')) ?? [];
  // a course's corrected card (cardFixes.ts): the new par, or gone when no longer an eagle
  const out = all.map((e) => fixEagle(e)).filter((e): e is LocalEagle => !!e);
  if (out.length !== all.length || out.some((e, i) => e !== all[i])) await write('eagles', out);
  return out;
}

export const saveEagles = (list: LocalEagle[]) => write('eagles', list);

/** Add an eagle (or replace one with the same id). */
export async function recordEagle(e: EagleEvent): Promise<void> {
  const all = (await loadEagles()).filter((x) => x.id !== e.id);
  all.push({ ...e, sent: false });
  await saveEagles(all);
}

/**
 * A player's names merged into one (settings "merge names"): this device's rounds and eagles under
 * any of `names` go under `into` too (the shared board has already moved them). Returns how many rounds.
 */
export async function renameAllLocal(names: string[], into: string): Promise<number> {
  const from = new Set(names.filter((n) => n !== into));
  const all = await loadBoard();
  let n = 0;
  for (const e of all) if (from.has(e.player)) { e.player = into; n++; }
  if (n) await write('leaderboard', all);
  const eagles = await loadEagles();
  let m = 0;
  for (const e of eagles) if (from.has(e.player)) { e.player = into; m++; }
  if (m) await saveEagles(eagles);
  const holeouts = await loadHoleouts();
  let k = 0;
  for (const h of holeouts) if (from.has(h.player)) { h.player = into; k++; }
  if (k) await saveHoleouts(holeouts);
  return n;
}

/** A round's player name changed: its eagles not yet sent follow it. */
export async function renameEagles(round: string, player: string): Promise<void> {
  const all = await loadEagles();
  let changed = false;
  for (const e of all) if (e.round === round && !e.sent && e.player !== player) { e.player = player; changed = true; }
  if (changed) await saveEagles(all);
  const hs = await loadHoleouts();
  let hc = false;
  for (const h of hs) if (h.round === round && !h.sent && h.player !== player) { h.player = player; hc = true; }
  if (hc) await saveHoleouts(hs);
}

/** Hole-outs from off the green made on this device, with their flights (holeouts.ts); `sent` once the shared list has them. */
export interface LocalHoleOut extends HoleOut { sent: boolean }

/** Kept on the device: the longest this many (with their flights, a few KB each). */
const MAX_LOCAL_HOLEOUTS = 60;

export async function loadHoleouts(): Promise<LocalHoleOut[]> {
  return (await read<LocalHoleOut[]>('holeouts')) ?? [];
}

export const saveHoleouts = (list: LocalHoleOut[]) => write('holeouts', list);

/** Add a hole-out (or replace one with the same id); the shortest sent ones go when the list is full. */
export async function recordHoleout(h: HoleOut): Promise<void> {
  let all = (await loadHoleouts()).filter((x) => x.id !== h.id);
  all.push({ ...h, sent: false });
  if (all.length > MAX_LOCAL_HOLEOUTS) {
    all.sort((a, b) => b.dist - a.dist);
    all = all.filter((x, i) => i < MAX_LOCAL_HOLEOUTS || !x.sent);
  }
  await saveHoleouts(all);
}

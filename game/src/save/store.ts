// Local persistence (spec 10.4): IndexedDB via idb-keyval, with a
// localStorage fallback and an in-memory last resort. Every access is
// wrapped so a blocked storage never breaks the game.

import { createStore, del, get, set, UseStore } from 'idb-keyval';
import type { Difficulty } from '../data/difficulty';
import type { HoleScore, RoundTotals } from '../systems/rules/scoring';

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
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal', lefty: false, units: 'yd', latencyMs: 0, volume: 0.7, muted: false,
  e5: false, gimmes: false, maxDoublePar: false, mulligans: false, viewScale: 0, playerName: 'player', showTips: true,
};

export interface LeaderboardEntry {
  id: string;
  course: string;
  tee: string;
  length: '18' | 'front' | 'back';
  difficulty: Difficulty;
  casual: boolean;
  player: string;
  date: string;
  gross: number;
  toPar: number;
  back: number | null;
  scores: HoleScore[];
  totals: RoundTotals;
}

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

async function read<T>(key: string): Promise<T | undefined> {
  const s = store();
  if (s) {
    try {
      const v = await get<T>(key, s);
      if (v !== undefined) return v;
    } catch {
      idbOk = false;
    }
  }
  try {
    const raw = window.localStorage.getItem(`local-golf:${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* storage blocked */ }
  return mem.get(key) as T | undefined;
}

async function write(key: string, value: unknown): Promise<void> {
  mem.set(key, value);
  const s = store();
  if (s) {
    try { await set(key, value, s); } catch { idbOk = false; }
  }
  try { window.localStorage.setItem(`local-golf:${key}`, JSON.stringify(value)); } catch { /* quota or blocked */ }
}

async function remove(key: string): Promise<void> {
  mem.delete(key);
  const s = store();
  if (s) { try { await del(key, s); } catch { /* ignore */ } }
  try { window.localStorage.removeItem(`local-golf:${key}`); } catch { /* ignore */ }
}

export async function loadSettings(): Promise<Settings> {
  const s = await read<Partial<Settings>>('settings');
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export const saveSettings = (s: Settings) => write('settings', s);

export async function loadBoard(): Promise<LeaderboardEntry[]> {
  return (await read<LeaderboardEntry[]>('leaderboard')) ?? [];
}

export async function addToBoard(e: LeaderboardEntry): Promise<void> {
  const all = await loadBoard();
  all.push(e);
  await write('leaderboard', all);
}

export async function replaceBoard(entries: LeaderboardEntry[]): Promise<void> {
  await write('leaderboard', entries);
}

export const loadRoundInProgress = <T>() => read<T>('round-in-progress');
export const saveRoundInProgress = (snap: unknown) => write('round-in-progress', snap);
export const clearRoundInProgress = () => remove('round-in-progress');

/** The leaderboard as backup text (JSON) for copying to another device. */
export function backupText(entries: LeaderboardEntry[]): string {
  return JSON.stringify({ app: 'local-golf', version: 1, entries });
}

function isEntry(e: unknown): e is LeaderboardEntry {
  const x = e as Partial<LeaderboardEntry> | null;
  return !!x && typeof x === 'object'
    && typeof x.id === 'string' && typeof x.course === 'string' && typeof x.tee === 'string'
    && (x.length === '18' || x.length === 'front' || x.length === 'back')
    && typeof x.difficulty === 'string' && typeof x.casual === 'boolean'
    && typeof x.player === 'string' && typeof x.date === 'string'
    && Number.isFinite(x.gross) && Number.isFinite(x.toPar)
    && Array.isArray(x.scores) && !!x.totals && typeof x.totals === 'object';
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

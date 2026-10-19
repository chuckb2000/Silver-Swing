// Shared leaderboard: the site's server keeps every friend's finished rounds
// (Cloudflare Pages Function at /api/scores, see game/functions). This
// device's leaderboard stays the offline copy; rounds not yet sent are sent
// at start-up, after each round and after an import. Where there is no
// server (local dev, the claude.ai preview) everything here quietly does nothing.

import { isEntry, LeaderboardEntry } from './entry';
import { loadBoard, loadUploaded, saveUploaded } from './store';

const API = 'api/scores'; // relative to the page
let available: Promise<boolean> | null = null;
let flushing: Promise<number> | null = null;

/** Is the shared leaderboard reachable? (checked once per session) */
export function onlineAvailable(): Promise<boolean> {
  if (!available) {
    available = (async () => {
      try {
        const res = await fetch(`${API}?ping=1`, { cache: 'no-store' });
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return false;
        const j = (await res.json()) as { ok?: boolean };
        return j.ok === true;
      } catch {
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
    const res = await fetch(`${API}?course=${encodeURIComponent(course)}`, { cache: 'no-store' });
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
      const todo = all.filter((e) => !sent.has(e.id) && isEntry(e));
      let n = 0;
      for (let i = 0; i < todo.length; i += 20) {
        const batch = todo.slice(i, i + 20);
        try {
          const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(batch) });
          if (!res.ok) break;
          for (const e of batch) sent.add(e.id);
          n += batch.length;
        } catch {
          break;
        }
      }
      if (n) await saveUploaded(sent);
      return n;
    })().finally(() => { flushing = null; });
  }
  return flushing;
}

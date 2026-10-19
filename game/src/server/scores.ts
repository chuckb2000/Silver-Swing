// Shared leaderboard storage, run by the Cloudflare Pages Function in
// functions/api/scores.ts against a D1 (SQLite) database bound as `DB`.
// Kept free of Phaser and browser APIs so it can be unit-tested.

import { boardName } from '../save/names';
import { isEntry, LeaderboardEntry } from '../save/entry';

/** The parts of Cloudflare's D1 API used here. */
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    course TEXT NOT NULL,
    length TEXT NOT NULL,
    player TEXT NOT NULL,
    gross INTEGER NOT NULL,
    back INTEGER,
    date TEXT NOT NULL,
    data TEXT NOT NULL,
    received TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS rounds_course ON rounds (course, gross)',
];

const MAX_BODY = 256 * 1024;  // bytes per request
const MAX_BATCH = 50;         // rounds per request
const MAX_RETURN = 2000;      // rounds per course returned

let ready: Promise<void> | null = null;

/** Create the table on first use, so the database needs no manual setup. */
export function ensureSchema(db: D1Like): Promise<void> {
  if (!ready) {
    ready = (async () => { for (const sql of SCHEMA) await db.prepare(sql).run(); })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

/** For tests: forget that the schema was created (a new database). */
export function resetSchemaCache() {
  ready = null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** GET /api/scores?ping=1 or ?course=<id> */
export async function handleGet(db: D1Like | undefined, url: URL): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  await ensureSchema(db);
  if (url.searchParams.has('ping')) return json({ ok: true });
  const course = url.searchParams.get('course') ?? '';
  if (!course || course.length > 64) return json({ error: 'course required' }, 400);
  const { results } = await db
    .prepare('SELECT data FROM rounds WHERE course = ? ORDER BY gross ASC, back ASC, date ASC LIMIT ?')
    .bind(course, MAX_RETURN)
    .all<{ data: string }>();
  const entries: LeaderboardEntry[] = [];
  for (const r of results) {
    try {
      const e = JSON.parse(r.data) as unknown;
      if (isEntry(e)) entries.push({ ...e, player: boardName(e.player) }); // rounds stored before a word was banned
    } catch { /* skip a damaged row */ }
  }
  return json({ entries });
}

/** POST /api/scores with one round or an array of rounds (already-known ids are ignored). */
export async function handlePost(db: D1Like | undefined, body: string): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);
  let data: unknown;
  try { data = JSON.parse(body); } catch { return json({ error: 'not json' }, 400); }
  const list = Array.isArray(data) ? data : [data];
  if (list.length > MAX_BATCH) return json({ error: `at most ${MAX_BATCH} rounds per request` }, 413);
  await ensureSchema(db);
  const now = new Date().toISOString();
  let added = 0, rejected = 0;
  for (const e of list) {
    if (!isEntry(e)) { rejected++; continue; }
    const clean: LeaderboardEntry = { ...e, player: boardName(e.player) }; // banned words -> 'player'
    const res = (await db
      .prepare('INSERT OR IGNORE INTO rounds (id, course, length, player, gross, back, date, data, received) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(clean.id, clean.course, clean.length, clean.player, clean.gross, clean.back ?? null, clean.date, JSON.stringify(clean), now)
      .run()) as { meta?: { changes?: number }; changes?: number };
    added += res?.meta?.changes ?? res?.changes ?? 0;
  }
  return json({ ok: true, added, rejected });
}

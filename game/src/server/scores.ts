// Shared leaderboard storage, run by the Cloudflare Pages Function in
// functions/api/scores.ts against a D1 (SQLite) database bound as `DB`.
// Kept free of Phaser and browser APIs so it can be unit-tested.

import { DEFAULT_NAME, nameAllowed, tidyName } from '../save/names';
import { isEntry, LeaderboardEntry } from '../save/entry';
import { birdiesIn, EagleEvent, eaglesIn, isEagle } from '../save/feats';

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
  // names on the boards belong to one device (developer, 2026-10-19: no two people with the same name)
  `CREATE TABLE IF NOT EXISTS names (
    name TEXT PRIMARY KEY,
    owner TEXT,
    created TEXT NOT NULL
  )`,
  // eagles (and better), reported the moment the ball drops, finished round or not
  `CREATE TABLE IF NOT EXISTS eagles (
    id TEXT PRIMARY KEY,
    round TEXT NOT NULL,
    player TEXT NOT NULL,
    owner TEXT,
    course TEXT NOT NULL,
    hole INTEGER NOT NULL,
    par INTEGER NOT NULL,
    strokes INTEGER NOT NULL,
    tee TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    date TEXT NOT NULL,
    received TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS eagles_date ON eagles (date)',
];

/** Columns added to `rounds` after it was first created (ALTER TABLE fails harmlessly once they exist). */
const ROUND_COLUMNS = ['owner TEXT', 'birdies INTEGER', 'casual INTEGER'];

const MAX_BODY = 256 * 1024;  // bytes per request
const MAX_BATCH = 50;         // rounds per request
const MAX_RETURN = 2000;      // rounds per course returned
const MAX_NAMES_PER_OWNER = 8; // names one device can hold (a shared family computer)
const MAX_LIST = 50;          // eagles / records returned

let ready: Promise<void> | null = null;

/**
 * Create the tables on first use and bring an older database up to date, so
 * the database needs no manual setup: new columns are added to `rounds`, and
 * rounds stored before them get their birdie count, and their eagles go on the
 * eagles list.
 */
export function ensureSchema(db: D1Like): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const sql of SCHEMA) await db.prepare(sql).run();
      for (const col of ROUND_COLUMNS) {
        try { await db.prepare(`ALTER TABLE rounds ADD COLUMN ${col}`).run(); } catch { /* already there */ }
      }
      await db.prepare('CREATE INDEX IF NOT EXISTS rounds_birdies ON rounds (birdies, date)').run();
      await backfill(db);
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

/** Rounds stored before the birdie column: count their birdies and list their eagles. */
async function backfill(db: D1Like) {
  for (let pass = 0; pass < 20; pass++) {
    const { results } = await db.prepare('SELECT id, data, received FROM rounds WHERE birdies IS NULL LIMIT 200').all<{ id: string; data: string; received: string }>();
    if (!results.length) return;
    for (const r of results) {
      let e: unknown = null;
      try { e = JSON.parse(r.data); } catch { /* damaged */ }
      if (!isEntry(e)) {
        await db.prepare('UPDATE rounds SET birdies = 0, casual = 1 WHERE id = ?').bind(r.id).run();
        continue;
      }
      await db.prepare('UPDATE rounds SET birdies = ?, casual = ? WHERE id = ?').bind(birdiesIn(e.scores), e.casual ? 1 : 0, r.id).run();
      for (const ev of eaglesIn(e, slotToHole(e))) await insertEagle(db, ev, null, r.received);
    }
  }
}

/** Scorecard slot -> the course's hole (a 9-hole course played twice round). */
const slotToHole = (e: LeaderboardEntry) => (slot: number) => (e.length === '9x2' ? ((slot - 1) % 9) + 1 : slot);

async function insertEagle(db: D1Like, ev: EagleEvent, owner: string | null, received: string): Promise<number> {
  const res = (await db
    .prepare('INSERT OR IGNORE INTO eagles (id, round, player, owner, course, hole, par, strokes, tee, difficulty, date, received) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(ev.id, ev.round, ev.player, owner, ev.course, ev.hole, ev.par, ev.strokes, ev.tee, ev.difficulty, ev.date, received)
    .run()) as { meta?: { changes?: number }; changes?: number };
  return res?.meta?.changes ?? res?.changes ?? 0;
}

/** A name that may go on a board: tidied, allowed, and not the default "player". */
export function boardableName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = tidyName(raw);
  return t && t !== DEFAULT_NAME && nameAllowed(t) ? t : null;
}

const ownerOf = (v: unknown): string | null => (typeof v === 'string' && /^[a-z0-9]{8,64}$/.test(v) ? v : null);

export type ClaimResult = 'ok' | 'taken' | 'invalid' | 'too_many';

/**
 * May `owner` (a device's player key) use `name`? The first device to use a
 * name keeps it. A name used only by rounds from before names were kept
 * (owner unknown) goes to the first device that claims it. A round sent with
 * no key (an old copy of the game) may use a name nobody has claimed.
 */
export async function claimName(db: D1Like, rawName: unknown, rawOwner: unknown): Promise<ClaimResult> {
  const name = boardableName(rawName);
  if (!name) return 'invalid';
  const owner = ownerOf(rawOwner);
  const { results } = await db.prepare('SELECT owner FROM names WHERE name = ?').bind(name).all<{ owner: string | null }>();
  const row = results[0];
  if (!row) {
    if (!owner) return 'ok';
    const { results: mine } = await db.prepare('SELECT COUNT(*) AS n FROM names WHERE owner = ?').bind(owner).all<{ n: number }>();
    if ((mine[0]?.n ?? 0) >= MAX_NAMES_PER_OWNER) return 'too_many';
    await db.prepare('INSERT OR IGNORE INTO names (name, owner, created) VALUES (?, ?, ?)').bind(name, owner, new Date().toISOString()).run();
    // a race: someone else may have claimed it a moment ago
    const { results: again } = await db.prepare('SELECT owner FROM names WHERE name = ?').bind(name).all<{ owner: string | null }>();
    return again[0]?.owner === owner ? 'ok' : 'taken';
  }
  if (row.owner === owner) return 'ok';
  if (row.owner === null && owner) {
    await db.prepare('UPDATE names SET owner = ? WHERE name = ? AND owner IS NULL').bind(owner, name).run();
    return 'ok';
  }
  return 'taken';
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
      if (!isEntry(e)) continue;
      const name = boardableName(e.player); // rounds stored before a word was banned, or as "player"
      if (name) entries.push({ ...e, player: name });
    } catch { /* skip a damaged row */ }
  }
  return json({ entries });
}

function parseList(body: string): unknown[] | Response {
  if (body.length > MAX_BODY) return json({ error: 'too large' }, 413);
  let data: unknown;
  try { data = JSON.parse(body); } catch { return json({ error: 'not json' }, 400); }
  const list = Array.isArray(data) ? data : [data];
  if (list.length > MAX_BATCH) return json({ error: `at most ${MAX_BATCH} per request` }, 413);
  return list;
}

/**
 * POST /api/scores with one round or an array of rounds (already-known ids are
 * ignored). Each round may carry `owner`, the sending device's player key.
 * Rounds without a name for the board ("player", empty, banned) are refused;
 * rounds under a name another device holds come back in `taken`.
 */
export async function handlePost(db: D1Like | undefined, body: string): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  const list = parseList(body);
  if (list instanceof Response) return list;
  await ensureSchema(db);
  const now = new Date().toISOString();
  let added = 0, rejected = 0;
  const taken: string[] = [];
  for (const raw of list) {
    if (!isEntry(raw)) { rejected++; continue; }
    const { owner: rawOwner, ...e } = raw as LeaderboardEntry & { owner?: unknown };
    const claim = await claimName(db, e.player, rawOwner);
    if (claim === 'taken' || claim === 'too_many') { taken.push(e.id); continue; }
    if (claim !== 'ok') { rejected++; continue; }
    const clean: LeaderboardEntry = { ...e, player: boardableName(e.player)! };
    const res = (await db
      .prepare('INSERT OR IGNORE INTO rounds (id, course, length, player, gross, back, date, data, received, owner, birdies, casual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(clean.id, clean.course, clean.length, clean.player, clean.gross, clean.back ?? null, clean.date, JSON.stringify(clean), now,
        ownerOf(rawOwner), birdiesIn(clean.scores), clean.casual ? 1 : 0)
      .run()) as { meta?: { changes?: number }; changes?: number };
    const n = res?.meta?.changes ?? res?.changes ?? 0;
    added += n;
    // the round's eagles, in case the live report never arrived
    if (n) for (const ev of eaglesIn(clean, slotToHole(clean))) await insertEagle(db, ev, ownerOf(rawOwner), now);
  }
  return json({ ok: true, added, rejected, taken });
}

/** GET /api/eagles?limit=n: the most recent eagles (and better) on any course. */
export async function handleEaglesGet(db: D1Like | undefined, url: URL): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  await ensureSchema(db);
  const limit = Math.max(1, Math.min(MAX_LIST, Number(url.searchParams.get('limit')) || 30));
  const course = url.searchParams.get('course');
  const sql = `SELECT id, round, player, course, hole, par, strokes, tee, difficulty, date FROM eagles${course ? ' WHERE course = ?' : ''} ORDER BY date DESC LIMIT ?`;
  const stmt = course ? db.prepare(sql).bind(course, limit * 2) : db.prepare(sql).bind(limit * 2);
  const { results } = await stmt.all<EagleEvent>();
  const eagles: EagleEvent[] = [];
  for (const r of results) {
    const name = boardableName(r.player);
    if (name && eagles.length < limit) eagles.push({ ...r, player: name });
  }
  return json({ eagles });
}

/** POST /api/eagles with one eagle or a list: `EagleEvent` plus the device's `owner` key. */
export async function handleEaglesPost(db: D1Like | undefined, body: string): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  const list = parseList(body);
  if (list instanceof Response) return list;
  await ensureSchema(db);
  const now = new Date().toISOString();
  let added = 0, rejected = 0;
  const taken: string[] = [];
  for (const raw of list) {
    if (!isEagle(raw)) { rejected++; continue; }
    const { owner: rawOwner, ...ev } = raw as EagleEvent & { owner?: unknown };
    const claim = await claimName(db, ev.player, rawOwner);
    if (claim === 'taken' || claim === 'too_many') { taken.push(ev.id); continue; }
    if (claim !== 'ok') { rejected++; continue; }
    added += await insertEagle(db, { ...ev, player: boardableName(ev.player)! }, ownerOf(rawOwner), now);
  }
  return json({ ok: true, added, rejected, taken });
}

export interface BirdieRecord { player: string; course: string; birdies: number; length: string; tee: string; date: string; id: string }

/**
 * GET /api/records?kind=birdies[&course=id][&limit=n]: the most birdies (or
 * better) in a finished, non-casual round, across all courses unless one is
 * asked for. Ties go to whoever did it first.
 */
export async function handleRecordsGet(db: D1Like | undefined, url: URL): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  await ensureSchema(db);
  const kind = url.searchParams.get('kind') ?? 'birdies';
  if (kind !== 'birdies') return json({ error: 'unknown kind' }, 400);
  const limit = Math.max(1, Math.min(MAX_LIST, Number(url.searchParams.get('limit')) || 20));
  const course = url.searchParams.get('course');
  const sql = `SELECT id, player, course, birdies, length, data, date FROM rounds WHERE birdies > 0 AND casual = 0${course ? ' AND course = ?' : ''} ORDER BY birdies DESC, date ASC LIMIT ?`;
  const stmt = course ? db.prepare(sql).bind(course, limit * 2) : db.prepare(sql).bind(limit * 2);
  const { results } = await stmt.all<{ id: string; player: string; course: string; birdies: number; length: string; data: string; date: string }>();
  const rows: BirdieRecord[] = [];
  for (const r of results) {
    const name = boardableName(r.player);
    if (!name || rows.length >= limit) continue;
    let tee = '';
    try { tee = (JSON.parse(r.data) as { tee?: string }).tee ?? ''; } catch { /* keep '' */ }
    rows.push({ id: r.id, player: name, course: r.course, birdies: r.birdies, length: r.length, tee, date: r.date });
  }
  return json({ records: rows });
}

/** GET /api/names?name=x&owner=k: may this device use the name? POST the same to claim it. */
export async function handleNames(db: D1Like | undefined, req: { method: string; url: URL; body?: string }): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  await ensureSchema(db);
  let name: unknown, owner: unknown;
  if (req.method === 'POST') {
    try { ({ name, owner } = JSON.parse(req.body ?? '') as { name?: unknown; owner?: unknown }); } catch { return json({ error: 'not json' }, 400); }
    if (!ownerOf(owner)) return json({ error: 'owner required' }, 400);
    const r = await claimName(db, name, owner);
    return json({ ok: r === 'ok', result: r });
  }
  name = req.url.searchParams.get('name');
  owner = req.url.searchParams.get('owner');
  const n = boardableName(name);
  if (!n) return json({ ok: false, result: 'invalid' });
  const { results } = await db.prepare('SELECT owner FROM names WHERE name = ?').bind(n).all<{ owner: string | null }>();
  const row = results[0];
  const free = !row || row.owner === null || row.owner === ownerOf(owner);
  return json({ ok: free, result: free ? 'ok' : 'taken' });
}

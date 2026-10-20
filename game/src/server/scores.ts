// Shared leaderboard storage, run by the Cloudflare Pages Function in
// functions/api/scores.ts against a D1 (SQLite) database bound as `DB`.
// Kept free of Phaser and browser APIs so it can be unit-tested.

import { DEFAULT_NAME, nameAllowed, tidyName } from '../save/names';
import { feedBadges, FeedRow } from '../save/feed';
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
  'CREATE INDEX IF NOT EXISTS eagles_received ON eagles (received)',
  'CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)',
  // players who chose "hide me from the leaderboards" (developer, 2026-10-20): their rounds and
  // eagles are kept but left out of every shared list, so showing them again brings them all back
  'CREATE TABLE IF NOT EXISTS hidden (owner TEXT PRIMARY KEY, since TEXT NOT NULL)',
];

/** Rows of players who haven't hidden themselves (rounds and eagles both have `owner`). */
const SHOWN = '(owner IS NULL OR owner NOT IN (SELECT owner FROM hidden))';
const shownAs = (t: string) => `(${t}.owner IS NULL OR ${t}.owner NOT IN (SELECT owner FROM hidden))`;

/** Bumped when SCHEMA or ROUND_COLUMNS change: a database at this version skips the setup. */
const SCHEMA_VERSION = '4';
/** Old rounds counted per request (Cloudflare's free plan allows 50 database queries per request). */
const BACKFILL_ROWS = 10;

/** Columns added to `rounds` after it was first created (ALTER TABLE fails harmlessly once they exist). */
const ROUND_COLUMNS = ['owner TEXT', 'birdies INTEGER', 'casual INTEGER', 'tee TEXT', 'daily TEXT'];

/** Indexes for the lists added with schema 3 (a player's own rounds, the activity feed, the daily round). */
const ROUND_INDEXES = [
  'CREATE INDEX IF NOT EXISTS rounds_birdies ON rounds (birdies, date)',
  'CREATE INDEX IF NOT EXISTS rounds_owner ON rounds (owner, date)',
  'CREATE INDEX IF NOT EXISTS rounds_received ON rounds (received)',
  'CREATE INDEX IF NOT EXISTS rounds_daily ON rounds (daily, gross)',
];

const MAX_BODY = 256 * 1024;  // bytes per request
const MAX_BATCH = 10;         // rounds or eagles per request (each costs a few queries; the free plan allows 50 per request)
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
      // one query on a database that is up to date
      let version: string | null = null;
      try {
        const { results } = await db.prepare("SELECT v FROM meta WHERE k = 'schema'").all<{ v: string }>();
        version = results[0]?.v ?? null;
      } catch { /* no meta table yet */ }
      if (version !== SCHEMA_VERSION) {
        for (const sql of SCHEMA) await db.prepare(sql).run();
        for (const col of ROUND_COLUMNS) {
          try { await db.prepare(`ALTER TABLE rounds ADD COLUMN ${col}`).run(); } catch { /* already there */ }
        }
        for (const sql of ROUND_INDEXES) await db.prepare(sql).run();
        // the tee of rounds stored before it had a column (one statement for them all)
        try { await db.prepare("UPDATE rounds SET tee = json_extract(data, '$.tee') WHERE tee IS NULL").run(); } catch { /* no JSON functions: the feed's badges skip them */ }
        await db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('schema', ?)").bind(SCHEMA_VERSION).run();
        migratedNow = true; // the setup used this request's queries; the backfill starts with the next one
      }
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

let backfilled = false;
let migratedNow = false;

/** Before every request: the tables exist, and a few old rounds are brought up to date. */
export async function prepareDb(db: D1Like): Promise<void> {
  await ensureSchema(db);
  if (migratedNow) { migratedNow = false; return; }
  await backfill(db);
}

/**
 * Rounds stored before the birdie column: count their birdies and list their
 * eagles, a few per request so no request goes over the query limit. Once none
 * are left, a flag in `meta` stops the check.
 */
async function backfill(db: D1Like) {
  if (backfilled) return;
  const { results: flag } = await db.prepare("SELECT v FROM meta WHERE k = 'backfill'").all<{ v: string }>();
  if (flag[0]?.v === 'done') { backfilled = true; return; }
  const { results } = await db.prepare(`SELECT id, data, received FROM rounds WHERE birdies IS NULL LIMIT ${BACKFILL_ROWS}`).all<{ id: string; data: string; received: string }>();
  if (!results.length) {
    await db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('backfill', 'done')").run();
    backfilled = true;
    return;
  }
  for (const r of results) {
    try {
      let e: unknown = null;
      try { e = JSON.parse(r.data); } catch { /* damaged */ }
      if (!isEntry(e)) {
        await db.prepare('UPDATE rounds SET birdies = 0, casual = 1 WHERE id = ?').bind(r.id).run();
        continue;
      }
      await db.prepare('UPDATE rounds SET birdies = ?, casual = ? WHERE id = ?').bind(birdiesIn(e.scores), e.casual ? 1 : 0, r.id).run();
      for (const ev of eaglesIn(e, slotToHole(e))) await insertEagle(db, ev, null, r.received);
    } catch {
      // a row that can't be read is set aside, not retried on every request
      try { await db.prepare('UPDATE rounds SET birdies = 0, casual = 1 WHERE id = ?').bind(r.id).run(); } catch { /* ignore */ }
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
  backfilled = false;
  migratedNow = false;
}

/** One claim check per name and device in a request (a batch is usually one player's rounds). */
function claimer(db: D1Like) {
  const memo = new Map<string, Promise<ClaimResult>>();
  return (name: unknown, owner: unknown) => {
    const k = `${String(name)}\u0000${String(owner)}`;
    let p = memo.get(k);
    if (!p) { p = claimName(db, name, owner); memo.set(k, p); }
    return p;
  };
}

const int = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** A round's scores as the game writes them (nothing else gets stored). */
export function validScores(e: LeaderboardEntry): boolean {
  return e.scores.every((s) => !!s && int(s.hole, 1, 18) && int(s.par, 3, 6) && int(s.strokes, 0, 40)
    && int(s.putts, 0, 40) && int(s.penalties, 0, 40));
}

/** An ISO time no later than tomorrow (a wrong clock or a made-up date can't sit at the top of a list). */
function sane(date: string, now: Date): string {
  const t = Date.parse(date);
  return Number.isFinite(t) && t <= now.getTime() + 86_400_000 ? new Date(t).toISOString() : now.toISOString();
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The daily round counts once per player code and day (the first one the
 * server gets); it must be the day's nine holes at Normal with no casual
 * settings, and a day near today. Anything else is an ordinary round.
 */
async function dailyCounts(db: D1Like, e: LeaderboardEntry, owner: string | null, now: Date): Promise<boolean> {
  if (!e.daily || !isDay(e.daily) || !owner || e.casual || e.difficulty !== 'normal' || !['front', 'back', '9'].includes(e.length)) return false;
  const t = Date.parse(`${e.daily}T12:00:00Z`);
  if (Math.abs(t - now.getTime()) > 2 * 86_400_000) return false;
  const { results } = await db.prepare('SELECT id FROM rounds WHERE daily = ? AND owner = ? LIMIT 1').bind(e.daily, owner).all<{ id: string }>();
  return !results.length;
}

/** GET /api/scores?ping=1, ?course=<id>, ?owner=<player key>, ?daily=<day> or ?week=<first day> */
export async function handleGet(db: D1Like | undefined, url: URL): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  await prepareDb(db);
  if (url.searchParams.has('ping')) return json({ ok: true });
  const owner = url.searchParams.get('owner');
  const daily = url.searchParams.get('daily');
  const week = url.searchParams.get('week');
  const course = url.searchParams.get('course') ?? '';
  let stmt: D1Statement;
  if (owner !== null) {
    // a player's own rounds, from every device with the player code ("my golf"): the key is private
    if (!ownerOf(owner)) return json({ error: 'owner required' }, 400);
    stmt = db.prepare('SELECT data FROM rounds WHERE owner = ? ORDER BY date DESC LIMIT ?').bind(owner, MAX_RETURN);
  } else if (daily !== null) {
    if (!isDay(daily)) return json({ error: 'daily=yyyy-mm-dd' }, 400);
    stmt = db.prepare(`SELECT data FROM rounds WHERE daily = ? AND ${SHOWN} ORDER BY gross ASC, back ASC, date ASC LIMIT ?`).bind(daily, MAX_RETURN);
  } else if (week !== null) {
    // the seven daily rounds from this day on (the week's board: best five of seven, worked out by the game)
    if (!isDay(week)) return json({ error: 'week=yyyy-mm-dd' }, 400);
    stmt = db.prepare(`SELECT data FROM rounds WHERE daily >= ? AND daily <= ? AND ${SHOWN} ORDER BY daily ASC, gross ASC LIMIT ?`).bind(week, addDays(week, 6), MAX_RETURN);
  } else {
    if (!course || course.length > 64) return json({ error: 'course required' }, 400);
    stmt = db.prepare(`SELECT data FROM rounds WHERE course = ? AND ${SHOWN} ORDER BY gross ASC, back ASC, date ASC LIMIT ?`).bind(course, MAX_RETURN);
  }
  const { results } = await stmt.all<{ data: string }>();
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
  await prepareDb(db);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const claim = claimer(db);
  let added = 0, rejected = 0;
  const taken: string[] = [];
  // rounds the board already has (a device resending after an import): fine, not "taken", in one query
  const ids = list.map((r) => (r as { id?: unknown })?.id).filter((v): v is string => typeof v === 'string' && v.length <= 80);
  const have = new Set<string>();
  if (ids.length) {
    const { results } = await db.prepare(`SELECT id FROM rounds WHERE id IN (${ids.map(() => '?').join(', ')})`).bind(...ids).all<{ id: string }>();
    for (const r of results) have.add(r.id);
  }
  for (const raw of list) {
    try {
      if (!isEntry(raw) || !validScores(raw)) { rejected++; continue; }
      if (have.has(raw.id)) continue;
      const { owner: rawOwner, ...e } = raw as LeaderboardEntry & { owner?: unknown };
      const c = await claim(e.player, rawOwner);
      if (c === 'taken' || c === 'too_many') { taken.push(e.id); continue; }
      if (c !== 'ok') { rejected++; continue; }
      const clean: LeaderboardEntry = { ...e, player: boardableName(e.player)!, date: sane(e.date, nowDate) };
      if (clean.daily !== undefined && !(await dailyCounts(db, clean, ownerOf(rawOwner), nowDate))) delete clean.daily; // a second go: an ordinary round
      const data = JSON.stringify(clean);
      if (data.length > 16_000) { rejected++; continue; }
      const res = (await db
        .prepare('INSERT OR IGNORE INTO rounds (id, course, length, player, gross, back, date, data, received, owner, birdies, casual, tee, daily) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(clean.id, clean.course, clean.length, clean.player, clean.gross, clean.back ?? null, clean.date, data, now,
          ownerOf(rawOwner), birdiesIn(clean.scores), clean.casual ? 1 : 0, clean.tee, clean.daily ?? null)
        .run()) as { meta?: { changes?: number }; changes?: number };
      added += res?.meta?.changes ?? res?.changes ?? 0;
      // the round's eagles, in case the live report never arrived (the same ids: never twice)
      for (const ev of eaglesIn(clean, slotToHole(clean))) await insertEagle(db, ev, ownerOf(rawOwner), now);
    } catch {
      rejected++; // one bad round doesn't hold up the rest
    }
  }
  return json({ ok: true, added, rejected, taken });
}

/** GET /api/eagles?limit=n: the most recent eagles (and better) on any course. */
export async function handleEaglesGet(db: D1Like | undefined, url: URL): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  await prepareDb(db);
  const limit = Math.max(1, Math.min(MAX_LIST, Number(url.searchParams.get('limit')) || 30));
  const course = url.searchParams.get('course');
  const sql = `SELECT id, round, player, course, hole, par, strokes, tee, difficulty, date FROM eagles WHERE ${SHOWN}${course ? ' AND course = ?' : ''} ORDER BY received DESC, date DESC LIMIT ?`;
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
  await prepareDb(db);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const claim = claimer(db);
  let added = 0, rejected = 0;
  const taken: string[] = [];
  for (const raw of list) {
    try {
      if (!isEagle(raw)) { rejected++; continue; }
      const { owner: rawOwner, ...ev } = raw as EagleEvent & { owner?: unknown };
      if (!ownerOf(rawOwner)) { rejected++; continue; } // eagles come only from a copy of the game that has a player key
      const c = await claim(ev.player, rawOwner);
      if (c === 'taken' || c === 'too_many') { taken.push(ev.id); continue; }
      if (c !== 'ok') { rejected++; continue; }
      added += await insertEagle(db, { ...ev, player: boardableName(ev.player)!, date: sane(ev.date, nowDate) }, ownerOf(rawOwner), now);
    } catch {
      rejected++;
    }
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
  await prepareDb(db);
  const kind = url.searchParams.get('kind') ?? 'birdies';
  if (kind !== 'birdies') return json({ error: 'unknown kind' }, 400);
  const limit = Math.max(1, Math.min(MAX_LIST, Number(url.searchParams.get('limit')) || 20));
  const course = url.searchParams.get('course');
  const sql = `SELECT id, player, course, birdies, length, data, date FROM rounds WHERE birdies > 0 AND casual = 0 AND ${SHOWN}${course ? ' AND course = ?' : ''} ORDER BY birdies DESC, date ASC LIMIT ?`;
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
  await prepareDb(db);
  let name: unknown, owner: unknown;
  if (req.method === 'POST') {
    try { ({ name, owner } = JSON.parse(req.body ?? '') as { name?: unknown; owner?: unknown }); } catch { return json({ error: 'not json' }, 400); }
    if (!ownerOf(owner)) return json({ error: 'owner required' }, 400);
    const r = await claimName(db, name, owner);
    return json({ ok: r === 'ok', result: r });
  }
  name = req.url.searchParams.get('name');
  owner = req.url.searchParams.get('owner');
  if (name === null && ownerOf(owner)) {
    // the names a player code holds (a second device checks a typed code before using it)
    const { results } = await db.prepare('SELECT name FROM names WHERE owner = ? ORDER BY name LIMIT 8').bind(ownerOf(owner)).all<{ name: string }>();
    return json({ ok: true, names: results.map((r) => r.name) });
  }
  const n = boardableName(name);
  if (!n) return json({ ok: false, result: 'invalid' });
  const { results } = await db.prepare('SELECT owner FROM names WHERE name = ?').bind(n).all<{ owner: string | null }>();
  const row = results[0];
  const free = !row || row.owner === null || row.owner === ownerOf(owner);
  return json({ ok: free, result: free ? 'ok' : 'taken' });
}

let feedCache: { at: number; limit: number; body: { rounds: FeedRow[] } } | null = null;
const FEED_CACHE_MS = 30_000;

/** For tests: forget the cached feed. */
export function resetFeedCache() { feedCache = null; }

/**
 * GET /api/recent?limit=n: the latest rounds on the shared board, newest
 * first, each marked when it was the player's best or a new record for its
 * board (course, tees, length) at the time. One query; kept for 30 seconds.
 */
export async function handleRecentGet(db: D1Like | undefined, url: URL): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  const limit = Math.max(1, Math.min(MAX_LIST, Number(url.searchParams.get('limit')) || 30));
  if (feedCache && feedCache.limit >= limit && Date.now() - feedCache.at < FEED_CACHE_MS) {
    return json({ rounds: feedCache.body.rounds.slice(0, limit) });
  }
  await prepareDb(db);
  const { results } = await db.prepare(`SELECT r.id, r.player, r.course, r.length, r.tee, r.gross, r.casual, r.date, r.received, r.daily, r.data,
      (SELECT MIN(p.gross) FROM rounds p WHERE p.course = r.course AND p.length = r.length AND p.tee IS r.tee AND p.casual = 0 AND p.received < r.received AND ${shownAs('p')}) AS prev_record,
      (SELECT MIN(p.gross) FROM rounds p WHERE p.course = r.course AND p.length = r.length AND p.tee IS r.tee AND p.casual = 0 AND p.player = r.player AND p.received < r.received) AS prev_best
    FROM rounds r WHERE ${shownAs('r')} ORDER BY r.received DESC, r.date DESC LIMIT ?`).bind(limit * 2).all<{
      id: string; player: string; course: string; length: string; tee: string | null; gross: number; casual: number | null; date: string;
      received: string; daily: string | null; data: string; prev_record: number | null; prev_best: number | null;
    }>();
  const rows: FeedRow[] = [];
  for (const r of results) {
    const name = boardableName(r.player);
    if (!name || rows.length >= limit) continue;
    let toPar = 0, holes = 0;
    try { const e = JSON.parse(r.data) as LeaderboardEntry; toPar = e.toPar; holes = e.scores.length; } catch { continue; }
    const casual = r.casual === 1;
    rows.push({
      id: r.id, player: name, course: r.course, length: r.length, tee: r.tee ?? '', gross: r.gross, toPar, holes,
      casual, daily: r.daily ?? null, date: r.date, received: r.received,
      ...feedBadges(r.gross, casual, r.prev_best, r.prev_record),
    });
  }
  feedCache = { at: Date.now(), limit, body: { rounds: rows } };
  return json({ rounds: rows });
}

/**
 * POST /api/hide with `{ owner, hidden }`: hide this player code's rounds and eagles
 * from every shared list (settings "leaderboards: hidden"), or show them again.
 * The rounds stay stored ("my golf" still finds them under the player code).
 */
export async function handleHide(db: D1Like | undefined, body: string): Promise<Response> {
  if (!db) return json({ ok: false, error: 'no database bound (DB)' }, 503);
  let owner: unknown, hidden: unknown;
  try { ({ owner, hidden } = JSON.parse(body) as { owner?: unknown; hidden?: unknown }); } catch { return json({ error: 'not json' }, 400); }
  const o = ownerOf(owner);
  if (!o || typeof hidden !== 'boolean') return json({ error: 'owner and hidden required' }, 400);
  await prepareDb(db);
  if (hidden) await db.prepare('INSERT OR IGNORE INTO hidden (owner, since) VALUES (?, ?)').bind(o, new Date().toISOString()).run();
  else await db.prepare('DELETE FROM hidden WHERE owner = ?').bind(o).run();
  feedCache = null;
  return json({ ok: true, hidden });
}


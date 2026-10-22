// The Pages side of live matches: makes a match code and hands each request
// for a match to its Durable Object (src/server/matchRoom.ts) through the
// MATCH binding. Kept free of Cloudflare's types so the game's TypeScript
// checks it, and so the tests can run it with a fake namespace.

import { isMatchCode, jsonResponse, MatchResult } from './matchRoom';
import { D1Like, recordMatch } from './scores';

/** The parts of a Durable Object namespace binding used here. */
export interface MatchNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(input: Request | string, init?: RequestInit): Promise<Response> };
}

export interface MatchEnv {
  MATCH?: MatchNamespace;
  /** the leaderboard's database: a finished match goes on its "recent" list */
  DB?: D1Like;
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no l, o, 0, 1: easy to read out

export function newMatchCode(rand: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * 32) % 32];
  return s;
}

const NOT_SET_UP = { ok: false, error: 'not_set_up', message: 'live matches are not set up on this site' };

export function matchesUp(env: MatchEnv): Response {
  return env.MATCH ? jsonResponse({ ok: true }) : jsonResponse(NOT_SET_UP, 503);
}

/** POST /api/matches {cfg, player, key}: a new match under a fresh code. */
export async function createMatch(env: MatchEnv, body: string, rand?: () => number): Promise<Response> {
  if (!env.MATCH) return jsonResponse(NOT_SET_UP, 503);
  if (body.length > 64 * 1024) return jsonResponse({ ok: false, error: 'too_big' }, 413);
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newMatchCode(rand);
    const stub = env.MATCH.get(env.MATCH.idFromName(code));
    const res = await stub.fetch('https://match/create', { method: 'POST', body, headers: { 'content-type': 'application/json' } });
    if (res.status === 409) continue; // the code is taken: another one
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return res.ok ? jsonResponse({ ok: true, code }) : jsonResponse({ ok: false, ...j }, res.status);
  }
  return jsonResponse({ ok: false, error: 'busy' }, 503);
}

/**
 * POST /api/match/<code>/report: a game saw its match end. The result comes
 * from the match's own object (not from the game), and goes on the
 * leaderboard's "recent" list once (developer, 2026-10-21: "kevin def.
 * charlie 3&2"). Both games report; the second changes nothing.
 */
export async function reportMatch(env: MatchEnv, code: string): Promise<Response> {
  if (!env.MATCH) return jsonResponse(NOT_SET_UP, 503);
  if (!env.DB) return jsonResponse({ ok: false, error: 'no_db', message: 'no leaderboard database here' }, 503);
  const stub = env.MATCH.get(env.MATCH.idFromName(code));
  const res = await stub.fetch('https://match/result');
  if (res.status === 404) return jsonResponse({ ok: false, error: 'no_match' }, 404);
  const r = (await res.json().catch(() => null)) as (MatchResult & { exists: boolean }) | { finished?: false } | null;
  if (!r || r.finished !== true) return jsonResponse({ ok: true, finished: false, recorded: false });
  const out = await recordMatch(env.DB, code, r);
  return jsonResponse({ ok: true, finished: true, recorded: out === 'ok', result: out });
}

/** /api/match/<code>/<what>: info, events, hello, act or ws, handed to the match's object; report (above). */
export async function toMatch(env: MatchEnv, req: Request, parts: string[]): Promise<Response> {
  if (!env.MATCH) return jsonResponse(NOT_SET_UP, 503);
  const [code, what = 'info'] = parts;
  if (!isMatchCode(code)) return jsonResponse({ ok: false, error: 'bad_code', message: 'not a match code' }, 400);
  if (what === 'report' && parts.length === 2) {
    return req.method === 'POST' ? reportMatch(env, code) : jsonResponse({ ok: false, error: 'method' }, 405);
  }
  // (the object's own "result", "create" and the development "skip" aren't reachable from here)
  if (!['info', 'events', 'hello', 'act', 'say', 'ws'].includes(what) || parts.length > 2) return jsonResponse({ ok: false, error: 'not_found' }, 404);
  if (what === 'ws' && req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return jsonResponse({ ok: false, error: 'upgrade', message: 'a WebSocket is needed' }, 426);
  const stub = env.MATCH.get(env.MATCH.idFromName(code));
  const url = new URL(req.url);
  // the object only sees its own path (its storage is the match): /info, /events, /act, /say (chat), /ws
  return stub.fetch(new Request(`https://match/${what}${url.search}`, req));
}

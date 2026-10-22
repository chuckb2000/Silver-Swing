// Cloudflare Pages Function: one live match, /api/match/<code>/<what>
// (info, events, hello, act, say: a chat message, ws: the WebSocket). Handed to the match's Durable Object.

import { MatchEnv, toMatch } from '../../../src/server/matchRoutes';

interface Context { request: Request; env: MatchEnv; params: { path?: string[] | string } }

export const onRequest = async ({ request, env, params }: Context): Promise<Response> => {
  const parts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  return toMatch(env, request, parts);
};

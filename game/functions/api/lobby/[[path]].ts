// Cloudflare Pages Function: the challenge lobby, /api/lobby/<what> (ws: the
// WebSocket every open game keeps; list: the open posts). Handed to the match
// Worker's object named "lobby" (src/server/lobby.ts) through the MATCH binding.

import { MatchEnv, toLobby } from '../../../src/server/matchRoutes';

interface Context { request: Request; env: MatchEnv; params: { path?: string[] | string } }

export const onRequest = async ({ request, env, params }: Context): Promise<Response> => {
  const parts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  return toLobby(env, request, parts);
};

// Cloudflare Pages Function: start a live match (POST /api/matches) or check
// that live matches are set up here (GET /api/matches?ping=1). Each match is
// a Durable Object in the match Worker (game/match-worker), bound to this
// Pages project as MATCH; without the binding the game hides "play a friend".

import { createMatch, MatchEnv, matchesUp } from '../../src/server/matchRoutes';

interface Context { request: Request; env: MatchEnv }

export const onRequestGet = async ({ env }: Context): Promise<Response> => matchesUp(env);

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => createMatch(env, await request.text());

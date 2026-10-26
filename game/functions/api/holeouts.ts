// Cloudflare Pages Function: the longest hole-outs from off the green at /api/holeouts
// (GET the list, or one with its flight by ?id=; POST a hole-out the moment the ball drops).
// Same D1 database (DB) as /api/scores; the tables are created on first use.

import { D1Like, handleHoleoutsGet, handleHoleoutsPost, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleHoleoutsGet(env.DB, new URL(request.url));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleHoleoutsPost(env.DB, await request.text());
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

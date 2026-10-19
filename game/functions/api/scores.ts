// Cloudflare Pages Function: the shared leaderboard at /api/scores.
// Needs a D1 database bound to the Pages project with the variable name DB
// (Pages project → Settings → Bindings). The table is created on first use.

import { D1Like, handleGet, handlePost, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleGet(env.DB, new URL(request.url));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handlePost(env.DB, await request.text());
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

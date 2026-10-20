// Cloudflare Pages Function: the recent eagles list at /api/eagles (GET the
// list, POST an eagle the moment it is made). Same D1 database (DB) as
// /api/scores; the tables are created on first use.

import { D1Like, handleEaglesGet, handleEaglesPost, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleEaglesGet(env.DB, new URL(request.url));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleEaglesPost(env.DB, await request.text());
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

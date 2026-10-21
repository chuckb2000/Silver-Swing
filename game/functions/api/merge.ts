// Cloudflare Pages Function: POST /api/merge {owner, into, from?} puts a
// player's rounds under one name (settings "merge names"). Same D1 database (DB).

import { D1Like, handleMerge, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleMerge(env.DB, await request.text());
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

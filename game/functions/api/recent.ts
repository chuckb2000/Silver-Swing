// Cloudflare Pages Function: the friends' activity feed at /api/recent
// (the latest rounds on the shared board). Same D1 database (DB).

import { D1Like, handleRecentGet, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleRecentGet(env.DB, new URL(request.url));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

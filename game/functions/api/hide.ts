// Cloudflare Pages Function: /api/hide, a player hides themselves from the shared
// leaderboards or shows themselves again (settings). Same D1 database (DB).

import { D1Like, handleHide, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleHide(env.DB, await request.text());
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

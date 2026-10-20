// Cloudflare Pages Function: records at /api/records?kind=birdies (the most
// birdies in a round, all courses or ?course=<id>). Same D1 database (DB).

import { D1Like, handleRecordsGet, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  try {
    return await handleRecordsGet(env.DB, new URL(request.url));
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

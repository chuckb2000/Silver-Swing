// Cloudflare Pages Function: player names at /api/names. GET ?name=&owner=
// says whether this device may use a name; POST {name, owner} claims it. A
// name belongs to the first device that uses it. Same D1 database (DB).

import { D1Like, handleNames, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  try {
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    return await handleNames(env.DB, { method: request.method, url: new URL(request.url), body: request.method === 'POST' ? await request.text() : undefined });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

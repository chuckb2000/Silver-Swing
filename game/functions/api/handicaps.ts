// Cloudflare Pages Function: /api/handicaps, each shown player's latest Normal rounds,
// cut down to what the game's handicap needs. Same D1 database (DB).

import { D1Like, handleHandicapsGet, json } from '../../src/server/scores';

interface Env { DB?: D1Like }
interface Context { request: Request; env: Env }

export const onRequestGet = async ({ env }: Context): Promise<Response> => {
  try {
    return await handleHandicapsGet(env.DB);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

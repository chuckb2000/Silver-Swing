// The match Worker: hosts the MatchRoom Durable Object (one per live match).
// The Pages site reaches it through its MATCH binding (functions/api/matches.ts,
// functions/api/match/[[path]].ts); this Worker has no public routes of its own.
// Deploy: `npm run deploy` here, then bind the Pages project to it
// (docs/reports/multiplayer_live_match.md, "Setting it up").

import { DurableObject } from 'cloudflare:workers';
import { MatchRoomCore, PING, PONG, RoomHost, RoomSocket, SocketInfo } from '../../src/server/matchRoom';

function wrap(ws: WebSocket): RoomSocket {
  return {
    send: (t) => ws.send(t),
    close: (c, r) => ws.close(c, r),
    info: () => (ws.deserializeAttachment() as SocketInfo | null) ?? null,
    setInfo: (i) => ws.serializeAttachment(i),
  };
}

/** The Worker has no bindings of its own. */
type Env = Record<string, never>;

export class MatchRoom extends DurableObject<Env> {
  private core: MatchRoomCore;
  private wrapped = new WeakMap<WebSocket, RoomSocket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // keep-alive pings are answered without waking (or billing) the object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    const st = ctx.storage;
    const host: RoomHost = {
      storage: {
        get: (k) => st.get(k),
        put: (e) => st.put(e),
        list: (o) => st.list(o),
        deleteAll: () => st.deleteAll(),
        setAlarm: (t) => st.setAlarm(t),
      },
      sockets: () => ctx.getWebSockets().map((w) => this.socket(w)),
      accept: (info) => {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        ctx.acceptWebSocket(server);
        if (info) server.serializeAttachment(info);
        return new Response(null, { status: 101, webSocket: client });
      },
      now: () => Date.now(),
      random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
    };
    this.core = new MatchRoomCore(host);
  }

  private socket(ws: WebSocket): RoomSocket {
    let w = this.wrapped.get(ws);
    if (!w) { w = wrap(ws); this.wrapped.set(ws, w); }
    return w;
  }

  fetch(req: Request): Promise<Response> {
    return this.core.fetch(req);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.core.message(this.socket(ws), message);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.core.closed(this.socket(ws));
    try { ws.close(code, reason); } catch { /* already closed */ }
  }

  async webSocketError(ws: WebSocket) {
    this.core.closed(this.socket(ws));
  }

  async alarm() {
    await this.core.alarm();
  }
}

export default {
  fetch(): Response {
    return new Response('silver swings golf: match rooms (reached through the game site)', { status: 404 });
  },
};

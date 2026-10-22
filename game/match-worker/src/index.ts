// The match Worker: hosts the MatchRoom Durable Object (one per live match).
// The Pages site reaches it through its MATCH binding (functions/api/matches.ts,
// functions/api/match/[[path]].ts); this Worker has no public routes of its own
// (in development only, MATCH_DEBUG=1, a route that moves a match's clock on).
// Deploy: `npm run deploy` here, then bind the Pages project to it
// (docs/reports/multiplayer_live_match.md, "Setting it up").

import { DurableObject } from 'cloudflare:workers';
import { MatchRoomCore, PING, PONG, RoomHost, RoomSocket, SocketInfo } from '../../src/server/matchRoom';
import { LobbyCore, LobbyInfo, LobbySocket } from '../../src/server/lobby';

function wrap(ws: WebSocket, ctx: DurableObjectState): RoomSocket {
  return {
    send: (t) => ws.send(t),
    close: (c, r) => ws.close(c, r),
    info: () => (ws.deserializeAttachment() as SocketInfo | null) ?? null,
    setInfo: (i) => ws.serializeAttachment(i),
    // the last keep-alive the platform answered for us (the object isn't woken for those)
    pingedAt: () => ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? null,
  };
}

/** A socket of the lobby ("open to a challenge"), not of a match: its attachment says so. */
const isLobby = (ws: WebSocket) => (ws.deserializeAttachment() as { lobby?: boolean } | null)?.lobby === true;

interface Env {
  /** its own Durable Object namespace (wrangler.toml) */
  MATCH: DurableObjectNamespace;
  /** '1' only under scripts/match-dev.sh: the tests may move a match's clock on */
  MATCH_DEBUG?: string;
}

export class MatchRoom extends DurableObject<Env> {
  private core: MatchRoomCore;
  private wrapped = new WeakMap<WebSocket, RoomSocket>();
  /** the object named "lobby" is the challenge lobby (src/server/lobby.ts), made on its first use */
  private lobbyCore: LobbyCore | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // keep-alive pings are answered without waking (or billing) the object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    const st = ctx.storage;
    const host: RoomHost = {
      storage: {
        get: (k) => st.get(k),
        put: (e) => st.put(e),
        deleteAll: () => st.deleteAll(),
        getAlarm: () => st.getAlarm(),
        setAlarm: (t) => st.setAlarm(t),
      },
      sockets: () => ctx.getWebSockets().map((w) => this.socket(w)),
      accept: (info) => {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        ctx.acceptWebSocket(server);
        server.serializeAttachment(info); // its opening time: a socket that never says hello is closed after 10 s
        return new Response(null, { status: 101, webSocket: client });
      },
      now: () => Date.now(),
      random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
      debug: env.MATCH_DEBUG === '1',
    };
    this.core = new MatchRoomCore(host);
  }

  private socket(ws: WebSocket): RoomSocket {
    let w = this.wrapped.get(ws);
    if (!w) { w = wrap(ws, this.ctx); this.wrapped.set(ws, w); }
    return w;
  }

  private lobby(): LobbyCore {
    if (!this.lobbyCore) {
      const ctx = this.ctx, st = ctx.storage;
      this.lobbyCore = new LobbyCore({
        storage: { get: (k) => st.get(k), put: (e) => st.put(e) },
        sockets: () => ctx.getWebSockets().filter(isLobby).map((w) => this.socket(w) as unknown as LobbySocket),
        accept: (info: LobbyInfo) => {
          const pair = new WebSocketPair();
          const [client, server] = Object.values(pair);
          ctx.acceptWebSocket(server);
          server.serializeAttachment(info);
          return new Response(null, { status: 101, webSocket: client });
        },
        now: () => Date.now(),
        random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
      });
    }
    return this.lobbyCore;
  }

  fetch(req: Request): Promise<Response> {
    if (new URL(req.url).pathname.startsWith('/lobby/')) return this.lobby().fetch(req);
    return this.core.fetch(req);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (isLobby(ws)) { await this.lobby().message(this.socket(ws) as unknown as LobbySocket, message); return; }
    await this.core.message(this.socket(ws), message);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const lobby = isLobby(ws);
    const gone = lobby ? this.lobby().closed(this.socket(ws) as unknown as LobbySocket) : this.core.closed(this.socket(ws)); // who it was is read at once; the rest waits on the storage
    // finish the closing handshake. A browser that closes without a code sends none (1005), and 1005
    // and 1006 can't be sent back: closing with them throws, the reply never goes, and the browser's
    // socket hangs in CLOSING (found by the two-browser test). Answer those with 1000.
    const reply = code >= 1000 && code < 5000 && code !== 1005 && code !== 1006 && code !== 1015 ? code : 1000;
    try { ws.close(reply, reason); } catch { /* already closed */ }
    await gone;
  }

  async webSocketError(ws: WebSocket) {
    if (isLobby(ws)) { await this.lobby().closed(this.socket(ws) as unknown as LobbySocket); return; }
    await this.core.closed(this.socket(ws));
  }

  async alarm() {
    await this.core.alarm();
  }
}

export default {
  fetch(req: Request, env: Env): Promise<Response> | Response {
    // development only: POST /debug/<code>/skip?ms=N moves that match's clock on (the move clock's tests)
    const m = new URL(req.url).pathname.match(/^\/debug\/([a-z0-9]{6})\/skip$/);
    if (env.MATCH_DEBUG === '1' && m && req.method === 'POST') {
      return env.MATCH.get(env.MATCH.idFromName(m[1])).fetch(new Request(`https://match/skip${new URL(req.url).search}`, { method: 'POST' }));
    }
    return new Response('silver swings golf: match rooms (reached through the game site)', { status: 404 });
  },
};

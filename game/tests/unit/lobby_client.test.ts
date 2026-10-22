// The game's line to the challenge lobby (src/net/lobbyClient.ts) against the
// lobby itself (src/server/lobby.ts) over a fake network: what each game
// knows after a post, an offer and its answer, and after its line drops.

import { describe, expect, it } from 'vitest';
import { LobbyCore, LobbyHost, LobbyInfo, LobbySocket } from '../../src/server/lobby';
import { LobbyClient, LobbyEvent } from '../../src/net/lobbyClient';
import type { WebSocketLike } from '../../src/net/matchClient';

const KEY_A = 'aaaabbbbccccdddd', KEY_B = 'eeeeffffgggghhhh';

/** Let the fake network's messages and the lobby's awaits run. */
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); };

function world() {
  const store = new Map<string, unknown>();
  const sockets: ServerEnd[] = [];
  let now = Date.parse('2026-10-22T18:00:00Z');
  let r = 0;
  let accepting: ServerEnd | null = null;
  class ServerEnd implements LobbySocket {
    inf: LobbyInfo | null = null;
    open = true;
    constructor(public client: ClientEnd) {}
    send(t: string) { if (!this.open) throw new Error('closed'); setTimeout(() => this.client.receive(t), 0); }
    close(code = 1000) { if (!this.open) return; this.open = false; setTimeout(() => this.client.closedBy(code), 0); }
    info() { return this.inf; }
    setInfo(i: LobbyInfo) { this.inf = structuredClone(i); }
    pingedAt() { return null; }
  }
  const host: LobbyHost = {
    storage: { get: async <T>(k: string) => structuredClone(store.get(k)) as T | undefined, put: async (e) => { for (const [k, v] of Object.entries(e)) store.set(k, structuredClone(v)); } },
    sockets: () => sockets.filter((s) => s.open),
    accept: (info) => { const s = accepting!; s.setInfo(info); sockets.push(s); return new Response(null, { status: 200 }); },
    now: () => now,
    random: () => { r = (r * 9301 + 49297) % 233280; return r / 233280; },
  };
  const core = new LobbyCore(host);
  class ClientEnd implements WebSocketLike {
    readyState = 0;
    onopen: WebSocketLike['onopen'] = null;
    onmessage: WebSocketLike['onmessage'] = null;
    onclose: WebSocketLike['onclose'] = null;
    onerror: WebSocketLike['onerror'] = null;
    server: ServerEnd;
    constructor(readonly url: string) {
      this.server = new ServerEnd(this);
      accepting = this.server;
      void core.fetch(new Request('https://match/lobby/ws', { headers: { Upgrade: 'websocket' } })).then(() => {
        this.readyState = 1;
        this.onopen?.({});
      });
    }
    send(d: string) { if (this.readyState !== 1) throw new Error('not open'); void core.message(this.server, d); }
    close() { if (this.readyState === 3) return; this.readyState = 3; this.server.open = false; void core.closed(this.server); }
    receive(t: string) { if (this.readyState === 1) this.onmessage?.({ data: t }); }
    closedBy(code: number) { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({ code }); }
  }
  const client = () => {
    const timers: (() => void)[] = [];
    const c = new LobbyClient({
      base: 'https://silver.test', WebSocket: ClientEnd,
      setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => undefined,
      setInterval: () => 0, clearInterval: () => undefined,
      now: () => now,
    });
    const events: LobbyEvent[] = [];
    c.onEvent((e) => events.push(e));
    return { c, events, retry: () => { const t = timers.splice(0); for (const f of t) f(); } };
  };
  return { core, sockets, client, tick: (ms: number) => { now += ms; } };
}

describe("the game's line to the challenge lobby", () => {
  it('a post, an offer and its answer reach the right games; a dropped line comes back with the picture', async () => {
    const W = world();
    const A = W.client(), B = W.client();
    A.c.start(KEY_A);
    B.c.start(KEY_B);
    await flush();
    expect([A.c.ready, B.c.ready, A.c.online]).toEqual([true, true, 2]);
    expect(A.c.post('charlie', 'ogc')).toBe(true);
    await flush();
    expect(A.c.mine).not.toBeNull();
    expect(B.c.mine).toBeNull();
    const post = B.c.openPosts()[0];
    expect(post).toMatchObject({ by: 'charlie', course: 'ogc' });
    expect(B.events.find((e) => e.kind === 'posted')).toMatchObject({ mine: false });
    expect(A.events.find((e) => e.kind === 'posted')).toMatchObject({ mine: true });

    B.c.offer('kevin', post.id, 'abcdef', 'ogc', 'front 9  ·  blue tees  ·  normal');
    await flush();
    expect(A.c.offers.map((o) => [o.from, o.code])).toEqual([['kevin', 'abcdef']]);
    expect(B.c.sent.map((o) => o.code)).toEqual(['abcdef']);

    // kevin's line drops; he comes back to the same picture (his offer out)
    W.sockets.find((s) => s.inf?.key === KEY_B)!.close(1001);
    await flush();
    expect(B.c.ready).toBe(false);
    B.retry();
    await flush();
    expect(B.c.ready).toBe(true);
    expect(B.c.sent.map((o) => o.code)).toEqual(['abcdef']);

    A.c.answer(A.c.offers[0].id, true);
    await flush();
    const reply = B.events.find((e) => e.kind === 'reply');
    expect(reply).toMatchObject({ accepted: true, offer: { code: 'abcdef', to: 'charlie' } });
    expect([A.c.mine, A.c.offers, B.c.openPosts(), B.c.sent]).toEqual([null, [], [], []]);
  });

  it('a post past its 15 minutes leaves the list at once, before the lobby says so', async () => {
    const W = world();
    const A = W.client(), B = W.client();
    A.c.start(KEY_A);
    B.c.start(KEY_B);
    await flush();
    A.c.post('charlie', null);
    await flush();
    expect(B.c.openPosts()).toHaveLength(1);
    W.tick(15 * 60_000);
    expect(B.c.openPosts()).toHaveLength(0);
  });
});

// The challenge lobby (src/server/lobby.ts; developer, 2026-10-22: "open to a
// challenge"): posts go to everyone, offers to the poster, answers to the one
// who offered; the first offer accepted wins; posts last 15 minutes; keys are
// never sent to anyone.

import { describe, expect, it } from 'vitest';
import { LobbyCore, LobbyHost, LobbyInfo, LobbySocket } from '../../src/server/lobby';
import { LOBBY, LobbyNews } from '../../src/systems/match/lobby';

const KEY_A = 'aaaabbbbccccdddd', KEY_B = 'eeeeffffgggghhhh', KEY_C = 'jjjjkkkkmmmmnnnn';

class Sock implements LobbySocket {
  inf: LobbyInfo | null = null;
  got: LobbyNews[] = [];
  closedWith: number | null = null;
  send(t: string) { if (this.closedWith !== null) throw new Error('closed'); if (t !== '{"type":"pong"}') this.got.push(JSON.parse(t)); }
  close(code = 1000) { this.closedWith = code; }
  info() { return this.inf; }
  setInfo(i: LobbyInfo) { this.inf = structuredClone(i); }
  pingedAt() { return null; }
  /** the news of one type it has had, latest last */
  all<T extends LobbyNews['type']>(type: T) { return this.got.filter((n) => n.type === type) as Extract<LobbyNews, { type: T }>[]; }
  last<T extends LobbyNews['type']>(type: T) { const a = this.all(type); return a[a.length - 1]; }
}

function lobby() {
  const store = new Map<string, unknown>();
  const socks: Sock[] = [];
  let now = Date.parse('2026-10-22T18:00:00Z');
  let r = 0;
  const host: LobbyHost = {
    storage: { get: async <T>(k: string) => structuredClone(store.get(k)) as T | undefined, put: async (e) => { for (const [k, v] of Object.entries(e)) store.set(k, structuredClone(v)); } },
    sockets: () => socks.filter((s) => s.closedWith === null),
    accept: (info) => { const s = new Sock(); s.setInfo(info); socks.push(s); return new Response(null, { status: 200 }); },
    now: () => now,
    random: () => { r = (r * 9301 + 49297) % 233280; return r / 233280; },
  };
  let core = new LobbyCore(host);
  const t = {
    core: () => core,
    store,
    tick: (ms: number) => { now += ms; },
    now: () => now,
    /** the object woke up afresh (memory gone, storage kept) */
    restart: () => { core = new LobbyCore(host); },
    /** a game opens its line and says hello */
    async open(key: string, v: number = LOBBY.version): Promise<Sock> {
      await core.fetch(new Request('https://match/lobby/ws', { headers: { Upgrade: 'websocket' } }));
      const s = socks[socks.length - 1];
      await core.message(s, JSON.stringify({ type: 'hello', key, v }));
      return s;
    },
    say: (s: Sock, m: Record<string, unknown>) => core.message(s, JSON.stringify(m)),
  };
  return t;
}

describe('the challenge lobby (developer, 2026-10-22: "open to a challenge")', () => {
  it('a post reaches everyone; an offer reaches the poster; accepting it closes the post and tells the others "taken"', async () => {
    const L = lobby();
    const a = await L.open(KEY_A), b = await L.open(KEY_B), c = await L.open(KEY_C);
    expect(a.last('welcome')).toMatchObject({ posts: [], mine: null, offers: [], sent: [] });
    expect(c.last('welcome').online).toBe(3);
    await L.say(a, { type: 'post', name: 'charlie', course: 'oswego_lake' });
    const post = b.last('posted').post;
    expect(post).toMatchObject({ by: 'charlie', course: 'oswego_lake' });
    expect(post.until - post.at).toBe(LOBBY.postMs);
    expect(c.last('posted').post.id).toBe(post.id);
    expect(a.last('posted')).toMatchObject({ post: { id: post.id }, mine: true }); // the poster's own games hear it as theirs
    expect(b.last('posted').mine).toBeUndefined();
    expect(JSON.stringify(a.got)).not.toContain(KEY_A); // keys are never sent

    await L.say(b, { type: 'offer', name: 'kevin', post: post.id, code: 'abcdef', course: 'oswego_lake', line: '18 holes · blue tees · normal' });
    await L.say(c, { type: 'offer', name: 'dave', post: post.id, code: 'ghijkm', course: 'oswego_lake', line: 'front 9 · blue tees · normal' });
    const offers = a.all('offer').map((n) => n.offer);
    expect(offers.map((o) => [o.from, o.code, o.to])).toEqual([['kevin', 'abcdef', 'charlie'], ['dave', 'ghijkm', 'charlie']]);
    expect(b.last('sent').offer.code).toBe('abcdef');
    expect(c.all('offer')).toEqual([]); // offers go to the poster only

    await L.say(a, { type: 'answer', offer: offers[0].id, accept: true });
    expect(b.last('reply')).toEqual({ type: 'reply', offer: offers[0].id, accepted: true });
    expect(c.last('reply')).toEqual({ type: 'reply', offer: offers[1].id, accepted: false, why: 'taken' });
    for (const s of [a, b, c]) expect(s.last('closed')).toEqual({ type: 'closed', post: post.id, why: 'taken' });
    expect(a.last('offerGone')).toEqual({ type: 'offerGone', offer: offers[0].id, why: 'accepted' });
    // the post is gone for a game that opens now
    const d = await L.open('ppppqqqqrrrrssss');
    expect(d.last('welcome').posts).toEqual([]);
  });

  it('declining, withdrawing and cancelling each tell the right players', async () => {
    const L = lobby();
    const a = await L.open(KEY_A), b = await L.open(KEY_B), c = await L.open(KEY_C);
    await L.say(a, { type: 'post', name: 'charlie', course: null }); // any course: the others propose one
    const post = b.last('posted').post;
    expect(post.course).toBeNull();
    await L.say(b, { type: 'offer', name: 'kevin', post: post.id, code: 'abcdef', course: 'langston', line: '18 holes · blue tees · normal' });
    const ob = a.last('offer').offer;
    expect(ob.course).toBe('langston');
    await L.say(a, { type: 'answer', offer: ob.id, accept: false });
    expect(b.last('reply')).toEqual({ type: 'reply', offer: ob.id, accepted: false, why: 'declined' });
    expect(a.last('offerGone')).toEqual({ type: 'offerGone', offer: ob.id, why: 'declined' });
    // a declined offer leaves the post up: another comes, and is taken back
    await L.say(c, { type: 'offer', name: 'dave', post: post.id, code: 'ghijkm', course: 'ogc', line: '18 holes · blue tees · normal' });
    const oc = a.last('offer').offer;
    await L.say(c, { type: 'withdraw', offer: oc.id });
    expect(a.last('offerGone')).toEqual({ type: 'offerGone', offer: oc.id, why: 'withdrawn' });
    // a new offer, then the poster stops looking: the offer is answered "closed"
    await L.say(c, { type: 'offer', name: 'dave', post: post.id, code: 'ghijkm', course: 'ogc', line: '18 holes · blue tees · normal' });
    await L.say(a, { type: 'cancel' });
    expect(c.last('reply')).toMatchObject({ accepted: false, why: 'closed' });
    expect(b.last('closed')).toEqual({ type: 'closed', post: post.id, why: 'cancelled' });
  });

  it('posts last 15 minutes; one post per player (a new one replaces it, not too often); the course must match', async () => {
    const L = lobby();
    const a = await L.open(KEY_A), b = await L.open(KEY_B);
    await L.say(a, { type: 'post', name: 'charlie', course: 'oswego_lake' });
    const p1 = b.last('posted').post;
    await L.say(b, { type: 'offer', name: 'kevin', post: p1.id, code: 'abcdef', course: 'langston', line: 'x' });
    expect(b.last('error')).toMatchObject({ code: 'course' }); // charlie chose oswego lake
    await L.say(a, { type: 'post', name: 'charlie', course: null });
    expect(a.last('error')).toMatchObject({ code: 'too_fast' });
    L.tick(LOBBY.postEveryMs);
    await L.say(a, { type: 'post', name: 'charlie', course: null });
    expect(b.last('closed')).toEqual({ type: 'closed', post: p1.id, why: 'cancelled' });
    const p2 = b.last('posted').post;
    expect(p2.id).not.toBe(p1.id);
    await L.say(b, { type: 'offer', name: 'kevin', post: p2.id, code: 'abcdef', course: 'langston', line: 'x' });
    L.tick(LOBBY.postMs);
    await L.say(b, { type: 'cancel' }); // any message: the lobby notices the time
    expect(b.last('closed')).toEqual({ type: 'closed', post: p2.id, why: 'expired' });
    expect(b.last('reply')).toMatchObject({ accepted: false, why: 'closed' });
  });

  it('refuses what no game sends: no name, the default name, its own post, a bad code, too many offers, a stale version', async () => {
    const L = lobby();
    const a = await L.open(KEY_A), b = await L.open(KEY_B);
    await L.say(a, { type: 'post', name: 'player', course: null });
    expect(a.last('error')).toMatchObject({ code: 'name' });
    await L.say(a, { type: 'post', name: 'charlie', course: '<b>' });
    expect(a.last('error')).toMatchObject({ code: 'course' });
    await L.say(a, { type: 'post', name: 'charlie', course: null });
    const p = b.last('posted').post;
    await L.say(a, { type: 'offer', name: 'charlie', post: p.id, code: 'abcdef', course: 'ogc', line: 'x' });
    expect(a.last('error')).toMatchObject({ code: 'own' });
    await L.say(b, { type: 'offer', name: 'kevin', post: p.id, code: 'ABCDEF', course: 'ogc', line: 'x' });
    expect(b.last('error')).toMatchObject({ code: 'bad_offer' });
    await L.say(b, { type: 'answer', offer: 'nothing', accept: true });
    expect(b.last('error')).toMatchObject({ code: 'no_offer' });
    // three posts out at once, an offer to each: a fourth waits
    const others = [KEY_C, 'ppppqqqqrrrrssss', 'ttttuuuuvvvvwwww'];
    const ids: string[] = [p.id];
    for (const [i, k] of others.entries()) {
      const s = await L.open(k);
      await L.say(s, { type: 'post', name: `p${i}`, course: null });
      ids.push(b.last('posted').post.id);
    }
    for (const id of ids) await L.say(b, { type: 'offer', name: 'kevin', post: id, code: 'abcdef', course: 'ogc', line: 'x' });
    expect(b.all('sent')).toHaveLength(LOBBY.maxOffers);
    expect(b.last('error')).toMatchObject({ code: 'too_many' });
    // a game of another lobby version is closed
    const old = await L.open('xxxxyyyyzzzz2222', 0);
    expect(old.closedWith).toBe(4012);
  });

  it('keeps posts and offers through a restart, and lists posts over HTTP without keys', async () => {
    const L = lobby();
    const a = await L.open(KEY_A), b = await L.open(KEY_B);
    await L.say(a, { type: 'post', name: 'charlie', course: 'ogc' });
    const p = b.last('posted').post;
    await L.say(b, { type: 'offer', name: 'kevin', post: p.id, code: 'abcdef', course: 'ogc', line: '18 holes · blue tees · normal' });
    L.restart();
    const a2 = await L.open(KEY_A);
    expect(a2.last('welcome')).toMatchObject({ mine: p.id });
    expect(a2.last('welcome').offers.map((o) => o.from)).toEqual(['kevin']);
    const b2 = await L.open(KEY_B);
    expect(b2.last('welcome').sent.map((o) => o.code)).toEqual(['abcdef']);
    const res = await L.core().fetch(new Request('https://match/lobby/list'));
    const j = await res.json() as { posts: unknown[]; online: number };
    expect(j.posts).toHaveLength(1);
    expect(JSON.stringify(j)).not.toContain(KEY_A);
    expect([...L.store.keys()]).toEqual(['L']); // one stored record
  });
});

// Service worker (player improvements, item 3): the game opens from the home
// screen and a course played once loads from this device next time, even
// offline. Built into dist/ with this build's id (scripts/artifact-page.mjs).
//   - the page and app files: the network first, this device when offline;
//     Vite's hashed files (assets/) from this device once fetched
//   - sprites: the network when it answers in 2.5 s, else this device
//   - courses/<id>/*: this device, in a cache per course version
//     (courses/versions.json, a hash of the course's files written by the
//     build); a rebuilt course gets a new cache and the old one is dropped
//   - music/*.mp3: this device once fetched (each file's name carries its hash);
//     music/index.json and music/christmas.json the network first
//   - api/*: never cached (scores always go to the network)
const BUILD = '__BUILD__';
const APP = `app-${BUILD}`;
const SPRITES = 'sprites-1';
const MUSIC = 'music-1';
const VERSIONS = 'courses/versions.json';
let versions = null;
let versionsAt = 0;

// waits until the page asks: at once when the page is already this version (it
// loads network-first), else after the player takes the update offered on the title
self.addEventListener('install', () => {});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('app-') && k !== APP) await caches.delete(k);
    // music files this build no longer has go (a movement made again has a new name)
    try {
      const want = new Set();
      for (const list of ['music/index.json', 'music/christmas.json']) { // the suite, and the Christmas carols
        for (const t of (await (await fetch(list, { cache: 'no-store' })).json()).tracks ?? []) want.add(t.file);
      }
      const mc = await caches.open(MUSIC);
      for (const r of await mc.keys()) if (!want.has(new URL(r.url).pathname.split('/').pop())) await mc.delete(r);
    } catch { /* offline: next time */ }
    await self.clients.claim();
  })());
});

async function courseVersions(fresh) {
  if (versions && !fresh && Date.now() - versionsAt < 60_000) return versions;
  try {
    const res = await fetch(VERSIONS, { cache: 'no-store' });
    if (res.ok) {
      versions = await res.json();
      versionsAt = Date.now();
      const c = await caches.open(APP);
      await c.put(VERSIONS, new Response(JSON.stringify(versions), { headers: { 'content-type': 'application/json' } }));
      return versions;
    }
  } catch { /* offline */ }
  if (!versions) {
    const hit = await caches.match(VERSIONS);
    versions = hit ? await hit.json() : {};
  }
  return versions;
}

async function courseFile(req, id, file) {
  const v = (await courseVersions(file === 'course.json'))[id];
  if (!v) return fetch(req); // not a built course (or the list is unreachable): no caching
  const name = `course-${id}-${v}`;
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    // the course's older versions go
    for (const k of await caches.keys()) if (k.startsWith(`course-${id}-`) && k !== name) await caches.delete(k);
  }
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(APP);
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

// The network's copy when it answers within `ms`, else this device's (always, offline). The sprites
// were served from this device and refreshed behind (so the first visit after a deploy ran the new
// code with the old sprite sheet and font, a frame added by that deploy missing until the next visit).
async function freshOrKept(req, name, ms) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res.ok || !hit ? res : hit;
  });
  if (!hit) return net;
  return Promise.race([net.catch(() => hit), new Promise((resolve) => setTimeout(() => resolve(hit), ms))]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (path.startsWith('api/')) return;
  const m = path.match(/^courses\/([a-z0-9_]+)\/(.+)$/);
  if (m) { e.respondWith(courseFile(req, m[1], m[2])); return; }
  if (path === VERSIONS) { e.respondWith(courseVersions(true).then((v) => new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } }))); return; }
  if (path.startsWith('assets/')) { e.respondWith(cacheFirst(req, APP)); return; }
  if (path.startsWith('music/') && path.endsWith('.mp3')) { e.respondWith(cacheFirst(req, MUSIC)); return; }
  if (path.startsWith('sprites/') || path.startsWith('icons/')) { e.respondWith(freshOrKept(req, SPRITES, 2500)); return; }
  e.respondWith(networkFirst(req)); // the page, index.json, manifest
});

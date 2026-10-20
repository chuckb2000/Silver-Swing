// Install to the home screen, with course files kept on the device (player
// improvements, item 3): the service worker (public/sw.js) is registered on
// the hosted site only - not in development, the tests or the claude.ai
// artifact (an iframe on another host).

export const update = { ready: false, apply: () => {} };
let onReady: (() => void) | null = null;

/** Called when a new version of the game is waiting (the title screen offers a reload). */
export function whenUpdateReady(cb: () => void) {
  onReady = cb;
  if (update.ready) cb();
}

export function registerOffline() {
  // installing is optional (developer, 2026-10-20): no browser install banner; the browser menu still offers it
  window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());
  const q = new URLSearchParams(location.search);
  const test = q.has('sw') && location.hostname === 'localhost'; // the Playwright test of the offline copy
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || (location.protocol !== 'https:' && !test)) return;
  if (window.self !== window.top || /(^|\.)(claude|anthropic)\./.test(location.hostname) || (q.has('autoplay') && !test)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const offer = (w: ServiceWorker) => {
        update.ready = true;
        update.apply = () => {
          navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
          w.postMessage('skip-waiting');
        };
        onReady?.();
      };
      // A new worker waits. The page itself is loaded network-first, so after a
      // deploy it is usually the new version already: then the worker takes over
      // quietly. Only a page older than the site (opened offline, from this
      // device) is offered the reload (afternoon review: "update" showed after
      // every deploy).
      const waiting = async (w: ServiceWorker) => {
        if (await pageIsCurrent()) {
          navigator.serviceWorker.addEventListener('controllerchange', () => void rewarm(), { once: true });
          w.postMessage('skip-waiting');
        } else offer(w);
      };
      // the first worker takes over at once; later ones wait to be offered
      if (reg.waiting && navigator.serviceWorker.controller) void waiting(reg.waiting);
      else if (reg.waiting) reg.waiting.postMessage('skip-waiting');
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state !== 'installed') return;
          if (navigator.serviceWorker.controller) void waiting(w); else w.postMessage('skip-waiting');
        });
      });
    } catch { /* no offline copy: the game still works online */ }
  });
}

/** The page's own bundle (index.html's module script), as a path. */
function bundleOf(src: string | null | undefined): string | null {
  if (!src) return null;
  try { return new URL(src, location.href).pathname; } catch { return null; }
}

/** Is the running page the site's current version (the same bundle as a fresh index.html)? */
async function pageIsCurrent(): Promise<boolean> {
  const mine = bundleOf(document.querySelector('script[type="module"][src]')?.getAttribute('src'));
  if (!mine) return false;
  try {
    const res = await fetch('./', { cache: 'no-store' });
    if (!res.ok) return false;
    const m = (await res.text()).match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
    return bundleOf(m?.[1]) === mine;
  } catch {
    return false; // can't tell: offer it as before
  }
}

/**
 * A worker that took over quietly starts with an empty app cache (it drops the
 * old one): fetch the page and the files it has loaded again so the new worker
 * keeps them, and the game still opens offline. Courses and sprites have their
 * own caches, which stay.
 */
async function rewarm() {
  const base = new URL(navigator.serviceWorker.controller?.scriptURL ?? 'sw.js', location.href);
  const scope = base.pathname.replace(/[^/]*$/, '');
  // the course list's versions too: the worker finds a kept course's cache by them (offline as well)
  const urls = new Set<string>(['./', 'courses/versions.json', 'manifest.webmanifest'].map((u) => new URL(u, location.href).href).concat(location.href));
  for (const e of performance.getEntriesByType('resource')) {
    const u = new URL(e.name);
    if (u.origin !== location.origin || !u.pathname.startsWith(scope)) continue;
    const path = u.pathname.slice(scope.length);
    if (/^(api|sprites|icons)\//.test(path) || /^courses\/[a-z0-9_]+\//.test(path)) continue;
    urls.add(u.href);
  }
  for (const u of urls) { try { await fetch(u); } catch { /* offline again: next time */ } }
}

/** Courses kept on this device, and how much they take (null where the browser can't say). */
export async function keptCourses(): Promise<{ courses: number; bytes: number | null }> {
  if (typeof caches === 'undefined') return { courses: 0, bytes: null };
  const keys = (await caches.keys()).filter((k) => k.startsWith('course-'));
  let bytes: number | null = null;
  try { bytes = (await navigator.storage?.estimate?.())?.usage ?? null; } catch { /* unknown */ }
  return { courses: keys.length, bytes };
}

/** Remove the courses kept on this device (they download again when played). */
export async function freeUpSpace(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const keys = (await caches.keys()).filter((k) => k.startsWith('course-'));
  for (const k of keys) await caches.delete(k);
  return keys.length;
}

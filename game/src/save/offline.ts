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
      // the first worker takes over at once; later ones wait to be offered
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      else if (reg.waiting) reg.waiting.postMessage('skip-waiting');
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state !== 'installed') return;
          if (navigator.serviceWorker.controller) offer(w); else w.postMessage('skip-waiting');
        });
      });
    } catch { /* no offline copy: the game still works online */ }
  });
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

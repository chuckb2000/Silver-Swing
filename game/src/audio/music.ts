// The game's music (developer, 2026-10-22): the nine movements of the Silver
// Swings suite (about 15 minutes, made in code: assets-src/music/), shuffled,
// in the menus and in rounds. It plays through the sound effects' master gain,
// so settings "volume" and "sound: muted" apply to it; muted (or the tab
// hidden) it pauses, and nothing more is downloaded. Each movement (about
// 1.2 MB) is fetched whole as it's needed, the next one while this one plays;
// the offline copy keeps them (public/sw.js, cache "music-1").
// From 12 to 31 December the six Christmas carols play instead (music/christmas.json,
// assets-src/music/carols.py; developer, 2026-11-13).

import { app } from '../app';
import { audioGraph, initAudio, onSoundChange, soundOn } from './sfx';
import { Playlist } from './playlist';

interface Track { id: string; title: string; file: string; seconds: number; bytes: number }

/** The music's level under the master volume: a little quieter in a round than in the menus. */
const LEVEL = { menu: 0.6, round: 0.42 };
// a moment of silence (a valid WAV): played on the first tap so iPhones let the music start later
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let el: HTMLAudioElement | null = null;
let gain: GainNode | null = null;
let tracks: Track[] = [];
let list: Playlist | null = null;
let started = false;
let current = -1;
let failures = 0;
let where: keyof typeof LEVEL = 'menu';
const urls = new Map<number, string>();

/** For the tests: what the music is doing. */
export const musicState = {
  get started() { return started; },
  get track() { return current >= 0 ? tracks[current]?.id ?? null : null; },
  get playing() { return !!el && !el.paused && !!el.src && el.src !== SILENT; },
  get level() { return gain?.gain.value ?? null; },
};

/** Any first tap or key: sound starts (browsers allow audio only after one), then the music. */
export function installMusic() {
  const go = () => {
    window.removeEventListener('pointerdown', go, true);
    window.removeEventListener('keydown', go, true);
    unlock();
    void initAudio().then(start);
  };
  window.addEventListener('pointerdown', go, true);
  window.addEventListener('keydown', go, true);
  (window as unknown as { __music: typeof musicState }).__music = musicState;
}

/** In a round, or in the menus: the music's level. */
export function musicFor(w: keyof typeof LEVEL) {
  where = w;
  const g = audioGraph();
  if (gain && g) gain.gain.setTargetAtTime(LEVEL[w], g.ctx.currentTime, 0.6);
  else if (el && !gain) el.volume = LEVEL[w];
}

function unlock() {
  if (el) return;
  el = new Audio();
  el.setAttribute('playsinline', '');
  el.preload = 'auto';
  el.src = SILENT;
  void el.play().then(() => el?.pause()).catch(() => undefined);
}

async function start() {
  if (started || !el) return;
  started = true;
  try {
    const res = await fetch(app.holiday === 'christmas' ? 'music/christmas.json' : 'music/index.json');
    if (!res.ok) return;
    tracks = ((await res.json()) as { tracks: Track[] }).tracks ?? [];
  } catch {
    return; // no music here (the single-page artifact, or offline before it was ever fetched)
  }
  if (!tracks.length) return;
  const g = audioGraph();
  if (g) {
    try {
      gain = g.ctx.createGain();
      gain.gain.value = LEVEL[where];
      g.ctx.createMediaElementSource(el).connect(gain).connect(g.master);
    } catch {
      gain = null;
    }
  }
  if (!gain) el.volume = soundOn() ? LEVEL[where] : 0;
  list = new Playlist(tracks.length);
  el.addEventListener('ended', () => void next());
  el.addEventListener('error', () => { if (el?.src && el.src !== SILENT) void next(); });
  document.addEventListener('visibilitychange', apply);
  onSoundChange(apply);
  if (soundOn()) void next();
}

/** Should the music be playing now? */
const wanted = () => soundOn() && document.visibilityState === 'visible';

function apply() {
  if (!el || !started || !list) return;
  if (!gain) el.volume = soundOn() ? LEVEL[where] : 0;
  if (!wanted()) { el.pause(); return; }
  if (current < 0) { void next(); return; }
  void audioGraph()?.ctx.resume().catch(() => undefined);
  void el.play().catch(() => undefined);
}

async function url(i: number): Promise<string | null> {
  const hit = urls.get(i);
  if (hit) return hit;
  try {
    const res = await fetch(`music/${tracks[i].file}`);
    if (!res.ok) return null;
    const u = URL.createObjectURL(await res.blob());
    urls.set(i, u);
    return u;
  } catch {
    return null;
  }
}

/** a track is being fetched: every volume change asks for one while nothing plays, and the second
 * request replaced the first track a moment after it started */
let fetching = false;

async function next() {
  if (fetching) return;
  fetching = true;
  try { await advance(); } finally { fetching = false; }
}

async function advance(): Promise<void> {
  if (!el || !list || !wanted()) { current = -1; return; }
  const i = list.next();
  const u = await url(i);
  if (!u) {
    // can't get this one (offline): try the others, then give up until sound is turned on again
    if (++failures < tracks.length) return advance();
    failures = 0; current = -1;
    return;
  }
  failures = 0;
  // the one before goes (only this one and the next are kept)
  for (const [k, v] of urls) if (k !== i) { URL.revokeObjectURL(v); urls.delete(k); }
  current = i;
  el.src = u;
  if (wanted()) await el.play().catch(() => undefined);
  const ahead = list.peek();
  if (ahead >= 0) void url(ahead);
}

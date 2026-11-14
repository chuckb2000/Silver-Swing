// Test helper: a simple robot golfer that drives the real input path
// (PlayScene.tap with exact timestamps). Exposed as window.__autoplay for
// the Playwright smoke test; never used by normal play.

import type Phaser from 'phaser';
import type { PlayScene } from '../scenes/PlayScene';
import type { HudScene } from '../scenes/HudScene';
import type { LeaderboardEntry } from '../save/entry';
import { shareImage } from '../ui/shareCard';
import { app } from '../app';
import { loadCourse } from '../data/courses';
import { Round, RoundConfig } from '../systems/game/round';
import { makeWind } from '../data/difficulty';
import { applyScale } from '../scale';

export interface AutoplayLog { hole: number; shots: string[] }

export function installAutoplay(game: Phaser.Game) {
  const api = {
    play: () => game.scene.getScene('play') as PlayScene,

    /** Open one hole of a course straight away (screenshots, mock-ups): calm air, the course's default tee. */
    async startAt(id: string, hole: number, viewScale?: number): Promise<void> {
      if (viewScale !== undefined) { app.settings.viewScale = viewScale; applyScale(game); }
      const scene = game.scene.getScenes(true)[0];
      await loadCourse(scene, id);
      const c = app.course!;
      const cfg: RoundConfig = {
        courseId: id, tee: c.json.defaultTee, holes: [hole], length: '18', playerName: 'player', seed: 1,
        settings: { difficulty: 'normal', lefty: false, e5: false, gimmes: false, maxDoublePar: false, mulligans: false },
        startedAt: new Date().toISOString(),
      };
      app.round = new Round(c, cfg);
      app.round.startHole(0);
      (app.round as unknown as { wind: unknown; winds: unknown[] }).wind = makeWind(0, 0);
      (app.round as unknown as { winds: unknown[] }).winds = [makeWind(0, 0)];
      for (const s of game.scene.getScenes(true)) if (s.scene.key !== 'play') game.scene.stop(s.scene.key);
      game.scene.start('play', { resume: false });
    },
    hud: () => game.scene.getScene('hud') as HudScene,

    /**
     * Hit one stroke toward the default target. `accuracy` is the tap-3 error in % of
     * the bar (+ right of the zone centre, - left). Resolves once the stroke is under way.
     */
    async shot(accuracy = 0, powerScale = 1): Promise<boolean> {
      const p = api.play();
      if (p.state !== 'aim') return false;
      p.tap(performance.now());
      // the meter starts once the camera is back on the golfer
      const m = p.meter;
      if ((p.state as string) !== 'swing' || !m) return false;
      const r = p.round;
      const d = r.distToPin();
      const t0 = m.startedAt;
      const want = p.club.kind === 'putter'
        ? Math.min(1, (d * 1.12 + 0.3) / p.puttScale) * powerScale
        : Math.max(0.15, Math.min(1, (d * 0.97) / Math.max(1, r.fullCarry(p.club) * p.swingScale))) * powerScale;
      const [d2, d3] = m.tapTimes(want * 100, accuracy);
      p.tap(t0 + d2);
      p.tap(t0 + d3);
      return true;
    },

    /** The share picture of a round (player improvements, item 2): its size in bytes and a data URL. */
    async sharePicture(entry: LeaderboardEntry, rank = ''): Promise<{ bytes: number; url: string } | null> {
      const scene = game.scene.getScenes(true)[0];
      const blob = await shareImage(scene, entry, rank);
      if (!blob) return null;
      const url = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
      return { bytes: blob.size, url };
    },

    /** Advance whatever is pending: skip intro, fast-forward, resolve dialogs. */
    step(): string {
      const p = api.play();
      const h = api.hud();
      switch (p.state) {
        case 'intro': p.skipIntro(); return 'intro';
        case 'flight': p.fastForward(); return 'flight';
        case 'relief': {
          // take the first drop option if there is one, else the first option
          const opts = p.reliefOptions;
          const i = opts.findIndex((o) => o.shape !== 'point');
          p.chooseRelief(i >= 0 ? i : 0);
          if ((p.state as string) === 'relief' && p.reliefOptional) p.playAsItLies();
          return 'relief';
        }
        case 'drop': p.confirmDrop(); return 'drop';
        case 'holed': h.continueFromHoled(); return 'holed';
        default: return p.state;
      }
    },
  };
  (window as unknown as { __autoplay: typeof api }).__autoplay = api;
  return api;
}

// Test helper: a simple robot golfer that drives the real input path
// (PlayScene.tap with exact timestamps). Exposed as window.__autoplay for
// the Playwright smoke test; never used by normal play.

import type Phaser from 'phaser';
import type { PlayScene } from '../scenes/PlayScene';
import type { HudScene } from '../scenes/HudScene';

export interface AutoplayLog { hole: number; shots: string[] }

export function installAutoplay(game: Phaser.Game) {
  const api = {
    play: () => game.scene.getScene('play') as PlayScene,
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

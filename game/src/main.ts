import Phaser from 'phaser';
import { BgScene } from './scenes/BgScene';
import { BootScene } from './scenes/BootScene';
import { CourseSelectScene } from './scenes/CourseSelectScene';
import { CreditsScene } from './scenes/CreditsScene';
import { HudScene } from './scenes/HudScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { PlayScene } from './scenes/PlayScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SetupScene } from './scenes/SetupScene';
import { SummaryScene } from './scenes/SummaryScene';
import { TitleScene } from './scenes/TitleScene';
import { applyScale, computeLayout, setLayout } from './scale';
import { installAutoplay } from './dev/autoplay';

const layout = computeLayout();
setLayout(layout);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14202a',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  scale: { mode: Phaser.Scale.NONE, width: layout.W, height: layout.H, zoom: layout.r / layout.dpr },
  input: { activePointers: 2 },
  // course files: a request that stalls (seen on first loads over the network, developer 2026-10-19)
  // times out and is tried again instead of hanging the load; fewer at once so each one finishes
  loader: { maxParallelDownloads: 8, timeout: 45_000, maxRetries: 3 },
  fps: { target: 60 },
  scene: [BootScene, BgScene, TitleScene, CourseSelectScene, SetupScene, PlayScene, HudScene, SummaryScene, LeaderboardScene, SettingsScene, CreditsScene],
});

let pending = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => applyScale(game));
});
game.events.once('ready', () => applyScale(game));
(window as unknown as { __game: Phaser.Game }).__game = game;
// the robot golfer is for the tests only (page address ?autoplay); not a way for anyone to post rounds
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('autoplay')) installAutoplay(game);

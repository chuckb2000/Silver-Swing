// Pixel scaling. The canvas renders at the device's full resolution and every
// camera zooms by a whole number Z: one art pixel ("texel") is a Z x Z block of
// device pixels, so the art stays pixel-exact, while the camera and moving
// objects can travel in one-device-pixel steps instead of whole-texel jumps
// (smooth scrolling). Z is chosen so the short side of the view is ~270 texels.

import Phaser from 'phaser';
import { app } from './app';

export interface Layout {
  W: number;   // canvas size in canvas pixels (even)
  H: number;
  Z: number;   // canvas pixels per texel
  r: number;   // device pixels per canvas pixel (2 on very large screens)
  iw: number;  // view size in texels (HUD and menu layout units)
  ih: number;
  dpr: number;
}

/** CSS size of the #game container (it sits inside the phone's safe area). */
function viewSize(): { w: number; h: number } {
  const r = document.getElementById('game')?.getBoundingClientRect();
  return {
    w: r && r.width > 0 ? r.width : window.innerWidth,
    h: r && r.height > 0 ? r.height : window.innerHeight,
  };
}

/** Above this many device pixels the canvas renders at half resolution (fill cost). */
const MAX_PIXELS = 4.2e6;

export function computeLayout(): Layout {
  const dpr = window.devicePixelRatio || 1;
  const { w, h } = viewSize();
  const dw = Math.max(2, Math.floor(w * dpr));
  const dh = Math.max(2, Math.floor(h * dpr));
  const r = dw * dh > MAX_PIXELS ? 2 : 1;
  let W = Math.floor(dw / r);
  let H = Math.floor(dh / r);
  // even sizes put the camera centre on a pixel boundary (crisp texels)
  W -= W % 2;
  H -= H % 2;
  const minDim = Math.min(W, H);
  let Z = Math.max(1, Math.floor(minDim / 270));
  if (minDim / Z > 330) Z = Math.max(1, Math.round(minDim / 285));
  Z = Math.max(1, Z - (app.settings.viewScale || 0));
  return { W, H, Z, r, iw: Math.floor(W / Z), ih: Math.floor(H / Z), dpr };
}

/** Store the layout in `app` (scenes read app.zoom / app.view). */
export function setLayout(L: Layout) {
  app.zoom = L.Z;
  app.view = { w: L.iw, h: L.ih };
}

export function applyScale(game: Phaser.Game) {
  const L = computeLayout();
  setLayout(L); // before resize(): scenes rebuild from app.view in the resize event
  game.scale.resize(L.W, L.H);
  game.scale.setZoom(L.r / L.dpr);
  const c = game.canvas;
  c.style.width = `${(L.W * L.r) / L.dpr}px`;
  c.style.height = `${(L.H * L.r) / L.dpr}px`;
}

/**
 * World camera: zoom = texel scale x view level (1 course, 2 drops, 3 green).
 * Rounding is ours (centerSnapped), not Phaser's, which would floor every
 * sprite to a whole world pixel (0.5 m) and make slow movement step.
 */
export function worldCamera(cam: Phaser.Cameras.Scene2D.Camera, level = 1) {
  cam.setRoundPixels(false);
  cam.setZoom(app.zoom * level);
}

/** Centre a world camera on (x, y) world px, snapped to whole device pixels. */
export function centerSnapped(cam: Phaser.Cameras.Scene2D.Camera, x: number, y: number) {
  const z = cam.zoom;
  cam.centerOn(Math.round(x * z) / z, Math.round(y * z) / z);
}

/** HUD and menu camera: origin top-left, coordinates in texels. */
export function uiCamera(cam: Phaser.Cameras.Scene2D.Camera) {
  cam.setOrigin(0, 0);
  cam.setZoom(app.zoom);
  cam.setScroll(0, 0);
  cam.setRoundPixels(true);
}

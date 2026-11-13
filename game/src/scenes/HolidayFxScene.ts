// Falling snow at Christmas, falling leaves at Thanksgiving (developer, 2026-11-13): drawn over the
// title, the menus and the course, under the HUD. In a round they drift with the hole's wind.
// Never takes a tap.

import Phaser from 'phaser';
import { app } from '../app';
import { uiCamera } from '../scale';

interface Bit { x: number; y: number; v: number; ph: number; s: number; img?: Phaser.GameObjects.Image }

export class HolidayFxScene extends Phaser.Scene {
  private g: Phaser.GameObjects.Graphics | null = null;
  private bits: Bit[] = [];
  private t = 0;

  constructor() {
    super('holidayfx');
  }

  create() {
    uiCamera(this.cameras.main);
    this.input.enabled = false;
    this.bits = [];
    this.t = 0;
    const W = app.view.w, H = app.view.h;
    const rnd = Phaser.Math.Between;
    if (app.holiday === 'christmas') {
      this.g = this.add.graphics();
      const n = Math.round((W * H) / 1400);
      for (let i = 0; i < n; i++) {
        const big = Math.random() < 0.18;
        this.bits.push({ x: rnd(0, W), y: rnd(0, H), v: big ? 13 + Math.random() * 6 : 6 + Math.random() * 7, ph: Math.random() * 6.28, s: big ? 2 : 1 });
      }
    } else if (app.holiday === 'thanksgiving' && this.textures.exists('holiday')) {
      const n = Math.max(6, Math.round((W * H) / 9000));
      for (let i = 0; i < n; i++) {
        const img = this.add.image(0, 0, 'holiday', `leaf_${i % 6}`).setOrigin(0.5);
        this.bits.push({ x: rnd(0, W), y: rnd(0, H), v: 9 + Math.random() * 8, ph: Math.random() * 6.28, s: 1, img });
      }
    }
    const resize = () => uiCamera(this.cameras.main);
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => this.scale.off('resize', resize));
  }

  update(_time: number, dt: number) {
    if (!this.bits.length) return;
    const s = Math.min(dt, 100) / 1000;
    this.t += s;
    const W = app.view.w, H = app.view.h;
    // in a round the hole's wind blows them along (east is to the right of the screen)
    const playing = this.scene.isActive('play') && app.round;
    const wind = playing ? app.round!.wind.vx * 2.2 : 3;
    const xmas = !!this.g;
    this.g?.clear();
    for (const b of this.bits) {
      b.y += b.v * s;
      b.x += (wind * (xmas ? 1 : 1.6) + Math.sin(this.t * (xmas ? 1.3 : 2.1) + b.ph) * (xmas ? 4 : 9)) * s;
      if (b.y > H + 4) { b.y = -4; b.x = Math.random() * W; }
      if (b.x > W + 4) b.x -= W + 8;
      if (b.x < -4) b.x += W + 8;
      if (xmas) {
        this.g!.fillStyle(0xffffff, b.s > 1 ? 0.95 : 0.75);
        this.g!.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
      } else if (b.img) {
        // the leaf tumbles: it turns over now and then
        b.img.setPosition(Math.round(b.x), Math.round(b.y)).setFlipX(Math.sin(this.t * 3 + b.ph) > 0).setFlipY(Math.sin(this.t * 1.7 + b.ph * 2) > 0.6);
      }
    }
  }
}

/** Start the falling snow or leaves (if it's a holiday and they aren't falling already). */
export function holidayFx(scene: Phaser.Scene) {
  if (!app.holiday) return;
  if (!scene.scene.isActive('holidayfx')) scene.scene.launch('holidayfx');
}

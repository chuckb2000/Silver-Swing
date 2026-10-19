// Credits and data attribution (spec 14).

import { app } from '../app';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { MenuScene } from './menu';

export class CreditsScene extends MenuScene {
  constructor() {
    super('credits');
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(340, W - 8), ph = Math.min(H - 8, 220);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.92));
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, 'credits', { origin: [0.5, 0], scale: 2 }));
    const c = app.course!.json;
    const lines: [string, number][] = [
      [`${c.name}, ${c.location}`, COLORS.yellow],
      ['designed by h. chandler egan (1924)', COLORS.dim],
      ['later work by john harbottle iii and bill & john f. robinson', COLORS.dim],
      ['', 0],
      ['map data © openstreetmap contributors (odbl)', COLORS.white],
      ['elevation and tree canopy: oregon dogami lidar', COLORS.white],
      ['scorecard: golfpass listing (unverified)', COLORS.white],
      ['', 0],
      ['engine: phaser 3 (mit)  ·  sound: zzfx by frank force (mit)', COLORS.dim],
      ['all art, sound and the pixel font were generated in code', COLORS.dim],
      ['for this project; style inspired by 16-bit golf games.', COLORS.dim],
      ['', 0],
      ['personal, unofficial project - not affiliated with the club.', COLORS.dim],
    ];
    let y = y0 + 28;
    for (const [s, col] of lines) {
      if (s) this.root.add(txt(this, x0 + pw / 2, y, s, { origin: [0.5, 0], color: col, maxWidth: pw - 12 }));
      y += s ? 12 : 6;
    }
    this.root.add(new Button(this, x0 + 8, y0 + ph - 20, 56, 15, 'back', () => this.back(), { color: 'grey' }));
  }
}

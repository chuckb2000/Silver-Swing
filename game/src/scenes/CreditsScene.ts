// Credits and data attribution (spec 14).

import { app, GAME_NAME } from '../app';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { MenuScene } from './menu';

export class CreditsScene extends MenuScene {
  constructor() {
    super('credits');
  }

  build() {
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(340, W - 8), ph = Math.min(H - 8, 250);
    const x0 = Math.round((W - pw) / 2), y0 = Math.round((H - ph) / 2);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.92));
    this.root.add(txt(this, x0 + pw / 2, y0 + 5, 'credits', { origin: [0.5, 0], scale: 2 }));
    const c = (app.course ?? null)?.json ?? { name: 'no course loaded', location: '', architects: 'unknown', attribution: [] as string[] } as unknown as NonNullable<typeof app.course>['json'];
    // the game, then the current course: its designers and data sources (from course.json)
    const lines: [string, number][] = [
      [GAME_NAME.toLowerCase(), COLORS.white],
      ['', 0],
      [`${c.name}, ${c.location}`, COLORS.yellow],
      ...(c.architects && c.architects !== 'unknown' ? [[`design: ${c.architects}`, COLORS.dim] as [string, number]] : []),
      ...c.attribution.map((a): [string, number] => [a, COLORS.white]),
      ['', 0],
      ['engine: phaser 3 (mit)  ·  sound: zzfx by frank force (mit)', COLORS.dim],
      ['all art, sound and the pixel font were generated in code', COLORS.dim],
      ['for this project; style inspired by 16-bit golf games.', COLORS.dim],
      ['', 0],
      ['personal, unofficial project - not affiliated with any club.', COLORS.dim],
    ];
    let y = y0 + 28;
    for (const [s, col] of lines) {
      if (!s) { y += 6; continue; }
      const t = txt(this, x0 + pw / 2, y, s, { origin: [0.5, 0], color: col, maxWidth: pw - 12 });
      this.root.add(t);
      y += Math.max(12, Math.round(t.height) + 3); // long lines wrap
    }
    this.root.add(new Button(this, x0 + 8, y0 + ph - 20, 56, 15, 'back', () => this.back(), { color: 'grey' }));
  }
}

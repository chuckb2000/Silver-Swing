// Title menu (runs above the BgScene fly-over).

import { app } from '../app';
import { initAudio, setVolume } from '../audio/sfx';
import { peekSnapshot } from '../save/snapshot';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { resumeRound } from './flow';
import { ensureBg, MenuScene } from './menu';

export class TitleScene extends MenuScene {
  constructor() {
    super('title');
  }

  create() {
    ensureBg(this);
    setVolume(app.settings.volume, app.settings.muted);
    this.input.once('pointerdown', () => { void initAudio(); });
    super.create();
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const cx = Math.round(W / 2);
    const top = Math.max(8, Math.round(H * 0.14));
    this.root.add(txt(this, cx, top, 'local golf', { origin: [0.5, 0], scale: 4 }));
    this.root.add(txt(this, cx, top + 42, app.course!.json.name, { origin: [0.5, 0], scale: W < 330 ? 1 : 2, color: COLORS.yellow }));
    this.root.add(txt(this, cx, top + 62, `lake oswego, oregon  ·  par ${app.course!.json.par}  ·  ${app.course!.json.teeSets[0].totalYd} yd`, { origin: [0.5, 0], color: COLORS.dim }));
    const snap = await peekSnapshot();
    if (!this.sys.isActive()) return;
    const bw = 124, bh = 17, gap = 21;
    let y = top + 84;
    const add = (label: string, cb: () => void, grey = false) => {
      this.root.add(new Button(this, cx - bw / 2, y, bw, bh, label, cb, { color: grey ? 'grey' : 'orange' }));
      y += gap;
    };
    if (snap) {
      const holeNo = snap.cfg.holes[Math.min(snap.cfg.holes.length - 1, snap.holeIndex + (snap.betweenHoles ? 1 : 0))];
      add(`continue round (hole ${holeNo})`, async () => {
        const ok = await resumeRound(this);
        if (!ok) this.rebuild();
        else this.scene.stop('bg');
      });
    }
    add(snap ? 'new round' : 'play', () => this.scene.start('setup'), !!snap);
    add('leaderboard', () => this.scene.start('leaderboard'), true);
    add('settings', () => this.scene.start('settings', { from: 'title' }), true);
    add('credits', () => this.scene.start('credits'), true);
    this.root.add(new Panel(this, 4, H - 16, W - 8, 12, 0.55));
    this.root.add(txt(this, cx, H - 15, 'map data © openstreetmap contributors · lidar: dogami', { origin: [0.5, 0], color: COLORS.dim }));
  }
}

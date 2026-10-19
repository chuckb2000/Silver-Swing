// Title menu (runs above the BgScene fly-over).

import { app, GAME_NAME } from '../app';
import { coursesByState } from '../data/registry';
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
    // the game name as large as fits (4x on a wide screen, two lines on a narrow one)
    const name = GAME_NAME.toLowerCase();
    const one = txt(this, cx, top, name, { origin: [0.5, 0], scale: 4 });
    if (one.width <= W - 16) this.root.add(one);
    else {
      one.destroy();
      const words = name.split(' ');
      const l1 = txt(this, cx, top - 6, words.slice(0, 2).join(' '), { origin: [0.5, 0], scale: 3 });
      const l2 = txt(this, cx, top + 22, words.slice(2).join(' '), { origin: [0.5, 0], scale: 3 });
      if (l1.width > W - 16) { l1.setScale(2); l2.setScale(2); l2.y = top + 12; }
      this.root.add([l1, l2]);
    }
    const n = app.courses.length;
    const states = coursesByState(app.courses).length;
    const sub = n === 1 ? app.courses[0].name : `${n} courses${states > 1 ? ` in ${states} states` : ''}`;
    this.root.add(txt(this, cx, top + 46, sub, { origin: [0.5, 0], scale: W < 330 ? 1 : 2, color: COLORS.yellow }));
    this.root.add(txt(this, cx, top + 66, 'real courses, rebuilt from map and lidar data', { origin: [0.5, 0], color: COLORS.dim }));
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
    add(snap ? 'new round' : 'play', () => this.scene.start('courses', { purpose: 'play', from: 'title' }), !!snap);
    add('leaderboard', () => this.scene.start('leaderboard'), true);
    add('settings', () => this.scene.start('settings', { from: 'title' }), true);
    add('credits', () => this.scene.start('credits'), true);
    this.root.add(new Panel(this, 4, H - 16, W - 8, 12, 0.55));
    this.root.add(txt(this, cx, H - 15, 'map data © openstreetmap contributors · more in credits', { origin: [0.5, 0], color: COLORS.dim }));
  }
}

// Title menu over a rotating set of course views (sprites/title/<id>.png,
// rendered from each course's own art by assets-src/course_cards.py): each
// drifts slowly, then cross-fades to the next. The trophy logo sits beside
// the game name. Falls back to the course fly-over (BgScene) without them.

import Phaser from 'phaser';
import { app, GAME_NAME } from '../app';
import { coursesByState } from '../data/registry';
import { initAudio, setVolume } from '../audio/sfx';
import { peekSnapshot } from '../save/snapshot';
import { Button, COLORS, Panel, setTxt, txt } from '../ui/widgets';
import { resumeRound } from './flow';
import { ensureBg, MenuScene } from './menu';

const SHOW_MS = 9000;   // each course on screen
const FADE_MS = 1400;   // cross-fade
const SHADE = 0.32;     // darkened a little so the menu reads

let order: string[] | null = null; // course views, shuffled once per visit to the site
let at = 0;

interface Shown { img: Phaser.GameObjects.Image; t: number; fromX: number; fromY: number; toX: number; toY: number }

export class TitleScene extends MenuScene {
  private shown: Shown[] = [];
  private shade: Phaser.GameObjects.Rectangle | null = null;
  private resuming = false;

  constructor() {
    super('title');
  }

  create() {
    this.flyover = false;
    this.shown = [];
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x081018, SHADE).setOrigin(0, 0).setDepth(-1);
    this.layoutShade();
    this.scale.on('resize', this.layoutShade, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layoutShade, this); this.shade = null; this.shown = []; });
    void this.startMaps();
    setVolume(app.settings.volume, app.settings.muted);
    this.input.once('pointerdown', () => { void initAudio(); });
    super.create();
  }

  private layoutShade() {
    this.shade?.setPosition(0, 0).setSize(app.view.w, app.view.h);
  }

  /** Load the course views (once) and start the rotation; without any, the fly-over. */
  private async startMaps() {
    if (!order) {
      try {
        const res = await fetch('sprites/title/index.json');
        const j = (await res.json()) as { maps?: string[] };
        order = (j.maps ?? []).filter((id) => app.courses.some((c) => c.id === id));
      } catch {
        order = [];
      }
      for (let i = order.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [order[i], order[k]] = [order[k], order[i]];
      }
    }
    if (!this.sys.isActive()) return;
    const want = order.filter((id) => !this.textures.exists(`tmap_${id}`));
    if (want.length) {
      await new Promise<void>((resolve) => {
        for (const id of want) this.load.image(`tmap_${id}`, `sprites/title/${id}.png`);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
        this.load.start();
      });
    }
    if (!this.sys.isActive()) return;
    order = order.filter((id) => this.textures.exists(`tmap_${id}`));
    if (!order.length) { ensureBg(this); return; }
    if (this.scene.isActive('bg')) this.scene.stop('bg');
    this.next();
  }

  /** Bring in the next course view; it drifts from one corner of itself toward the other. */
  private next() {
    if (!order || !order.length) return;
    const id = order[at++ % order.length];
    const W = app.view.w, H = app.view.h;
    const img = this.add.image(0, 0, `tmap_${id}`).setOrigin(0, 0).setDepth(-2);
    const k = img.height < H || img.width < W ? 2 : 1; // a tall phone screen: twice the size
    img.setScale(k).setAlpha(this.shown.length ? 0 : 1);
    const spareX = Math.max(0, img.width * k - W), spareY = Math.max(0, img.height * k - H);
    const left = Math.random() < 0.5, up = Math.random() < 0.5;
    const s: Shown = {
      img, t: 0,
      fromX: left ? 0 : -spareX, toX: left ? -spareX : 0,
      fromY: up ? 0 : -spareY, toY: up ? -spareY * 0.6 : -spareY * 0.4,
    };
    img.setPosition(Math.round(s.fromX), Math.round(s.fromY));
    this.shown.push(s);
  }

  update(_t: number, dt: number) {
    const d = Math.min(dt, 100);
    const last = this.shown.length - 1;
    this.shown.forEach((s, i) => {
      s.t += d;
      const f = Math.min(1, s.t / (SHOW_MS + 2 * FADE_MS));
      s.img.setPosition(Math.round(s.fromX + (s.toX - s.fromX) * f), Math.round(s.fromY + (s.toY - s.fromY) * f)); // whole texels
      if (i > 0) s.img.setAlpha(Math.min(1, s.t / FADE_MS));
      if (i === last && s.t >= SHOW_MS) this.next();
    });
    // the old view goes once the new one is fully in
    while (this.shown.length > 1 && this.shown[1].t >= FADE_MS) this.shown.shift()!.img.destroy();
  }

  async build() {
    const W = app.view.w, H = app.view.h;
    const cx = Math.round(W / 2);
    let top = Math.max(8, Math.round(H * 0.14));
    // the trophy logo beside the game name (4x on a wide screen), or above it on a tall narrow one
    const name = GAME_NAME.toLowerCase();
    const trophy = this.textures.exists('trophy') ? this.textures.get('trophy').getSourceImage() as HTMLImageElement : null;
    const one = txt(this, cx, top, name, { origin: [0.5, 0], scale: 4 });
    const tgap = 8;
    let placed = false;
    let dy = 0;
    if (trophy && one.width + trophy.width + tgap <= W - 16) {
      const left = Math.round(cx - (one.width + trophy.width + tgap) / 2);
      this.root.add(this.add.image(left, Math.max(2, top - 16), 'trophy').setOrigin(0, 0));
      one.setX(left + trophy.width + tgap + Math.round(one.width / 2));
      this.root.add(one);
      placed = true;
    } else if (trophy && H >= 330) {
      this.root.add(this.add.image(cx - Math.round(trophy.width / 2), 4, 'trophy').setOrigin(0, 0));
      top = Math.max(top, trophy.height + 14);
      one.setY(top);
    }
    if (placed) { /* beside the trophy */ }
    else if (one.width <= W - 16) this.root.add(one);
    else {
      one.destroy();
      const words = name.split(' ');
      // two lines: everything below moves down by the second line
      const l1 = txt(this, cx, top, words.slice(0, 2).join(' '), { origin: [0.5, 0], scale: 3 });
      const l2 = txt(this, cx, top + 30, words.slice(2).join(' '), { origin: [0.5, 0], scale: 3 });
      dy = 30;
      if (l1.width > W - 16) { l1.setScale(2); l2.setScale(2); l2.y = top + 20; dy = 20; }
      this.root.add([l1, l2]);
    }
    const n = app.courses.length;
    const states = coursesByState(app.courses).length;
    const sub = n === 1 ? app.courses[0].name : `${n} courses${states > 1 ? ` in ${states} states` : ''}`;
    this.root.add(txt(this, cx, top + 46 + dy, sub, { origin: [0.5, 0], scale: W < 330 ? 1 : 2, color: COLORS.yellow }));
    this.root.add(txt(this, cx, top + 66 + dy, 'real courses, rebuilt from map and lidar data', { origin: [0.5, 0], color: COLORS.dim }));
    const snap = await peekSnapshot();
    if (!this.sys.isActive()) return;
    const bw = 124, bh = 17, gap = 21;
    let y = top + 84 + dy;
    const add = (label: string, cb: () => void, grey = false) => {
      this.root.add(new Button(this, cx - bw / 2, y, bw, bh, label, cb, { color: grey ? 'grey' : 'orange' }));
      y += gap;
    };
    if (snap) {
      const holeNo = snap.cfg.holes[Math.min(snap.cfg.holes.length - 1, snap.holeIndex + (snap.betweenHoles ? 1 : 0))];
      add(`continue round (hole ${holeNo})`, async () => {
        if (this.resuming) return;
        this.resuming = true;
        // the round's course may have to load first: show that something is happening
        const dim = this.add.rectangle(0, 0, W, H, 0x081018, 0.7).setOrigin(0, 0).setInteractive();
        const msg = txt(this, cx, H / 2 - 4, 'loading course...', { origin: [0.5, 0], scale: 2, color: COLORS.yellow });
        this.root.add([dim, msg]);
        let ok = false;
        try {
          ok = await resumeRound(this, (f) => { if (msg.active) setTxt(msg, `loading course ${Math.round(f * 100)}%`); });
        } catch (e) {
          console.error(e);
        }
        this.resuming = false;
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

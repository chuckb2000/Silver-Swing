// Title menu over a slowly scrolling panorama of the courses' landmarks
// (sprites/title_pano.png: Oregon, Cape Cod, DC; it loops), with the trophy logo.

import { app, GAME_NAME } from '../app';
import { coursesByState } from '../data/registry';
import { initAudio, setVolume } from '../audio/sfx';
import { peekSnapshot } from '../save/snapshot';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { resumeRound } from './flow';
import Phaser from 'phaser';
import { MenuScene } from './menu';

const SCROLL_PX_PER_S = 10;
const SKY_TOP = 0x5aa7e6; // the panorama's top sky colour, above it on tall screens

export class TitleScene extends MenuScene {
  constructor() {
    super('title');
  }

  private pano: Phaser.GameObjects.TileSprite | null = null;
  private sky: Phaser.GameObjects.Rectangle | null = null;
  private scrollX = Math.random() * 1440;

  create() {
    this.flyover = false;
    if (this.scene.isActive('bg')) this.scene.stop('bg');
    this.makeBackdrop();
    this.scale.on('resize', this.layoutBackdrop, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.layoutBackdrop, this); this.pano = null; this.sky = null; });
    setVolume(app.settings.volume, app.settings.muted);
    this.input.once('pointerdown', () => { void initAudio(); });
    super.create();
  }

  private makeBackdrop() {
    if (!this.textures.exists('title_pano')) return;
    this.sky = this.add.rectangle(0, 0, 10, 10, SKY_TOP, 1).setOrigin(0, 0).setDepth(-2);
    this.pano = this.add.tileSprite(0, 0, 10, 270, 'title_pano').setOrigin(0, 0).setDepth(-1);
    this.layoutBackdrop();
  }

  private layoutBackdrop() {
    if (!this.pano || !this.sky) return;
    const W = app.view.w, H = app.view.h;
    // one art pixel per texel, anchored at the bottom; plain sky above on a tall screen
    this.pano.setPosition(0, H - 270).setSize(W, 270);
    this.sky.setPosition(0, 0).setSize(W, Math.max(0, H - 270 + 1));
  }

  update(_t: number, dt: number) {
    if (!this.pano) return;
    this.scrollX = (this.scrollX + (Math.min(dt, 100) / 1000) * SCROLL_PX_PER_S) % 1440;
    this.pano.tilePositionX = Math.floor(this.scrollX); // whole texels: crisp, no shimmer
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

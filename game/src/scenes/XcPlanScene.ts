// Cross-country: choose the next leg on the course map (developer, 2026-10-27).
// Tap a tee, then a green. Greens a leg can't end on are greyed, with the reason
// when tapped (used, too short, too long, or no way to finish the round after
// it). The legs played so far are drawn as lines. "play this leg" opens it.
// The map zooms (developer, 2026-10-27): pinch, the mouse wheel or the +/-
// buttons, and a drag moves it; a tap that doesn't move picks.

import Phaser from 'phaser';
import { app } from '../app';
import { uiCamera } from '../scale';
import { greenChoices, LegChoice, teeChoices, unused, xcMap, XcMap } from '../systems/game/crossCountry';
import { saveSnapshot } from '../save/snapshot';
import { totals } from '../systems/rules/scoring';
import { shortName } from '../save/milestones';
import { Button, COLORS, dimmer, Panel, setTxt, txt } from '../ui/widgets';
import { scorecard } from './HudScene';
import { musicFor } from '../audio/music';

/** The last view, kept between legs on the same course and screen size. */
let savedView: { key: string; s: number; ox: number; oy: number } | null = null;

const TEE_C = 0xffffff, GREEN_C = 0x7be07b, SEL_C = 0xffd23f, OFF_C = 0x6d747c, USED_C = 0x3a4048;

export class XcPlanScene extends Phaser.Scene {
  private map!: XcMap;
  private tee: number | null = null;
  private green: number | null = null;
  private choices: LegChoice[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.BitmapText[] = [];
  private status!: Phaser.GameObjects.BitmapText;
  private playBtn!: Button;
  private toScreen!: (x: number, y: number) => { x: number; y: number };
  private layer: Phaser.GameObjects.Container | null = null;
  private img!: Phaser.GameObjects.Image;
  /** The map's view: scale (screen px per overview texel) and where the crop's corner is on screen. */
  private view = { s: 1, ox: 0, oy: 0 };
  private fit = 1;
  private maxS = 4;
  /** The map's area on screen, and the crop of the overview texture (texels). */
  private area = { x: 0, y: 0, w: 0, h: 0 };
  private crop = { x: 0, y: 0, w: 0, h: 0 };
  private viewKey = '';
  /** A press on the map: where it started, whether it became a drag or a pinch. */
  private press: { x: number; y: number; moved: boolean } | null = null;
  private pinch: { d: number; mx: number; my: number } | null = null;

  constructor() {
    super('xcplan');
  }

  create() {
    const r = app.round;
    if (!r?.cfg.xc || !app.course || !r.needsLeg) { this.scene.start('title'); return; }
    musicFor('round');
    uiCamera(this.cameras.main);
    // a window resized or a phone turned: laid out again (the map and the buttons kept their old places,
    // "play this leg" off the screen going from portrait to landscape)
    const onResize = () => { if (this.sys.isActive()) this.scene.restart(); };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.cameras.main.setBackgroundColor('#14202a');
    this.tee = null;
    this.green = null;
    this.choices = [];
    this.layer = null;
    this.labels = [];
    const c = app.course.json;
    this.map = xcMap(c, r.cfg.tee);
    const W = app.view.w, H = app.view.h;
    // the course overview (2 m a pixel) cropped to the course and a margin, as large as fits between the
    // top line and the bottom panel
    const top = 16, bottom = 44;
    const mPer = c.maps.overviewMPerPx, worldH = c.world.height;
    const pts = [...c.boundary, ...c.holes.flatMap((h) => [h.greenCenter, ...Object.values(h.tees).map((t) => [t.x, t.y])])];
    const pad = 30;
    const bx0 = Math.max(0, Math.min(...pts.map((p) => p[0])) - pad), bx1 = Math.min(c.world.width, Math.max(...pts.map((p) => p[0])) + pad);
    const by0 = Math.max(0, Math.min(...pts.map((p) => p[1])) - pad), by1 = Math.min(worldH, Math.max(...pts.map((p) => p[1])) + pad);
    const cx = bx0 / mPer, cy = (worldH - by1) / mPer, cw = (bx1 - bx0) / mPer, ch = (by1 - by0) / mPer;
    this.crop = { x: cx, y: cy, w: cw, h: ch };
    this.area = { x: 0, y: top, w: W, h: H - top - bottom };
    this.fit = Math.min((W - 8) / cw, (H - top - bottom) / ch);
    this.maxS = Math.max(this.fit * 6, 6);
    this.img = this.add.image(0, 0, 'overview').setOrigin(0, 0).setCrop(cx, cy, cw, ch).setDepth(0);
    this.toScreen = (x, y) => ({ x: this.view.ox + (x / mPer - this.crop.x) * this.view.s, y: this.view.oy + ((worldH - y) / mPer - this.crop.y) * this.view.s });
    this.viewKey = `${c.id}:${W}x${H}`;
    if (savedView?.key === this.viewKey) this.view = { s: savedView.s, ox: savedView.ox, oy: savedView.oy };
    else this.view = { s: this.fit, ox: 0, oy: 0 };
    this.clampView();
    this.applyView();
    // the top line and the bottom panel sit over the map when it's zoomed
    this.add.rectangle(0, 0, W, top, 0x14202a, 1).setOrigin(0, 0).setDepth(10);
    this.add.rectangle(0, H - bottom, W, bottom, 0x14202a, 1).setOrigin(0, 0).setDepth(10);
    this.gfx = this.add.graphics().setDepth(1);
    // top line: where, which leg, strokes so far
    const done = r.scores.length;
    const tot = totals(r.scores);
    txt(this, W / 2, 3, `cross-country  ·  ${shortName(c.name).toLowerCase()}  ·  leg ${done + 1} of ${c.holes.length}${done ? `  ·  ${tot.strokes} strokes` : ''}`, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: W - 8 }).setDepth(11);
    // bottom panel: what to do, and the buttons
    this.add.existing(new Panel(this, 4, H - bottom + 2, W - 8, bottom - 6, 0.88)).setDepth(11);
    this.status = txt(this, 10, H - bottom + 7, '', { color: COLORS.white, maxWidth: W - 120 }).setDepth(12);
    this.playBtn = new Button(this, W - 98, H - bottom + 8, 90, 16, 'play this leg', () => this.play(), { color: 'orange' });
    this.add.existing(this.playBtn).setDepth(12);
    this.add.existing(new Button(this, W - 98, H - 18, 44, 13, 'card', () => this.showCard(), { color: 'grey' })).setDepth(12);
    this.add.existing(new Button(this, W - 52, H - 18, 44, 13, 'menu', () => this.scene.start('title'), { color: 'grey' })).setDepth(12);
    // zoom buttons, top right of the map
    const zx = W - 36, zy = top + 3;
    this.add.existing(new Button(this, zx, zy, 15, 15, '+', () => this.zoomAt(this.area.x + this.area.w / 2, this.area.y + this.area.h / 2, 1.5), { color: 'grey' })).setDepth(12);
    this.add.existing(new Button(this, zx + 17, zy, 15, 15, '-', () => this.zoomAt(this.area.x + this.area.w / 2, this.area.y + this.area.h / 2, 1 / 1.5), { color: 'grey' })).setDepth(12);
    this.input.addPointer(1);
    const onMap = (y: number, x: number) => y > top && y < H - bottom && !(x > zx - 2 && y < zy + 17);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.layer) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      const two = this.twoDown();
      if (two) { this.press = null; this.pinch = two; return; }
      this.press = onMap(w.y, w.x) ? { x: w.x, y: w.y, moved: false } : null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.layer) return;
      const two = this.twoDown();
      if (two && this.pinch) {
        // pinch: zoom about the fingers' midpoint, and follow it
        this.view.ox += two.mx - this.pinch.mx;
        this.view.oy += two.my - this.pinch.my;
        this.zoomAt(two.mx, two.my, two.d / Math.max(1, this.pinch.d));
        this.pinch = two;
        return;
      }
      if (!this.press || !p.isDown) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      if (!this.press.moved && Math.hypot(w.x - this.press.x, w.y - this.press.y) < 4) return;
      this.view.ox += w.x - this.press.x;
      this.view.oy += w.y - this.press.y;
      this.press = { x: w.x, y: w.y, moved: true };
      this.clampView();
      this.applyView();
      this.redraw();
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pinch) { if (!this.twoDown()) this.pinch = null; this.press = null; return; }
      const pr = this.press;
      this.press = null;
      if (this.layer || !pr || pr.moved) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.pick(w.x, w.y);
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.layer || !dy) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.zoomAt(w.x, w.y, dy < 0 ? 1.25 : 1 / 1.25);
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const f = e.key === '+' || e.key === '=' ? 1.5 : e.key === '-' || e.key === '_' ? 1 / 1.5 : 0;
      if (f && !this.layer) this.zoomAt(this.area.x + this.area.w / 2, this.area.y + this.area.h / 2, f);
    });
    // a single tee left: chosen already
    const tees = teeChoices(this.map, r.cfg.xc.legs.filter(Boolean));
    if (tees.length === 1) this.selectTee(tees[0]);
    this.redraw();
  }

  /** Both pointers down: their distance and midpoint (game px), else null. */
  private twoDown(): { d: number; mx: number; my: number } | null {
    const a = this.input.pointer1, b = this.input.pointer2;
    if (!a?.isDown || !b?.isDown) return null;
    const pa = this.cameras.main.getWorldPoint(a.x, a.y), pb = this.cameras.main.getWorldPoint(b.x, b.y);
    return { d: Math.hypot(pa.x - pb.x, pa.y - pb.y), mx: (pa.x + pb.x) / 2, my: (pa.y + pb.y) / 2 };
  }

  /** Zoom by `f` keeping the map point under (px, py) where it is. */
  private zoomAt(px: number, py: number, f: number) {
    const v = this.view;
    const ns = Phaser.Math.Clamp(v.s * f, this.fit, this.maxS);
    const tx = (px - v.ox) / v.s, ty = (py - v.oy) / v.s;
    v.ox = px - tx * ns;
    v.oy = py - ty * ns;
    v.s = ns;
    this.clampView();
    this.applyView();
    this.redraw();
  }

  /** Keep the map over its area (centred when it's smaller). */
  private clampView() {
    const v = this.view, a = this.area, w = this.crop.w * v.s, h = this.crop.h * v.s;
    v.ox = w <= a.w ? a.x + (a.w - w) / 2 : Phaser.Math.Clamp(v.ox, a.x + a.w - w, a.x);
    v.oy = h <= a.h ? a.y + (a.h - h) / 2 : Phaser.Math.Clamp(v.oy, a.y + a.h - h, a.y);
    v.ox = Math.round(v.ox);
    v.oy = Math.round(v.oy);
  }

  private applyView() {
    const v = this.view;
    this.img.setScale(v.s).setPosition(v.ox - this.crop.x * v.s, v.oy - this.crop.y * v.s);
    savedView = { key: this.viewKey, ...v };
  }

  private legs() { return app.round!.cfg.xc!.legs.filter(Boolean); }

  /** The nearest tee or green marker to a tap (within 10 texels): a tee first, then a green of the chosen tee. */
  private pick(x: number, y: number) {
    const legs = this.legs();
    const left = unused(this.map.tees.length, legs);
    const near = (pts: { x: number; y: number }[], ids: number[]) => {
      let best: number | null = null, bd = 10;
      for (const id of ids) { const p = this.toScreen(pts[id - 1].x, pts[id - 1].y); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = id; } }
      return { id: best, d: bd };
    };
    const t = near(this.map.tees, left.tees);
    const g = this.tee !== null ? near(this.map.greens, left.greens) : { id: null, d: 99 };
    if (g.id !== null && (t.id === null || g.d <= t.d)) { this.green = g.id; this.redraw(); return; }
    if (t.id !== null) { this.selectTee(t.id); this.redraw(); }
  }

  private selectTee(t: number) {
    this.tee = t;
    this.green = null;
    this.choices = greenChoices(this.map, this.legs(), t);
  }

  private redraw() {
    const g = this.gfx;
    g.clear();
    for (const l of this.labels) l.destroy();
    this.labels = [];
    const legs = this.legs();
    const left = unused(this.map.tees.length, legs);
    const startable = new Set(teeChoices(this.map, legs));
    // the legs played: thin lines
    g.lineStyle(1, 0xffffff, 0.45);
    for (const [t, gr] of legs) {
      const a = this.toScreen(this.map.tees[t - 1].x, this.map.tees[t - 1].y), b = this.toScreen(this.map.greens[gr - 1].x, this.map.greens[gr - 1].y);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // the leg being chosen
    if (this.tee !== null && this.green !== null) {
      const a = this.toScreen(this.map.tees[this.tee - 1].x, this.map.tees[this.tee - 1].y), b = this.toScreen(this.map.greens[this.green - 1].x, this.map.greens[this.green - 1].y);
      const ok = this.choices.find((c) => c.green === this.green)?.ok;
      g.lineStyle(2, ok ? SEL_C : 0xe2382f, 0.95);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const label = (x: number, y: number, s: string, col: number) => this.labels.push(txt(this, Math.round(x), Math.round(y), s, { color: col }).setDepth(2));
    // greens: circles; green when the chosen tee may go there, grey when not, dark when used
    this.map.greens.forEach((p, i) => {
      const id = i + 1;
      const q = this.toScreen(p.x, p.y);
      const used = !left.greens.includes(id);
      const ch = this.tee !== null ? this.choices[i] : null;
      const col = used ? USED_C : id === this.green ? SEL_C : ch ? (ch.ok ? GREEN_C : OFF_C) : 0x9fd89f;
      // a green that can't be played to is drawn small; numbers only on the greens the chosen tee can reach
      const small = used || (ch !== null && !ch.ok && id !== this.green);
      g.fillStyle(0x0b1116, 1).fillCircle(q.x, q.y, small ? 2.5 : 4);
      g.fillStyle(col, 1).fillCircle(q.x, q.y, small ? 1.5 : 3);
      if (ch && (ch.ok || id === this.green)) label(q.x + 4, q.y - 3, String(id), col);
    });
    // tees: squares; white when a leg can start there, yellow when chosen
    this.map.tees.forEach((p, i) => {
      const id = i + 1;
      const q = this.toScreen(p.x, p.y);
      const used = !left.tees.includes(id);
      const col = used ? USED_C : id === this.tee ? SEL_C : startable.has(id) ? TEE_C : OFF_C;
      const small = used || (this.tee !== null && id !== this.tee);
      g.fillStyle(0x0b1116, 1).fillRect(Math.round(q.x) - (small ? 2 : 3), Math.round(q.y) - (small ? 2 : 3), small ? 4 : 6, small ? 4 : 6);
      g.fillStyle(col, 1).fillRect(Math.round(q.x) - (small ? 1 : 2), Math.round(q.y) - (small ? 1 : 2), small ? 2 : 4, small ? 2 : 4);
      // numbers on the tees a leg can start from, until one is chosen; then only on that one
      if (!used && (this.tee === null ? startable.has(id) : id === this.tee)) label(q.x - 4 - String(id).length * 5, q.y - 3, String(id), col);
    });
    // what to do next
    let msg: string;
    let ready = false;
    if (this.tee === null) msg = 'tap a tee (square) to start the next leg. pinch, scroll or +/- to zoom';
    else if (this.green === null) msg = `tee ${this.tee}: now tap a green (circle) to play to`;
    else {
      const ch = this.choices[this.green - 1];
      const yd = `${Math.round(ch.yd)} yd`;
      if (ch.ok) { msg = `tee ${this.tee} to green ${this.green}  ·  ${yd}${this.tee === this.green ? '  ·  the real hole' : ''}`; ready = true; }
      else msg = `green ${this.green}: ${ch.why === 'used' ? 'already played to' : ch.why === "can't finish" ? "you couldn't finish the round after it" : `${ch.why} (${yd})`}`;
    }
    setTxt(this.status, msg);
    this.playBtn.setEnabled(ready);
  }

  /** Play the chosen leg. */
  private play() {
    const r = app.round!;
    if (this.tee === null || this.green === null || !this.choices[this.green - 1]?.ok) return;
    r.cfg.xc!.legs[r.holeIndex] = [this.tee, this.green];
    r.startHole(r.holeIndex);
    void saveSnapshot(r);
    this.scene.start('play', { resume: false });
  }

  private showCard() {
    if (this.layer) { this.layer.destroy(true); this.layer = null; return; }
    const W = app.view.w, H = app.view.h;
    const layer = this.add.container(0, 0).setDepth(50);
    this.press = null;
    const dim = dimmer(this, 0.6);
    const card = scorecard(this, app.round!, W, H);
    layer.add([dim, card]);
    dim.on('pointerdown', () => { layer.destroy(true); this.layer = null; });
    this.layer = layer;
  }
}

// Pixel UI widgets: outlined bitmap text, chunky orange buttons, hatched panels.

import Phaser from 'phaser';
import { app } from '../app';
import { sfx } from '../audio/sfx';

export const FONT = 'px';

export const COLORS = {
  orange: 0xe8681e,
  orangeHi: 0xf59a4e,
  orangeLo: 0xa4451a,
  grey: 0x5d6673,
  greyHi: 0x7d8794,
  greyLo: 0x394049,
  outline: 0x1c140f,
  panel: 0x121a20,
  white: 0xf6f6f2,
  yellow: 0xffd84a,
  green: 0x7fe08a,
  red: 0xff6a5a,
  blue: 0x7cc0ff,
  dim: 0xa9b3bd,
};

export interface TextOpts {
  color?: number;
  scale?: number;
  origin?: [number, number];
  maxWidth?: number;
}

export function clean(s: string): string {
  return s.toLowerCase().replace(/−/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), FONT, clean(s));
  if (o.scale) t.setScale(o.scale);
  if (o.color !== undefined) t.setTint(o.color);
  if (o.origin) t.setOrigin(o.origin[0], o.origin[1]);
  if (o.maxWidth) t.setMaxWidth(o.maxWidth);
  return t;
}

export function setTxt(t: Phaser.GameObjects.BitmapText, s: string) {
  const c = clean(s);
  if (t.text !== c) t.setText(c);
}

/** Snap a container's position to whole pixels (bitmap text stays crisp). */
export function snap<T extends { x: number; y: number }>(o: T): T {
  o.x = Math.round(o.x);
  o.y = Math.round(o.y);
  return o;
}

export interface ButtonOpts {
  color?: 'orange' | 'grey';
  icon?: string;          // frame in the 'ui' atlas
  onDown?: boolean;       // fire on pointer-down (swing taps)
  textColor?: number;
  sound?: string | null;
  scale?: number;
}

/**
 * A tap on an interactive object (a list row, a course card): a press and a release on it, the
 * same press. A release alone (a press made elsewhere, a dialog's button over it) isn't one
 * (developer, 2026-10-22: closing a card opened the card of the row under the button).
 */
export function onTap(o: Phaser.GameObjects.GameObject, fn: () => void): void {
  let downAt = -1;
  o.on('pointerdown', (p: Phaser.Input.Pointer) => { downAt = p.downTime; });
  o.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (downAt < 0 || p.downTime !== downAt) return;
    downAt = -1;
    fn();
  });
}

/** How far off a button (game pixels) letting go still counts as a tap on it. */
export const BUTTON_SLOP = 6;

export class Button extends Phaser.GameObjects.Container {
  bw: number;
  bh: number;
  private g: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.BitmapText;
  private iconImg?: Phaser.GameObjects.Image;
  private pressed = false;
  enabled = true;
  private opts: ButtonOpts;
  private cb: (ev: { time: number }) => void;
  private labelY = 0;
  private iconY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, cb: (ev: { time: number }) => void, opts: ButtonOpts = {}) {
    super(scene, Math.round(x), Math.round(y));
    this.bw = w;
    this.bh = h;
    this.cb = cb;
    this.opts = opts;
    this.g = scene.add.graphics();
    this.add(this.g);
    if (opts.icon) {
      this.iconImg = scene.add.image(0, 0, 'ui', opts.icon).setOrigin(0.5, 0.5);
      this.iconY = Math.floor((h - 3) / 2);
      this.iconImg.setPosition(Math.floor(w / 2), this.iconY);
      if (opts.scale) this.iconImg.setScale(opts.scale);
      this.add(this.iconImg);
    }
    if (text) {
      this.label = txt(scene, Math.floor(w / 2), 0, text, { color: opts.textColor ?? COLORS.white, scale: opts.scale });
      this.label.setOrigin(0.5, 0);
      this.labelY = Math.max(0, Math.round((h - 3 - this.label.height * (opts.scale ?? 1)) / 2) + 1);
      this.label.y = this.labelY;
      this.add(this.label);
    }
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(w / 2, h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabled) return;
      this.pressed = true;
      this.draw();
      if (opts.onDown) {
        this.fire(p.event?.timeStamp ?? performance.now());
        return;
      }
      // the press counts when it is let go on or near the button: a finger or a mouse that slid a little
      // off a small button lost the tap (developer, 2026-10-22: "occasionally missing clicks"). Let go
      // well away, it doesn't count (the way to change your mind)
      const id = p.id, downAt = p.downTime;
      const up = (q: Phaser.Input.Pointer) => {
        if (q.id !== id) return;
        scene.input.off(Phaser.Input.Events.POINTER_UP, up);
        scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, up);
        const was = this.pressed;
        this.pressed = false;
        if (!this.active) return; // gone meanwhile (a screen redrawn)
        this.draw();
        // the release of this press (a later press means this one was let go where this scene didn't hear it)
        if (was && q.downTime === downAt && this.enabled && this.near(q)) this.fire(q.event?.timeStamp ?? performance.now());
      };
      scene.input.on(Phaser.Input.Events.POINTER_UP, up);
      scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, up);
    });
    // a swing-style button (it acted on the press): only its look goes back
    this.on('pointerup', () => { if (opts.onDown && this.pressed) { this.pressed = false; this.draw(); } });
    this.draw();
    scene.add.existing(this);
  }

  /** Is the pointer on the button, or within a few pixels of it? */
  near(p: Phaser.Input.Pointer): boolean {
    const cam = this.scene.cameras.main;
    const w = p.positionToCamera(cam) as Phaser.Math.Vector2;
    // as Phaser's own hit test: a fixed (scroll factor 0) object ignores the camera's scroll
    const x = w.x + cam.scrollX * this.scrollFactorX - cam.scrollX;
    const y = w.y + cam.scrollY * this.scrollFactorY - cam.scrollY;
    const m = this.getWorldTransformMatrix();
    const l = m.applyInverse(x, y);
    const sx = BUTTON_SLOP / (Math.hypot(m.a, m.b) || 1), sy = BUTTON_SLOP / (Math.hypot(m.c, m.d) || 1);
    return l.x >= -sx && l.x <= this.bw + sx && l.y >= -sy && l.y <= this.bh + sy;
  }

  private fire(time: number) {
    if (this.opts.sound !== null) sfx(this.opts.sound ?? 'click');
    // timing-critical buttons (swing) run immediately; everything else on the
    // next tick so a handler may safely destroy the button that fired it
    if (this.opts.onDown) this.cb({ time });
    else this.scene.time.delayedCall(0, () => this.cb({ time }));
  }

  setLabel(s: string) {
    if (this.label) setTxt(this.label, s);
    return this;
  }

  setIcon(frame: string) {
    this.iconImg?.setFrame(frame);
    return this;
  }

  /** Orange or grey (drawn again only when it changes). */
  setColor(c: 'orange' | 'grey') {
    if ((this.opts.color ?? 'orange') === c) return this;
    this.opts = { ...this.opts, color: c };
    this.draw();
    return this;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.45);
    // a greyed-out button doesn't catch the pointer: a swing tap that lands on it reaches the course
    if (this.input) this.input.enabled = on;
    return this;
  }

  /** Visual press without a pointer (keyboard shortcuts). */
  flash() {
    this.pressed = true;
    this.draw();
    this.scene.time.delayedCall(90, () => { this.pressed = false; this.draw(); });
  }

  private draw() {
    const g = this.g;
    const w = this.bw, h = this.bh;
    const grey = this.opts.color === 'grey';
    const body = grey ? COLORS.grey : COLORS.orange;
    const hi = grey ? COLORS.greyHi : COLORS.orangeHi;
    const lo = grey ? COLORS.greyLo : COLORS.orangeLo;
    const off = this.pressed ? 1 : 0;
    const edge = this.pressed ? 2 : 3;
    g.clear();
    // outline
    g.fillStyle(COLORS.outline, 1);
    g.fillRect(1, off, w - 2, h - off);
    g.fillRect(0, off + 1, w, h - off - 2);
    // dark bottom edge
    g.fillStyle(lo, 1);
    g.fillRect(1, off + 1, w - 2, h - off - 2);
    // body
    g.fillStyle(body, 1);
    g.fillRect(1, off + 1, w - 2, h - off - 2 - edge);
    // highlight
    g.fillStyle(hi, 1);
    g.fillRect(2, off + 1, w - 4, 1);
    if (this.label) this.label.y = this.labelY + off;
    if (this.iconImg) this.iconImg.y = this.iconY + off;
  }
}

/** Dark, semi-transparent panel with a diagonal hatch. */
export class Panel extends Phaser.GameObjects.Container {
  pw: number;
  ph: number;
  private g: Phaser.GameObjects.Graphics;
  private hatch: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.8) {
    super(scene, Math.round(x), Math.round(y));
    this.pw = w;
    this.ph = h;
    this.g = scene.add.graphics();
    this.hatch = scene.add.tileSprite(1, 1, w - 2, h - 2, 'ui', 'hatch').setOrigin(0, 0);
    this.add([this.g, this.hatch]);
    this.draw(alpha);
    scene.add.existing(this);
  }

  resize(w: number, h: number, alpha = 0.8) {
    this.pw = w;
    this.ph = h;
    this.hatch.setSize(w - 2, h - 2);
    this.draw(alpha);
  }

  private draw(alpha: number) {
    const g = this.g;
    g.clear();
    g.fillStyle(0x0a0e12, Math.min(1, alpha + 0.1));
    g.fillRect(1, 0, this.pw - 2, this.ph);
    g.fillRect(0, 1, this.pw, this.ph - 2);
    g.fillStyle(COLORS.panel, alpha);
    g.fillRect(1, 1, this.pw - 2, this.ph - 2);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(2, 1, this.pw - 4, 1);
  }
}

/** A tappable full-screen dimmer that blocks input to what is beneath. */
export function dimmer(scene: Phaser.Scene, alpha = 0.55): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(0, 0, app.view.w + 2, app.view.h + 2, 0x05080b, alpha).setOrigin(0, 0);
  r.setInteractive();
  return r;
}

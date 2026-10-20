// HUD overlay for the Play scene: panels, buttons, swing meter, mini-map,
// banners and the modal dialogs (scorecard, relief, overview, pause).

import { isListedEagle, nameRound } from '../save/eagleReport';
import { DEFAULT_NAME } from '../save/names';
import { askName } from '../ui/nameInput';
import Phaser from 'phaser';
import { clearSnapshot } from '../save/snapshot';
import { app, fmtDist, PX_PER_M, unitLabel, YD } from '../app';
import { sfx } from '../audio/sfx';
import { FULL_MAX, PART_MAX, ZONE_REACH } from '../systems/swing/meter';
import { GOOD_BAND, missWord, perfectHalfWidth, PuttStrike, Strike } from '../systems/swing/outcome';
import { lieModsFor } from '../systems/rules/lie';
import { ReliefArea } from '../systems/rules/relief';
import { HoleScore, scoreName, toPar, totals } from '../systems/rules/scoring';
import { SimEvent } from '../systems/physics/sim';
import { SURFACE_LABEL } from '../systems/physics/surfaces';
import { Button, COLORS, dimmer, Panel, setTxt, txt } from '../ui/widgets';
import { uiCamera } from '../scale';
import type { PlayScene } from './PlayScene';
import { finishRound } from './flow';
import { courseHoleFor } from '../systems/game/round';
import type { LeaderboardEntry } from '../save/entry';

type Modal = 'relief' | 'drop' | 'card' | 'overview' | 'pause' | 'holed' | null;

export class HudScene extends Phaser.Scene {
  play!: PlayScene;
  private W = 480;
  private H = 270;
  private root!: Phaser.GameObjects.Container;
  private modalLayer!: Phaser.GameObjects.Container;
  private modal: Modal = null;
  // top-left
  private cardBtn!: Button;
  private holeBox!: Panel;
  private holeTxt!: Phaser.GameObjects.BitmapText;
  private info!: Panel;
  private infoLines: Phaser.GameObjects.BitmapText[] = [];
  // top-right
  private windPanel!: Panel;
  private windArrow!: Phaser.GameObjects.Image;
  private windTxt!: Phaser.GameObjects.BitmapText;
  private miniPanel!: Panel;
  private mini!: Phaser.GameObjects.Image;
  private miniG!: Phaser.GameObjects.Graphics;
  private mapBtn!: Button;
  private menuBtn!: Button;
  // bottom
  private aimL!: Button;
  private aimR!: Button;
  private aimLabel!: Panel;
  private clubPanel!: Panel;
  private clubIcon!: Phaser.GameObjects.Image;
  private clubName!: Phaser.GameObjects.BitmapText;
  private clubCarry!: Phaser.GameObjects.BitmapText;
  private clubUp!: Button;
  private clubDown!: Button;
  private spinBtn!: Button;
  private scaleBtn!: Button;
  private unplayBtn!: Button;
  private mulliganBtn!: Button;
  private swingBtn!: Button;
  private meterPanel!: Panel;
  private meterG!: Phaser.GameObjects.Graphics;
  private meterLabels: Phaser.GameObjects.BitmapText[] = [];
  private meterRead!: Phaser.GameObjects.BitmapText;
  private offArrow!: Phaser.GameObjects.Image;
  // banners
  private banner!: Phaser.GameObjects.BitmapText;
  private sub!: Phaser.GameObjects.BitmapText;
  private bannerTimer?: Phaser.Time.TimerEvent;
  private intro: Phaser.GameObjects.Container | null = null;
  reliefTitle = '';

  constructor() {
    super('hud');
  }

  create() {
    // Phaser reuses this object when the scene starts again (the next round in the same
    // tab): forget the last round's objects, which were destroyed when it stopped. Left
    // in place, refresh() wrote to destroyed text and froze the game on the second round
    // (developer, 2026-10-19: "freezes when I load a course for the first time").
    this.infoLines = [];
    this.meterLabels = [];
    this.intro = null;
    this.modal = null;
    this.cardLayer = null;
    this.modalBeforeCard = null;
    this.bannerTimer = undefined;
    this.redraw = null;
    this.play = this.scene.get('play') as PlayScene;
    uiCamera(this.cameras.main);
    this.W = app.view.w;
    this.H = app.view.h;
    this.root = this.add.container(0, 0);
    this.modalLayer = this.add.container(0, 0).setDepth(100);
    this.build();
    this.layout();
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.refresh();
  }

  /** Draws the open dialog again (after a resize or a phone turning), so its buttons stay on screen. */
  private redraw: (() => void) | null = null;

  private onResize() {
    uiCamera(this.cameras.main);
    this.W = app.view.w;
    this.H = app.view.h;
    this.layout();
    if (this.modal && this.redraw) this.redraw();
    this.refresh();
  }

  // ------------------------------------------------------------------ build
  private build() {
    const p = this.play;
    this.cardBtn = new Button(this, 0, 0, 30, 14, 'card', () => this.toggleCard());
    this.holeBox = new Panel(this, 0, 0, 30, 14);
    const flagI = this.add.image(4, 3, 'ui', 'flag_icon').setOrigin(0, 0);
    this.holeTxt = txt(this, 14, 2, '1');
    this.holeBox.add([flagI, this.holeTxt]);
    this.info = new Panel(this, 0, 0, 74, 48);
    for (let i = 0; i < 4; i++) {
      const t = txt(this, 5, 3 + i * 11, '');
      this.infoLines.push(t);
      this.info.add(t);
    }
    this.windPanel = new Panel(this, 0, 0, 44, 46);
    const wl = txt(this, 22, 2, 'wind', { origin: [0.5, 0], color: COLORS.dim });
    this.windArrow = this.add.image(22, 22, 'ui', 'wind_0');
    this.windTxt = txt(this, 22, 33, '0', { origin: [0.5, 0] });
    this.windPanel.add([wl, this.windArrow, this.windTxt]);
    this.miniPanel = new Panel(this, 0, 0, 80, 80);
    this.mini = this.add.image(3, 3, 'mini_1').setOrigin(0, 0);
    this.miniG = this.add.graphics();
    this.miniPanel.add([this.mini, this.miniG]);
    this.mapBtn = new Button(this, 0, 0, 26, 13, 'map', () => this.toggleOverview(), { color: 'grey' });
    // the pause menu (also Esc): resume, settings, save and exit, quit the round
    this.menuBtn = new Button(this, 0, 0, 30, 14, 'menu', () => this.togglePause(), { color: 'grey' });

    // aim: a tap nudges the target a little; holding moves it, faster the longer it is held
    this.aimL = new Button(this, 0, 0, 16, 15, '', () => undefined, { icon: 'arrow_left', sound: null });
    this.aimR = new Button(this, 0, 0, 16, 15, '', () => undefined, { icon: 'arrow_right', sound: null });
    this.aimLabel = new Panel(this, 0, 0, 26, 15);
    this.aimLabel.add(txt(this, 13, 2, 'aim', { origin: [0.5, 0] }));
    for (const b of [this.aimL, this.aimR]) this.holdRepeat(b, b === this.aimL ? 1 : -1);
    this.clubPanel = new Panel(this, 0, 0, 66, 42);
    this.clubIcon = this.add.image(33, 9, 'ui', 'club_driver');
    this.clubName = txt(this, 33, 16, 'driver', { origin: [0.5, 0] });
    this.clubCarry = txt(this, 33, 27, '', { origin: [0.5, 0], color: COLORS.dim });
    this.clubPanel.add([this.clubIcon, this.clubName, this.clubCarry]);
    this.clubUp = new Button(this, 0, 0, 15, 20, '', () => p.cycleClub(-1), { icon: 'arrow_up', sound: null });
    this.clubDown = new Button(this, 0, 0, 15, 20, '', () => p.cycleClub(1), { icon: 'arrow_down', sound: null });
    this.spinBtn = new Button(this, 0, 0, 20, 18, '', () => p.setSpin(p.spin === 0 ? 1 : p.spin === 1 ? -1 : 0), { icon: 'spin_0', color: 'grey', sound: null });
    this.scaleBtn = new Button(this, 0, 0, 34, 14, 'full', () => p.cycleScale(), { color: 'grey', sound: null });
    this.unplayBtn = new Button(this, 0, 0, 52, 13, 'unplayable', () => this.openUnplayable(), { color: 'grey' });
    this.mulliganBtn = new Button(this, 0, 0, 52, 13, 'mulligan', () => this.play.takeMulligan(), { color: 'grey' });
    this.swingBtn = new Button(this, 0, 0, 58, 20, 'swing', (ev) => this.onSwingButton(ev.time), { onDown: true, sound: null, scale: 1 });
    this.meterPanel = new Panel(this, 0, 0, 190, 24);
    this.meterG = this.add.graphics();
    this.meterPanel.add(this.meterG);
    for (const v of [25, 50, 75, 100]) {
      const t = txt(this, 0, 0, String(v), { origin: [0.5, 0], color: COLORS.dim });
      this.meterLabels.push(t);
      this.meterPanel.add(t);
    }
    this.meterRead = txt(this, 0, 0, '', { origin: [0.5, 1], color: COLORS.white });
    this.meterRead.setVisible(false);
    this.offArrow = this.add.image(0, 0, 'ui', 'wind_0').setVisible(false).setTint(0xfff2a0);
    this.banner = txt(this, 0, 0, '', { origin: [0.5, 0.5], scale: 2 }).setDepth(50);
    this.sub = txt(this, 0, 0, '', { origin: [0.5, 0.5] }).setDepth(50);
    this.root.add([this.menuBtn, this.cardBtn, this.holeBox, this.info, this.windPanel, this.miniPanel, this.mapBtn, this.aimL, this.aimR, this.aimLabel,
      this.clubPanel, this.clubUp, this.clubDown, this.spinBtn, this.scaleBtn, this.unplayBtn, this.mulliganBtn, this.meterPanel, this.meterRead, this.swingBtn, this.offArrow]);
  }

  private holdRepeat(b: Button, dir: number) {
    let timer: Phaser.Time.TimerEvent | null = null;
    let since = 0;
    b.on('pointerdown', () => {
      if (!b.enabled) return;
      timer?.remove();
      this.play.aimStep(dir);
      since = this.time.now;
      let last = since;
      timer = this.time.addEvent({
        delay: 16, loop: true, callback: () => {
          const now = this.time.now;
          this.play.aimHold(dir, now - since, now - last);
          last = now;
        },
      });
    });
    const stop = () => { timer?.remove(); timer = null; };
    b.on('pointerup', stop);
    b.on('pointerout', stop);
  }

  private layout() {
    const W = this.W, H = this.H;
    const portrait = H > W;
    this.cardBtn.setPosition(4, 4);
    this.holeBox.setPosition(37, 4);
    this.info.setPosition(4, 21);
    this.windPanel.setPosition(W - 48, 4);
    this.menuBtn.setPosition(W - 48 - 34, 4);
    // mini-map under the wind panel
    this.miniPanel.setPosition(W - 4 - this.miniPanel.pw, 54);
    this.mapBtn.setPosition(W - 4 - 26, 54 + this.miniPanel.ph + 3);
    const by = H - 4;
    this.clubPanel.setPosition(4, by - 42);
    this.clubUp.setPosition(72, by - 42);
    this.clubDown.setPosition(72, by - 20);
    this.aimL.setPosition(4, by - 42 - 19);
    this.aimLabel.setPosition(22, by - 42 - 19);
    this.aimR.setPosition(50, by - 42 - 19);
    this.swingBtn.setPosition(W - 62, by - 20);
    this.spinBtn.setPosition(W - 62 - 24, by - 19);
    // landscape: the meter sits between the club controls (left) and the scale/spin/swing buttons (right)
    const gapL = 4 + 66 + 4 + 15 + 6, gapR = W - 62 - 24 - 38 - 6;
    const mw = portrait ? Math.min(220, W - 16) : Math.max(120, Math.min(220, gapR - gapL));
    this.meterPanel.resize(mw, 24);
    if (portrait) {
      this.meterPanel.setPosition(Math.round((W - mw) / 2), by - 42 - 19 - 32);
    } else {
      this.meterPanel.setPosition(Math.round(gapL + (gapR - gapL - mw) / 2), by - 24);
    }
    this.meterRead.setPosition(Math.round(this.meterPanel.x + mw / 2), this.meterPanel.y - 2);
    this.scaleBtn.setPosition(W - 62 - 24 - 38, by - 18);
    this.unplayBtn.setPosition(4, 21 + 48 + 3);
    this.mulliganBtn.setPosition(4, 21 + 48 + 3 + 16);
    this.banner.setPosition(Math.round(W / 2), Math.round(H * 0.3));
    this.sub.setPosition(Math.round(W / 2), Math.round(H * 0.3) + 16);
    if (this.intro) this.showIntro();
  }

  // ------------------------------------------------------------------ state
  refresh() {
    const p = this.play;
    if (!p || !p.round) return;
    const r = p.round;
    const aiming = p.state === 'aim';
    const swinging = p.state === 'swing';
    setTxt(this.holeTxt, String(r.holeNumber));
    const d = r.distToPin();
    const lieTxt = r.lie ? r.lie.label : '';
    const surf = SURFACE_LABEL[r.surfaceAt()] ?? '';
    setTxt(this.infoLines[0], `par ${r.hole.par}`);
    setTxt(this.infoLines[1], p.state === 'holed' || p.state === 'replay' ? `holed: ${r.tally.strokes}` : `shot ${r.tally.strokes + 1}`);
    // with the putter in hand the distance is in feet (or metres), like the putting meter
    setTxt(this.infoLines[2], p.club.kind === 'putter' ? distLabel(d).replace(/(\d)(ft|m)$/, '$1 $2') : `${fmtDist(d)} ${unitLabel()}`);
    setTxt(this.infoLines[3], r.ball.teedUp ? 'tee' : lieTxt || surf);
    this.infoLines[3].setTint(r.lie && r.lie.distMult < 1 ? COLORS.yellow : COLORS.green);
    // wind
    const w = r.wind;
    const k = ((Math.round(w.dir / (Math.PI / 8)) % 16) + 16) % 16;
    this.windArrow.setFrame(`wind_${k}`).setVisible(w.mph >= 0.5);
    setTxt(this.windTxt, w.mph < 0.5 ? 'calm' : w.mph.toFixed(1));
    // club
    const c = p.club;
    this.clubIcon.setFrame(`club_${c.kind === 'driver' ? 'driver' : c.kind}`);
    setTxt(this.clubName, c.name);
    if (c.kind === 'putter') setTxt(this.clubCarry, `100%: ${puttScaleLabel(p.puttScale)}`);
    else setTxt(this.clubCarry, `${fmtDist(r.fullCarry(c) * p.swingScale)} ${unitLabel()}`);
    this.spinBtn.setIcon(`spin_${p.spin}`).setVisible(c.kind !== 'putter');
    this.scaleBtn.setLabel(c.kind === 'putter' ? puttScaleLabel(p.puttScale) : swingLabel(p.swingScale)).setVisible(true);
    for (const b of [this.aimL, this.aimR, this.clubUp, this.clubDown, this.spinBtn, this.scaleBtn]) b.setEnabled(aiming);
    this.swingBtn.setEnabled(aiming || swinging);
    this.swingBtn.setLabel(c.kind === 'putter' ? 'putt' : 'swing');
    this.unplayBtn.setVisible(aiming && !r.ball.teedUp && r.tally.strokes > 0 && !r.onHoleGreen());
    this.mulliganBtn.setVisible(aiming && r.cfg.settings.mulligans && !r.mulliganUsed && r.shotNo > 0);
    const showCtl = !['intro', 'holed', 'loading'].includes(p.state);
    for (const o of [this.aimL, this.aimR, this.aimLabel, this.clubPanel, this.clubUp, this.clubDown, this.swingBtn, this.meterPanel]) o.setVisible(showCtl);
    if (!showCtl) { this.spinBtn.setVisible(false); this.scaleBtn.setVisible(false); this.unplayBtn.setVisible(false); this.mulliganBtn.setVisible(false); }
    // minimap
    const mm = app.course!.json.maps.holes.find((m) => m.hole === r.courseHole)!;
    if (this.mini.texture.key !== `mini_${r.courseHole}`) this.mini.setTexture(`mini_${r.courseHole}`);
    if (this.miniPanel.pw !== mm.w + 6 || this.miniPanel.ph !== mm.h + 6) {
      this.miniPanel.resize(mm.w + 6, mm.h + 6);
      this.layout();
    }
    this.drawMini();
  }

  private drawMini() {
    const p = this.play;
    const r = p.round;
    const mm = app.course!.json.maps.holes.find((m) => m.hole === r.courseHole)!;
    const g = this.miniG;
    g.clear();
    const toM = (x: number, y: number) => ({ x: 3 + Math.round((x - mm.x0) / mm.mPerPx), y: 3 + Math.round((mm.y1 - y) / mm.mPerPx) });
    const pin = toM(r.pin.x, r.pin.y);
    g.fillStyle(0xffffff, 1).fillRect(pin.x, pin.y - 3, 1, 4);
    g.fillStyle(0xe2382f, 1).fillRect(pin.x + 1, pin.y - 3, 2, 2);
    const b = toM(r.ball.x, r.ball.y);
    if (p.state === 'aim' || p.state === 'swing') {
      const dist = p.isPutting() ? r.distToPin() : r.fullCarry(p.club);
      const e = toM(r.ball.x + Math.cos(p.aim) * dist, r.ball.y + Math.sin(p.aim) * dist);
      g.lineStyle(1, 0xffffff, 0.8);
      g.lineBetween(b.x, b.y, e.x, e.y);
    }
    g.fillStyle(0x14161c, 1).fillRect(b.x - 1, b.y - 1, 3, 3);
    g.fillStyle(0xffffff, 1).fillRect(b.x, b.y, 1, 1);
  }

  /** Called every frame by the Play scene. */
  tick() {
    const p = this.play;
    this.drawMeter();
    if (p.state === 'flight') this.drawMiniBall();
    // arrow toward an off-screen ball (kept clear of the HUD panels)
    const off = p.ballOffscreen;
    if (off && !this.modal) {
      const cam = p.cameras.main;
      // play-camera device pixels -> HUD texels
      const sx = ((off.x - cam.worldView.x) * cam.zoom) / app.zoom, sy = ((off.y - cam.worldView.y) * cam.zoom) / app.zoom;
      const x0 = 96, x1 = this.W - 16 - Math.max(48, this.miniPanel.pw + 8), y0 = 30, y1 = this.H - 78;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const t = Math.min((x1 - cx) / Math.abs(Math.cos(ang) || 1e-6), (y1 - cy) / Math.abs(Math.sin(ang) || 1e-6));
      const k = ((Math.round(-ang / (Math.PI / 8)) % 16) + 16) % 16;
      const pulse = 0.65 + 0.35 * Math.sin(this.time.now / 180);
      this.offArrow.setVisible(true).setFrame(`wind_${k}`).setAlpha(pulse)
        .setPosition(Math.round(cx + Math.cos(ang) * t), Math.round(cy + Math.sin(ang) * t));
    } else this.offArrow.setVisible(false);
  }

  private drawMiniBall() {
    this.drawMini();
  }

  private drawMeter() {
    const p = this.play;
    const g = this.meterG;
    g.clear();
    if (!this.meterPanel.visible) { this.meterRead.setVisible(false); return; }
    const putt = p.isPutting();
    const m = p.meter;
    const max = m ? m.max : (putt || p.swingScale < 1 ? PART_MAX : FULL_MAX);
    const lo = -ZONE_REACH;
    const x0 = 6, x1 = this.meterPanel.pw - 6, y0 = 4, h = 8;
    const X = (v: number) => Math.round(x0 + ((v - lo) / (max - lo)) * (x1 - x0));
    const r = p.round;
    // track
    g.fillStyle(0x0b0f13, 1).fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, h + 2);
    g.fillStyle(putt ? 0x34505c : 0x2c3640, 1).fillRect(x0, y0, x1 - x0, h);
    if (max > 100) g.fillStyle(0x5a2a22, 1).fillRect(X(100), y0, X(max) - X(100), h);
    // accuracy zone, centred on the start: red / yellow / green / yellow / red
    let half: number;
    if (putt) half = r.preset.perfectZone * p.club.windowMult;
    else {
      const mods = lieModsFor(r.lie, p.club);
      // an overswing (power past 100 %) halves the zone the moment the power is set, as the strike does
      const over = !!m && (m.phase === 'accuracy' || m.phase === 'done') && (m.power / 100) * p.swingScale > 1.0001;
      half = perfectHalfWidth(r.preset.perfectZone, p.club, { distMult: mods.distMult, windowMult: mods.windowMult }, over);
    }
    const good = half + GOOD_BAND;
    g.fillStyle(0xd23b2b, 1).fillRect(X(-ZONE_REACH), y0, X(ZONE_REACH) - X(-ZONE_REACH), h);
    g.fillStyle(0xf2c23a, 1).fillRect(X(-good), y0, Math.max(1, X(good) - X(-good)), h);
    g.fillStyle(0x4cd25c, 1).fillRect(X(-half), y0, Math.max(1, X(half) - X(-half)), h);
    // a dark line through the middle of the green, top to bottom of the bar: the perfect spot (developer)
    g.fillStyle(0x1f5a28, 1).fillRect(X(0), y0, 1, h);
    // ticks
    g.fillStyle(0x0b0f13, 1);
    for (const v of [25, 50, 75, 100]) g.fillRect(X(v), y0 + h - 3, 1, 3);
    this.meterLabels.forEach((t, i) => {
      const v = [25, 50, 75, 100][i];
      t.setPosition(X(v), y0 + h + 1);
      setTxt(t, putt ? puttScaleLabel(p.puttScale * v / 100) : String(v));
    });
    let read = '';
    if (m && (p.state === 'swing' || p.state === 'flight')) {
      const now = performance.now();
      const pos = Math.max(lo, Math.min(max, m.position(now)));
      if (m.phase === 'accuracy' || m.phase === 'done') {
        g.fillStyle(0xffffff, 1).fillRect(X(Math.min(max, m.power)) - 1, y0 - 3, 3, 2);
      }
      const cx = X(pos);
      g.fillStyle(0x0b0f13, 1).fillRect(cx - 1, y0 - 3, 3, h + 6);
      g.fillStyle(0xffffff, 1).fillRect(cx, y0 - 2, 1, h + 4);
      // how far the cursor's power would send it (flat, calm)
      const pw = m.phase === 'power' ? pos : m.power;
      if (pw > 0) {
        const metres = putt ? p.puttScale * pw / 100 : r.fullCarry(p.club) * p.swingScale * pw / 100;
        read = putt ? distLabel(metres) : `${fmtDist(metres)} ${unitLabel()}`;
      }
    }
    this.meterRead.setVisible(!!read);
    if (read) setTxt(this.meterRead, read);
  }

  private onSwingButton(time: number) {
    const p = this.play;
    if (p.state === 'aim' || p.state === 'swing') p.tap(time);
  }

  /** True when the pointer is over a HUD control or a modal is open. */
  blocks(ptr: Phaser.Input.Pointer): boolean {
    // the drop prompt is open while the player taps inside the relief area to place the ball
    if (this.modal && this.modal !== 'drop') return true;
    const hits = this.input.hitTestPointer(ptr);
    return hits.some((h) => (h as unknown as { visible?: boolean }).visible !== false && (h as unknown as { enabled?: boolean }).enabled !== false);
  }

  modalOpen(): boolean {
    return this.modal !== null && this.modal !== 'drop';
  }

  onModalKey(e: KeyboardEvent) {
    if (this.modal === 'card' && (e.key === 'c' || e.key === 'C' || e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.closeCard(); return; }
    if ((e.key === 'c' || e.key === 'C') && this.modal === 'holed') { this.toggleCard(); return; }
    if ((e.key === 'r' || e.key === 'R') && this.modal === 'holed') { this.play.startReplay(); return; }
    if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'm' || e.key === 'M' || e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      if (this.modal === 'overview' || this.modal === 'pause') this.closeModal();
    }
    if ((e.key === ' ' || e.key === 'Enter') && this.modal === 'holed') {
      e.preventDefault();
      this.continueFromHoled();
    }
  }

  // ------------------------------------------------------------------ banners
  flash(s: string, color: number = COLORS.white, subline = '', ms = 1500) {
    setTxt(this.banner, s);
    this.banner.setTint(color).setVisible(true).setAlpha(1).setScale(2);
    setTxt(this.sub, subline);
    this.sub.setVisible(!!subline).setAlpha(1);
    this.bannerTimer?.remove();
    this.tweens.killTweensOf([this.banner, this.sub]);
    this.bannerTimer = this.time.delayedCall(ms, () => {
      this.tweens.add({ targets: [this.banner, this.sub], alpha: 0, duration: 300 });
    });
  }

  strikeFeedback(st: Strike) {
    const lefty = this.play.round.cfg.settings.lefty;
    let label = 'perfect!';
    let color: number = COLORS.green;
    let note = '';
    if (st.quality === 'great') { label = 'great!'; note = `tiny ${missWord(st.side, false, lefty)} · `; }
    else if (st.quality === 'good') { label = `slight ${missWord(st.side, false, lefty)}`; color = COLORS.yellow; }
    else if (st.quality !== 'perfect') { label = missWord(st.side, true, lefty); color = COLORS.red; }
    const pw = Math.round(st.power * 100);
    this.flash(label, color, `${note}${pw}% power${st.overswing ? ' (overswing)' : ''}`, 1100);
  }

  puttFeedback(ps: PuttStrike, power: number) {
    const word = (ps.side > 0) !== this.play.round.cfg.settings.lefty ? 'push' : 'pull'; // a right-hander pushes it right
    const label = ps.quality === 'perfect' ? 'pure stroke' : ps.quality === 'great' ? 'good stroke' : ps.quality === 'good' ? `slight ${word}` : word;
    const color = ps.quality === 'perfect' || ps.quality === 'great' ? COLORS.green : ps.quality === 'good' ? COLORS.yellow : COLORS.red;
    this.flash(label, color, `${Math.round(power * 100)}% of ${puttScaleLabel(this.play.puttScale)}`, 900);
  }

  carryInfo(_ball: { x: number; y: number }, e: SimEvent) {
    const p = this.play;
    const st = p.shot?.spec;
    if (!st) return;
    const carry = Math.hypot(e.x - st.x, e.y - st.y);
    this.flash(`carry ${fmtDist(carry)}`, COLORS.white, '', 1200);
  }

  restInfo() {
    const p = this.play;
    const r = p.round;
    const st = p.shot?.spec;
    if (!st || !p.sim) return;
    const total = Math.hypot(p.sim.end.x - st.x, p.sim.end.y - st.y);
    const where = SURFACE_LABEL[r.surfaceAt()] ?? '';
    // on and around the green distances are in feet, like the putting meter
    const short = p.shot?.club.kind === 'putter' || r.onHoleGreen();
    const f = (m: number) => (short ? distLabel(m).replace(/(\d)(ft|m)$/, '$1 $2') : `${fmtDist(m)} ${unitLabel()}`);
    this.flash(where, COLORS.white, `${f(total)} · ${f(r.distToPin())} to go`, 1600);
  }

  // ------------------------------------------------------------------ intro
  showIntro() {
    this.intro?.destroy();
    const r = this.play.round;
    const W = this.W;
    const w = Math.min(220, W - 16), h = 70;
    const c = this.add.container(Math.round((W - w) / 2), Math.round(this.H - h - 30));
    const pnl = new Panel(this, 0, 0, w, h, 0.86);
    const portrait = this.add.image(8, 10, 'ui', 'portrait').setOrigin(0, 0);
    const t1 = txt(this, 64, 8, `hole ${r.holeNumber}`, { scale: 2 });
    const yd = r.tee.cardYd;
    const ydStr = app.settings.units === 'yd' ? `${yd} yd` : `${Math.round(yd * YD)} m`;
    const t2 = txt(this, 64, 30, `par ${r.hole.par}  ·  ${ydStr}  ·  ${r.cfg.tee.toLowerCase()}`, { color: COLORS.yellow });
    const t3 = txt(this, 64, 41, `handicap ${r.hole.handicap}  ·  pin ${r.pinLabel()}`, { color: COLORS.dim });
    const wtxt = r.wind.mph < 0.5 ? 'calm' : `wind ${r.wind.mph.toFixed(1)} mph`;
    const t4 = txt(this, 64, 52, `${wtxt}  ·  tap to play`, { color: COLORS.dim });
    c.add([pnl, portrait, t1, t2, t3, t4]);
    this.intro = c;
    this.refresh();
  }

  hideIntro() {
    if (!this.intro) return;
    const c = this.intro;
    this.intro = null;
    this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
    this.refresh();
  }

  // ------------------------------------------------------------------ modals
  private openModal(kind: Modal) {
    // a card opened during the shot must not hide (and later strand) the panel that follows it
    if (this.cardLayer) {
      this.cardLayer.destroy();
      this.cardLayer = null;
      this.modalBeforeCard = null;
      this.modalLayer.setVisible(true);
    }
    this.closeModal();
    this.modal = kind;
    this.modalLayer.removeAll(true);
  }

  closeModal() {
    this.modal = null;
    this.redraw = null;
    this.modalLayer.removeAll(true);
  }

  private cardLayer: Phaser.GameObjects.Container | null = null;
  private modalBeforeCard: Modal = null;

  toggleCard() {
    if (this.cardLayer) { this.closeCard(); return; }
    this.play.cancelSwing();
    if (this.modal && this.modal !== 'holed') return;
    this.modalBeforeCard = this.modal;
    if (this.modal === 'holed') this.modalLayer.setVisible(false);
    this.modal = 'card';
    const layer = this.add.container(0, 0).setDepth(120);
    const dim = dimmer(this, 0.6);
    dim.on('pointerdown', () => this.closeCard());
    layer.add(dim);
    const card = scorecard(this, this.play.round, this.W, this.H);
    layer.add(card);
    const below = Math.min(this.H - 14, (card.getData('bottom') as number) + 4);
    layer.add(txt(this, this.W / 2, below, 'tap anywhere to close', { origin: [0.5, 0], color: COLORS.dim }));
    this.cardLayer = layer;
  }

  closeCard() {
    this.cardLayer?.destroy();
    this.cardLayer = null;
    this.modal = this.modalBeforeCard;
    this.modalBeforeCard = null;
    this.modalLayer.setVisible(true);
  }

  toggleOverview() {
    if (this.modal === 'overview') { this.closeModal(); return; }
    this.play.cancelSwing();
    if (this.modal) return;
    this.openModal('overview');
    const r = this.play.round;
    const dim = dimmer(this, 0.75);
    dim.on('pointerdown', () => this.closeModal());
    this.modalLayer.add(dim);
    const mPer = app.course!.json.maps.overviewMPerPx;
    const pts = [...r.tee.centerline, [r.pin.x, r.pin.y], [r.ball.x, r.ball.y]];
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const pad = 40;
    let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const maxW = (this.W - 16) * mPer, maxH = (this.H - 36) * mPer;
    // expand to the screen aspect, clamp to the course map
    const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2;
    let wM = Math.max(x1 - x0, 60), hM = Math.max(y1 - y0, 60);
    let scale = 1;
    if (wM / mPer * 2 <= this.W - 16 && hM / mPer * 2 <= this.H - 36) scale = 2;
    wM = Math.min(maxW / scale, Math.max(wM, (this.W - 16) * mPer / scale));
    hM = Math.min(maxH / scale, Math.max(hM, (this.H - 36) * mPer / scale));
    x0 = cxm - wM / 2; x1 = cxm + wM / 2; y0 = cym - hM / 2; y1 = cym + hM / 2;
    const Wm = app.course!.json.world.width, Hm = app.course!.json.world.height;
    if (x0 < 0) { x1 -= x0; x0 = 0; }
    if (y0 < 0) { y1 -= y0; y0 = 0; }
    if (x1 > Wm) { x0 -= x1 - Wm; x1 = Wm; }
    if (y1 > Hm) { y0 -= y1 - Hm; y1 = Hm; }
    const cropX = Math.round(x0 / mPer), cropY = Math.round((Hm - y1) / mPer);
    const cropW = Math.round((x1 - x0) / mPer), cropH = Math.round((y1 - y0) / mPer);
    const img = this.add.image(0, 0, 'overview').setOrigin(0, 0).setCrop(cropX, cropY, cropW, cropH).setScale(scale);
    const ox = Math.round((this.W - cropW * scale) / 2) - cropX * scale;
    const oy = Math.round((this.H - 20 - cropH * scale) / 2) - cropY * scale;
    img.setPosition(ox, oy);
    const frame = this.add.graphics();
    frame.lineStyle(1, 0x0a0e12, 1).strokeRect(ox + cropX * scale - 1, oy + cropY * scale - 1, cropW * scale + 2, cropH * scale + 2);
    const g = this.add.graphics();
    const toS = (x: number, y: number) => ({ x: Math.round(ox + (x / mPer) * scale), y: Math.round(oy + ((Hm - y) / mPer) * scale) });
    // centre line
    g.lineStyle(1, 0xffffff, 0.35);
    const cl = r.tee.centerline;
    for (let i = 0; i < cl.length - 1; i++) { const a = toS(cl[i][0], cl[i][1]), b = toS(cl[i + 1][0], cl[i + 1][1]); g.lineBetween(a.x, a.y, b.x, b.y); }
    const pin = toS(r.pin.x, r.pin.y);
    g.fillStyle(0xffffff, 1).fillRect(pin.x, pin.y - 5, 1, 6);
    g.fillStyle(0xe2382f, 1).fillRect(pin.x + 1, pin.y - 5, 3, 2);
    const b = toS(r.ball.x, r.ball.y);
    g.fillStyle(0x14161c, 1).fillRect(b.x - 2, b.y - 2, 5, 5);
    g.fillStyle(0xffffff, 1).fillRect(b.x - 1, b.y - 1, 3, 3);
    const p = this.play;
    if (p.state === 'aim') {
      const dist = p.isPutting() ? r.distToPin() : r.fullCarry(p.club);
      const e = toS(r.ball.x + Math.cos(p.aim) * dist, r.ball.y + Math.sin(p.aim) * dist);
      g.lineStyle(1, 0xffd84a, 0.9).lineBetween(b.x, b.y, e.x, e.y);
      g.strokeCircle(e.x, e.y, 2);
    }
    const head = txt(this, this.W / 2, 4, `hole ${r.holeNumber}  ·  par ${r.hole.par}  ·  ${fmtDist(r.distToPin())} ${unitLabel()} to the pin`, { origin: [0.5, 0] });
    const foot = txt(this, this.W / 2, this.H - 13, 'tap or press tab to close', { origin: [0.5, 0], color: COLORS.dim });
    this.modalLayer.add([img, frame, g, head, foot]);
  }

  togglePause() {
    if (this.modal === 'pause') { this.closeModal(); return; }
    this.play.cancelSwing();
    if (this.modal) return;
    this.openModal('pause');
    const dim = dimmer(this, 0.6);
    this.modalLayer.add(dim);
    const w = 150, h = 128;
    const x = Math.round((this.W - w) / 2), y = Math.round((this.H - h) / 2);
    const pnl = new Panel(this, x, y, w, h, 0.92);
    const t = txt(this, x + w / 2, y + 6, 'paused', { origin: [0.5, 0], scale: 2 });
    const b1 = new Button(this, x + 15, y + 30, w - 30, 16, 'resume', () => this.closeModal());
    const b2 = new Button(this, x + 15, y + 50, w - 30, 16, 'settings', () => { this.closeModal(); this.scene.launch('settings', { from: 'hud' }); this.scene.pause('play'); this.scene.pause('hud'); }, { color: 'grey' });
    // the round is saved after every shot: this leaves it to continue from the title screen
    const b3 = new Button(this, x + 15, y + 70, w - 30, 16, 'save & exit', () => {
      this.closeModal();
      this.scene.stop('play');
      this.scene.start('title');
    }, { color: 'grey' });
    const b4 = new Button(this, x + 15, y + 90, w - 30, 16, 'quit round', () => { this.closeModal(); this.confirmQuit(); }, { color: 'grey' });
    const note = txt(this, x + w / 2, y + 110, 'save & exit: continue it later', { origin: [0.5, 0], color: COLORS.dim });
    this.modalLayer.add([pnl, t, b1, b2, b3, b4, note]);
  }

  /** Quit the round for good: not saved, not on the leaderboard, can't be continued. */
  private confirmQuit() {
    this.openModal('pause');
    this.modalLayer.add(dimmer(this, 0.6));
    const w = 170, h = 74;
    const x = Math.round((this.W - w) / 2), y = Math.round((this.H - h) / 2);
    const pnl = new Panel(this, x, y, w, h, 0.92);
    const t1 = txt(this, x + w / 2, y + 7, 'quit this round?', { origin: [0.5, 0], scale: 2 });
    const t2 = txt(this, x + w / 2, y + 29, "it won't be saved or go on the leaderboard", { origin: [0.5, 0], color: COLORS.dim, maxWidth: w - 10 });
    const back = new Button(this, x + 8, y + h - 24, 70, 16, 'keep playing', () => this.closeModal(), { color: 'grey' });
    const quit = new Button(this, x + w - 78, y + h - 24, 70, 16, 'quit round', () => {
      this.closeModal();
      void clearSnapshot();
      this.scene.stop('play');
      this.scene.start('title');
    });
    this.modalLayer.add([pnl, t1, t2, back, quit]);
  }

  openUnplayable() {
    this.play.openUnplayable();
  }

  showRelief(title: string, options: ReliefArea[], optional: boolean) {
    this.reliefTitle = title;
    this.openModal('relief');
    this.redraw = () => this.showRelief(title, options, optional);
    const n = options.length + (optional ? 1 : 0);
    const w = Math.min(232, this.W - 12), h = 26 + n * 18;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.42);
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t = txt(this, x + w / 2, y + 5, title, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: w - 10 });
    this.modalLayer.add([pnl, t]);
    options.forEach((o, i) => {
      const label = `${o.label}${o.penalty ? ` (+${o.penalty})` : ''}`;
      const b = new Button(this, x + 6, y + 20 + i * 18, w - 12, 16, label, () => this.play.chooseRelief(i), { color: i === 0 && options.length > 1 ? 'grey' : 'orange' });
      this.modalLayer.add(b);
    });
    if (optional) {
      const b = new Button(this, x + 6, y + 20 + options.length * 18, w - 12, 16, 'play it as it lies', () => this.play.playAsItLies(), { color: 'grey' });
      this.modalLayer.add(b);
    }
  }

  showDrop(a: ReliefArea) {
    this.openModal('drop');
    this.redraw = () => this.showDrop(a);
    const w = Math.min(232, this.W - 12), h = 38;
    const x = Math.round((this.W - w) / 2), y = this.H - h - 6;
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t = txt(this, x + w / 2, y + 4, `${a.label}: tap inside the area`, { origin: [0.5, 0], color: COLORS.yellow, maxWidth: w - 8 });
    const ok = new Button(this, x + w - 74, y + 18, 68, 16, 'drop here', () => this.play.confirmDrop());
    const back = new Button(this, x + 6, y + 18, 50, 16, 'back', () => this.play.cancelDrop(), { color: 'grey' });
    this.modalLayer.add([pnl, t, ok, back]);
  }

  hideRelief() {
    this.closeModal();
    this.refresh();
  }

  /** The hole-complete panel again, after a replay. */
  reshowHoled() {
    if (this.lastHoled) this.showHoled(this.lastHoled[0], this.lastHoled[1], this.lastHoled[2], true);
  }

  private lastHoled: [HoleScore, boolean, boolean] | null = null;

  showHoled(score: HoleScore, gimme: boolean, maxed = false, quiet = false) {
    this.openModal('holed');
    this.lastHoled = [score, gimme, maxed];
    this.redraw = () => this.showHoled(score, gimme, maxed, true);
    const r = this.play.round;
    const name = maxed ? 'max score' : scoreName(score.strokes, score.par);
    const d = score.strokes - score.par;
    const color = d < 0 ? COLORS.yellow : d === 0 ? COLORS.green : COLORS.white;
    if (!quiet) { if (d < 0) sfx('great'); else if (d === 0) sfx('good'); else sfx('bad'); }
    const tot = totals(r.scores);
    const eagle = !maxed && isListedEagle(r, score);
    const unnamed = eagle && r.cfg.playerName === DEFAULT_NAME;
    const w = Math.min(210, this.W - 12), h = unnamed ? 112 : eagle ? 100 : 92;
    const x = Math.round((this.W - w) / 2), y = Math.round(this.H * 0.28);
    const pnl = new Panel(this, x, y, w, h, 0.9);
    const t1 = txt(this, x + w / 2, y + 6, name + (gimme ? ' (gimme)' : ''), { origin: [0.5, 0], scale: 2, color });
    const t2 = txt(this, x + w / 2, y + 28, `${score.strokes} strokes on a par ${score.par}${score.penalties ? ` · ${score.penalties} penalty` : ''}`, { origin: [0.5, 0] });
    const t3 = txt(this, x + w / 2, y + 40, `${toPar(tot.toPar)} through ${tot.holes} · ${tot.strokes} total`, { origin: [0.5, 0], color: COLORS.dim });
    const last = r.isLastHole;
    const nb = new Button(this, x + w - 86, y + h - 22, 80, 16, last ? 'finish round' : 'next hole', () => this.continueFromHoled());
    const cb = new Button(this, x + 6, y + h - 22, 44, 16, 'card', () => this.toggleCard(), { color: 'grey' });
    this.modalLayer.add([pnl, t1, t2, t3, nb, cb]);
    if (this.play.canReplay()) {
      // the physics is deterministic: the holing shot plays back exactly (player improvements, item 9)
      this.modalLayer.add(new Button(this, x + 54, y + h - 22, 52, 16, 'replay', () => this.play.startReplay(), { color: 'grey' }));
    }
    if (eagle) {
      // the eagle goes on the shared list now; a player with no name is asked for one
      const t4 = txt(this, x + w / 2, y + 54, unnamed ? 'add your name for the recent eagles list' : 'on the recent eagles list!', { origin: [0.5, 0], color: COLORS.yellow, maxWidth: w - 12 });
      this.modalLayer.add(t4);
      if (unnamed) {
        const ab = new Button(this, x + w / 2 - 34, y + 67, 68, 16, 'add name', () => {
          askName(this, '', async (name) => {
            if (!name) return;
            await nameRound(r, name);
            if (t4.active) setTxt(t4, `${name}: on the recent eagles list!`);
            if (ab.active) ab.setVisible(false);
          }, 'your name for the eagles list');
        });
        this.modalLayer.add(ab);
      }
    }
    this.refresh();
  }

  continueFromHoled() {
    if (this.play.state !== 'holed') return;
    this.closeModal();
    const r = this.play.round;
    if (r.nextHole()) {
      this.play.startHoleIntro();
    } else {
      this.play.state = 'done'; // nothing more happens on the course while the round is saved (and a second tap does nothing)
      void finishRound(this);
    }
  }
}

/** What a scorecard shows: a title line, the nines, each hole's par and yards, and the scores. */
export interface CardData {
  title: string;
  blocks: (readonly [number, number, string])[];
  hole: (slot: number) => { par: number; yd: number | null };
  scores: HoleScore[];
}

/** The card of a round being played (or just finished). */
export function cardOfRound(r: import('../systems/game/round').Round): CardData {
  const holes = r.course.json.holes;
  const nCourse = holes.length;
  return {
    title: `${r.course.json.name}  ·  ${r.cfg.tee.toLowerCase()} tees  ·  ${r.cfg.playerName}`,
    blocks: nCourse === 9 && r.cfg.holes.length <= 9 ? [[1, 9, 'tot']] : [[1, 9, 'out'], [10, 18, 'in']],
    hole: (h) => { const hj = holes[courseHoleFor(h, nCourse) - 1]; return { par: hj.par, yd: hj.tees[r.cfg.tee]?.cardYd ?? 0 }; },
    scores: r.scores,
  };
}

/**
 * The card of a finished round from a leaderboard (only the nines it played).
 * Yards need the course's own data (`holes`, when it is the loaded course).
 */
export function cardOfEntry(e: LeaderboardEntry, courseName: string, holes: import('../data/course').HoleJson[] | null): CardData {
  const blocks: (readonly [number, number, string])[] = e.length === 'front' ? [[1, 9, 'out']] : e.length === 'back' ? [[10, 18, 'in']]
    : e.length === '9' ? [[1, 9, 'tot']] : [[1, 9, 'out'], [10, 18, 'in']];
  const by = new Map(e.scores.map((s) => [s.hole, s]));
  return {
    title: `${courseName}  ·  ${e.tee.toLowerCase()} tees  ·  ${e.player}`,
    blocks,
    hole: (h) => {
      const hj = holes ? holes[courseHoleFor(h, holes.length) - 1] : null;
      return { par: by.get(h)?.par ?? hj?.par ?? 0, yd: hj ? hj.tees[e.tee]?.cardYd ?? null : null };
    },
    scores: e.scores,
  };
}

/** Scorecard table: out and in (18-hole course, or a 9-hole course twice around), or one nine. */
export function scorecard(scene: Phaser.Scene, r: import('../systems/game/round').Round, W: number, H: number): Phaser.GameObjects.Container {
  return scorecardOf(scene, cardOfRound(r), W, H);
}

export function scorecardOf(scene: Phaser.Scene, d: CardData, W: number, H: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const blocks = d.blocks;
  const cellW = W < 330 ? 17 : 21;
  const labelW = 34, sumW = 24;
  const tw = labelW + cellW * 9 + sumW + 2;
  const x0 = Math.round((W - tw) / 2);
  const rowH = 11;
  const scoreH = 17; // tall enough for a circle / square around the number
  const blockH = rowH * 3 + scoreH + 4;
  const th = blockH * blocks.length + 36;
  const y0 = Math.max(4, Math.round((H - th) / 2) - 6);
  const pnl = new Panel(scene, x0 - 6, y0 - 4, tw + 12, th + 8, 0.94);
  c.add(pnl);
  c.add(txt(scene, x0, y0, d.title, { color: COLORS.dim, maxWidth: tw }));
  const byHole = new Map(d.scores.map((s) => [s.hole, s]));
  blocks.forEach(([a, b, lab], k) => {
    const yb = y0 + 14 + k * (blockH + 6);
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.06).fillRect(x0, yb, tw, rowH);
    g.fillStyle(0xffffff, 0.04).fillRect(x0, yb + rowH * 2, tw, rowH);
    c.add(g);
    const rows = ['hole', 'yards', 'par', 'score'];
    const sy = yb + rowH * 3 + 4; // score text top (its digits are 6 x 9 px including the outline)
    rows.forEach((rl, i) => c.add(txt(scene, x0 + 2, i === 3 ? sy : yb + i * rowH + 1, rl, { color: i === 3 ? COLORS.yellow : COLORS.dim })));
    let sumPar = 0, sumYd = 0, sumSc = 0, any = false, ydKnown = true;
    for (let h = a; h <= b; h++) {
      const hj = d.hole(h);
      const cx = x0 + labelW + (h - a) * cellW + cellW / 2;
      sumPar += hj.par;
      if (hj.yd === null) ydKnown = false; else sumYd += hj.yd;
      c.add(txt(scene, cx, yb + 1, String(h), { origin: [0.5, 0] }));
      c.add(txt(scene, cx, yb + rowH + 1, hj.yd === null ? '-' : String(hj.yd), { origin: [0.5, 0], color: COLORS.dim }));
      c.add(txt(scene, cx, yb + rowH * 2 + 1, String(hj.par), { origin: [0.5, 0] }));
      const s = byHole.get(h);
      if (s) {
        any = true;
        sumSc += s.strokes;
        const dd = s.strokes - s.par;
        const col = dd < 0 ? COLORS.yellow : dd === 0 ? COLORS.white : dd === 1 ? 0x9fd0ff : 0xff9b8a;
        const gg = scene.add.graphics();
        const mx = Math.round(cx), my = sy + 4; // centre of the digits
        // birdie: circle; eagle or better: filled circle; bogey: square; double bogey+: filled square
        if (dd <= -2) gg.fillStyle(COLORS.yellow, 0.22).fillCircle(mx, my + 0.5, 7);
        if (dd <= -1) gg.lineStyle(1, COLORS.yellow, 0.95).strokeCircle(mx, my + 0.5, 7);
        if (dd >= 2) gg.fillStyle(col, 0.18).fillRect(mx - 7, my - 6.5, 14, 14);
        if (dd >= 1) gg.lineStyle(1, col, 0.75).strokeRect(mx - 7, my - 6.5, 14, 14);
        c.add(gg);
        c.add(txt(scene, cx, sy, String(s.strokes), { origin: [0.5, 0], color: col }));
      }
    }
    const sx = x0 + labelW + 9 * cellW + sumW / 2;
    c.add(txt(scene, sx, yb + 1, lab, { origin: [0.5, 0], color: COLORS.dim }));
    c.add(txt(scene, sx, yb + rowH + 1, ydKnown ? String(sumYd) : '-', { origin: [0.5, 0], color: COLORS.dim }));
    c.add(txt(scene, sx, yb + rowH * 2 + 1, String(sumPar), { origin: [0.5, 0] }));
    if (any) c.add(txt(scene, sx, sy, String(sumSc), { origin: [0.5, 0], color: COLORS.yellow }));
  });
  const tot = totals(d.scores);
  const fw = tot.fairwayChances ? `${tot.fairways}/${tot.fairwayChances}` : '-';
  c.add(txt(scene, x0, y0 + 14 + blocks.length * (blockH + 6) - 2,
    `total ${tot.strokes || '-'} (${tot.holes ? toPar(tot.toPar) : 'e'})  ·  putts ${tot.putts}  ·  fairways ${fw}  ·  gir ${tot.gir}/${tot.holes}  ·  penalties ${tot.penalties}`,
    { color: COLORS.dim, maxWidth: tw }));
  c.setData('bottom', y0 + th + 4);
  c.setData('top', y0 - 4);
  return c;
}

/** Putting distances: whole feet with yards, metres (one decimal under 10) with metres. */
export function distLabel(m: number): string {
  if (app.settings.units === 'yd') return `${Math.round(m / 0.3048)}ft`;
  return m < 10 ? `${Math.round(m * 10) / 10}m` : `${Math.round(m)}m`;
}

/** Putter scale / meter marks: always whole numbers. */
function puttScaleLabel(m: number): string {
  return app.settings.units === 'yd' ? `${Math.round(m / 0.3048)}ft` : `${Math.round(m)}m`;
}

function swingLabel(s: number): string {
  return s >= 1 ? 'full' : s === 0.75 ? '3/4' : s === 0.5 ? '1/2' : '1/4';
}

export { PX_PER_M };

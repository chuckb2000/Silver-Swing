// Play: world rendering, camera, input and the shot state machine.
//
// Rendering is at device resolution with the art scaled by the camera (see
// scale.ts); the camera is a smooth spring (ui/cameraRig.ts). Putting uses a
// zoomed-in view with its own high-resolution green art (ui/greenView.ts).

import { reportEagle } from '../save/eagleReport';
import Phaser from 'phaser';
import { app, HEIGHT_PX, PX_PER_M } from '../app';
import { initAudio, sfx, startAmbience } from '../audio/sfx';
import { CLUBS, Club } from '../data/clubs';
import { Outcome, PlannedShot, puttScales, Round, SWING_SCALES } from '../systems/game/round';
import { HZ, SimEvent, SimResult } from '../systems/physics/sim';
import { SURF } from '../systems/physics/surfaces';
import { ReliefArea } from '../systems/rules/relief';
import { FULL_MAX, PART_MAX, SwingMeter } from '../systems/swing/meter';
import { worldCamera } from '../scale';
import { saveSnapshot } from '../save/snapshot';
import { CameraRig, Rect } from '../ui/cameraRig';
import { CourseView, DEPTH } from '../ui/courseView';
import { GreenLayer, GreenView } from '../ui/greenView';
import { COLORS } from '../ui/widgets';
import type { HudScene } from './HudScene';

export type PlayState = 'loading' | 'intro' | 'aim' | 'swing' | 'flight' | 'settle' | 'relief' | 'drop' | 'holed' | 'done';

type Facing = 'side' | 'front' | 'back';

/** Camera levels (multiples of the texel scale). The putting view uses its art's own level. */
const COURSE = 1;
const DROP = 2;

/** Aim nudges: sideways metres at the target per tap; while held, metres per second (ramping up). */
const AIM_STEP_M = 1.0;
const AIM_HOLD = [3, 14];
const PUTT_STEP_M = 0.025; // half the cup's radius per tap
const PUTT_HOLD = [0.25, 1.2];
const HOLD_DELAY = 260;  // ms a key or button is held before the aim moves continuously
const FLIGHT_PLAYBACK = 1.3; // the ball flies this much faster than real time on screen
const FADE_RGB = [20, 32, 42] as const;

interface Flyover { pts: { x: number; y: number }[]; cum: number[]; len: number; T: number; ta: number; t: number; hold: number }

export class PlayScene extends Phaser.Scene {
  round!: Round;
  view!: CourseView;
  green!: GreenView;
  hud!: HudScene;
  rig!: CameraRig;
  state: PlayState = 'loading';
  aim = 0;
  club: Club = CLUBS[0];
  spin = 0;
  puttScale = 25;       // putter: 100 % of the meter in metres
  swingScale = 1;       // full clubs: swing length (fraction of a full swing)
  meter: SwingMeter | null = null;
  shot: PlannedShot | null = null;
  sim: SimResult | null = null;
  outcome: Outcome | null = null;
  reliefOptions: ReliefArea[] = [];
  reliefArea: ReliefArea | null = null;
  dropPoint: { x: number; y: number } | null = null;
  reliefOptional = false;
  lastStrikeLabel = '';
  level = COURSE;
  landing = { x: 0, y: 0 };   // landing preview (world metres)
  explore = false;           // the player dragged the view away from the aim framing
  private playT = 0;
  private evIdx = 0;
  private ball!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private golfer!: Phaser.GameObjects.Image;
  private flag!: Phaser.GameObjects.Sprite;
  private cup!: Phaser.GameObjects.Image;
  private teeMarkers: Phaser.GameObjects.Image[] = [];
  private marker!: Phaser.GameObjects.Image;
  private puttTarget!: Phaser.GameObjects.Image;
  private dots: Phaser.GameObjects.Image[] = [];
  private ticks: Phaser.GameObjects.Image[] = [];
  private trail: Phaser.GameObjects.Image[] = [];
  private trailIdx = 0;
  private lastTrailI = -999;
  private slopeLayer!: Phaser.GameObjects.Graphics;
  private reliefGfx!: Phaser.GameObjects.Graphics;
  private dropMarker!: Phaser.GameObjects.Image;
  private holdUntil = 0;
  private drag: { mode: 'aim' | 'pan'; sx: number; sy: number; cx: number; cy: number } | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private intro: Flyover | null = null;
  private preroll: { phase: 'pan' | 'backswing'; t: number } | null = null; // flight: watching the swing first
  private followArmed = true; // flight: the camera follows once the ball is on screen
  private pose = 'address';
  private ballHidden = false;
  private holing = false;
  private fading = false;
  private zooming = false;
  private flagFrame = 0;
  private flagTimer = 0;
  private slopeDirty = true;
  private landedShown = false;
  private worldRect!: Rect;
  ballOffscreen: { x: number; y: number } | null = null;

  constructor() {
    super('play');
  }

  create(data: { resume?: boolean }) {
    const course = app.course!;
    this.round = app.round!;
    this.round.units = app.settings.units;
    this.state = 'loading';
    this.teeMarkers = [];
    this.dots = [];
    this.ticks = [];
    this.trail = [];
    this.level = COURSE;
    this.holing = false;
    this.fading = false;
    // a scene object is reused from round to round: nothing from the last one carries over
    this.zooming = false;
    this.drag = null;
    this.preroll = null;
    this.explore = false;
    this.meter = null;
    const cam = this.cameras.main;
    worldCamera(cam, COURSE);
    cam.setBackgroundColor('#20381f');
    this.rig = new CameraRig(cam);
    this.worldRect = { x: 0, y: 0, w: course.json.world.width * PX_PER_M, h: course.json.world.height * PX_PER_M };
    this.rig.bounds = this.worldRect;
    this.view = new CourseView(this, course);
    this.green = new GreenView(this, course);
    this.slopeLayer = this.add.graphics().setDepth(DEPTH.ground + 2);
    this.reliefGfx = this.add.graphics().setDepth(DEPTH.ground + 3);
    this.cup = this.add.image(0, 0, 'ui', 'cup').setDepth(DEPTH.ground + 1);
    this.flag = this.add.sprite(0, 0, 'ui', 'flag_0').setOrigin(0.25, 1);
    this.shadow = this.add.image(0, 0, 'ui', 'ball_shadow').setOrigin(0.5, 0.5).setDepth(DEPTH.shadow);
    this.ball = this.add.image(0, 0, 'ui', 'ball').setOrigin(0.5, 0.5);
    this.golfer = this.add.image(0, 0, 'ui', 'golfer_side_address').setOrigin(9 / 20, 20 / 22);
    this.marker = this.add.image(0, 0, 'ui', 'landing').setDepth(DEPTH.overlay + 2);
    this.puttTarget = this.add.image(0, 0, 'ui', 'putt_target').setDepth(DEPTH.overlay + 2).setVisible(false);
    this.dropMarker = this.add.image(0, 0, 'ui', 'cross').setDepth(DEPTH.overlay + 3).setVisible(false);
    for (let i = 0; i < 2; i++) this.teeMarkers.push(this.add.image(0, 0, 'ui', 'tee_marker').setOrigin(0.5, 1));
    for (let i = 0; i < 100; i++) this.dots.push(this.add.image(0, 0, 'ui', 'aim_dot').setDepth(DEPTH.overlay).setVisible(false).setAlpha(0.85));
    for (let i = 0; i < 8; i++) this.ticks.push(this.add.image(0, 0, 'ui', 'aim_tick').setDepth(DEPTH.overlay + 1).setVisible(false));
    for (let i = 0; i < 70; i++) this.trail.push(this.add.image(0, 0, 'ui', 'trail').setDepth(DEPTH.flight - 1).setVisible(false));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SHIFT') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerup', () => { this.drag = null; });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.state === 'aim') this.cycleClub(dy > 0 ? 1 : -1);
    });
    // any first interaction unlocks audio
    this.input.once('pointerdown', () => { void initAudio().then(startAmbience); });
    kb.once('keydown', () => { void initAudio().then(startAmbience); });
    const onResize = () => this.rig.apply();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    // the meter runs on the real clock but the game stops while the tab is hidden: cancel the swing
    const onHidden = () => this.cancelSwing();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden));

    this.hud = this.scene.get('hud') as HudScene;
    this.hud.events.once('create', () => {
      cam.fadeIn(350, ...FADE_RGB);
      void this.green.prepare(this.round.courseHole);
      if (data?.resume) this.beginShot(true, true); else this.startHoleIntro(false);
    });
    this.scene.launch('hud');
    this.events.once('shutdown', () => this.scene.stop('hud'));
  }

  // --------------------------------------------------------------- hole flow
  startHoleIntro(withCut = true) {
    if (withCut) {
      // leave 'holed' at once so a second "next hole" press cannot skip a hole during the fade
      this.state = 'loading';
      this.cut(() => this.startHoleIntro(false), 220, 300);
      return;
    }
    this.state = 'intro';
    const r = this.round;
    this.green.forget(r.courseHole);
    void this.green.prepare(r.courseHole);
    this.applyView(null, COURSE);
    this.resetBallSprite();
    this.placePin();
    this.placeTeeMarkers(true);
    this.club = r.autoClub();
    this.setScalesFor(this.club);
    this.aim = r.defaultAim(this.club, this.scaleArg());
    this.updateLanding();
    this.updateBallSprite(r.ball.x, r.ball.y, 0);
    this.updateGolfer();
    this.intro = makeFlyover(r.tee.centerline.map(([x, y]) => this.px(x, y)));
    const start = this.intro.pts[0];
    this.rig.jump(start.x, start.y);
    this.hud.showIntro();
    this.setOverlayVisible(false);
  }

  /** Leave the fly-over: cut back to the tee. */
  skipIntro() {
    if (this.state !== 'intro' || this.fading) return;
    this.cut(() => {
      this.hud.hideIntro();
      this.intro = null;
      this.beginShot(false, true);
    });
  }

  /** Prepare the next stroke from the ball's current position. */
  beginShot(fresh: boolean, jump = false) {
    const r = this.round;
    void fresh;
    this.state = 'aim';
    this.club = r.autoClub();
    this.setScalesFor(this.club);
    this.aim = r.defaultAim(this.club, this.scaleArg());
    this.spin = 0;
    this.meter = null;
    this.shot = null;
    this.sim = null;
    this.preroll = null;
    this.ballHidden = false;
    this.explore = false;
    this.pose = 'address';
    for (const t of this.trail) if (t.visible) this.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.setVisible(false) });
    this.placeTeeMarkers(r.ball.teedUp);
    this.updateLanding();
    this.slopeDirty = true;
    const green = this.wantGreenView();
    const level = green ? this.green.level(r.courseHole, green) : this.isPutting() ? DROP : COURSE;
    const changes = green !== this.green.layer || level !== this.level;
    if (changes && green && this.green.layer && !jump) {
      // between the far and the close-up putting views: zoom rather than cut
      this.resetBallSprite();
      this.setOverlayVisible(true);
      this.zoomTo(green, level);
      this.hud.refresh();
      void saveSnapshot(r);
      return;
    }
    const finish = (snap: boolean) => {
      if (changes) this.applyView(green, level);
      this.resetBallSprite();
      this.placePin();
      this.updateBallSprite(r.ball.x, r.ball.y, 0);
      this.updateGolfer();
      this.setOverlayVisible(true);
      const f = this.aimFraming();
      if (snap) this.rig.jump(f.x, f.y); else this.rig.target(f.x, f.y, 0.45);
    };
    if (changes && !jump) this.cut(() => finish(true));
    else finish(jump);
    this.hud.refresh();
    void saveSnapshot(r);
  }

  isPutting(): boolean {
    return this.club.kind === 'putter';
  }

  /** Scale argument for the round engine: putter metres or swing length. */
  scaleArg(): number {
    return this.isPutting() ? this.puttScale : this.swingScale;
  }

  private setScalesFor(c: Club) {
    this.round.units = app.settings.units; // the setting may have changed mid-round
    if (c.kind === 'putter') this.puttScale = this.round.autoPuttScale();
    else this.swingScale = this.round.autoSwingScale(c);
  }

  /**
   * Putting view when the putter is in hand and the ball is inside the green's
   * art: the closest of the close-up (24 px/m), near (12 px/m) and far (6 px/m) views
   * in which ball and hole fit on screen.
   */
  private wantGreenView(): GreenLayer | null {
    const r = this.round;
    const h = r.courseHole;
    if (!this.isPutting() || !this.green.isReady(h) || !this.green.contains(h, 'far', r.ball.x, r.ball.y, 8)) return null;
    // the closest view in which the ball and the hole both fit on screen
    for (const l of ['close', 'near'] as GreenLayer[]) {
      if (!this.green.def(h, l)) continue;
      const m = l === 'close' ? 3 : 5;
      if (this.green.contains(h, l, r.ball.x, r.ball.y, m) && this.green.contains(h, l, r.pin.x, r.pin.y, m)
        && this.puttFits(this.green.level(h, l))) return l;
    }
    return 'far';
  }

  /** Do the ball and the hole fit on screen (clear of the HUD) at this level? */
  private puttFits(level: number): boolean {
    const r = this.round;
    const b = this.px(r.ball.x, r.ball.y), pin = this.px(r.pin.x, r.pin.y);
    const vw = this.cameras.main.width / (app.zoom * level), vh = this.cameras.main.height / (app.zoom * level);
    const mx = 44 / level, my = 70 / level;
    return Math.abs(pin.x - b.x) < vw - 2 * mx && Math.abs(pin.y - b.y) < vh - 2 * my;
  }

  inGreenView(): boolean {
    return this.green.visible;
  }

  private applyView(green: GreenLayer | null, level: number) {
    const hole = this.round.courseHole;
    if (green && this.green.show(hole, green)) {
      this.view.setTreesVisible(false);
      this.rig.bounds = this.green.rect(hole, green);
      this.cup.setFrame(green === 'close' ? 'cup_true' : 'cup_big');
    } else {
      this.green.hide();
      this.view.setTreesVisible(true);
      this.rig.bounds = this.worldRect;
      this.cup.setFrame('cup');
      if (level !== COURSE && level !== DROP) level = DROP;
    }
    this.setLevel(level);
    this.slopeDirty = true;
  }

  /** Zoom between the far and close-up putting views (no fade). */
  private zoomTo(layer: GreenLayer, level: number) {
    const hole = this.round.courseHole;
    const from = this.level;
    const c0 = this.rig.clamp(this.rig.x, this.rig.y);
    // where the camera ends up, framed for the new level
    this.level = level; this.rig.level = level;
    const target = this.aimFraming();
    this.level = from; this.rig.level = from;
    // zooming out shows the far art at once; zooming in keeps it until the close-up is reached
    if (level < from) { this.green.show(hole, layer); this.rig.bounds = this.green.rect(hole, layer); this.cup.setFrame(layer === 'close' ? 'cup_true' : 'cup_big'); }
    this.slopeLayer.clear();
    this.zooming = true;
    this.tweens.addCounter({
      from: 0, to: 1, duration: 480, ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        this.setLevel(from + (level - from) * t);
        this.rig.jump(c0.x + (target.x - c0.x) * t, c0.y + (target.y - c0.y) * t);
        this.placePin();
        this.updateBallSprite(this.round.ball.x, this.round.ball.y, 0);
        this.updateGolfer();
      },
      onComplete: () => {
        this.green.show(hole, layer);
        this.cup.setFrame(layer === 'close' ? 'cup_true' : 'cup_big');
        this.rig.bounds = this.green.rect(hole, layer);
        this.setLevel(level);
        this.zooming = false;
        this.placePin();
        this.updateBallSprite(this.round.ball.x, this.round.ball.y, 0);
        this.updateGolfer();
        const f = this.aimFraming();
        this.rig.jump(f.x, f.y);
        this.slopeDirty = true;
      },
    });
  }

  /** Camera zoom level; small sprites keep their on-screen size (1/level scale, pixel exact). */
  private setLevel(level: number) {
    this.level = level;
    this.rig.level = level;
    const s = 1 / level;
    for (const o of [this.golfer, this.ball, this.shadow, this.flag, this.cup, this.marker, this.puttTarget, this.dropMarker,
      ...this.teeMarkers, ...this.dots, ...this.ticks, ...this.trail]) o.setScale(s);
    this.rig.apply();
  }

  /** Fade out, run `fn` (move the camera, change views), fade back in. */
  private cut(fn: () => void, outMs = 170, inMs = 230) {
    const cam = this.cameras.main;
    if (this.fading) { fn(); return; }
    this.fading = true;
    cam.fadeOut(outMs, ...FADE_RGB);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      fn();
      cam.fadeIn(inMs, ...FADE_RGB);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => { this.fading = false; });
    });
  }

  // --------------------------------------------------------------- input
  private onKey(e: KeyboardEvent) {
    if (this.state === 'loading') return;
    const k = e.key;
    if (this.hud.modalOpen()) {
      this.hud.onModalKey(e);
      return;
    }
    if (k === ' ' || k === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;
      if (this.state === 'intro') { this.skipIntro(); return; }
      if (this.state === 'aim' || this.state === 'swing') { this.tap(e.timeStamp); return; }
      if (this.state === 'flight') { this.fastForward(); return; }
      if (this.state === 'drop') { this.confirmDrop(); return; }
      if (this.state === 'holed') { this.hud.continueFromHoled(); return; }
    }
    if (k === 'Tab' || k === 'm' || k === 'M') { e.preventDefault(); this.hud.toggleOverview(); return; }
    if (k === 'c' || k === 'C') { this.hud.toggleCard(); return; }
    if (k === 'Escape') { this.hud.togglePause(); return; }
    if (this.state !== 'aim') return;
    if (e.repeat) return;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.aimStep(1, e.shiftKey);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.aimStep(-1, e.shiftKey);
    else if (k === 'w' || k === 'W' || k === 'ArrowUp') this.cycleClub(-1);
    else if (k === 's' || k === 'S' || k === 'ArrowDown') this.cycleClub(1);
    else if (k === 'q' || k === 'Q') this.setSpin(this.spin === 1 ? 0 : 1);
    else if (k === 'e' || k === 'E') this.setSpin(this.spin === -1 ? 0 : -1);
    else if (k === 'u' || k === 'U') this.hud.openUnplayable();
    else if (k === 'p' || k === 'P') this.cycleScale();
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    if (this.state === 'loading' || this.hud.blocks(p)) return;
    if (p.rightButtonDown()) return;
    const ts = p.event?.timeStamp ?? performance.now();
    if (this.state === 'swing') { this.tap(ts); return; }
    if (this.state === 'intro') { this.skipIntro(); return; }
    if (this.state === 'flight') { this.fastForward(); return; }
    if (this.state === 'drop') { this.pickDrop(p); return; }
    if (this.state === 'aim') {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.nearAimHandle(w.x, w.y)) {
        this.drag = { mode: 'aim', sx: p.x, sy: p.y, cx: 0, cy: 0 };
        this.aimAtWorld(w.x, w.y);
      } else {
        // anywhere else: drag to look around the hole; the aim stays put
        this.drag = { mode: 'pan', sx: p.x, sy: p.y, cx: this.rig.x, cy: this.rig.y };
      }
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer) {
    if (!this.drag || !p.isDown || this.state !== 'aim') return;
    if (this.drag.mode === 'aim') {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.aimAtWorld(w.x, w.y);
      return;
    }
    const z = this.cameras.main.zoom;
    const dx = p.x - this.drag.sx, dy = p.y - this.drag.sy;
    if (!this.explore && Math.hypot(dx, dy) < 4 * app.zoom) return; // ignore tiny wobbles on a tap
    this.explore = true;
    const c = this.rig.clamp(this.drag.cx - dx / z, this.drag.cy - dy / z);
    this.rig.jump(c.x, c.y);
  }

  /** Is a world-pixel point on the aim marker or close to the aim line? */
  private nearAimHandle(wx: number, wy: number): boolean {
    const r = this.round;
    const b = this.px(r.ball.x, r.ball.y);
    const h = this.handlePx();
    const L = this.level;
    if (Math.hypot(wx - h.x, wy - h.y) * L < 16) return true;
    const dx = h.x - b.x, dy = h.y - b.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((wx - b.x) * dx + (wy - b.y) * dy) / len2));
    return Math.hypot(b.x + dx * t - wx, b.y + dy * t - wy) * L < 8;
  }

  private aimAtWorld(wx: number, wy: number) {
    const b = this.px(this.round.ball.x, this.round.ball.y);
    const dx = wx - b.x, dy = -(wy - b.y);
    if (Math.hypot(dx, dy) * this.level < 4) return;
    this.aim = Math.atan2(dy, dx);
    this.onAimChanged();
  }

  /** Metres from the ball to what the aim points at (sets how far a nudge turns). */
  private aimDist(): number {
    const r = this.round;
    if (this.isPutting()) return Math.max(0.5, r.distToPin());
    return Math.max(8, Math.hypot(this.landing.x - r.ball.x, this.landing.y - r.ball.y));
  }

  /** One tap of an aim key or button: the target moves sideways a fixed distance. */
  aimStep(dir: number, fine = false) {
    if (this.state !== 'aim') return;
    const lateral = (this.isPutting() ? PUTT_STEP_M : AIM_STEP_M) * (fine ? 0.3 : 1);
    this.aim += (dir * lateral) / this.aimDist();
    this.onAimChanged();
  }

  /** A held aim key or button (after HOLD_DELAY): moves continuously, faster the longer it is held. */
  aimHold(dir: number, heldMs: number, dtMs: number, fine = false) {
    if (this.state !== 'aim' || heldMs < HOLD_DELAY) return;
    const [v0, v1] = this.isPutting() ? PUTT_HOLD : AIM_HOLD;
    const ramp = Math.min(1, (heldMs - HOLD_DELAY) / 1200);
    const speed = (v0 + (v1 - v0) * ramp * ramp) * (fine ? 0.3 : 1); // metres per second at the target
    this.aim += (dir * speed * (dtMs / 1000)) / this.aimDist();
    this.onAimChanged();
  }

  private onAimChanged() {
    // aiming keeps the view the player dragged to (third playtest: it snapped
    // back to the golfer); it only follows if the landing marker would leave it
    this.updateLanding();
    if (this.explore) {
      const m = this.isPutting() ? this.px(this.round.pin.x, this.round.pin.y) : this.landingPx();
      if (!this.inView(m.x, m.y, 30)) this.rig.target(m.x, m.y, 0.3);
    }
    this.updateGolfer();
    this.hud.refresh();
  }

  cycleClub(dir: number) {
    if (this.state !== 'aim' || this.fading || this.zooming) return;
    const allowed = this.round.allowedClubs();
    let i = allowed.findIndex((c) => c.id === this.club.id);
    if (i < 0) i = 0;
    i = Math.max(0, Math.min(allowed.length - 1, i + dir));
    const before = this.club;
    this.club = allowed[i];
    if (before === this.club) return;
    sfx('tick');
    this.setScalesFor(this.club);
    if ((before.kind === 'putter') !== (this.club.kind === 'putter')) {
      this.aim = this.round.defaultAim(this.club, this.scaleArg());
      this.explore = false;
      this.slopeDirty = true;
      const green = this.wantGreenView();
      const level = green ? this.green.level(this.round.courseHole, green) : this.isPutting() ? DROP : COURSE;
      this.cut(() => {
        this.applyView(green, level);
        this.resetBallSprite();
        this.placePin();
        this.updateBallSprite(this.round.ball.x, this.round.ball.y, 0);
        this.updateGolfer();
        const f = this.aimFraming();
        this.rig.jump(f.x, f.y);
      });
    }
    this.updateLanding();
    this.updateGolfer();
    this.hud.refresh();
  }

  setSpin(s: number) {
    if (this.state !== 'aim' || this.isPutting()) return;
    this.spin = s;
    sfx('tick');
    this.hud.refresh();
  }

  /** Putter scale (6 / 12 / 25 m) or swing length (full, 3/4, 1/2, 1/4). */
  cycleScale() {
    if (this.state !== 'aim') return;
    if (this.isPutting()) {
      const scales = puttScales(app.settings.units);
      const i = scales.findIndex((v) => Math.abs(v - this.puttScale) < 1e-6);
      this.puttScale = scales[(i + 1) % scales.length];
    } else {
      const i = SWING_SCALES.indexOf(this.swingScale);
      this.swingScale = SWING_SCALES[(i + 1) % SWING_SCALES.length];
    }
    sfx('tick');
    this.updateLanding();
    this.hud.refresh();
  }

  /** Swing button / space / click: start, power, accuracy. The view stays where it is. */
  tap(ts: number) {
    if (this.fading || this.zooming) return;
    if (this.state === 'aim') {
      this.drag = null;
      this.pose = 'address';
      this.updateGolfer();
      this.startMeter(ts);
      return;
    }
    if (this.state === 'swing' && this.meter) {
      const before = this.meter.phase;
      this.meter.tap(ts);
      if (before === 'power' && this.meter.phase === 'accuracy') this.onPowerSet();
      if (this.meter.phase === 'done') this.launch();
    }
  }

  /**
   * Stop a swing in progress and go back to aiming, without a stroke: opening the menu,
   * the map or the card, or leaving the tab, must not let the meter run out behind it
   * (it used to fire a full-power miss).
   */
  cancelSwing() {
    if (this.state !== 'swing') return;
    this.meter = null;
    this.state = 'aim';
    this.pose = 'address';
    this.updateGolfer();
    this.hud.refresh();
  }

  private startMeter(ts: number) {
    const putt = this.isPutting();
    const max = putt || this.swingScale < 1 ? PART_MAX : FULL_MAX;
    this.meter = new SwingMeter(putt ? 'putt' : 'full', this.round.preset.secondsPer100, max, app.settings.latencyMs, this.round.preset.fastSecondsPer100); // the tap counts when it happens (developer: timing it is part of the skill)
    this.meter.tap(ts);
    this.state = 'swing';
    this.hud.refresh();
  }

  private onPowerSet() {
    this.pose = 'backswing';
    this.updateGolfer();
    sfx('tick', 0.6);
  }

  /**
   * Tap 3: the shot is decided. If the golfer is off screen (the player looked
   * elsewhere while swinging) the camera first goes back to him and shows the
   * swing; the ball is struck when it arrives, then followed.
   */
  private launch() {
    const r = this.round;
    const m = this.meter!.result!;
    this.shot = r.plan(this.club.id, this.aim, m, this.spin, this.scaleArg());
    this.sim = r.simulate(this.shot);
    (window as unknown as { __last: unknown }).__last = { shot: this.shot, sim: { landing: this.sim.landing, end: this.sim.end, events: this.sim.events, n: this.sim.n, hitTree: this.sim.hitTree }, meter: m };
    this.state = 'flight';
    this.playT = 0;
    this.evIdx = 0;
    for (const t of this.trail) t.setVisible(false);
    this.trailIdx = 0;
    this.lastTrailI = -999;
    this.landedShown = false;
    this.placeTeeMarkers(false);
    this.setOverlayVisible(false);
    const b0 = this.px(r.ball.x, r.ball.y);
    if (this.inView(b0.x, b0.y, 24)) {
      this.preroll = null;
      this.strike();
    } else {
      this.preroll = { phase: 'pan', t: 0 };
      this.pose = 'address';
      this.updateGolfer();
      const f = this.swingFraming();
      this.rig.target(f.x, f.y, 0.3);
    }
    this.hud.refresh();
  }

  /** Where the camera looks to watch a swing: the golfer, a little toward the shot. */
  private swingFraming(): { x: number; y: number } {
    const b = this.px(this.round.ball.x, this.round.ball.y);
    const ax = Math.cos(this.aim), ay = -Math.sin(this.aim);
    return { x: b.x + ax * this.rig.viewW * 0.22, y: b.y + ay * this.rig.viewH * 0.22 };
  }

  /** Before the ball is struck: pan to the golfer, then the backswing. */
  private stepPreroll(dt: number) {
    const p = this.preroll!;
    p.t += dt;
    if (p.phase === 'pan') {
      const b = this.px(this.round.ball.x, this.round.ball.y);
      if ((this.inView(b.x, b.y, 30) && this.rig.settled(12)) || p.t > 1400) {
        this.preroll = { phase: 'backswing', t: 0 };
        this.pose = 'backswing';
        this.updateGolfer();
      }
    } else if (p.t > 280) {
      this.strike();
    }
  }

  /** The club meets the ball: sound, strike feedback, and the ball starts moving. */
  private strike() {
    const m = this.meter!.result!;
    if (this.isPutting()) {
      sfx('putt');
      this.lastStrikeLabel = '';
      if (this.shot!.putt) this.hud.puttFeedback(this.shot!.putt, m.power);
    } else if (this.shot!.strike) {
      const st = this.shot!.strike;
      sfx('whoosh', 0.7);
      sfx(st.quality === 'perfect' ? 'perfect' : 'strike');
      this.lastStrikeLabel = st.quality;
      this.hud.strikeFeedback(st);
    }
    this.pose = 'impact';
    this.updateGolfer();
    this.time.delayedCall(110, () => { if (this.state === 'flight') { this.pose = this.isPutting() ? 'address' : 'follow'; this.updateGolfer(); } });
    // the camera follows once the ball is on screen, straight away when the view
    // is not looking at where the ball is going
    const b0 = this.px(this.round.ball.x, this.round.ball.y), l0 = this.landingPx();
    this.followArmed = this.inView(b0.x, b0.y, 24) || !this.inView(l0.x, l0.y, 0);
    this.preroll = null;
  }

  fastForward() {
    if (this.state !== 'flight' || !this.sim) return;
    if (this.preroll) this.strike();
    this.playT = Math.max(this.playT, (this.sim.n / HZ) * 1000 - 200);
  }

  // --------------------------------------------------------------- per frame
  update(time: number, dt: number) {
    if (!this.hud || !this.hud.play || this.state === 'done') return;
    const r = this.round;
    // flag waves
    this.flagTimer += dt;
    if (this.flagTimer > 380) { this.flagTimer = 0; this.flagFrame ^= 1; this.flag.setFrame(`flag_${this.flagFrame}`); }

    if (this.state === 'intro' && this.intro) {
      const f = this.intro;
      f.t += Math.min(dt, 50) / 1000;
      const p = flyoverAt(f, f.t);
      this.rig.jump(p.x, p.y);
      if (f.t > f.T + f.hold) this.skipIntro();
    } else if (this.state === 'aim' || this.state === 'swing' || this.state === 'drop' || this.state === 'relief') {
      if (this.state === 'aim' && !this.hud.modalOpen()) this.keyAim(dt);
      if (((this.state === 'aim' && !this.explore) || this.state === 'drop' || this.state === 'relief') && !this.zooming) {
        const f = this.aimFraming();
        this.rig.target(f.x, f.y);
      }
      const now = performance.now();
      if (this.state === 'swing' && this.meter) {
        const before = this.meter.phase;
        this.meter.update(now);
        if (before === 'power' && this.meter.phase === 'accuracy') this.onPowerSet();
        if (this.meter.phase === 'done' && this.state === 'swing') this.launch();
      }
    } else if (this.state === 'flight') {
      if (this.preroll) this.stepPreroll(dt); else this.stepPlayback(dt);
    } else if (this.state === 'settle') {
      if (time > this.holdUntil) this.afterRest();
    }
    if (this.state !== 'intro' && !this.zooming) this.rig.update(dt);
    const cam = this.cameras.main;
    this.view.update(cam, dt);
    // overlays
    if (this.state === 'aim' || this.state === 'swing') this.drawAimOverlay();
    if (this.slopeDirty && this.isPutting() && this.state === 'aim' && !this.zooming) this.drawSlopes();
    // the flag thins out when the ball is near the hole, so ball and cup stay readable
    if (!this.holing && this.state !== 'intro') {
      // putting from within 4 m (or the ball close to the cup on screen): the flag is all but out
      const near = this.ball.visible && ((this.isPutting() && this.round.distToPin() < 4 && this.state !== 'flight')
        || Math.hypot(this.ball.x - this.cup.x, this.ball.y - this.cup.y) * this.level < 16);
      const want = near ? 0.25 : 1;
      if (Math.abs(this.flag.alpha - want) > 0.01) this.flag.setAlpha(this.flag.alpha + (want - this.flag.alpha) * Math.min(1, dt / 120));
    }
    // trees in front of the golfer, the ball and (putting) the hole fade out
    const pts: { x: number; y: number; depth: number }[] = [];
    if (this.golfer.visible) pts.push({ x: this.golfer.x, y: this.golfer.y - 8 / this.level, depth: this.golfer.y });
    if (this.ball.visible && this.ball.depth < DEPTH.flight) pts.push({ x: this.ball.x, y: this.ball.y, depth: this.ball.y });
    if (this.state === 'drop' && this.dropPoint) { const d = this.px(this.dropPoint.x, this.dropPoint.y); pts.push({ x: d.x, y: d.y, depth: d.y }); }
    if (this.green.visible) {
      pts.push({ x: this.cup.x, y: this.cup.y, depth: this.cup.y });
      this.green.fadeOccluders(pts);
    } else this.view.fadeOccluders(pts);
    // off-screen ball arrow for the HUD
    const bp = this.px(r.ball.x, r.ball.y);
    const v = cam.worldView;
    this.ballOffscreen = (this.state === 'aim' && (bp.x < v.x || bp.x > v.right || bp.y < v.y || bp.y > v.bottom)) ? bp : null;
    this.hud.tick();
  }

  private keyAim(dt: number) {
    const k = this.keys;
    const left = k.LEFT.isDown || k.A.isDown;
    const right = k.RIGHT.isDown || k.D.isDown;
    if (left === right) return;
    const key = left ? (k.LEFT.isDown ? k.LEFT : k.A) : (k.RIGHT.isDown ? k.RIGHT : k.D);
    this.aimHold(left ? 1 : -1, key.getDuration(), dt, k.SHIFT.isDown);
  }

  /** Spec 10.3: frame ball and target; if they don't fit, look at the target. */
  private aimFraming(): { x: number; y: number } {
    const r = this.round;
    const b = this.px(r.ball.x, r.ball.y);
    const L = this.level;
    if (this.state === 'drop' && this.reliefArea) {
      const at = this.dropPoint ?? this.reliefArea.center;
      return this.px(at.x, at.y);
    }
    const vw = this.rig.viewW, vh = this.rig.viewH;
    if (this.isPutting()) {
      const pin = this.px(r.pin.x, r.pin.y);
      const mx = 44 / L, my = 70 / L; // keep clear of the HUD at the edges
      const fits = Math.abs(pin.x - b.x) < vw - 2 * mx && Math.abs(pin.y - b.y) < vh - 2 * my;
      if (fits) return { x: (b.x + pin.x) / 2, y: (b.y + pin.y) / 2 };
      // a long putt: keep the ball near the edge and look toward the hole
      const d = Math.hypot(pin.x - b.x, pin.y - b.y) || 1;
      const ux = (pin.x - b.x) / d, uy = (pin.y - b.y) / d;
      const reach = Math.min(Math.abs((vw / 2 - mx) / (ux || 1e-6)), Math.abs((vh / 2 - my) / (uy || 1e-6)));
      return { x: b.x + ux * reach, y: b.y + uy * reach };
    }
    const m = this.landingPx();
    const fitsX = Math.abs(m.x - b.x) < vw - 70 / L;
    const fitsY = Math.abs(m.y - b.y) < vh - 90 / L;
    if (fitsX && fitsY) return { x: (b.x + m.x) / 2, y: (b.y + m.y) / 2 - 6 / L };
    return { x: m.x, y: m.y };
  }

  /** Is a world-pixel point inside the current view, at least `margin` texels from its edges? */
  private inView(x: number, y: number, margin: number): boolean {
    const c = this.rig.clamp(this.rig.x, this.rig.y);
    const m = margin / this.level;
    return Math.abs(x - c.x) < this.rig.viewW / 2 - m && Math.abs(y - c.y) < this.rig.viewH / 2 - m;
  }

  private updateLanding() {
    this.landing = this.round.previewLanding(this.club, this.aim, this.isPutting() ? 1 : this.swingScale);
  }

  landingPx(): { x: number; y: number } {
    return this.px(this.landing.x, this.landing.y);
  }

  /** Half the drawn cup's width in texels: true to scale in the close-up, enlarged further out. */
  private cupDrawR(): number {
    return this.green.layer === 'close' ? 2 : 3.5;
  }

  /** Metres around the hole kept free of slope marks and meter ticks (putting view). */
  private holeClearM(): number {
    return this.green.visible ? Math.max(2 * this.cupDrawR() / (this.level * PX_PER_M), 0.6) : 0;
  }

  /** The draggable end of the aim line: landing marker, or the end of the putt line past the hole. */
  private handlePx(): { x: number; y: number } {
    const r = this.round;
    if (!this.isPutting()) return this.landingPx();
    const d = this.puttLineM();
    return this.px(r.ball.x + Math.cos(this.aim) * d, r.ball.y + Math.sin(this.aim) * d);
  }

  /** Length of the dotted putt line: a little past the hole. */
  private puttLineM(): number {
    const hole = this.round.distToPin();
    return hole + Math.max(1.0, hole * 0.15);
  }

  private snap(v: number): number {
    return Math.round(v * this.level) / this.level;
  }

  private drawAimOverlay() {
    const r = this.round;
    const b = this.px(r.ball.x, r.ball.y);
    const putt = this.isPutting();
    const L = this.level;
    const preview = r.preset.landingPreview;
    let n = 0;
    let used = 0;
    if (putt) {
      // putt: a dotted line from the ball to a little past the hole (kept off the
      // drawn cup), and orange ticks at 25 / 50 / 75 / 100 % of the meter
      // (flat-green distances) away from the hole
      this.marker.setVisible(false);
      this.puttTarget.setVisible(false);
      const lineM = this.puttLineM();
      const step = 3 / L / PX_PER_M; // metres between dots (3 texels)
      const cupClear = (this.cupDrawR() + 1.5) / L; // world px around the drawn cup kept free of dots
      const c = this.px(r.pin.x, r.pin.y);
      const bwp = this.px(r.ball.x, r.ball.y);
      const bm = { x: r.ball.x, y: r.ball.y };
      for (let sM = 3 / L / PX_PER_M + 0.12; sM < lineM && n < this.dots.length; sM += step) {
        const q = this.px(bm.x + Math.cos(this.aim) * sM, bm.y + Math.sin(this.aim) * sM);
        if (Math.hypot(q.x - c.x, q.y - c.y) < cupClear) continue;
        if (Math.hypot(q.x - bwp.x, q.y - bwp.y) < 2.5 / L) continue;
        this.dots[n++].setVisible(true).setPosition(this.snap(q.x), this.snap(q.y));
      }
      const clearM = this.holeClearM();
      for (const f of [0.25, 0.5, 0.75, 1]) {
        const dM = this.puttScale * f;
        if (used >= this.ticks.length) break;
        const t = this.ticks[used++];
        const tx = bm.x + Math.cos(this.aim) * dM, ty = bm.y + Math.sin(this.aim) * dM;
        // only up to one mark past the line's end, and never on top of the hole
        if (dM > lineM + this.puttScale * 0.25 || Math.hypot(tx - r.pin.x, ty - r.pin.y) < Math.max(0.5, clearM)) { t.setVisible(false); continue; }
        const q = this.px(tx, ty);
        t.setVisible(true).setPosition(this.snap(q.x), this.snap(q.y));
      }
    } else {
      this.puttTarget.setVisible(false);
      const m = this.landingPx();
      this.marker.setFrame('landing').setVisible(preview);
      this.marker.setPosition(this.snap(m.x), this.snap(m.y));
      // dotted line; on Pro (no landing preview) only the first part is shown
      const len = Math.hypot(m.x - b.x, m.y - b.y);
      const shown = preview ? len - 6 / L : Math.min(len, 36 / L);
      const step = 7 / L;
      const dx = (m.x - b.x) / (len || 1), dy = (m.y - b.y) / (len || 1);
      for (let s = step; s < shown && n < this.dots.length; s += step) {
        this.dots[n++].setVisible(true).setPosition(this.snap(b.x + dx * s), this.snap(b.y + dy * s));
      }
    }
    for (let i = n; i < this.dots.length; i++) this.dots[i].setVisible(false);
    for (let i = used; i < this.ticks.length; i++) this.ticks[i].setVisible(false);
  }

  private setOverlayVisible(on: boolean) {
    if (!on) {
      this.marker.setVisible(false);
      this.puttTarget.setVisible(false);
      for (const d of this.dots) d.setVisible(false);
      for (const t of this.ticks) t.setVisible(false);
    }
    if (!on && !this.isPutting()) this.slopeLayer.clear();
  }

  /** Slope chevrons on the putting surface (spec 7.6): darker to brighter for <1 %, 1-2 %, >2 %. */
  private drawSlopes() {
    this.slopeDirty = false;
    const g = this.slopeLayer;
    g.clear();
    const r = this.round;
    const t = app.course!.terrain;
    const green = t.greens.find((gm) => gm.def.id === r.hole.greenId);
    if (!green || !this.isPutting()) return;
    const poly = green.poly;
    const L = this.level;
    const cols = [0xe6f6da, 0xf4efa6, 0xf7c487];
    const alphas = [0.32, 0.46, 0.62];
    // one chevron every 8 texels of the current view (0.7 m apart at most; rows staggered), each a 3 x 3 texel mark
    const step = Math.max(8 / L, 1.4) / PX_PER_M; // in the close-up no denser than ~0.7 m
    const u = 1 / L; // one texel in world px
    const clearR = Math.max(this.holeClearM(), 0.6);
    let row = 0;
    for (let y = Math.ceil(poly.minY / step) * step; y <= poly.maxY; y += step, row++) {
      const shift = (row % 2) * step / 2;
      for (let x = Math.ceil(poly.minX / step) * step + shift; x <= poly.maxX; x += step) {
        if (!poly.contains(x, y)) continue;
        if (Math.hypot(x - r.pin.x, y - r.pin.y) < clearR) continue; // keep the hole area clean
        const [gx, gy] = t.grad(x, y, 0.3);
        const sl = Math.hypot(gx, gy);
        const lv = sl < 0.01 ? 0 : sl < 0.02 ? 1 : 2;
        const ang = Math.atan2(-gy, -gx); // downhill
        const oct = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
        const p = this.px(x, y);
        g.fillStyle(cols[lv], alphas[lv]);
        const cx = this.snap(p.x), cy = this.snap(p.y);
        for (const [dx, dy] of CHEVRONS[oct]) g.fillRect(cx + dx * u, cy + dy * u, u, u);
      }
    }
  }

  private stepPlayback(dt: number) {
    const sim = this.sim!;
    const putt = this.isPutting();
    const landT = sim.landing ? sim.landing.t * 1000 : 0;
    const total = (sim.n / HZ) * 1000;
    const remaining = total - this.playT;
    // the flight plays a little faster than real time; long roll-outs ease up to 1.7x (putts: real time)
    let speed = 1;
    if (!putt && this.playT < landT) speed = FLIGHT_PLAYBACK;
    else if (!putt) speed = 1 + 0.7 * smoothstep(1500, 3500, remaining);
    this.playT += Math.min(dt, 50) * speed;
    const fi = Math.min(sim.n - 1, (this.playT / 1000) * HZ);
    const i = Math.floor(fi), j = Math.min(sim.n - 1, i + 1), f = fi - i;
    const S = sim.samples;
    const x = S[i * 3] + (S[j * 3] - S[i * 3]) * f;
    const y = S[i * 3 + 1] + (S[j * 3 + 1] - S[i * 3 + 1]) * f;
    const z = S[i * 3 + 2] + (S[j * 3 + 2] - S[i * 3 + 2]) * f;
    const ground = app.course!.terrain.z(x, y);
    const hag = Math.max(0, z - ground);
    this.updateBallSprite(x, y, hag);
    // a faint dotted trail of the flight (helps read the curve)
    if (hag > 0.6 && i - this.lastTrailI >= 9) {
      this.lastTrailI = i;
      const dot = this.trail[this.trailIdx++ % this.trail.length];
      dot.setPosition(this.ball.x, this.ball.y).setVisible(true).setAlpha(0.6);
    }
    // events -> sounds
    while (this.evIdx < sim.events.length && sim.events[this.evIdx].t * 1000 <= this.playT) {
      this.onSimEvent(sim.events[this.evIdx]);
      this.evIdx++;
    }
    // camera
    const bx = this.ball.x, by = this.ball.y;
    if (this.green.visible || putt) {
      // putting: the view stays still unless the ball heads for its edge
      const vw = this.rig.viewW, vh = this.rig.viewH, m = 36 / this.level;
      const c = this.rig.clamp(this.rig.x, this.rig.y);
      if (Math.abs(bx - c.x) > vw / 2 - m || Math.abs(by - c.y) > vh / 2 - m) this.rig.target(bx, by, 0.6);
    } else {
      // the view holds until the ball comes into it (or lands), then follows with a look-ahead
      if (!this.followArmed && (this.inView(bx, by, 24) || this.playT >= landT)) this.followArmed = true;
      if (this.followArmed) {
        const k = Math.min(sim.n - 1, i + 40);
        const a = this.px(S[k * 3], S[k * 3 + 1]);
        this.rig.target(bx + (a.x - bx) * 0.6, by + (a.y - by) * 0.6, 0.28);
      }
    }
    if (fi >= sim.n - 1) {
      this.state = 'settle';
      this.holdUntil = this.time.now + (sim.holed ? 1100 : 650);
      if (this.pose !== 'idle') { this.pose = 'idle'; this.updateGolfer(); }
    }
  }

  private onSimEvent(e: SimEvent) {
    switch (e.type) {
      case 'land':
        if (e.surf === SURF.bunker) sfx('sand'); else if (e.surf === SURF.water || e.surf === SURF.obWater) { /* splash event follows */ } else sfx('thud', 0.8);
        if (!this.landedShown && this.shot?.strike) {
          this.landedShown = true;
          this.hud.carryInfo(this.round.ball, e);
        }
        if (!this.isPutting() && this.pose !== 'idle') { this.pose = 'idle'; this.updateGolfer(); }
        break;
      case 'bounce': if (e.surf !== SURF.green) sfx('thud', 0.35, 1.2); break;
      case 'canopy': sfx('wood', 0.8, 1.3); break;
      case 'trunk': sfx('wood'); break;
      case 'wall': sfx('thud', 0.9, 0.7); break;
      case 'splash': sfx('splash'); this.splashFx(e.x, e.y); break;
      case 'holed': this.holeOutFx(); break;
      case 'lipout': sfx('tick', 0.7, 0.8); break;
      default: break;
    }
  }

  /** The ball drops into the cup: it slides to the centre and sinks, the flag jumps, a ring pops. */
  private holeOutFx() {
    sfx('cup');
    const r = this.round;
    const c = this.px(r.pin.x, r.pin.y);
    const L = this.level;
    this.holing = true;
    this.shadow.setVisible(false);
    this.ball.setDepth(DEPTH.ground + 1.5);
    const s0 = this.ball.scale;
    this.tweens.add({
      targets: this.ball, x: c.x, y: c.y + 0.5 / L, duration: 90, ease: 'Quad.easeIn',
      onComplete: () => {
        // sink: the ball shrinks into the hole and stays there, half lit
        this.tweens.add({ targets: this.ball, scale: s0 * 0.55, alpha: 0.75, y: c.y + 1 / L, duration: 220, ease: 'Quad.easeIn' });
      },
    });
    const ring = this.add.circle(c.x, c.y, 2 / L, 0xffffff, 0).setStrokeStyle(1 / L, 0xffffff, 0.95).setDepth(DEPTH.overlay);
    this.tweens.add({ targets: ring, radius: 16 / L, alpha: 0, duration: 700, delay: 140, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    const fy = this.flag.y;
    this.flag.setAlpha(1);
    this.tweens.add({ targets: this.flag, y: fy - 3 / L, duration: 110, yoyo: true, ease: 'Quad.easeOut', delay: 120 });
    this.hud.flash('in the hole!', COLORS.yellow, '', 1000);
  }

  private splashFx(x: number, y: number) {
    const p = this.px(x, y);
    const L = this.level;
    const ring = this.add.circle(p.x, p.y, 2 / L, 0xffffff, 0).setStrokeStyle(1 / L, 0xdbeeff, 0.9).setDepth(DEPTH.ground + 5);
    this.tweens.add({ targets: ring, radius: 7 / L, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
    this.ball.setVisible(false);
    this.shadow.setVisible(false);
  }

  /** After the ball comes to rest: apply the rules and decide what is next. */
  private afterRest() {
    const r = this.round;
    const out = r.resolve(this.shot!, this.sim!);
    this.outcome = out;
    switch (out.kind) {
      case 'holed':
      case 'gimme': {
        // a holed ball stays in the cup; a conceded one is picked up
        if (out.kind === 'gimme') this.ball.setVisible(false);
        this.shadow.setVisible(false);
        const score = r.finishHole();
        this.state = 'holed';
        this.hud.showHoled(score, out.kind === 'gimme');
        void saveSnapshot(r);
        void reportEagle(r, score); // on the recent eagles list straight away, round finished or not
        break;
      }
      case 'max_score': {
        const score = r.finishHole(true);
        this.state = 'holed';
        this.hud.showHoled(score, false, true);
        void saveSnapshot(r);
        break;
      }
      case 'water':
        this.hud.flash(out.penalty === 'red' ? 'penalty area' : 'water hazard', 0x7cc0ff);
        this.openRelief(out.options, false, 'in the water: 1 penalty stroke');
        break;
      case 'ob':
        this.hud.flash('out of bounds', 0xffffff);
        if (out.options.length === 1) {
          this.openRelief(out.options, false, 'out of bounds: stroke and distance');
        } else this.openRelief(out.options, false, 'out of bounds');
        break;
      case 'wrong_green':
        this.hud.flash('wrong green', 0xffd84a);
        this.openRelief([out.area], false, 'wrong green: free relief is required');
        break;
      case 'cartpath':
        this.openRelief([out.area], true, 'on the cart path: free relief available');
        break;
      default:
        this.hud.restInfo();
        this.beginShot(true);
    }
  }

  // --------------------------------------------------------------- relief
  openRelief(options: ReliefArea[], optional: boolean, title: string) {
    this.state = 'relief';
    this.reliefOptions = options;
    this.reliefOptional = optional;
    this.updateBallSprite(this.round.ball.x, this.round.ball.y, 0);
    this.hud.showRelief(title, options, optional);
  }

  chooseRelief(i: number) {
    if (this.fading || this.zooming) return;
    const a = this.reliefOptions[i];
    if (!a) return;
    if (a.shape === 'point') {
      this.round.applyRelief(a, a.center);
      this.hud.hideRelief();
      this.hud.flash(a.penalty ? `+${a.penalty} penalty` : 'free relief', 0xffd84a);
      this.beginShot(false);
      return;
    }
    const sug = this.round.validDrop(a, a.center) ? a.center : suggestFrom(this.round, a);
    if (!sug) {
      this.hud.flash('no valid drop spot', 0xff6a5a);
      return;
    }
    this.reliefArea = a;
    this.dropPoint = sug;
    this.state = 'drop';
    const go = () => {
      this.applyView(null, DROP);
      const d = this.px(sug.x, sug.y);
      this.rig.jump(d.x, d.y);
      this.drawRelief();
    };
    if (this.green.visible || this.level !== DROP) this.cut(go); else go();
    this.hud.showDrop(a);
  }

  playAsItLies() {
    this.hud.hideRelief();
    this.reliefArea = null;
    this.round.refreshLie();
    this.beginShot(false);
  }

  private pickDrop(p: Phaser.Input.Pointer) {
    if (!this.reliefArea) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const H = app.course!.json.world.height;
    const pt = { x: w.x / PX_PER_M, y: H - w.y / PX_PER_M };
    if (this.round.validDrop(this.reliefArea, pt)) {
      this.dropPoint = pt;
      sfx('tick');
      this.drawRelief();
    } else {
      sfx('back');
      this.hud.flash('not a valid drop spot', 0xff6a5a);
    }
  }

  confirmDrop() {
    if (this.state !== 'drop' || !this.reliefArea || !this.dropPoint || this.fading || this.zooming) return;
    const a = this.reliefArea;
    this.round.applyRelief(a, this.dropPoint);
    this.reliefGfx.clear();
    this.dropMarker.setVisible(false);
    this.reliefArea = null;
    this.hud.hideRelief();
    this.hud.flash(a.penalty ? `dropped: +${a.penalty} penalty` : 'dropped: free relief', 0xffd84a);
    this.beginShot(false);
  }

  cancelDrop() {
    if (this.state !== 'drop') return;
    this.reliefGfx.clear();
    this.dropMarker.setVisible(false);
    this.reliefArea = null;
    this.state = 'relief';
    this.hud.showRelief(this.hud.reliefTitle, this.reliefOptions, this.reliefOptional);
  }

  takeMulligan() {
    if (this.state !== 'aim') return;
    if (this.round.mulligan()) {
      this.hud.flash('mulligan', 0xffd84a, 'replaying the last shot');
      this.beginShot(false);
    }
  }

  openUnplayable() {
    if (this.state !== 'aim') return;
    const s = this.round.surfaceAt();
    if (s === SURF.water) return;
    this.openRelief(this.round.unplayable(), true, 'unplayable: 1 penalty stroke');
  }

  private drawRelief() {
    const g = this.reliefGfx;
    g.clear();
    const a = this.reliefArea;
    if (!a) return;
    const r = this.round;
    // shade the valid area on a 0.25 m lattice
    const pts: { x: number; y: number }[] = [];
    if (a.shape === 'circle') {
      for (let y = -a.radius; y <= a.radius; y += 0.25) for (let x = -a.radius; x <= a.radius; x += 0.25) pts.push({ x: a.center.x + x, y: a.center.y + y });
    } else if (a.shape === 'line') {
      const d = a.dir!;
      for (let s = 0; s < 40; s += 0.25) for (let o = -a.radius; o <= a.radius; o += 0.25) pts.push({ x: a.center.x + d.x * s - d.y * o, y: a.center.y + d.y * s + d.x * o });
    }
    g.fillStyle(0xfff2a8, 0.55);
    for (const p of pts) {
      if (!r.validDrop(a, p)) continue;
      const q = this.px(p.x, p.y);
      g.fillRect(Math.round(q.x * 2) / 2, Math.round(q.y * 2) / 2, 0.5, 0.5);
    }
    if (a.shape === 'circle') {
      const c = this.px(a.center.x, a.center.y);
      g.lineStyle(0.5, 0xffffff, 0.9);
      g.strokeCircle(Math.round(c.x * 2) / 2, Math.round(c.y * 2) / 2, a.radius * PX_PER_M);
    }
    if (this.dropPoint) {
      const d = this.px(this.dropPoint.x, this.dropPoint.y);
      this.dropMarker.setVisible(true).setPosition(this.snap(d.x), this.snap(d.y));
    }
  }

  // --------------------------------------------------------------- sprites
  px(x: number, y: number) {
    return { x: x * PX_PER_M, y: (app.course!.json.world.height - y) * PX_PER_M };
  }

  private placePin() {
    const r = this.round;
    const p = this.px(r.pin.x, r.pin.y);
    const cx = this.snap(p.x), cy = this.snap(p.y);
    this.cup.setPosition(cx, cy);
    this.flag.setPosition(cx, cy + 0.5 / this.level).setDepth(cy).setVisible(true).setAlpha(1);
  }

  private placeTeeMarkers(show: boolean) {
    const r = this.round;
    const t = r.tee;
    const line = t.centerline;
    const dx = line[1][0] - line[0][0], dy = line[1][1] - line[0][1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 2.6 : -2.6;
      const p = this.px(t.x + nx * s + (dx / L) * 1.2, t.y + ny * s + (dy / L) * 1.2);
      this.teeMarkers[i].setPosition(Math.round(p.x), Math.round(p.y)).setDepth(p.y).setVisible(show && this.level === COURSE);
    }
  }

  private resetBallSprite() {
    this.tweens.killTweensOf(this.ball);
    this.holing = false;
    this.ball.setScale(1 / this.level).setAlpha(1);
  }

  updateBallSprite(x: number, y: number, hag: number) {
    if (this.holing) return;
    const p = hag < 0.3 ? this.px(x, y) : this.px(x, y);
    const lift = hag * HEIGHT_PX;
    this.ball.setVisible(!this.ballHidden);
    this.shadow.setVisible(!this.ballHidden && hag > 0.05);
    // the ball reads bigger as it climbs toward the camera (and gets an outline)
    const frame = this.green.visible && hag < 0.3 ? 'ball_big' : hag < 3 ? 'ball' : hag < 14 ? 'ball_air3' : 'ball_air4';
    if (this.ball.frame.name !== frame) this.ball.setFrame(frame);
    this.shadow.setFrame(hag > 14 ? 'ball_shadow2' : hag > 3 ? 'ball_shadow3' : 'ball_shadow');
    // positions are not rounded: the ball moves in device pixels, not texels
    this.ball.setPosition(p.x, p.y - lift);
    this.shadow.setPosition(p.x, p.y + 0.5 / this.level);
    this.ball.setDepth(hag > 0.3 ? DEPTH.flight : p.y + 0.5);
    if (this.state === 'aim' || this.state === 'swing' || this.state === 'intro') this.ball.setDepth(DEPTH.overlay - 1);
  }

  updateGolfer() {
    const r = this.round;
    const lefty = r.cfg.settings.lefty;   // the round's hand, not the live setting
    // facing = aim rotated -90deg (right-hander) or +90deg (left-hander)
    const f = this.aim + (lefty ? Math.PI / 2 : -Math.PI / 2);
    const fx = Math.cos(f), fy = Math.sin(f);
    let facing: Facing, flip = false;
    if (Math.abs(fx) >= Math.abs(fy)) { facing = 'side'; flip = fx < 0; } else { facing = fy < 0 ? 'front' : 'back'; flip = lefty; }
    const pose = this.isPutting() && this.pose === 'backswing' ? 'putt' : this.isPutting() && this.pose === 'follow' ? 'address' : this.pose;
    this.golfer.setFrame(`golfer_${facing}_${pose}`);
    this.golfer.setFlipX(flip);
    const b = this.px(r.ball.x, r.ball.y);
    // sprite canvas is 20 x 22 (18 x 20 + outline); feet at (9, 20)
    let ox = 0, oy = 0;
    if (facing === 'side') { ox = flip ? 7 : -7; oy = 0; }
    else if (facing === 'front') { ox = 0; oy = -3; }
    else { ox = 0; oy = 4; }
    const L = this.level;
    const feetX = this.snap(b.x + ox / L), feetY = this.snap(b.y + oy / L);
    this.golfer.setPosition(feetX, feetY);
    this.golfer.setDepth(feetY);
    // seen from behind, the golfer covers the ball: see through him while lining up a putt
    const lining = this.green.visible && this.isPutting() && facing === 'back' && (this.state === 'aim' || this.state === 'swing');
    this.golfer.setAlpha(lining ? 0.45 : 1);
    this.golfer.setVisible(true);
  }
}

// ------------------------------------------------------------------ helpers

function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Fly-over along the hole: the centre line with its corners rounded off (Chaikin). */
function makeFlyover(line: { x: number; y: number }[]): Flyover {
  let pts = line.slice();
  for (let k = 0; k < 4 && pts.length > 2; k++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = cum[cum.length - 1];
  const vmax = 150; // world px per second at cruise (75 m/s)
  const ta = 0.9;   // seconds to speed up / slow down
  const T = Math.min(7.5, Math.max(2.8, len / vmax + ta));
  return { pts, cum, len, T, ta, t: 0, hold: 0.7 };
}

/** Position along the fly-over at time t: speed up, cruise, slow down. */
function flyoverAt(f: Flyover, t: number): { x: number; y: number } {
  const T = f.T, ta = Math.min(f.ta, T / 2);
  const v = f.len / Math.max(0.001, T - ta);
  let s: number;
  if (t <= 0) s = 0;
  else if (t < ta) s = 0.5 * (v / ta) * t * t;
  else if (t < T - ta) s = 0.5 * v * ta + v * (t - ta);
  else if (t < T) { const rr = T - t; s = f.len - 0.5 * (v / ta) * rr * rr; }
  else s = f.len;
  let i = 1;
  while (i < f.cum.length - 1 && f.cum[i] < s) i++;
  const a = f.pts[i - 1], b = f.pts[i];
  const seg = f.cum[i] - f.cum[i - 1] || 1;
  const u = Math.min(1, Math.max(0, (s - f.cum[i - 1]) / seg));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function suggestFrom(round: Round, a: ReliefArea) {
  // nearest valid spot: rings around the anchor
  for (let rad = 0; rad <= Math.max(a.radius, 0.1) + (a.shape === 'line' ? 60 : 0); rad += 0.2) {
    const n = Math.max(1, Math.ceil(rad * 12));
    for (let k = 0; k < n; k++) {
      const th = (2 * Math.PI * k) / n;
      let p = { x: a.center.x + Math.cos(th) * rad, y: a.center.y + Math.sin(th) * rad };
      if (a.shape === 'line') p = { x: a.center.x + a.dir!.x * rad, y: a.center.y + a.dir!.y * rad };
      if (round.validDrop(a, p)) return p;
    }
  }
  return null;
}

const CHEVRONS: number[][][] = [
  [[0, -1], [1, 0], [0, 1]],          // E  (>)
  [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]], // NE
  [[-1, 0], [0, -1], [1, 0]],          // N (^)
  [[-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], // NW
  [[0, -1], [-1, 0], [0, 1]],          // W (<)
  [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]],   // SW
  [[-1, 0], [0, 1], [1, 0]],           // S (v)
  [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]],     // SE
];

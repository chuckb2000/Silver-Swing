// Watch a hole-out from the leaderboard's "hole-outs" list again (developer, 2026-10-26): the
// course it was holed on, the golfer at the spot it was played from, and its flight as the
// player's game simulated it (systems/match/path.ts), at playing speed and then its end in
// slow motion. The leaderboard loads the course first (watchHoleout below).

import Phaser from 'phaser';
import { app, HEIGHT_PX, PX_PER_M } from '../app';
import { initAudio, sfx } from '../audio/sfx';
import { loadCourse } from '../data/courses';
import { holeOutDistance, HoleOut } from '../save/holeouts';
import { listName } from '../save/milestones';
import { centerSnapped, uiCamera, worldCamera } from '../scale';
import { decodePath } from '../systems/match/path';
import { HZ, SimEvent, SimResult } from '../systems/physics/sim';
import { SURF } from '../systems/physics/surfaces';
import { CourseView, DEPTH } from '../ui/courseView';
import { Button, COLORS, Panel, txt } from '../ui/widgets';
import { charTex, onSnow } from '../ui/holidayArt';

const SLOW = 0.35;
const SLOW_MS = 2600;
const FLIGHT_SPEED = 1.3;

/** The playback's state at a time: where the ball is and how high. Pure, for tests. */
export function ballAt(sim: SimResult, playT: number): { x: number; y: number; z: number; i: number; done: boolean } {
  const fi = Math.min(sim.n - 1, (playT / 1000) * HZ);
  const i = Math.floor(fi), j = Math.min(sim.n - 1, i + 1), f = fi - i;
  const S = sim.samples;
  return {
    x: S[i * 3] + (S[j * 3] - S[i * 3]) * f,
    y: S[i * 3 + 1] + (S[j * 3 + 1] - S[i * 3 + 1]) * f,
    z: S[i * 3 + 2] + (S[j * 3 + 2] - S[i * 3 + 2]) * f,
    i, done: fi >= sim.n - 1,
  };
}

/**
 * Open a hole-out's replay from a menu scene: the course is loaded (the menu's backdrop is
 * stopped while it changes), then the replay plays, then `back` reopens.
 */
export async function watchHoleout(scene: Phaser.Scene, h: HoleOut, back: string): Promise<boolean> {
  const sim = h.path ? decodePath(h.path) : null;
  if (!sim || !app.courses.some((c) => c.id === h.course)) return false;
  if (app.course?.json.id !== h.course) {
    scene.scene.stop('bg');
    for (let i = 0; i < 60 && scene.scene.isActive('bg'); i++) await new Promise((r) => requestAnimationFrame(r));
    await loadCourse(scene, h.course); // not remembered as the last course played
  }
  scene.scene.start('replay', { h, sim, back });
  return true;
}

export class ReplayScene extends Phaser.Scene {
  private view!: CourseView;
  private sim!: SimResult;
  private h!: HoleOut;
  private back = 'leaderboard';
  private ball!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private flag!: Phaser.GameObjects.Sprite;
  private pass: 1 | 2 | 0 = 0;
  private playT = 0;
  private evIdx = 0;
  private holdUntil = 0;
  private sunk = false;
  private flagT = 0;
  private flagFrame = 0;
  private landT = 0;
  private camX = 0;
  private camY = 0;
  private pin = { x: 0, y: 0 };

  constructor() {
    super('replay');
  }

  create(data: { h: HoleOut; sim: SimResult; back?: string }) {
    const course = app.course!;
    this.h = data.h;
    this.sim = data.sim;
    this.back = data.back ?? 'leaderboard';
    this.pass = 0;
    const cam = this.cameras.main;
    worldCamera(cam);
    cam.setBackgroundColor('#20381f');
    this.view = new CourseView(this, course);
    // the cup is where the ball dropped
    this.pin = { x: this.sim.end.x, y: this.sim.end.y };
    const holed = this.sim.events.find((e) => e.type === 'holed');
    if (holed) this.pin = { x: holed.x, y: holed.y };
    const c = this.px(this.pin.x, this.pin.y);
    this.add.image(Math.round(c.x), Math.round(c.y), 'ui', 'cup').setDepth(DEPTH.ground + 1);
    this.flag = this.add.sprite(Math.round(c.x), Math.round(c.y) + 0.5, charTex(this, 'flag_0'), 'flag_0').setOrigin(0.25, 1).setDepth(c.y);
    this.shadow = this.add.image(0, 0, 'ui', 'ball_shadow').setDepth(DEPTH.shadow);
    this.ball = this.add.image(0, 0, 'ui', 'ball');
    // the golfer at the spot, after the swing, facing along the shot
    const S = this.sim.samples;
    const from = { x: S[0], y: S[1] };
    const k = Math.min(this.sim.n - 1, 30);
    const aim = Math.atan2(S[k * 3 + 1] - from.y, S[k * 3] - from.x);
    this.placeGolfer(from, aim);
    this.landT = this.sim.landing ? this.sim.landing.t * 1000 : 0;
    const p = this.px(from.x, from.y);
    this.camX = p.x; this.camY = p.y;
    centerSnapped(cam, p.x, p.y);
    const onResize = () => worldCamera(this.cameras.main);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.input.on('pointerdown', () => { void initAudio(); });
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.scene.launch('replayHud', { scene: this, h: this.h });
    this.events.once('shutdown', () => this.scene.stop('replayHud'));
    cam.fadeIn(300, 8, 16, 24);
    this.time.delayedCall(450, () => this.start(1));
  }

  px(x: number, y: number) {
    return { x: x * PX_PER_M, y: (app.course!.json.world.height - y) * PX_PER_M };
  }

  private placeGolfer(at: { x: number; y: number }, aim: number) {
    const f = aim - Math.PI / 2; // a right-hander stands left of the line
    const fx = Math.cos(f), fy = Math.sin(f);
    let facing: string, flip = false;
    if (Math.abs(fx) >= Math.abs(fy)) { facing = 'side'; flip = fx < 0; } else facing = fy < 0 ? 'front' : 'back';
    const b = this.px(at.x, at.y);
    const ox = facing === 'side' ? (flip ? 7 : -7) : 0, oy = facing === 'front' ? -3 : facing === 'back' ? 4 : 0;
    const putter = this.h.club.toLowerCase().includes('putter');
    const g = this.add.image(Math.round(b.x + ox), Math.round(b.y + oy), charTex(this, 'golfer_side_idle'), `golfer_${facing}_${putter ? 'address' : 'follow'}`)
      .setOrigin(9 / 20, 20 / 22).setFlipX(flip);
    g.setDepth(g.y);
  }

  /** Play from the start (pass 1) or the end in slow motion (pass 2). */
  start(pass: 1 | 2) {
    this.pass = pass;
    const total = (this.sim.n / HZ) * 1000;
    this.playT = pass === 1 ? 0 : Math.max(0, total - SLOW_MS);
    this.evIdx = 0;
    while (this.evIdx < this.sim.events.length && this.sim.events[this.evIdx].t * 1000 <= this.playT) this.evIdx++;
    this.holdUntil = Number.POSITIVE_INFINITY;
    this.sunk = false;
    this.tweens.killTweensOf(this.ball);
    this.ball.setScale(1).setAlpha(1).setVisible(true);
    this.draw(ballAt(this.sim, this.playT));
    if (pass === 2) {
      const b = ballAt(this.sim, this.playT);
      const p = this.px(b.x, b.y);
      this.camX = p.x; this.camY = p.y;
    }
    (this.scene.get('replayHud') as ReplayHudScene | undefined)?.status(pass === 1 ? '' : 'slow motion');
  }

  /** Watch it again from the start. */
  again() { this.start(1); }

  close() {
    this.cameras.main.fadeOut(250, 8, 16, 24);
    this.time.delayedCall(260, () => this.scene.start(this.back));
  }

  private draw(b: { x: number; y: number; z: number }) {
    if (this.sunk) return;
    const hag = Math.max(0, b.z - app.course!.terrain.z(b.x, b.y));
    const p = this.px(b.x, b.y);
    const frame = hag < 3 ? (onSnow(app.course, b.x, b.y) ? 'ball_snow' : 'ball') : hag < 14 ? 'ball_air3' : 'ball_air4';
    if (this.ball.frame.name !== frame) this.ball.setFrame(frame);
    this.shadow.setFrame(hag > 14 ? 'ball_shadow2' : hag > 3 ? 'ball_shadow3' : 'ball_shadow');
    this.ball.setPosition(p.x, p.y - hag * HEIGHT_PX).setDepth(hag > 0.3 ? DEPTH.flight : p.y + 0.5);
    this.shadow.setPosition(p.x, p.y + 0.5).setVisible(hag > 0.05);
  }

  private onEvent(e: SimEvent) {
    switch (e.type) {
      case 'land': if (e.surf === SURF.bunker || e.surf === SURF.waste) sfx('sand'); else sfx('thud', 0.8); break;
      case 'bounce': if (e.surf !== SURF.green) sfx('thud', 0.35, 1.2); break;
      case 'canopy': sfx('wood', 0.8, 1.3); break;
      case 'trunk': sfx('wood'); break;
      case 'lipout': sfx('tick', 0.7, 0.8); break;
      case 'holed': this.sink(); break;
      default: break;
    }
  }

  private sink() {
    sfx('cup');
    const c = this.px(this.pin.x, this.pin.y);
    this.sunk = true;
    this.shadow.setVisible(false);
    this.ball.setDepth(DEPTH.ground + 1.5);
    this.tweens.add({
      targets: this.ball, x: c.x, y: c.y + 0.5, duration: 90, ease: 'Quad.easeIn',
      onComplete: () => this.tweens.add({ targets: this.ball, scale: 0.55, alpha: 0.75, y: c.y + 1, duration: 220, ease: 'Quad.easeIn' }),
    });
    const ring = this.add.circle(c.x, c.y, 2, 0xffffff, 0).setStrokeStyle(1, 0xffffff, 0.95).setDepth(DEPTH.overlay);
    this.tweens.add({ targets: ring, radius: 16, alpha: 0, duration: 700, delay: 140, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
  }

  update(_t: number, dtRaw: number) {
    const dt = Math.min(dtRaw, 50);
    const cam = this.cameras.main;
    this.flagT += dt;
    if (this.flagT > 380) { this.flagT = 0; this.flagFrame ^= 1; this.flag.setFrame(`flag_${this.flagFrame}`); }
    if (this.pass) {
      const total = (this.sim.n / HZ) * 1000;
      let speed = this.pass === 2 ? SLOW : this.playT < this.landT ? FLIGHT_SPEED : 1;
      if (this.pass === 1 && this.playT >= this.landT && total - this.playT > 1500) speed = 1.4;
      this.playT += dt * speed;
      const b = ballAt(this.sim, this.playT);
      this.draw(b);
      while (this.evIdx < this.sim.events.length && this.sim.events[this.evIdx].t * 1000 <= this.playT) this.onEvent(this.sim.events[this.evIdx++]);
      // the camera follows the ball with a look-ahead
      const S = this.sim.samples;
      const k = Math.min(this.sim.n - 1, b.i + 40);
      const p = this.px(b.x, b.y), a = this.px(S[k * 3], S[k * 3 + 1]);
      const tx = p.x + (a.x - p.x) * 0.6, ty = p.y + (a.y - p.y) * 0.6;
      const lerp = 1 - Math.pow(1 - 0.12, dt / 16.7);
      this.camX += (tx - this.camX) * lerp;
      this.camY += (ty - this.camY) * lerp;
      if (b.done) {
        if (this.holdUntil === Number.POSITIVE_INFINITY) this.holdUntil = this.time.now + 1100;
        else if (this.time.now > this.holdUntil) {
          if (this.pass === 1) this.start(2);
          else { this.pass = 0; (this.scene.get('replayHud') as ReplayHudScene | undefined)?.status('done'); }
        }
      }
    }
    centerSnapped(cam, this.camX, this.camY);
    this.view.update(cam, dt);
  }
}

/** The replay's caption and buttons (a menu camera over the course). */
export class ReplayHudScene extends Phaser.Scene {
  private host!: ReplayScene;
  private h!: HoleOut;
  private note!: Phaser.GameObjects.BitmapText;
  private root!: Phaser.GameObjects.Container;

  constructor() {
    super('replayHud');
  }

  create(data: { scene: ReplayScene; h: HoleOut }) {
    this.host = data.scene;
    this.h = data.h;
    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  private build() {
    uiCamera(this.cameras.main);
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);
    const W = app.view.w, H = app.view.h;
    const pw = Math.min(360, W - 8), ph = 40;
    const x0 = Math.round((W - pw) / 2), y0 = H - ph - 4;
    const h = this.h;
    const c = app.courses.find((x) => x.id === h.course);
    this.root.add(new Panel(this, x0, y0, pw, ph, 0.85));
    this.root.add(txt(this, x0 + 8, y0 + 5, `${h.player}  ·  ${holeOutDistance(h.dist)}  ·  ${h.club.toLowerCase()} from the ${h.lie}`, { color: COLORS.yellow, maxWidth: pw - 16 }));
    this.root.add(txt(this, x0 + 8, y0 + 16, `${c ? listName(c) : h.course}  ·  hole ${h.hole}, par ${h.par}  ·  ${h.n === 1 ? 'hole in one' : `shot ${h.n}`}`, { color: COLORS.white, maxWidth: pw - 120 }));
    this.note = txt(this, x0 + 8, y0 + 27, '', { color: COLORS.dim });
    this.root.add(this.note);
    this.root.add(new Button(this, x0 + pw - 104, y0 + 21, 46, 15, 'again', () => this.host.again(), { color: 'grey' }));
    this.root.add(new Button(this, x0 + pw - 54, y0 + 21, 46, 15, 'close', () => this.host.close(), { color: 'orange' }));
  }

  status(s: string) {
    this.note?.setText(s === 'slow motion' ? 'slow motion' : '');
  }
}

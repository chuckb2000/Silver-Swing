// Smooth camera for the course view. The centre follows its target with a
// critically damped spring (no overshoot, no jitter), is kept inside the
// current bounds, and is snapped to whole device pixels when applied, so the
// art stays crisp while the motion is smooth (see scale.ts).

import Phaser from 'phaser';
import { app } from '../app';
import { centerSnapped } from '../scale';

export interface Rect { x: number; y: number; w: number; h: number }

export class CameraRig {
  x = 0;          // centre in world px (not snapped)
  y = 0;
  tx = 0;         // target centre
  ty = 0;
  smooth = 0.35;  // seconds to (nearly) reach a still target
  maxSpeed = Infinity; // world px per second
  level = 1;      // view level: camera zoom = texel scale x level
  bounds: Rect | null = null;
  private vx = 0;
  private vy = 0;

  constructor(readonly cam: Phaser.Cameras.Scene2D.Camera) {}

  /** Visible area in world px at the current level. */
  get viewW(): number { return this.cam.width / (app.zoom * this.level); }
  get viewH(): number { return this.cam.height / (app.zoom * this.level); }

  jump(x: number, y: number) {
    this.x = this.tx = x;
    this.y = this.ty = y;
    this.vx = this.vy = 0;
    this.apply();
  }

  target(x: number, y: number, smooth?: number) {
    this.tx = x;
    this.ty = y;
    if (smooth !== undefined) this.smooth = smooth;
  }

  /** Distance (world px) between where the camera will show and the clamped target. */
  distToTarget(): number {
    const a = this.clamp(this.x, this.y), b = this.clamp(this.tx, this.ty);
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** True once the view has (visually) arrived at its target. */
  settled(texels = 1): boolean {
    return this.distToTarget() * this.level < texels && Math.hypot(this.vx, this.vy) * this.level < 20;
  }

  update(dtMs: number) {
    const dt = Math.min(0.1, Math.max(0.001, dtMs / 1000));
    const st = Math.max(0.0001, this.smooth);
    const omega = 2 / st;
    const k = omega * dt;
    const exp = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
    let cx = this.x - this.tx, cy = this.y - this.ty;
    const maxChange = this.maxSpeed * st;
    const len = Math.hypot(cx, cy);
    if (len > maxChange) { cx *= maxChange / len; cy *= maxChange / len; }
    const tempX = (this.vx + omega * cx) * dt, tempY = (this.vy + omega * cy) * dt;
    this.vx = (this.vx - omega * tempX) * exp;
    this.vy = (this.vy - omega * tempY) * exp;
    this.x = this.x - cx + (cx + tempX) * exp;
    this.y = this.y - cy + (cy + tempY) * exp;
    this.apply();
  }

  /** Keep the view inside the bounds (centred on them when the view is larger). */
  clamp(x: number, y: number): { x: number; y: number } {
    const b = this.bounds;
    if (!b) return { x, y };
    const hw = this.viewW / 2, hh = this.viewH / 2;
    const cx = b.w <= hw * 2 ? b.x + b.w / 2 : Math.min(b.x + b.w - hw, Math.max(b.x + hw, x));
    const cy = b.h <= hh * 2 ? b.y + b.h / 2 : Math.min(b.y + b.h - hh, Math.max(b.y + hh, y));
    return { x: cx, y: cy };
  }

  apply() {
    const z = app.zoom * this.level;
    if (this.cam.zoom !== z) this.cam.setZoom(z);
    const c = this.clamp(this.x, this.y);
    centerSnapped(this.cam, c.x, c.y);
  }
}

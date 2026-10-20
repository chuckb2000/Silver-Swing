// Three-tap swing meter (spec 6.1 - 6.4, reworked after the first playtest).
//
// The cursor starts at the centre of the accuracy zone (bar position 0) and
// runs right to set the power (tap 2). It then turns back, crosses the zone
// and carries on to the left end of the bar (tap 3). The zone is symmetric:
// a tap right of centre (early) sends the ball right, left of centre (late)
// sends it left. If the cursor reaches the right end, the power is the
// maximum and the cursor turns back on its own; if it reaches the left end
// without tap 3, the shot is the biggest possible miss to the left.
// Putts use the same three taps (the third sets the start line).
//
// Speed (developer, 2026-10-19): the cursor starts slowly and speeds up as it
// nears 100 % (its speed grows in step with its position), reaching the
// original, faster meter speed at 100 % and holding it to the end of the bar.
// After tap 2 it comes back at the speed it had when tap 2 was made, so short
// shots are slow and easy to time and full swings are harder, as in golf.
//
// Pure logic driven by input timestamps (ms, the same clock as performance.now()).

export const FULL_MAX = 110;    // full swings can overswing to 110 %
export const PART_MAX = 100;    // putts and partial swings stop at 100 %
export const ZONE_REACH = 15;   // the bar runs 15 % left of the zone centre
export const LATE_POWER_TAP_MS = 150;

export type MeterPhase = 'idle' | 'power' | 'accuracy' | 'done';

export interface MeterResult {
  kind: 'full' | 'putt';
  power: number;   // 0 .. max/100, a fraction of the meter's 100 %
  offset: number;  // tap-3 position relative to the zone centre, % of bar (+ right, - left)
  maxed: boolean;  // the cursor reached the right end: maximum power
  late: boolean;   // no tap 3 before the left end of the bar
}

export class SwingMeter {
  readonly kind: 'full' | 'putt';
  readonly max: number;
  readonly msPer100: number;
  readonly latencyMs: number;
  /** cursor speed at 0 % and from 100 % on (% of bar per ms) */
  readonly v0: number;
  readonly v1: number;
  private readonly b: number;   // speed gained per % of bar travelled (1/ms)
  private readonly t100: number; // ms from tap 1 to 100 %
  private vBack = 0;
  phase: MeterPhase = 'idle';
  private t0 = 0;
  private t2 = 0;
  private powerPos = 0;
  private maxed = false;
  result: MeterResult | null = null;

  /**
   * @param secondsPer100 the starting speed, as the time 100 % of the bar would take at it
   * @param max right end of the bar (110 full swing, 100 putt / partial swing)
   * @param fastSecondsPer100 the speed at 100 % and beyond, the same way (default: no speed-up)
   */
  constructor(kind: 'full' | 'putt', secondsPer100: number, max = kind === 'putt' ? PART_MAX : FULL_MAX, latencyMs = 0, fastSecondsPer100 = secondsPer100) {
    this.kind = kind;
    this.max = max;
    this.msPer100 = secondsPer100 * 1000;
    this.latencyMs = latencyMs;
    this.v0 = 100 / this.msPer100;
    this.v1 = Math.max(this.v0, 100 / (fastSecondsPer100 * 1000));
    this.b = (this.v1 - this.v0) / 100;
    this.t100 = this.timeTo(100);
  }

  /** Starting speed, % of bar per millisecond. */
  get speed(): number {
    return this.v0;
  }

  /** Cursor speed (% of bar per ms) on the way out, at bar position `pos`. */
  speedAt(pos: number): number {
    return Math.min(this.v1, this.v0 + this.b * Math.max(0, pos));
  }

  /** Speed of the cursor on its way back (the speed it had at tap 2). */
  get backSpeed(): number {
    return this.vBack;
  }

  /** ms after tap 1 for the cursor to reach `pos` on its way out. */
  timeTo(pos: number): number {
    const p = Math.max(0, pos);
    const head = Math.min(p, 100);
    const t = this.b < 1e-12 ? head / this.v0 : Math.log(1 + (this.b * head) / this.v0) / this.b;
    return p <= 100 ? t : t + (p - 100) / this.v1;
  }

  /** Cursor position on its way out, `dt` ms after tap 1 (unclamped). */
  private outAt(dt: number): number {
    if (dt <= 0) return 0;
    if (dt > this.t100) return 100 + (dt - this.t100) * this.v1;
    return this.b < 1e-12 ? dt * this.v0 : (this.v0 / this.b) * (Math.exp(this.b * dt) - 1);
  }

  /**
   * Tap times (ms after tap 1) for a swing of `powerPct` % with tap 3 at `tapPct`
   * (bar position, zone centre = 0): what a player aiming for that swing does.
   */
  tapTimes(powerPct: number, tapPct: number): [number, number] {
    const t2 = this.timeTo(powerPct);
    return [t2, t2 + (powerPct - tapPct) / this.speedAt(powerPct)];
  }

  /** Time of the first tap (cursor start). */
  get startedAt(): number {
    return this.t0;
  }

  /** Power tapped so far (% of bar). */
  get power(): number {
    return this.powerPos;
  }

  /** Cursor position (% of bar, -ZONE_REACH .. max) at time `now`. */
  position(now: number): number {
    switch (this.phase) {
      case 'idle': return 0;
      case 'power': return Math.min(this.max, this.outAt(now - this.t0));
      case 'accuracy': return Math.max(-ZONE_REACH, this.powerPos - Math.max(0, now - this.t2) * this.vBack);
      default: return this.result ? this.result.offset : this.powerPos;
    }
  }

  tap(ts: number): MeterPhase {
    const t = ts - this.latencyMs;
    if (this.phase === 'idle') {
      this.phase = 'power';
      this.t0 = ts; // the first tap only starts the cursor; latency does not matter
      return this.phase;
    }
    if (this.phase === 'power') {
      const pos = this.outAt(t - this.t0);
      if (pos >= this.max) {
        // tapped just as (or after) the cursor reached the end: maximum power
        this.turnAtEnd();
        return this.phase;
      }
      this.powerPos = Math.max(0, pos);
      this.vBack = this.speedAt(this.powerPos);
      this.t2 = t;
      this.phase = 'accuracy';
      return this.phase;
    }
    if (this.phase === 'accuracy') {
      // the cursor turned by itself and the player was a moment late with tap 2
      if (this.maxed && t - this.t2 < LATE_POWER_TAP_MS) return this.phase;
      const pos = this.powerPos - (t - this.t2) * this.vBack;
      if (pos <= -ZONE_REACH) {
        this.finish(-ZONE_REACH, true);
      } else {
        this.finish(pos, false);
      }
    }
    return this.phase;
  }

  /** Call every frame: turns the cursor at the right end and ends a missed tap 3. */
  update(now: number): MeterPhase {
    if (this.phase === 'power' && this.outAt(now - this.t0) >= this.max) {
      this.turnAtEnd();
    }
    if (this.phase === 'accuracy' && this.powerPos - (now - this.t2) * this.vBack <= -ZONE_REACH) {
      this.finish(-ZONE_REACH, true);
    }
    return this.phase;
  }

  private turnAtEnd() {
    this.powerPos = this.max;
    this.vBack = this.speedAt(this.max);
    this.t2 = this.t0 + this.timeTo(this.max);
    this.maxed = true;
    this.phase = 'accuracy';
  }

  private finish(offset: number, late: boolean) {
    this.result = { kind: this.kind, power: this.powerPos / 100, offset, maxed: this.maxed, late };
    this.phase = 'done';
  }
}

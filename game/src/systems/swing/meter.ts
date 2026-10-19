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
// Pure logic driven by input timestamps (ms, the same clock as performance.now()).

export const FULL_MAX = 110;    // full swings can overswing to 110 %
export const PART_MAX = 100;    // putts and partial swings stop at 100 %
export const ZONE_REACH = 15;   // the bar runs 15 % left of the zone centre
export const LATE_POWER_TAP_MS = 150; // a tap this soon after an automatic turn is the late power tap

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
  phase: MeterPhase = 'idle';
  private t0 = 0;
  private t2 = 0;
  private powerPos = 0;
  private maxed = false;
  result: MeterResult | null = null;

  /**
   * @param secondsPer100 time for the cursor to travel 100 % of the bar
   * @param max right end of the bar (110 full swing, 100 putt / partial swing)
   */
  constructor(kind: 'full' | 'putt', secondsPer100: number, max = kind === 'putt' ? PART_MAX : FULL_MAX, latencyMs = 0) {
    this.kind = kind;
    this.max = max;
    this.msPer100 = secondsPer100 * 1000;
    this.latencyMs = latencyMs;
  }

  /** % of bar per millisecond (constant cursor speed both ways). */
  get speed(): number {
    return 100 / this.msPer100;
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
      case 'power': return Math.min(this.max, Math.max(0, (now - this.t0) * this.speed));
      case 'accuracy': return Math.max(-ZONE_REACH, this.powerPos - (now - this.t2) * this.speed);
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
      const pos = (t - this.t0) * this.speed;
      if (pos >= this.max) {
        // tapped just as (or after) the cursor reached the end: maximum power
        this.turnAtEnd();
        return this.phase;
      }
      this.powerPos = Math.max(0, pos);
      this.t2 = t;
      this.phase = 'accuracy';
      return this.phase;
    }
    if (this.phase === 'accuracy') {
      // the cursor turned by itself and the player was a moment late with tap 2
      if (this.maxed && t - this.t2 < LATE_POWER_TAP_MS) return this.phase;
      const pos = this.powerPos - (t - this.t2) * this.speed;
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
    if (this.phase === 'power' && (now - this.t0) * this.speed >= this.max) {
      this.turnAtEnd();
    }
    if (this.phase === 'accuracy' && this.powerPos - (now - this.t2) * this.speed <= -ZONE_REACH) {
      this.finish(-ZONE_REACH, true);
    }
    return this.phase;
  }

  private turnAtEnd() {
    this.powerPos = this.max;
    this.t2 = this.t0 + this.max / this.speed;
    this.maxed = true;
    this.phase = 'accuracy';
  }

  private finish(offset: number, late: boolean) {
    this.result = { kind: this.kind, power: this.powerPos / 100, offset, maxed: this.maxed, late };
    this.phase = 'done';
  }
}

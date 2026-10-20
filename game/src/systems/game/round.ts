// Round engine: hole flow, lies, club choice, shot planning, rules outcomes.
// Pure TypeScript (no Phaser) so the whole flow can be unit-tested.

import { CourseRuntime, HoleJson, TeeJson } from '../../data/course';
import { CLUBS, Club, clubById, isWedge, PUTTER } from '../../data/clubs';
import { DEFAULT_WIND, Difficulty, gust, makeWind, Preset, PRESETS, roundWinds, Wind } from '../../data/difficulty';
import { chipRelease, firstBounceK, puttSpeedFor } from '../physics/calibrate';
import { Rng } from '../physics/rng';
import { ShotSpec, SimResult, simulateShot } from '../physics/sim';
import { isOB, isWater, SURF } from '../physics/surfaces';
import { Polygon } from '../physics/terrain';
import { clubAllowed, Lie, lieModsFor, makeLie, spinEffect } from '../rules/lie';
import { CourseCtx, freeReliefArea, obOptions, penaltyAreaOptions, ReliefArea, unplayableOptions, validDrop } from '../rules/relief';
import { HoleScore, HoleTally } from '../rules/scoring';
import { MeterResult } from '../swing/meter';
import { coursePins, pinLabel as spotLabel } from './pins';
import { PuttStrike, puttStrikeFrom, Strike, strikeFrom } from '../swing/outcome';

export interface RoundSettings {
  difficulty: Difficulty;
  lefty: boolean;
  e5: boolean;
  gimmes: boolean;
  maxDoublePar: boolean;
  mulligans: boolean;
}

export interface RoundConfig {
  courseId: string;
  tee: string;
  holes: number[];
  playerName: string;
  seed: number;
  settings: RoundSettings;
  startedAt: string;
  /** Pin for each hole of the round (pins.ts pinSheet), fixed when the round starts so a
   *  resumed round keeps them; rounds saved before pins moved have none: the centre pin. */
  pins?: [number, number][];
  /** The daily round of this day (yyyy-mm-dd): course, tees, holes, seed and settings fixed by the date. */
  daily?: string;
  /** The practice ground (practice.ts): nothing is scored or saved. */
  practice?: boolean;
}

export interface BallPos { x: number; y: number; teedUp: boolean }

export type Outcome =
  | { kind: 'rest' }
  | { kind: 'holed' }
  | { kind: 'gimme' }
  | { kind: 'water'; penalty: 'red' | 'yellow'; options: ReliefArea[] }
  | { kind: 'ob'; options: ReliefArea[] }
  | { kind: 'wrong_green'; area: ReliefArea }
  | { kind: 'cartpath'; area: ReliefArea }
  | { kind: 'max_score' };

/**
 * A relief choice still to be made after a stroke (water, out of bounds, a
 * wrong green, a cart path). Saved with the round so a closed tab reopens the
 * same choice instead of replaying the stroke for free.
 */
export type PendingRelief =
  | { kind: 'water'; cross: { x: number; y: number } }
  | { kind: 'ob'; wentOut: { x: number; y: number } | null }
  | { kind: 'wrong_green' }
  | { kind: 'cartpath' };

export interface PlannedShot {
  club: Club;
  spec: ShotSpec;
  strike: Strike | null;
  putt: PuttStrike | null;
  puttDist: number | null;
  gustMph: number;
  scale: number;          // swing length (full clubs) or putter scale in metres
}


/**
 * Putter scales (the putting meter's 100 %), chosen so the 25/50/75/100 %
 * marks are whole numbers in the player's units: feet with yards, metres with metres.
 */
export const PUTT_SCALES_FT = [12, 24, 48, 80];
export const PUTT_SCALES_M = [4, 8, 16, 24];
export const FT = 0.3048;
export function puttScales(units: 'yd' | 'm'): number[] {
  return units === 'm' ? PUTT_SCALES_M : PUTT_SCALES_FT.map((f) => f * FT);
}
/** Swing lengths (fraction of a full swing): the meter's 100 % is this much of the club. */
export const SWING_SCALES = [1, 0.75, 0.5, 0.25];

const TEE_HEIGHT = 0.03;

/** Rng that always draws 0: every canopy the ball passes through counts as a hit. */
class AlwaysRng extends Rng {
  next(): number { return 0; }
}

export function isCasual(s: RoundSettings): boolean {
  return s.gimmes || s.maxDoublePar || s.mulligans;
}

export class Round {
  readonly course: CourseRuntime;
  readonly cfg: RoundConfig;
  readonly preset: Preset;
  readonly rng: Rng;
  holeIndex = 0;
  scores: HoleScore[] = [];
  tally!: HoleTally;
  ball!: BallPos;
  prev!: BallPos;
  wind!: Wind;
  lie!: Lie;
  shotNo = 0;              // strokes taken from the ground this hole (no penalties)
  lastPower: number | null = null;
  lastPuttPower: number | null = null;
  mulliganUsed = false;
  /** the relief choice the last stroke left open (null once the ball is dropped or played) */
  pending: PendingRelief | null = null;
  private beforeShot: { tally: { strokes: number; putts: number; penalties: number; fairway: boolean | null; reachedGreenAt: number | null }; shotNo: number; ball: BallPos; prev: BallPos; history: number } | null = null;
  history: { x: number; y: number }[] = [];
  shotSeq = 0;
  /** The last stroke simulated this hole, kept so it can be played back exactly (replay). */
  lastStroke: { shot: PlannedShot; hole: number; seq: number } | null = null;
  readonly winds: Wind[];
  /** Player's units (putter scales follow them); set by the game from the settings. */
  units: 'yd' | 'm' = 'yd';
  private aimCache = new Map<string, number>();

  constructor(course: CourseRuntime, cfg: RoundConfig) {
    this.course = course;
    this.cfg = cfg;
    this.preset = PRESETS[cfg.settings.difficulty];
    this.rng = new Rng(cfg.seed);
    this.winds = roundWinds(cfg.seed, cfg.holes.length, course.json.wind ?? DEFAULT_WIND, this.preset);
  }

  /** The hole's number on the scorecard (10-18 for the second time around a 9-hole course). */
  get holeNumber(): number { return this.cfg.holes[this.holeIndex]; }
  /** The course's own hole being played (a 9-hole course played twice repeats 1-9). */
  get courseHole(): number { return courseHoleFor(this.holeNumber, this.course.json.holes.length); }
  get hole(): HoleJson { return this.course.json.holes[this.courseHole - 1]; }
  get tee(): TeeJson { return this.hole.tees[this.cfg.tee] ?? Object.values(this.hole.tees)[0]; }
  get pin(): { x: number; y: number } {
    const p = this.cfg.pins?.[this.holeIndex] ?? this.hole.pin;
    return { x: p[0], y: p[1] };
  }
  /** Where today's pin is on the green ("back left", "middle"...), for the hole intro. */
  pinLabel(): string {
    const spots = coursePins(this.course, this.cfg.tee)[this.courseHole - 1] ?? [];
    const p = this.pin;
    let best = spots[0], d = Infinity;
    for (const s of spots) { const e = Math.hypot(s.x - p.x, s.y - p.y); if (e < d) { d = e; best = s; } }
    return best && d < 0.5 ? spotLabel(best) : 'middle';
  }
  get holeGreen(): Polygon { return this.course.greenPolys.get(this.hole.greenId)!; }
  get finished(): boolean { return this.holeIndex >= this.cfg.holes.length; }
  get isLastHole(): boolean { return this.holeIndex === this.cfg.holes.length - 1; }

  courseCtx(): CourseCtx {
    const others: Polygon[] = [];
    for (const [id, p] of this.course.greenPolys) if (id !== this.hole.greenId) others.push(p);
    return { terrain: this.course.terrain, boundary: this.course.boundary, hole: this.pin, holeGreen: this.holeGreen, otherGreens: others };
  }

  startHole(index: number) {
    this.holeIndex = index;
    this.tally = new HoleTally(this.holeNumber, this.hole.par);
    this.ball = { x: this.tee.x, y: this.tee.y, teedUp: true };
    this.prev = { ...this.ball };
    this.wind = this.winds[index] ?? makeWind(0, 0);
    this.shotNo = 0;
    this.mulliganUsed = false;
    this.beforeShot = null;
    this.pending = null;
    this.lastStroke = null;
    this.history = [{ x: this.ball.x, y: this.ball.y }];
    this.refreshLie();
  }

  distToPin(p: { x: number; y: number } = this.ball): number {
    return Math.hypot(p.x - this.pin.x, p.y - this.pin.y);
  }

  surfaceAt(p: { x: number; y: number } = this.ball): number {
    return this.course.terrain.surface(p.x, p.y);
  }

  onHoleGreen(p: { x: number; y: number } = this.ball): boolean {
    return this.holeGreen.contains(p.x, p.y);
  }

  refreshLie() {
    const t = this.course.terrain;
    const s = t.surface(this.ball.x, this.ball.y);
    const canopy = this.course.obstacles.canopyOverhead(this.ball.x, this.ball.y);
    const edge = this.holeGreen.contains(this.ball.x, this.ball.y) ? 0 : this.holeGreen.edgeDistance(this.ball.x, this.ball.y);
    const r = this.rng.fork(9000 + this.holeNumber * 100 + this.shotNo);
    this.lie = makeLie({ surface: s, teedUp: this.ball.teedUp, distToGreenEdge: edge, canopyBase: canopy ? canopy.base : null }, r);
  }

  allowedClubs(): Club[] {
    return CLUBS.filter((c) => clubAllowed(this.lie, c));
  }

  /** Spec 6.3: club whose full carry (adjusted for lie) is closest to the pin distance. */
  autoClub(): Club {
    if (this.puttingRange()) return PUTTER;
    const d = this.distToPin();
    let best: Club = CLUBS[0];
    let bestErr = Infinity;
    for (const c of this.allowedClubs()) {
      if (c.kind === 'putter') continue;
      const err = Math.abs(this.fullCarry(c) - d);
      if (err < bestErr) { bestErr = err; best = c; }
    }
    return best;
  }

  /** The putter is the natural club on the green and on the fringe close to it. */
  puttingRange(): boolean {
    const s = this.surfaceAt();
    return this.lie.kind === 'green' || (s === SURF.fringe && this.distToPin() < 15);
  }

  /** Carry of a 100% perfect shot with this club from the current lie (flat, calm). */
  fullCarry(c: Club): number {
    if (c.kind === 'putter') return 0;
    const m = lieModsFor(this.lie, c);
    return c.carryM * m.distMult * (m.splash ? 0.45 : 1);
  }

  /** Smallest swing length whose 100 % comfortably covers the distance to the pin. */
  autoSwingScale(c: Club): number {
    if (c.kind === 'putter') return this.autoPuttScale();
    const full = this.fullCarry(c);
    const want = this.distToPin() * 1.15;
    if (full <= want) return 1;
    for (const sc of [...SWING_SCALES].reverse()) if (full * sc >= want) return sc;
    return 1;
  }

  /** Smallest putter scale that comfortably covers the putt (playability addition). */
  autoPuttScale(units: 'yd' | 'm' = this.units): number {
    const d = this.distToPin();
    const scales = puttScales(units);
    for (const s of scales) if (s >= d * 1.6) return s;
    return scales[scales.length - 1];
  }

  /** Aim along the hole: at the pin when in range, else down the centre line. */
  lineAim(c: Club, scale = 1): number {
    const b = this.ball;
    const carry = c.kind === 'putter' ? Infinity : this.fullCarry(c) * scale;
    const d = this.distToPin();
    if (carry >= d * 0.92) return Math.atan2(this.pin.y - b.y, this.pin.x - b.x);
    const line = this.tee.centerline;
    // walk the centre line from the point nearest the ball until we are `carry` away
    let bestSeg = 0, bestT = 0, bestD = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1];
      const dx = bx - ax, dy = by - ay;
      const L2 = dx * dx + dy * dy || 1;
      let t = ((b.x - ax) * dx + (b.y - ay) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const dd = Math.hypot(ax + t * dx - b.x, ay + t * dy - b.y);
      if (dd < bestD) { bestD = dd; bestSeg = i; bestT = t; }
    }
    for (let i = bestSeg; i < line.length - 1; i++) {
      const [ax, ay] = line[i], [bx, by] = line[i + 1];
      const t0 = i === bestSeg ? bestT : 0;
      for (let t = t0; t <= 1.0001; t += 0.01) {
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        if (Math.hypot(px - b.x, py - b.y) >= carry) return Math.atan2(py - b.y, px - b.x);
      }
    }
    return Math.atan2(this.pin.y - b.y, this.pin.x - b.x);
  }

  /** Perfect 100 % strike with this club and swing length (calm air). */
  private perfectStrike(c: Club, scale: number): Strike {
    const m: MeterResult = { kind: 'full', power: 1, offset: 0, maxed: false, late: false };
    return strikeFrom(m, c, lieModsFor(this.lie, c), this.preset.perfectZone, this.cfg.settings.lefty, scale);
  }

  private flightSpec(c: Club, aim: number, strike: Strike, spin: number, wind: { vx: number; vy: number }): ShotSpec {
    const b = this.ball;
    const z = this.groundZ() + (b.teedUp ? TEE_HEIGHT : 0);
    const sEff = spinEffect(this.lie);
    const spinScaled = spin * (spin < 0 ? sEff : 1);
    const spinBack = spin < 0 && isWedge(c) && sEff === 1 && strike.power > 0.6 ? 2.0 * Math.min(1, (strike.power - 0.6) / 0.4) : 0;
    // short swings release a little (not out of a bunker, where the ball stops)
    const bunker = this.lie.kind === 'greenside_bunker' || this.lie.kind === 'fairway_bunker';
    const release = bunker || c.carryM <= 0 ? 1 : chipRelease(strike.carry / c.carryM);
    return {
      x: b.x, y: b.y, z, aim, pin: this.pin,
      flight: {
        carry: strike.carry, apex: strike.apex, hang: strike.hang, curveDeg: strike.curveDeg,
        windX: wind.vx, windY: wind.vy, firstBounceK: firstBounceK(c) * release, spin: spinScaled, spinBack,
        apexCap: this.lie.apexCap,
      },
    };
  }

  /** Where a perfect 100 % shot would first touch the ground (calm air, no trees): the landing marker. */
  previewLanding(c: Club, aim: number, scale: number): { x: number; y: number } {
    if (c.kind === 'putter') {
      const d = this.distToPin();
      return { x: this.ball.x + Math.cos(aim) * d, y: this.ball.y + Math.sin(aim) * d };
    }
    const spec = this.flightSpec(c, aim, this.perfectStrike(c, scale), 0, { vx: 0, vy: 0 });
    spec.untilLanding = true;
    const sim = simulateShot(this.course.terrain, null, spec, new Rng(1));
    const l = sim.landing ?? sim.end;
    return { x: l.x, y: l.y };
  }

  /**
   * Would a perfect shot down this line stay clear of trouble? Any canopy or
   * trunk on the way counts as a hit, the ball must not finish in the trees,
   * water or out of bounds, and its landing spot must not be hidden behind a
   * tree on screen (it would look like an aim at the tree).
   */
  private lineClear(c: Club, aim: number, scale: number): boolean {
    const spec = this.flightSpec(c, aim, this.perfectStrike(c, scale), 0, { vx: 0, vy: 0 });
    const sim = simulateShot(this.course.terrain, this.course.obstacles, spec, new AlwaysRng(1));
    if (sim.holed) return true;
    const s = sim.restSurface;
    // the landing marker must not sit behind a tree on screen either
    const land = sim.landing;
    if (land && this.course.obstacles.hidesPoint(land.x, land.y)) return false;
    return !sim.hitTree && !sim.inWater && !isWater(s) && !isOB(s) && s !== SURF.woods && s !== SURF.building
      && this.course.boundary.contains(sim.end.x, sim.end.y);
  }

  /**
   * Default aim: straight down the hole (or at the pin when it is in range).
   * Deliberately simple, so the player still does the thinking; it only moves
   * a few degrees when that line would put the ball into trees, water or out
   * of bounds, and then takes the nearest line that does not.
   */
  defaultAim(c: Club, scale = this.autoSwingScale(c)): number {
    const base = this.lineAim(c, scale);
    if (c.kind === 'putter') return base;
    const key = `${this.holeNumber}:${this.ball.x.toFixed(2)},${this.ball.y.toFixed(2)}:${c.id}:${scale}:${this.lie.kind}`;
    const hit = this.aimCache.get(key);
    if (hit !== undefined) return hit;
    let aim = base;
    if (!this.lineClear(c, base, scale)) {
      search: for (let k = 2; k <= 16; k += 2) {
        for (const sgn of [1, -1]) {
          const a = base + (sgn * k * Math.PI) / 180;
          if (this.lineClear(c, a, scale)) { aim = a; break search; }
        }
      }
    }
    this.aimCache.set(key, aim);
    return aim;
  }

  groundZ(p: { x: number; y: number } = this.ball): number {
    return this.course.terrain.z(p.x, p.y);
  }

  plan(clubId: string, aim: number, meter: MeterResult, spin: number, scale: number): PlannedShot {
    const club = clubById(clubId);
    const r = this.rng.fork(50_000 + this.holeNumber * 1000 + this.shotSeq++);
    const b = this.ball;
    const w = gust(this.wind, r);
    if (club.kind === 'putter') {
      const putt = puttStrikeFrom(meter, this.preset.perfectZone, club.windowMult, this.cfg.settings.lefty);
      const dist = meter.power * scale * putt.distMult;
      const aimFinal = aim - (putt.dirDeg * Math.PI) / 180;
      return {
        club, strike: null, putt, puttDist: dist, gustMph: w.mph, scale,
        spec: { x: b.x, y: b.y, z: this.groundZ(), aim: aimFinal, rollSpeed: puttSpeedFor(dist), pin: this.pin },
      };
    }
    const mods = lieModsFor(this.lie, club);
    const strike = strikeFrom(meter, club, mods, this.preset.perfectZone, this.cfg.settings.lefty, scale);
    const aimFinal = aim - (strike.aimOffsetDeg * Math.PI) / 180;
    return { club, strike, putt: null, puttDist: null, gustMph: w.mph, scale, spec: this.flightSpec(club, aimFinal, strike, spin, w) };
  }

  simulate(p: PlannedShot): SimResult {
    this.lastStroke = { shot: p, hole: this.holeNumber, seq: this.shotSeq };
    return this.simulateAgain(this.lastStroke);
  }

  /** The last stroke again, exactly as it was played (the physics is deterministic). */
  replay(): SimResult | null {
    return this.lastStroke ? this.simulateAgain(this.lastStroke) : null;
  }

  private simulateAgain(l: { shot: PlannedShot; hole: number; seq: number }): SimResult {
    const r = this.rng.fork(70_000 + l.hole * 1000 + l.seq);
    return simulateShot(this.course.terrain, this.course.obstacles, l.shot.spec, r);
  }

  /** Commit a stroke: count it, move the ball, apply the rules. */
  resolve(p: PlannedShot, sim: SimResult): Outcome {
    this.pending = null;
    // everything a mulligan rewinds (casual): the shot, any penalty after it and its stats
    this.beforeShot = {
      tally: { strokes: this.tally.strokes, putts: this.tally.putts, penalties: this.tally.penalties, fairway: this.tally.fairway, reachedGreenAt: this.tally.reachedGreenAt },
      shotNo: this.shotNo, ball: { ...this.ball }, prev: { ...this.prev }, history: this.history.length,
    };
    const wasOnGreen = this.onHoleGreen();
    this.tally.stroke(wasOnGreen && p.club.kind === 'putter');
    if (p.club.kind === 'putter') this.lastPuttPower = p.puttDist ?? 0;
    else if (p.strike) this.lastPower = p.strike.power;
    const isTeeShot = this.shotNo === 0;
    this.shotNo += 1;
    this.prev = { ...this.ball };
    const end = sim.end;
    this.ball = { x: end.x, y: end.y, teedUp: false };
    this.history.push({ x: end.x, y: end.y });
    if (sim.holed) {
      this.tally.rested(true, true, isTeeShot); // holed from the tee: the fairway counts as hit, not missed
      if (this.tally.reachedGreenAt === null) this.tally.reachedGreenAt = this.tally.strokes;
      return { kind: 'holed' };
    }
    const s = sim.restSurface;
    const ctx = this.courseCtx();
    const capped = () => this.cfg.settings.maxDoublePar && this.tally.strokes + 1 >= this.hole.par * 2; // a drop would reach the cap
    // water outside the course (a river or lake beyond the boundary, surface ob_water) is out of bounds, not a penalty area
    if ((sim.inWater || isWater(s)) && !isOB(s)) {
      if (capped()) return { kind: 'max_score' };
      return this.open({ kind: 'water', cross: sim.waterCross ?? { x: this.prev.x, y: this.prev.y } });
    }
    if (isOB(s) || !this.course.boundary.contains(end.x, end.y)) {
      if (capped()) return { kind: 'max_score' };
      return this.open({ kind: 'ob', wentOut: lastInBounds(sim, this.course.boundary) });
    }
    const onGreen = this.onHoleGreen();
    this.tally.rested(onGreen, s === SURF.fairway, isTeeShot);
    if (this.cfg.settings.maxDoublePar && this.tally.strokes >= this.hole.par * 2) {
      return { kind: 'max_score' }; // before the gimme, which would add a stroke past the cap
    }
    if (this.cfg.settings.gimmes && onGreen && this.distToPin() <= 0.6) {
      this.tally.strokes += 1; // the conceded putt still counts
      this.tally.putts += 1;
      return { kind: 'gimme' };
    }
    if (ctx.otherGreens.some((g) => g.contains(end.x, end.y))) {
      const o = this.open({ kind: 'wrong_green' });
      if (o.kind !== 'rest') return o;
    }
    if (s === SURF.cartpath || s === SURF.building) {
      const o = this.open({ kind: 'cartpath' });
      if (o.kind !== 'rest') return o;
    }
    this.refreshLie();
    return { kind: 'rest' };
  }

  /** Leave a relief choice open and return its options (none to offer: the ball is just at rest). */
  private open(p: PendingRelief): Outcome {
    const o = this.reliefOutcome(p);
    this.pending = o.kind === 'rest' ? null : p;
    return o;
  }

  /**
   * The relief options of a pending choice, from the ball where it ended and
   * the spot it was played from. Pure: the same answer after a resume.
   */
  reliefOutcome(p: PendingRelief): Outcome {
    const ctx = this.courseCtx();
    const end = this.ball;
    const prev = { x: this.prev.x, y: this.prev.y };
    switch (p.kind) {
      case 'water': {
        const wpoly = this.course.water.find((w) => w.poly.contains(end.x, end.y)) ?? null;
        const pen = wpoly ? wpoly.penalty : 'red';
        return { kind: 'water', penalty: pen, options: penaltyAreaOptions(ctx, pen, prev, p.cross, wpoly ? wpoly.poly : null) };
      }
      case 'ob':
        return { kind: 'ob', options: obOptions(ctx, prev, p.wentOut, this.cfg.settings.e5) };
      case 'wrong_green': {
        const g = ctx.otherGreens.find((q) => q.contains(end.x, end.y));
        const area = g ? freeReliefArea(ctx, end, (x, y) => g.contains(x, y), 'wrong green: free relief required') : null;
        return area ? { kind: 'wrong_green', area } : { kind: 'rest' };
      }
      case 'cartpath': {
        const area = freeReliefArea(ctx, end, (x, y) => {
          const q = this.course.terrain.surface(x, y);
          return q === SURF.cartpath || q === SURF.building;
        }, 'cart path: free relief');
        return area ? { kind: 'cartpath', area } : { kind: 'rest' };
      }
    }
  }

  /** Apply a relief choice: move the ball and add its penalty strokes. */
  applyRelief(area: ReliefArea, p: { x: number; y: number }) {
    this.pending = null;
    this.tally.penalty(area.penalty);
    if (area.kind === 'stroke_distance') {
      this.ball = { ...this.prev };
    } else {
      this.ball = { x: p.x, y: p.y, teedUp: false };
    }
    this.history.push({ x: this.ball.x, y: this.ball.y });
    this.refreshLie();
  }

  validDrop(area: ReliefArea, p: { x: number; y: number }): boolean {
    return validDrop(this.courseCtx(), area, p);
  }

  unplayable(): ReliefArea[] {
    return unplayableOptions(this.courseCtx(), this.ball, { x: this.prev.x, y: this.prev.y });
  }

  /** Practice: the ball back on the stall (`spot` omitted) or on a drill spot; nothing counted. */
  practiceReset(spot?: { x: number; y: number }) {
    this.tally = new HoleTally(this.holeNumber, this.hole.par);
    this.ball = spot ? { x: spot.x, y: spot.y, teedUp: false } : { x: this.tee.x, y: this.tee.y, teedUp: true };
    this.prev = { ...this.ball };
    this.shotNo = 0;
    this.pending = null;
    this.history = [{ x: this.ball.x, y: this.ball.y }];
    this.refreshLie();
  }

  /** Practice: calm, or the wind the round would have on this hole. */
  practiceWind(on: boolean) {
    this.wind = on ? this.winds[this.holeIndex] ?? makeWind(0, 0) : makeWind(0, 0);
  }

  /** Mulligan (casual): replay the last stroke from its spot without counting it. */
  mulligan(): boolean {
    if (!this.cfg.settings.mulligans || this.mulliganUsed || this.shotNo === 0) return false;
    this.mulliganUsed = true;
    this.pending = null;
    const b = this.beforeShot;
    if (b) {
      // as if the last shot (and any penalty or drop after it) never happened
      Object.assign(this.tally, b.tally);
      this.shotNo = b.shotNo;
      this.ball = { ...b.ball };
      this.prev = { ...b.prev };
      this.history.length = Math.min(this.history.length, b.history);
    } else {
      this.tally.strokes -= 1;
      this.ball = { ...this.prev };
    }
    this.history.push({ x: this.ball.x, y: this.ball.y });
    this.refreshLie();
    return true;
  }

  finishHole(maxed = false): HoleScore {
    // casual double-par maximum: picked up at the cap, never above it
    if (maxed) this.tally.strokes = this.hole.par * 2;
    else if (this.cfg.settings.maxDoublePar) this.tally.strokes = Math.min(this.tally.strokes, this.hole.par * 2);
    const s = this.tally.finish();
    this.scores.push(s);
    return s;
  }

  nextHole(): boolean {
    if (this.holeIndex + 1 >= this.cfg.holes.length) {
      this.holeIndex = this.cfg.holes.length;
      return false;
    }
    this.startHole(this.holeIndex + 1);
    return true;
  }
}

/** Last sampled point inside the boundary (where the ball went out). */
function lastInBounds(sim: SimResult, boundary: Polygon): { x: number; y: number } | null {
  const s = sim.samples;
  let last: { x: number; y: number } | null = null;
  for (let i = 0; i < sim.n; i += 4) {
    const x = s[i * 3], y = s[i * 3 + 1];
    if (boundary.contains(x, y)) last = { x, y };
  }
  return last;
}

/** The round's id on the leaderboards (and the prefix of its eagles' ids). */
export const roundId = (cfg: { startedAt: string; seed: number }) => `${cfg.startedAt}-${cfg.seed}`;

/** Scorecard hole number -> the course's hole (9-hole courses played twice around). */
export function courseHoleFor(slot: number, courseHoles: number): number {
  return ((slot - 1) % courseHoles) + 1;
}

export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

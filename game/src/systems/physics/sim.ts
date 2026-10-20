// Ball simulation: parametric flight -> bounces -> roll -> rest (or cup,
// water, out of the world). Fixed 120 Hz step, deterministic given the Rng.
// The whole shot is simulated up front; the renderer plays the samples back.

import { CANOPY_START, Obstacles, TRUNK_R } from './obstacles';
import { Rng } from './rng';
import { isWater, material, SURF } from './surfaces';
import { Terrain } from './terrain';

export const G = 9.81;
export const HZ = 120;
export const DT = 1 / HZ;
export const CUP_R = 0.054;
export const LIP_R = 0.075;
export const BALL_R = 0.0214;
export const MPH = 0.44704;
const ROLL_SLOPE = 5 / 7; // rolling solid sphere on an incline: a = 5/7 g sin(theta)

export interface FlightSpec {
  carry: number;        // nominal carry on flat ground in calm air (m)
  apex: number;         // apex above the launch point (m)
  hang: number;         // nominal hang time (s)
  curveDeg: number;     // + bends to the right of the aim line
  windX: number;        // wind velocity (air moving toward +x), m/s
  windY: number;
  firstBounceK: number; // per-club roll-out calibration (see calibrate.ts)
  spin: number;         // -1 backspin .. 0 .. +1 topspin (already scaled for lie)
  spinBack: number;     // metres a wedge spins back after landing on a green
  apexCap?: number;     // punch shot under a canopy
}

export interface ShotSpec {
  x: number; y: number; z: number;
  aim: number;            // radians; 0 = east, counter-clockwise
  flight?: FlightSpec;
  rollSpeed?: number;     // putt / bump: starts rolling at this speed (m/s)
  pin: { x: number; y: number } | null;
  maxTime?: number;
  untilLanding?: boolean; // stop at the first ground contact (landing previews)
}

export type SimEventType = 'land' | 'bounce' | 'canopy' | 'trunk' | 'wall' | 'splash' | 'holed' | 'lipout' | 'rest' | 'edge';
export interface SimEvent { t: number; type: SimEventType; x: number; y: number; z: number; surf?: number; speed?: number }

export interface SimResult {
  samples: Float32Array; // x, y, z per step
  n: number;
  end: { x: number; y: number; z: number };
  restSurface: number;
  holed: boolean;
  inWater: boolean;
  waterCross: { x: number; y: number } | null;
  landing: { x: number; y: number; z: number; t: number } | null;
  events: SimEvent[];
  duration: number;
  hitTree: boolean;
}

interface State {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

export function windComponents(aim: number, wx: number, wy: number) {
  const ux = Math.cos(aim), uy = Math.sin(aim);
  const rx = uy, ry = -ux; // right of the aim line
  return { along: wx * ux + wy * uy, cross: wx * rx + wy * ry };
}

/** Carry multiplier from the along-the-line wind component (spec 7.2). */
export function windCarryMult(alongMs: number): number {
  const mph = Math.abs(alongMs) / MPH;
  return alongMs >= 0 ? 1 + 0.005 * mph : 1 - 0.01 * mph;
}

const uOf = (tau: number) => {
  const t = Math.min(tau, 2.1);
  return 1.3 * t - 0.3 * t * t;
};

export function simulateShot(terrain: Terrain, obs: Obstacles | null, spec: ShotSpec, rng: Rng): SimResult {
  const out: number[] = [];
  const events: SimEvent[] = [];
  const maxSteps = Math.round((spec.maxTime ?? 45) * HZ);
  const s: State = { x: spec.x, y: spec.y, z: spec.z, vx: 0, vy: 0, vz: 0 };
  let phase: 'flight' | 'air' | 'roll' | 'rest' = spec.flight ? 'flight' : 'roll';
  let t = 0;
  let landed = false;
  let landing: SimResult['landing'] = null;
  let holed = false;
  let inWater = false;
  let hitTree = false;
  let waterCross: { x: number; y: number } | null = null;
  let lastDry = { x: spec.x, y: spec.y };
  let decelMult = 1;
  let spinBackLeft = 0;
  let canopyCooldown = 0;
  let lipArmed = true;
  const ux = Math.cos(spec.aim), uy = Math.sin(spec.aim);
  const rx = uy, ry = -ux;

  // flight parameters
  const f = spec.flight;
  let C = 0, A = 0, T = 1, latCurve = 0, drift = 0;
  if (f) {
    const w = windComponents(spec.aim, f.windX, f.windY);
    C = f.carry * windCarryMult(w.along);
    A = f.apex;
    if (f.apexCap !== undefined) A = Math.min(A, Math.max(1.5, f.apexCap));
    T = f.hang * (A / Math.max(0.01, f.apex)) ** 0.5; // a capped (punch) flight is quicker
    latCurve = C * Math.tan((f.curveDeg * Math.PI) / 180);
    drift = w.cross * f.hang * 0.3;
  } else if (spec.rollSpeed !== undefined) {
    s.vx = ux * spec.rollSpeed;
    s.vy = uy * spec.rollSpeed;
  }
  const z0 = spec.z;
  const hOf = (u: number) => (u <= 0.55 ? A * (1 - ((0.55 - u) / 0.55) ** 2) : A * (1 - ((u - 0.55) / 0.45) ** 2));
  const posAt = (tau: number) => {
    const u = uOf(tau);
    const sAlong = C * u;
    const lat = latCurve * u * u + drift * tau * tau;
    return { x: spec.x + ux * sAlong + rx * lat, y: spec.y + uy * sAlong + ry * lat, z: z0 + hOf(u) };
  };

  const record = () => { out.push(s.x, s.y, s.z); };
  record();

  const trackDry = () => {
    if (!isWater(terrain.surface(s.x, s.y))) lastDry = { x: s.x, y: s.y };
  };

  const toRest = (type: SimEventType = 'rest') => {
    phase = 'rest';
    s.vx = s.vy = s.vz = 0;
    events.push({ t, type, x: s.x, y: s.y, z: s.z, surf: terrain.surface(s.x, s.y) });
  };

  const splash = () => {
    inWater = true;
    waterCross = { ...lastDry };
    s.z = terrain.z(s.x, s.y);
    events.push({ t, type: 'splash', x: s.x, y: s.y, z: s.z });
    toRest();
  };

  /** Trees / buildings while the ball is moving. Returns true if velocity changed. */
  const obstacles = (px: number, py: number, pz: number, stepLen: number): boolean => {
    if (!obs) return false;
    for (const k of obs.treesNear(s.x, s.y)) {
      const tr = obs.trees[k];
      const dx = s.x - tr.x, dy = s.y - tr.y;
      const d = Math.hypot(dx, dy);
      const hz = s.z - tr.base;
      if (d < TRUNK_R + BALL_R && hz < tr.h && hz > -0.1) {
        // trunk: reflect the horizontal velocity about the radial normal
        const nx = dx / (d || 1), ny = dy / (d || 1);
        const vn = s.vx * nx + s.vy * ny;
        if (vn < 0) {
          s.vx = (s.vx - 2 * vn * nx) * 0.5;
          s.vy = (s.vy - 2 * vn * ny) * 0.5;
          s.vz *= 0.5;
          s.x = tr.x + nx * (TRUNK_R + BALL_R + 0.01);
          s.y = tr.y + ny * (TRUNK_R + BALL_R + 0.01);
          hitTree = true;
          events.push({ t, type: 'trunk', x: s.x, y: s.y, z: s.z });
          return true;
        }
      }
      if (canopyCooldown <= 0 && d < tr.r && hz > tr.h * CANOPY_START && hz < tr.h && stepLen > 0) {
        const p = 1 - Math.exp(-0.15 * stepLen);
        if (rng.next() < p) {
          const sp = Math.hypot(s.vx, s.vy, s.vz) * rng.range(0.3, 0.6);
          const heading = Math.atan2(s.vy, s.vx) + ((rng.range(-60, 60) * Math.PI) / 180);
          s.vx = Math.cos(heading) * sp;
          s.vy = Math.sin(heading) * sp;
          s.vz = 0;
          canopyCooldown = 0.12;
          hitTree = true;
          events.push({ t, type: 'canopy', x: s.x, y: s.y, z: s.z });
          return true;
        }
      }
    }
    for (const k of obs.buildingsNear(s.x, s.y)) {
      const b = obs.buildings[k];
      if (s.z - b.base > b.h) continue;
      if (!b.poly.contains(s.x, s.y)) continue;
      const wasInside = b.poly.contains(px, py) && pz - b.base <= b.h + 0.05;
      const e = b.poly.nearestEdge(wasInside ? s.x : px, wasInside ? s.y : py);
      const vn = s.vx * e.nx + s.vy * e.ny;
      if (vn < 0 || wasInside) {
        s.vx = (s.vx - 2 * Math.min(vn, 0) * e.nx) * 0.4;
        s.vy = (s.vy - 2 * Math.min(vn, 0) * e.ny) * 0.4;
      }
      if (wasInside) {
        // came down onto the roof: roll off the nearest edge
        s.vx = e.nx * 1.5; s.vy = e.ny * 1.5;
        s.z = Math.max(s.z, b.base + b.h * 0.6);
      }
      s.x = e.x + e.nx * 0.15;
      s.y = e.y + e.ny * 0.15;
      events.push({ t, type: 'wall', x: s.x, y: s.y, z: s.z });
      return true;
    }
    return false;
  };

  /** Ground contact while airborne. */
  const contact = (fromFlight: boolean) => {
    const surf = terrain.surface(s.x, s.y);
    const zg = terrain.z(s.x, s.y);
    s.z = zg;
    if (!landed) {
      landed = true;
      landing = { x: s.x, y: s.y, z: s.z, t };
      events.push({ t, type: 'land', x: s.x, y: s.y, z: s.z, surf });
      if (spec.untilLanding) { toRest(); return; }
    } else {
      events.push({ t, type: 'bounce', x: s.x, y: s.y, z: s.z, surf });
    }
    if (isWater(surf)) { splash(); return; }
    // dunk straight into the cup
    if (spec.pin && Math.hypot(s.x - spec.pin.x, s.y - spec.pin.y) < CUP_R && Math.hypot(s.vx, s.vy) < 6) {
      holeOut();
      return;
    }
    const m = material(surf);
    const [gx, gy] = terrain.grad(s.x, s.y, 0.5);
    const nl = Math.hypot(gx, gy, 1);
    const nx = -gx / nl, ny = -gy / nl, nz = 1 / nl;
    const vn = s.vx * nx + s.vy * ny + s.vz * nz;
    const tvx = s.vx - vn * nx, tvy = s.vy - vn * ny, tvz = s.vz - vn * nz;
    let kept: number;
    if (fromFlight && f) {
      kept = m.kept * f.firstBounceK;
      if (f.spin < 0) kept *= 1 - 0.4 * -f.spin;
      else if (f.spin > 0) kept *= 1 + 0.1 * f.spin;
      decelMult = f.spin < 0 ? 1 + 0.6 * -f.spin : f.spin > 0 ? 1 - 0.15 * f.spin : 1;
      if (f.spinBack > 0 && (surf === SURF.green || surf === SURF.fringe)) spinBackLeft = f.spinBack;
    } else {
      kept = 0.5 + 0.5 * m.kept;
    }
    const outN = -vn * m.e;
    s.vx = tvx * kept + outN * nx;
    s.vy = tvy * kept + outN * ny;
    s.vz = tvz * kept + outN * nz;
    if (outN < 0.6 || m.e === 0) {
      // too little bounce left: start rolling along the ground
      s.vz = 0;
      phase = 'roll';
      if (spinBackLeft > 0) {
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const back = Math.sqrt(2 * m.decel * 1.6 * spinBackLeft);
        s.vx = (-s.vx / sp) * back;
        s.vy = (-s.vy / sp) * back;
        spinBackLeft = 0;
      }
    } else {
      phase = 'air';
      s.z = zg + 0.005;
    }
  };

  const holeOut = () => {
    holed = true;
    if (spec.pin) { s.x = spec.pin.x; s.y = spec.pin.y; }
    s.z = terrain.z(s.x, s.y) - 0.08;
    events.push({ t, type: 'holed', x: s.x, y: s.y, z: s.z });
    phase = 'rest';
    s.vx = s.vy = s.vz = 0;
  };

  let flightTau = 0;
  for (let step = 0; step < maxSteps && (phase as string) !== 'rest'; step++) {
    t += DT;
    canopyCooldown -= DT;
    const px = s.x, py = s.y, pz = s.z;
    if (phase === 'flight') {
      flightTau = t / T;
      const p = posAt(flightTau);
      s.vx = (p.x - s.x) / DT; s.vy = (p.y - s.y) / DT; s.vz = (p.z - s.z) / DT;
      s.x = p.x; s.y = p.y; s.z = p.z;
      if (!terrain.inWorld(s.x, s.y)) { clampEdge(); continue; }
      trackDry();
      const stepLen = Math.hypot(s.x - px, s.y - py, s.z - pz);
      if (obstacles(px, py, pz, stepLen)) { phase = 'air'; record(); continue; }
      if (flightTau > 0.02 && s.z <= terrain.z(s.x, s.y)) contact(true);
    } else if (phase === 'air') {
      s.vz -= G * DT;
      s.x += s.vx * DT; s.y += s.vy * DT; s.z += s.vz * DT;
      if (!terrain.inWorld(s.x, s.y)) { clampEdge(); continue; }
      trackDry();
      const stepLen = Math.hypot(s.x - px, s.y - py, s.z - pz);
      obstacles(px, py, pz, stepLen);
      if (s.z <= terrain.z(s.x, s.y)) contact(false);
    } else if (phase === 'roll') {
      const surf = terrain.surface(s.x, s.y);
      if (isWater(surf)) { splash(); record(); break; }
      const m = material(surf);
      const [gx, gy] = terrain.grad(s.x, s.y, surf === SURF.green ? 0.2 : 0.4);
      const k = (ROLL_SLOPE * G) / Math.sqrt(1 + gx * gx + gy * gy);
      const ax = -gx * k, ay = -gy * k;
      const aSlope = Math.hypot(ax, ay);
      const decel = m.decel * decelMult;
      const sp = Math.hypot(s.vx, s.vy);
      let nvx: number, nvy: number;
      if (sp > 1e-6) {
        nvx = s.vx + (ax - (decel * s.vx) / sp) * DT;
        nvy = s.vy + (ay - (decel * s.vy) / sp) * DT;
        if (nvx * s.vx + nvy * s.vy < 0 && aSlope <= Math.max(m.staticMu * G, decel)) { nvx = 0; nvy = 0; }
      } else if (aSlope > Math.max(m.staticMu * G, decel)) {
        nvx = ax * DT; nvy = ay * DT;
      } else {
        nvx = 0; nvy = 0;
      }
      s.vx = nvx; s.vy = nvy;
      s.x += s.vx * DT; s.y += s.vy * DT;
      if (!terrain.inWorld(s.x, s.y)) { clampEdge(); continue; }
      s.z = terrain.z(s.x, s.y);
      trackDry();
      // cup
      if (spec.pin) {
        const d = segPointDist(px, py, s.x, s.y, spec.pin.x, spec.pin.y);
        const spd = Math.hypot(s.vx, s.vy);
        if (d < LIP_R) {
          if (d < CUP_R && spd < 1.3) { holeOut(); record(); break; }
          if (d >= CUP_R && spd < 0.6) { holeOut(); record(); break; }
          if (lipArmed) {
            lipArmed = false;
            const side = rng.next() < 0.5 ? -1 : 1;
            const frac = 1 - Math.min(1, Math.max(0, (d - CUP_R) / (LIP_R - CUP_R)));
            const ang = side * ((10 + 35 * frac) * Math.PI) / 180;
            const c = Math.cos(ang), sn = Math.sin(ang);
            const vx2 = (s.vx * c - s.vy * sn) * 0.72, vy2 = (s.vx * sn + s.vy * c) * 0.72;
            s.vx = vx2; s.vy = vy2;
            events.push({ t, type: 'lipout', x: s.x, y: s.y, z: s.z, speed: spd });
          }
        } else if (!lipArmed && Math.hypot(s.x - spec.pin.x, s.y - spec.pin.y) > 0.3) {
          lipArmed = true;
        }
      }
      obstacles(px, py, pz, 0);
      if (Math.hypot(s.vx, s.vy) < 0.05 && aSlope <= Math.max(m.staticMu * G, decel)) {
        decelMult = 1;
        toRest();
      }
    }
    record();
  }
  if ((phase as string) !== 'rest') toRest();

  function clampEdge() {
    s.x = Math.min(Math.max(s.x, 0.01), terrain.width - 0.01);
    s.y = Math.min(Math.max(s.y, 0.01), terrain.height - 0.01);
    s.z = terrain.z(s.x, s.y);
    events.push({ t, type: 'edge', x: s.x, y: s.y, z: s.z });
    toRest();
    record();
  }

  const samples = Float32Array.from(out);
  const restSurface = terrain.surface(s.x, s.y);
  return {
    samples,
    n: samples.length / 3,
    end: { x: s.x, y: s.y, z: s.z },
    restSurface,
    holed,
    inWater,
    waterCross,
    landing,
    events,
    duration: t,
    hitTree,
  };
}

export function segPointDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

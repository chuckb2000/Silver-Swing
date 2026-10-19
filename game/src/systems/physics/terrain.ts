// Terrain: heightmap + analytic green models + surface map.
// Mirrors pipeline/terrain.py exactly so the art and the physics agree.

import { SURF } from './surfaces';

export interface Bump { x: number; y: number; a: number; s: number }
export interface PinFlat { px: number; py: number; r0: number; r1: number; zp: number; fx: number; fy: number }
/** A tier line on a green: a smooth step of height h across the line through (x, y)
 *  whose unit normal (nx, ny) points to the upper tier, w metres wide. */
export interface Tier { x: number; y: number; nx: number; ny: number; w: number; h: number }
export interface GreenDef {
  id: string;
  hole: number | null;
  poly: number[][];
  cx: number; cy: number; z0: number; gx: number; gy: number;
  bumps: Bump[];
  blend: number;
  pinFlat?: PinFlat;
  tiers?: Tier[];
}

function smoothstep(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/** Height added by a green's tier lines, centred so the green's mean height is unchanged.
 *  Mirrors tier_offset() in pipeline/terrain.py. */
export function tierOffset(x: number, y: number, tiers: Tier[]): number {
  let z = 0;
  for (const t of tiers) {
    const d = (x - t.x) * t.nx + (y - t.y) * t.ny;
    z += t.h * (smoothstep(d / t.w + 0.5) - 0.5);
  }
  return z;
}

export class Polygon {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number;

  constructor(pts: number[][]) {
    const n = pts.length;
    this.xs = new Float64Array(n);
    this.ys = new Float64Array(n);
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[i];
      this.xs[i] = x; this.ys[i] = y;
      a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y);
    }
    this.minX = a; this.minY = b; this.maxX = c; this.maxY = d;
  }

  contains(x: number, y: number): boolean {
    if (x < this.minX || x > this.maxX || y < this.minY || y > this.maxY) return false;
    const { xs, ys } = this;
    let inside = false;
    for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
      if ((ys[i] > y) !== (ys[j] > y) && x < ((xs[j] - xs[i]) * (y - ys[i])) / (ys[j] - ys[i]) + xs[i]) inside = !inside;
    }
    return inside;
  }

  /** Distance from (x, y) to the polygon outline. */
  edgeDistance(x: number, y: number): number {
    const { xs, ys } = this;
    let best = Infinity;
    for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
      const ax = xs[j], ay = ys[j], bx = xs[i], by = ys[i];
      const dx = bx - ax, dy = by - ay;
      const L2 = dx * dx + dy * dy || 1e-12;
      let t = ((x - ax) * dx + (y - ay) * dy) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx - x, py = ay + t * dy - y;
      const d2 = px * px + py * py;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }

  /** Nearest point on the outline and the outward-ish edge normal there. */
  nearestEdge(x: number, y: number): { x: number; y: number; nx: number; ny: number; d: number } {
    const { xs, ys } = this;
    let best = Infinity, bx_ = x, by_ = y, nx = 0, ny = 0;
    for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
      const ax = xs[j], ay = ys[j], bx = xs[i], by = ys[i];
      const dx = bx - ax, dy = by - ay;
      const L2 = dx * dx + dy * dy || 1e-12;
      let t = ((x - ax) * dx + (y - ay) * dy) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx, py = ay + t * dy;
      const d2 = (px - x) ** 2 + (py - y) ** 2;
      if (d2 < best) {
        best = d2; bx_ = px; by_ = py;
        const L = Math.sqrt(L2);
        nx = dy / L; ny = -dx / L;
      }
    }
    // orient the normal away from the polygon interior
    const probeIn = this.contains(bx_ + nx * 0.05, by_ + ny * 0.05);
    if (probeIn) { nx = -nx; ny = -ny; }
    return { x: bx_, y: by_, nx, ny, d: Math.sqrt(best) };
  }

  area(): number {
    const { xs, ys } = this;
    let a = 0;
    for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) a += (xs[j] + xs[i]) * (ys[j] - ys[i]);
    return Math.abs(a) / 2;
  }
}

export class GreenModel {
  readonly def: GreenDef;
  readonly poly: Polygon;
  private readonly bx0: number; private readonly by0: number; private readonly bx1: number; private readonly by1: number;

  constructor(def: GreenDef) {
    this.def = def;
    this.poly = new Polygon(def.poly);
    this.bx0 = this.poly.minX - def.blend; this.by0 = this.poly.minY - def.blend;
    this.bx1 = this.poly.maxX + def.blend; this.by1 = this.poly.maxY + def.blend;
  }

  inBlendBox(x: number, y: number): boolean {
    return x >= this.bx0 && x <= this.bx1 && y >= this.by0 && y <= this.by1;
  }

  model(x: number, y: number): number {
    const d = this.def;
    let z = d.z0 + d.gx * (x - d.cx) + d.gy * (y - d.cy);
    for (const b of d.bumps) {
      const dx = x - b.x, dy = y - b.y;
      z += b.a * Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s));
    }
    if (d.tiers) z += tierOffset(x, y, d.tiers);
    return z;
  }

  shaped(x: number, y: number): number {
    let z = this.model(x, y);
    const pf = this.def.pinFlat;
    if (pf) {
      const dist = Math.hypot(x - pf.px, y - pf.py);
      const wp = 1 - smoothstep((dist - pf.r0) / (pf.r1 - pf.r0));
      if (wp > 0) {
        const zp = pf.zp + pf.fx * (x - pf.px) + pf.fy * (y - pf.py);
        z = z + (zp - z) * wp;
      }
    }
    return z;
  }

  weight(x: number, y: number): number {
    if (!this.inBlendBox(x, y)) return 0;
    if (this.poly.contains(x, y)) return 1;
    const dist = this.poly.edgeDistance(x, y);
    return 1 - smoothstep(dist / this.def.blend);
  }
}

export interface TerrainInit {
  width: number;   // metres
  height: number;  // metres
  pxPerM: number;  // surface map resolution
  heights: Float32Array; // (cols x rows) vertices at whole metres, row 0 = SOUTH
  hCols: number;
  hRows: number;
  surface: Uint8Array;   // (width*pxPerM x height*pxPerM), row 0 = NORTH
  greens: GreenDef[];
}

export class Terrain {
  readonly width: number;
  readonly height: number;
  readonly pxPerM: number;
  readonly greens: GreenModel[];
  private readonly hz: Float32Array;
  private readonly hCols: number;
  private readonly hRows: number;
  readonly surf: Uint8Array;
  readonly sW: number;
  readonly sH: number;

  constructor(o: TerrainInit) {
    this.width = o.width;
    this.height = o.height;
    this.pxPerM = o.pxPerM;
    this.hz = o.heights;
    this.hCols = o.hCols;
    this.hRows = o.hRows;
    this.surf = o.surface;
    this.sW = Math.round(o.width * o.pxPerM);
    this.sH = Math.round(o.height * o.pxPerM);
    this.greens = o.greens.map((g) => new GreenModel(g));
  }

  baseZ(x: number, y: number): number {
    const W = this.hCols, H = this.hRows;
    let xc = x < 0 ? 0 : x > W - 1.000001 ? W - 1.000001 : x;
    let yc = y < 0 ? 0 : y > H - 1.000001 ? H - 1.000001 : y;
    const i = Math.floor(xc), j = Math.floor(yc);
    const fx = xc - i, fy = yc - j;
    const a = this.hz;
    const r0 = j * W, r1 = (j + 1) * W;
    const z00 = a[r0 + i], z10 = a[r0 + i + 1], z01 = a[r1 + i], z11 = a[r1 + i + 1];
    xc = z00 * (1 - fx) + z10 * fx;
    yc = z01 * (1 - fx) + z11 * fx;
    return xc * (1 - fy) + yc * fy;
  }

  greenAt(x: number, y: number): GreenModel | null {
    for (const g of this.greens) if (g.inBlendBox(x, y) && g.weight(x, y) > 0) return g;
    return null;
  }

  z(x: number, y: number): number {
    const zb = this.baseZ(x, y);
    for (const g of this.greens) {
      if (!g.inBlendBox(x, y)) continue;
      const w = g.weight(x, y);
      if (w > 0) return zb + (g.shaped(x, y) - zb) * w;
    }
    return zb;
  }

  /** dz/dx, dz/dy by central differences (e metres). */
  grad(x: number, y: number, e = 0.25): [number, number] {
    const gx = (this.z(x + e, y) - this.z(x - e, y)) / (2 * e);
    const gy = (this.z(x, y + e) - this.z(x, y - e)) / (2 * e);
    return [gx, gy];
  }

  surface(x: number, y: number): number {
    const c = Math.floor(x * this.pxPerM);
    const r = Math.floor((this.height - y) * this.pxPerM);
    if (c < 0 || r < 0 || c >= this.sW || r >= this.sH) return SURF.ob;
    return this.surf[r * this.sW + c];
  }

  inWorld(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x <= this.width && y <= this.height;
  }
}

/** A flat synthetic terrain for tests (single surface, optional slope). */
export function flatTerrain(surface: number, opts: { width?: number; height?: number; slopeX?: number; slopeY?: number; z0?: number } = {}): Terrain {
  const width = opts.width ?? 600, height = opts.height ?? 600;
  const cols = width + 1, rows = height + 1;
  const heights = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) heights[j * cols + i] = (opts.z0 ?? 50) + (opts.slopeX ?? 0) * i + (opts.slopeY ?? 0) * j;
  const pxPerM = 2;
  const surf = new Uint8Array(width * pxPerM * height * pxPerM).fill(surface);
  return new Terrain({ width, height, pxPerM, heights, hCols: cols, hRows: rows, surface: surf, greens: [] });
}

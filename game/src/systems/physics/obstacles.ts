// Trees and buildings as physics obstacles, with a uniform-grid index.

import { Polygon } from './terrain';

export interface TreeArrays {
  x: number[]; y: number[]; h: number[]; r: number[]; c: number[];
}

export interface Tree {
  i: number;
  x: number; y: number;
  h: number;      // height above ground, m
  r: number;      // crown radius, m
  conifer: boolean;
  /** trees.json `c`: 0 deciduous, 1 conifer, 2 flowering tree (drawn in blossom), 3 flowering shrub (drawn in shrubs); 2 and 3 are deciduous for physics */
  kind?: number;
  base: number;   // ground elevation at the trunk
}

export interface Building {
  id: string;
  poly: Polygon;
  h: number;      // wall height, m
  base: number;   // ground elevation (min around footprint)
  inside: boolean;
}

export const TRUNK_R = 0.4;
export const CANOPY_START = 0.4; // canopy from 40% of height to the top

export class Obstacles {
  readonly trees: Tree[];
  readonly buildings: Building[];
  private readonly cell = 8;
  private readonly cols: number;
  private readonly rows: number;
  private readonly grid: number[][];
  private readonly bgrid: number[][];

  constructor(trees: Tree[], buildings: Building[], width: number, height: number) {
    this.trees = trees;
    this.buildings = buildings;
    this.cols = Math.ceil(width / this.cell) + 1;
    this.rows = Math.ceil(height / this.cell) + 1;
    this.grid = Array.from({ length: this.cols * this.rows }, () => []);
    this.bgrid = Array.from({ length: this.cols * this.rows }, () => []);
    trees.forEach((t, k) => {
      const rr = Math.max(t.r, TRUNK_R) + 0.1;
      this.cells(t.x - rr, t.y - rr, t.x + rr, t.y + rr, (c) => this.grid[c].push(k));
    });
    buildings.forEach((b, k) => {
      this.cells(b.poly.minX, b.poly.minY, b.poly.maxX, b.poly.maxY, (c) => this.bgrid[c].push(k));
    });
  }

  private cells(x0: number, y0: number, x1: number, y1: number, f: (c: number) => void) {
    const c0 = Math.max(0, Math.floor(x0 / this.cell)), c1 = Math.min(this.cols - 1, Math.floor(x1 / this.cell));
    const r0 = Math.max(0, Math.floor(y0 / this.cell)), r1 = Math.min(this.rows - 1, Math.floor(y1 / this.cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) f(r * this.cols + c);
  }

  treesNear(x: number, y: number): number[] {
    const c = Math.floor(x / this.cell), r = Math.floor(y / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return [];
    return this.grid[r * this.cols + c];
  }

  buildingsNear(x: number, y: number): number[] {
    const c = Math.floor(x / this.cell), r = Math.floor(y / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return [];
    return this.bgrid[r * this.cols + c];
  }

  /**
   * Would a tree hide this ground point on screen? In the 3/4 view a tree is
   * drawn upward from its trunk (north), so its crown covers ground up to
   * `vk` x its height north of the trunk.
   */
  hidesPoint(x: number, y: number, vk = 0.7): boolean {
    const c0 = Math.max(0, Math.floor((x - 12) / this.cell)), c1 = Math.min(this.cols - 1, Math.floor((x + 12) / this.cell));
    const r0 = Math.max(0, Math.floor((y - 50) / this.cell)), r1 = Math.min(this.rows - 1, Math.floor((y + 1) / this.cell));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        for (const k of this.grid[r * this.cols + c]) {
          const t = this.trees[k];
          const dy = y - t.y; // metres north of the trunk
          if (dy < -0.5 || dy > t.h * vk) continue;
          const half = dy < t.h * vk * 0.2 ? 1 : t.r * 0.9; // trunk near the base, crown above
          if (Math.abs(x - t.x) < half) return true;
        }
      }
    }
    return false;
  }

  /** Lowest canopy overhead at (x, y) above ground z, or null when in the open. */
  canopyOverhead(x: number, y: number): { base: number; tree: Tree } | null {
    let best: { base: number; tree: Tree } | null = null;
    for (const k of this.treesNear(x, y)) {
      const t = this.trees[k];
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < t.r * 0.85 && d > TRUNK_R) {
        const b = t.h * CANOPY_START;
        if (!best || b < best.base) best = { base: b, tree: t };
      }
    }
    return best;
  }

  static fromArrays(a: TreeArrays, groundZ: (x: number, y: number) => number): Tree[] {
    const out: Tree[] = [];
    for (let i = 0; i < a.x.length; i++) {
      out.push({ i, x: a.x[i], y: a.y[i], h: a.h[i], r: a.r[i], conifer: a.c[i] === 1, kind: a.c[i], base: groundZ(a.x[i], a.y[i]) });
    }
    return out;
  }
}

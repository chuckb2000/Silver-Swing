// Course data as exported by the pipeline (game/public/courses/<id>/course.json)
// plus the runtime structures built from it.

import { Building, Obstacles, Tree, TreeArrays } from '../systems/physics/obstacles';
import { GreenDef, Polygon, Terrain } from '../systems/physics/terrain';

export interface TeeJson { x: number; y: number; yd: number; adjYd: number; realYd: number; cardYd: number; centerline: number[][] }
export interface HoleJson {
  number: number; par: number; handicap: number;
  tees: Record<string, TeeJson>;
  greenId: string; greenCenter: [number, number]; pin: [number, number];
}
export interface WaterJson { id: string; penalty: 'red' | 'yellow'; poly: number[][] }
export interface BuildingJson { id: string; h: number; inside: boolean; poly: number[][] }
export interface MinimapJson { hole: number; file: string; x0: number; y1: number; mPerPx: number; w: number; h: number }
/** High-resolution art of a green and its surroundings at one scale. */
export interface GreenLayerJson {
  file: string;          // terrain art, `ppm` pixels per metre
  trees: string;         // tree atlas (Phaser JSON hash) for the trees in the window
  treesImage: string;
  x0: number; y1: number; // world metres of the top-left corner (west, north)
  w: number; h: number;   // size in metres
  ppm: number;
}
/** Putting views of one green: far (long putts) and near (close-up). */
export interface GreenViewJson {
  hole: number;
  far: GreenLayerJson;
  near: GreenLayerJson;
  close?: GreenLayerJson;
}

export interface CourseJson {
  id: string; name: string; location: string; architects: string; theme: string;
  attribution: string[];
  world: { width: number; height: number; pxPerM: number; utmOrigin: [number, number]; epsg: number };
  teeSets: { name: string; rating: number; slope: number; totalYd: number }[];
  defaultTee: string;
  par: number;
  holes: HoleJson[];
  greens: GreenDef[];
  water: WaterJson[];
  boundary: number[][];
  buildings: BuildingJson[];
  terrain: { chunk: number; cols: number; rows: number; pattern: string };
  waterFrames: { file: string; px: number; py: number; w: number; h: number; frames: number }[];
  height: { file: string; meta: string };
  surface: { file: string; ids: Record<string, number>; obIds: number[] };
  trees: { file: string };
  maps: { overview: string; overviewMPerPx: number; holes: MinimapJson[] };
  wind?: { minMph: number; maxMph: number };
  greenViews?: GreenViewJson[];
  /** a club of three or more nines: each nine's id, name and course holes (lengths.ts) */
  nines?: { id: string; name: string; holes: number[] }[];
}

export interface HeightMeta { cols: number; rows: number; res: number; min: number; max: number; samples: [number, number, number][] }

export interface CourseRuntime {
  json: CourseJson;
  terrain: Terrain;
  obstacles: Obstacles;
  boundary: Polygon;
  water: { id: string; penalty: 'red' | 'yellow'; poly: Polygon }[];
  greenPolys: Map<string, Polygon>;
  baseUrl: string;
}

/**
 * Decode the RG-encoded height image (row 0 = north) into rows south->north.
 * `channels` is the bytes per pixel of `px` (3 from decodePng's RGB, 4 from RGBA).
 */
export function decodeHeights(px: ArrayLike<number>, meta: HeightMeta, channels = 4): Float32Array {
  const { cols, rows, min, max } = meta;
  const out = new Float32Array(cols * rows);
  const scale = (max - min) / 65535;
  for (let r = 0; r < rows; r++) {
    const j = rows - 1 - r; // image row r -> grid row j (south->north)
    for (let i = 0; i < cols; i++) {
      const k = (r * cols + i) * channels;
      out[j * cols + i] = min + (px[k] * 256 + px[k + 1]) * scale;
    }
  }
  return out;
}

/** Surface ids from the greyscale surface image (`channels` bytes per pixel, the id in the first). */
export function decodeSurface(px: ArrayLike<number>, w: number, h: number, channels = 4): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = px[i * channels];
  return out;
}

export function buildRuntime(json: CourseJson, heights: Float32Array, hmeta: HeightMeta, surface: Uint8Array, trees: TreeArrays, baseUrl: string): CourseRuntime {
  const terrain = new Terrain({
    width: json.world.width, height: json.world.height, pxPerM: json.world.pxPerM,
    heights, hCols: hmeta.cols, hRows: hmeta.rows, surface, greens: json.greens,
  });
  const treeList: Tree[] = Obstacles.fromArrays(trees, (x, y) => terrain.z(x, y));
  const buildings: Building[] = json.buildings.map((b) => {
    const poly = new Polygon(b.poly);
    let base = Infinity;
    for (const [x, y] of b.poly) base = Math.min(base, terrain.z(x, y));
    return { id: b.id, poly, h: b.h, base, inside: b.inside };
  });
  const obstacles = new Obstacles(treeList, buildings, terrain.width, terrain.height);
  const greenPolys = new Map<string, Polygon>();
  for (const g of terrain.greens) greenPolys.set(g.def.id, g.poly);
  return {
    json, terrain, obstacles,
    boundary: new Polygon(json.boundary),
    water: json.water.map((w) => ({ id: w.id, penalty: w.penalty, poly: new Polygon(w.poly) })),
    greenPolys,
    baseUrl,
  };
}

// Shared application state (settings, loaded course, current round).

import type { CourseRuntime } from './data/course';
import { DEFAULT_SETTINGS, Settings } from './save/store';
import type { Round } from './systems/game/round';

export const COURSE_ID = 'oswego_lake';
export const PX_PER_M = 2;
export const HEIGHT_PX = PX_PER_M * 0.7; // vertical objects: px per metre of height
export const YD = 0.9144;

export const app = {
  settings: { ...DEFAULT_SETTINGS } as Settings,
  course: null as CourseRuntime | null,
  round: null as Round | null,
  /** device pixels per texel (see scale.ts) */
  zoom: 4,
  /** view size in texels: the coordinate space of the HUD and menus */
  view: { w: 480, h: 270 },
  calibration: {} as Record<string, number>,
};

export function fmtDist(m: number, units = app.settings.units): string {
  return units === 'yd' ? `${Math.round(m / YD)}` : `${Math.round(m)}`;
}

export function unitLabel(units = app.settings.units): string {
  return units === 'yd' ? 'yd' : 'm';
}

/** World metres -> world pixels (row 0 = north). */
export function toPx(x: number, y: number): { x: number; y: number } {
  const H = app.course ? app.course.json.world.height : 1024;
  return { x: x * PX_PER_M, y: (H - y) * PX_PER_M };
}

export function toWorld(px: number, py: number): { x: number; y: number } {
  const H = app.course ? app.course.json.world.height : 1024;
  return { x: px / PX_PER_M, y: H - py / PX_PER_M };
}

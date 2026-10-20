// Labels for the strokes of a hole, for "rewatch a shot" on the hole-complete
// panel (developer, 2026-10-20). Pure: no Phaser.
import type { PlayedStroke } from './round';

const YD = 0.9144, FT = 0.3048;

/** How far the ball went, in the player's units: putts in feet (or metres), other shots in yards (or metres). */
export function strokeDistance(st: PlayedStroke, units: 'yd' | 'm'): string {
  const m = Math.hypot(st.to.x - st.from.x, st.to.y - st.from.y);
  if (st.shot.club.kind === 'putter') {
    if (units === 'yd') return `${Math.round(m / FT)} ft`;
    return m < 10 ? `${Math.round(m * 10) / 10} m` : `${Math.round(m)} m`;
  }
  return units === 'yd' ? `${Math.round(m / YD)} yd` : `${Math.round(m)} m`;
}

const RESULT: Record<PlayedStroke['result'], string> = { holed: 'holed', water: 'water', ob: 'out of bounds', rest: '' };

/** "shot 2 · 7 iron · 148 yd", "shot 4 · putter · 12 ft · holed" */
export function strokeLabel(st: PlayedStroke, units: 'yd' | 'm' = 'yd'): string {
  return [`shot ${st.n}`, st.shot.club.name, strokeDistance(st, units), RESULT[st.result]].filter(Boolean).join(' · ');
}

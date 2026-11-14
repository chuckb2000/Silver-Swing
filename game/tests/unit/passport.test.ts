// The passport's maps (developer, 2026-11-13: "maybe it could be like a zoomed out view of a few
// holes"): every course on offer has one, the size of a passport tile (assets-src/passport_maps.py).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { registry } from './helpers';

describe('passport maps', () => {
  it('every course on offer has a 104 x 52 map', () => {
    for (const c of registry()) {
      const f = resolve(__dirname, `../../public/sprites/passport/${c.id}.png`);
      expect(existsSync(f), `${c.id}: run python3 assets-src/passport_maps.py ${c.id}`).toBe(true);
      const png = PNG.sync.read(readFileSync(f));
      expect([png.width, png.height], c.id).toEqual([104, 52]);
    }
  });
});

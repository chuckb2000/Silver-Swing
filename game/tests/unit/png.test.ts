// The course data images are decoded from their PNG bytes (no canvas), so
// browsers that add noise to canvas reads (Safari 26, Brave) get exact values.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { decodeHeights, decodeSurface, HeightMeta } from '../../src/data/course';
import { decodePng } from '../../src/data/png';
import { COURSES_DIR, registry } from './helpers';

/** A deterministic test image written by pngjs with one filter type. */
function encode(w: number, h: number, colorType: 0 | 2 | 6, filterType: number, seed: number) {
  const png = new PNG({ width: w, height: h });
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) & 255);
  for (let i = 0; i < w * h; i++) {
    // smooth-ish values so every filter predicts something, plus noise
    const v = (i % w) * 3 + Math.floor(i / w) * 5 + (rnd() & 7);
    png.data[i * 4] = v & 255;
    png.data[i * 4 + 1] = colorType === 0 ? v & 255 : rnd();
    png.data[i * 4 + 2] = colorType === 0 ? v & 255 : (v * 7) & 255;
    png.data[i * 4 + 3] = colorType === 6 ? rnd() : 255;
  }
  const bytes = PNG.sync.write(png, { colorType, filterType });
  return { png, bytes };
}

describe('decodePng', () => {
  for (const colorType of [0, 2, 6] as const) {
    for (const filterType of [0, 1, 2, 3, 4]) {
      it(`colour type ${colorType}, filter ${filterType}`, async () => {
        const { png, bytes } = encode(37, 23, colorType, filterType, 11 + filterType);
        const img = await decodePng(bytes);
        const ch = colorType === 0 ? 1 : colorType === 2 ? 3 : 4;
        expect([img.width, img.height, img.channels]).toEqual([37, 23, ch]);
        for (let i = 0; i < 37 * 23; i++) {
          for (let c = 0; c < ch; c++) expect(img.data[i * ch + c]).toBe(png.data[i * 4 + c]);
        }
      });
    }
  }

  it('rejects what it cannot read', async () => {
    await expect(decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).rejects.toThrow(/not a PNG/);
  });

  for (const c of registry()) {
    it(`${c.id}: surface and height images decode exactly`, async () => {
      const base = resolve(COURSES_DIR, c.id);
      const json = JSON.parse(readFileSync(resolve(base, 'course.json'), 'utf8'));
      const meta = JSON.parse(readFileSync(resolve(base, 'height.json'), 'utf8')) as HeightMeta;
      const sBytes = readFileSync(resolve(base, json.surface.file));
      const s = await decodePng(sBytes);
      const ref = PNG.sync.read(sBytes);
      const surf = decodeSurface(s.data, s.width, s.height, s.channels);
      const surfRef = decodeSurface(ref.data, ref.width, ref.height, 4);
      expect(Buffer.compare(Buffer.from(surf), Buffer.from(surfRef))).toBe(0);
      const known = new Set(Object.values(json.surface.ids as Record<string, number>));
      expect(surf.every((v) => known.has(v))).toBe(true);
      const h = await decodePng(readFileSync(resolve(base, json.height.file)));
      const heights = decodeHeights(h.data, meta, h.channels);
      for (const [i, j, z] of meta.samples) expect(Math.abs(heights[j * meta.cols + i] - z)).toBeLessThan(0.01);
    });
  }
});

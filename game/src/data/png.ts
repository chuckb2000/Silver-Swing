// Decoding the course's data images (surface ids, packed heights) straight
// from the PNG bytes, without a canvas. Reading pixels back from a canvas is
// not exact in every browser: Safari 26 (in all browsing modes), Brave and
// Firefox with resistFingerprinting add small random changes to canvas reads
// as anti-fingerprinting. On the surface map a change of 1 turns fairway (2)
// into rough (1) and rough into out of bounds (0) - what players saw on
// Oswego Lake. Pure (no DOM): runs in the browser and in the unit tests.
//
// Supports what the pipeline writes: 8-bit greyscale, grey+alpha, RGB and
// RGBA, not interlaced.

export interface RawImage {
  width: number;
  height: number;
  /** samples per pixel: 1 grey, 2 grey+alpha, 3 RGB, 4 RGBA */
  channels: number;
  /** row-major, `channels` bytes per pixel, row 0 = top */
  data: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** zlib inflate with the browser's (or Node's) built-in decompressor. */
export async function inflate(z: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([z as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function canDecodePng(): boolean {
  return typeof DecompressionStream !== 'undefined';
}

export async function decodePng(bytes: ArrayBuffer | Uint8Array): Promise<RawImage> {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < 8; i++) if (b[i] !== SIGNATURE[i]) throw new Error('not a PNG file');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let width = 0, height = 0, depth = 0, type = -1, interlace = 0;
  const parts: Uint8Array[] = [];
  let total = 0;
  for (let p = 8; p + 8 <= b.length;) {
    const len = dv.getUint32(p);
    const kind = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    if (kind === 'IHDR') {
      width = dv.getUint32(p + 8);
      height = dv.getUint32(p + 12);
      depth = b[p + 16];
      type = b[p + 17];
      interlace = b[p + 20];
    } else if (kind === 'IDAT') {
      parts.push(b.subarray(p + 8, p + 8 + len));
      total += len;
    } else if (kind === 'IEND') {
      break;
    }
    p += 12 + len;
  }
  const channels = CHANNELS[type];
  if (!width || !height || !channels || depth !== 8 || interlace !== 0) {
    throw new Error(`unsupported PNG: colour type ${type}, bit depth ${depth}, interlace ${interlace}`);
  }
  const z = new Uint8Array(total);
  let o = 0;
  for (const part of parts) { z.set(part, o); o += part.length; }
  const raw = await inflate(z);
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) throw new Error('PNG image data is truncated');
  return { width, height, channels, data: unfilter(raw, width, height, channels) };
}

/** Undo the per-row PNG filters (none, sub, up, average, Paeth). */
function unfilter(raw: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let r = 0; r < height; r++) {
    const f = raw[r * (stride + 1)];
    const src = r * (stride + 1) + 1;
    const dst = r * stride;
    const up = dst - stride; // previous row in out (only read when r > 0)
    switch (f) {
      case 0:
        out.set(raw.subarray(src, src + stride), dst);
        break;
      case 1:
        for (let i = 0; i < stride; i++) out[dst + i] = (raw[src + i] + (i >= bpp ? out[dst + i - bpp] : 0)) & 255;
        break;
      case 2:
        for (let i = 0; i < stride; i++) out[dst + i] = (raw[src + i] + (r > 0 ? out[up + i] : 0)) & 255;
        break;
      case 3:
        for (let i = 0; i < stride; i++) {
          const a = i >= bpp ? out[dst + i - bpp] : 0;
          const bb = r > 0 ? out[up + i] : 0;
          out[dst + i] = (raw[src + i] + ((a + bb) >> 1)) & 255;
        }
        break;
      case 4:
        for (let i = 0; i < stride; i++) {
          const a = i >= bpp ? out[dst + i - bpp] : 0;
          const bb = r > 0 ? out[up + i] : 0;
          const c = r > 0 && i >= bpp ? out[up + i - bpp] : 0;
          const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
          out[dst + i] = (raw[src + i] + pred) & 255;
        }
        break;
      default:
        throw new Error(`bad PNG filter ${f} on row ${r}`);
    }
  }
  return out;
}

"""Flowering shrubs (rhododendrons and the like) for any course: trees.json `c: 3`.

    python3 assets-src/shrubs.py        (also run by `make assets`)

Writes game/public/sprites/shrubs.png/json. Frames are keyed
`s_<w>_<h>_<variant>` on their own small size grid (SHRUB_WIDTHS x
SHRUB_HEIGHTS, below); `shrub_key()` is the sprite choice, the same one the
game makes (game/src/ui/shrubs.ts). The variant is the bush's index in
trees.json modulo 8, so a pipeline sets a bush's colour by where it puts the
bush in the list:

  0 pink   1 magenta   2 purple   3 white   4 red   5 coral   6 pale pink
  7 not in flower (leaves only)

`shrub(W, H, variant)` draws one bush at any size, for views at other scales
(the putting views, s09b). The shape: a low, wide mound of leaves, dark green
lit from the upper left like the trees, with trusses of blossom dotted over
the top and the lit side, a dark outline. Theme tree sheets are not touched.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from atlas import Atlas, hex2rgba  # noqa: E402
from trees import _outline  # noqa: E402

OUT = HERE.parent / "game" / "public" / "sprites"

SHRUB_WIDTHS = list(range(6, 26, 2))      # 6..24 px (course art at 2 px/m: bushes 3-12 m across)
SHRUB_HEIGHTS = list(range(4, 22, 2))     # 4..20 px
VARIANTS = 8
PX_PER_M = 2.0
HEIGHT_PX = PX_PER_M * 0.7                # vertical objects, as in the game (app.ts)

LEAF = [hex2rgba(c) for c in ("#1b3322", "#2a4f30", "#3b6b3e", "#548a4f")]   # outline, shade, mid, lit
# blossom per variant: shade, base, lit
FLOWERS = [
    [hex2rgba(c) for c in ("#c8507e", "#e97aa6", "#fbb6d0")],   # 0 pink
    [hex2rgba(c) for c in ("#9e1f6a", "#cc2f8c", "#f06bb4")],   # 1 magenta
    [hex2rgba(c) for c in ("#5e3f94", "#8462bd", "#b49ae0")],   # 2 purple
    [hex2rgba(c) for c in ("#bfc0cf", "#eeeef3", "#ffffff")],   # 3 white
    [hex2rgba(c) for c in ("#9b1c26", "#cf3038", "#f0646a")],   # 4 red
    [hex2rgba(c) for c in ("#c4553c", "#ec7b5c", "#ffab8c")],   # 5 coral
    [hex2rgba(c) for c in ("#d99ab2", "#f3c3d6", "#fde6ef")],   # 6 pale pink
    None,                                                       # 7 not in flower
]


def _ok(w: int, h: int) -> bool:
    return 0.5 * w <= h <= w + 2


def shrub_key(i: int, r: float, h: float) -> str:
    """Sprite for a bush of crown radius r and height h (m), index i in trees.json."""
    q = lambda vals, v: min(vals, key=lambda b: abs(b - v))  # noqa: E731
    w = q(SHRUB_WIDTHS, r * 2 * PX_PER_M)
    hh = q(SHRUB_HEIGHTS, 0.6 * w + h * HEIGHT_PX)      # the top seen at 3/4 plus the front
    while hh < 0.5 * w and hh < SHRUB_HEIGHTS[-1]:
        hh += 2
    while hh > w + 2 and hh > SHRUB_HEIGHTS[0]:
        hh -= 2
    return f"s_{w}_{hh}_{i % VARIANTS}"


def shrub(W: int, H: int, variant: int) -> np.ndarray:
    """One bush, W x H px (plus a 1 px margin each side for the outline)."""
    rng = np.random.default_rng(9000 * W + 37 * H + variant)
    Wc, Hc = W + 2, H + 1
    img = np.zeros((Hc, Wc, 4), np.uint8)
    yy, xx = np.mgrid[0:Hc, 0:Wc]
    px, py = xx + 0.5, yy + 0.5
    cx = Wc / 2
    rx = W / 2 - 0.3
    ry = H / 2 - 0.2
    cy = Hc - ry - 0.6
    L = (-0.62, -0.78)                                              # light from the upper left
    # a lumpy mound: leaf clumps over a low dome, each lit on its own upper left
    dome = (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1.0) & (py <= Hc - 0.5)
    tone = np.where(dome, 1, 0).astype(np.int8)
    n = max(3, int(W * H / 14))
    puffs = []
    for _ in range(n * 6):
        if len(puffs) >= n:
            break
        a = rng.uniform(0, 2 * math.pi)
        r = math.sqrt(rng.uniform(0, 1))
        ux, uy = cx + math.cos(a) * rx * r * 0.8, cy + math.sin(a) * ry * r * 0.8
        if uy > cy + ry * 0.35:
            continue
        pr = max(1.3, min(rx, ry) * rng.uniform(0.4, 0.6))
        puffs.append((ux, uy, pr))
    puffs.sort(key=lambda p: p[1])                                  # lower clumps in front
    mask = dome.copy()
    for ux, uy, pr in puffs:
        m = ((px - ux) ** 2 + (py - uy) ** 2 <= pr * pr) & (py <= Hc - 0.5)
        lam = ((px - ux) * L[0] + (py - uy) * L[1]) / pr
        tone = np.where(m, np.where(lam > 0.4, 3, np.where(lam > -0.3, 2, 1)), tone)
        mask |= m
    glam = ((px - cx) / rx) * L[0] + ((py - cy) / ry) * L[1]
    tone = np.where(mask & (glam < -0.6), np.minimum(tone, 1), tone)     # lower right in shade
    tone = np.where(mask & (py > Hc - 1.5), 1, tone)                     # the base in shade
    mask[:, 0] = mask[:, -1] = False
    mask[0, :] = False
    for t in (1, 2, 3):
        img[mask & (tone == t)] = LEAF[t]
    # blossom: round trusses, spaced apart, mostly on the top and the lit side
    pal = FLOWERS[variant % VARIANTS]
    if pal is not None:
        cr = 0.75 if W < 12 else max(1.0, W / 13)                   # truss radius
        gap = 2 * cr + (0.6 if W < 12 else 1.2)
        n_fl = int(2 + 0.9 * W * H / (gap * gap * 2.2))
        done = []
        for _ in range(n_fl * 30):
            if len(done) >= n_fl:
                break
            fx, fy = rng.uniform(cr, Wc - cr), rng.uniform(cr, cy + ry * 0.45)
            if not mask[int(fy), int(fx)] or any((fx - a) ** 2 + (fy - b) ** 2 < gap * gap for a, b in done):
                continue
            if rng.random() > 0.5 + 0.5 * (((fx - cx) / rx) * L[0] + ((fy - cy) / ry) * L[1] + 1) / 2:
                continue
            done.append((fx, fy))
            m = mask & ((px - fx) ** 2 + (py - fy) ** 2 <= cr * cr + 0.25)
            img[m] = pal[1]
            if cr >= 1.0:
                img[m & ((px - fx) + (py - fy) > cr * 0.5)] = pal[0]
                img[m & ((px - fx) + (py - fy) < -cr * 0.6)] = pal[2]
            else:
                img[m & ((px - fx) + (py - fy) < 0)] = pal[2]
    img[_outline(mask)] = LEAF[0]
    return img


def shrub_frames():
    out = []
    for W in SHRUB_WIDTHS:
        for H in SHRUB_HEIGHTS:
            if _ok(W, H):
                for v in range(VARIANTS):
                    out.append((f"s_{W}_{H}_{v}", shrub(W, H, v)))
    return out


def main():
    a = Atlas("shrubs", max_w=1024)
    frames = shrub_frames()
    for key, img in frames:
        a.add(key, img)
    w, h = a.write(OUT)
    print(f"[shrubs] {len(frames)} frames ({w}x{h}) -> {OUT}/shrubs.png")


if __name__ == "__main__":
    main()

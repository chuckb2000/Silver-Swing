"""Flowering trees (cherries in bloom) for any course: trees.json `c: 2`.

    python3 assets-src/blossom.py        (also run by `make assets`)

Writes game/public/sprites/blossom.png/json. Frames are keyed like the
deciduous trees, `b_<w>_<h>_<variant>`, on the same size grid (trees.py), so
the game picks a blossom frame exactly as it would a deciduous one and falls
back to the deciduous frame if a size is missing. The theme tree sheets are
not touched: any course can mark trees as flowering.

The shape is its own: a wide, umbrella-like crown built from many small
clusters of blossom, dark branches showing through underneath, lit from the
upper left like every other sprite. Variants (tree index % 3):
  0  Yoshino: pale pink, almost white
  1  Kwanzan: deep pink
  2  Akebono: soft pink
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from atlas import Atlas, hex2rgba  # noqa: E402
from trees import TREE_HEIGHTS, TREE_WIDTHS, _outline  # noqa: E402

OUT = HERE.parent / "game" / "public" / "sprites"

# outline, shade, mid, light, highlight
PALETTES = [
    [hex2rgba(c) for c in ("#5a2c43", "#d9a0bb", "#f0c4d6", "#fae0ea", "#fff6f9")],   # Yoshino
    [hex2rgba(c) for c in ("#561f3a", "#b9466f", "#d96a94", "#ef9cba", "#fbd0e0")],   # Kwanzan
    [hex2rgba(c) for c in ("#5a2640", "#cf7fa3", "#e9a3c1", "#f6c8da", "#fde8f0")],   # Akebono
]
BARK = [hex2rgba(c) for c in ("#1c110d", "#3b261d", "#5a3d2f")]


def blossom(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(7000 * W + 31 * H + variant)
    pal = PALETTES[variant % 3]
    Wc = W + 2
    img = np.zeros((H, Wc, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:Wc]
    px, py = xx + 0.5, yy + 0.5
    trunk_len = int(np.clip(round(0.32 * H), 4, 14))
    crown_h = H - trunk_len + 2
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = crown_h / 2 - 0.5
    cy = ry + 1.0
    # --- trunk and the branches spreading under the crown ------------------
    tw = max(2, int(round(W / 8)))
    tx0 = int(round(cx - tw / 2))
    wood = np.zeros((H, Wc), bool)
    wood[crown_h - 4:H - 1, tx0:tx0 + tw] = True
    fork_y = crown_h - 3.0
    n_br = 3 if W < 22 else 4
    for k in range(n_br):
        t = (k + 0.5) / n_br                     # 0..1 across the crown
        ex = cx + (t - 0.5) * 2 * rx * 0.82
        ey = cy + ry * rng.uniform(0.05, 0.35)
        sx, sy = cx + (t - 0.5) * tw * 0.6, fork_y
        d = np.hypot(ex - sx, ey - sy) + 1e-6
        s = np.clip(((px - sx) * (ex - sx) + (py - sy) * (ey - sy)) / (d * d), 0, 1)
        dist = np.hypot(px - (sx + s * (ex - sx)), py - (sy + s * (ey - sy)))
        wood |= dist <= np.maximum(0.55, tw * 0.45 * (1 - 0.6 * s))
    # --- crown: an umbrella of small blossom clusters ----------------------
    umb = (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1.0) & (py <= cy + ry * 0.55)
    n = int(10 + W * H / 40)
    puffs = []
    tries = 0
    while len(puffs) < n and tries < n * 30:
        tries += 1
        a = rng.uniform(0, 2 * math.pi)
        r = math.sqrt(rng.uniform(0, 1))
        ux, uy = cx + math.cos(a) * rx * r * 0.86, cy + math.sin(a) * ry * r * 0.86
        if uy > cy + ry * 0.45:
            continue
        pr = max(1.6, min(rx, ry) * rng.uniform(0.2, 0.32))
        puffs.append((ux, uy, pr))
    puffs.sort(key=lambda p: p[1])               # lower clusters drawn last: in front (3/4 view)
    crown = np.zeros((H, Wc), bool)
    tone = np.zeros((H, Wc), np.int8)
    L = (-0.62, -0.78)
    for ux, uy, pr in puffs:
        m = ((px - ux) ** 2 + (py - uy) ** 2 <= pr * pr) & (yy < crown_h)
        lam = ((px - ux) * L[0] + (py - uy) * L[1]) / pr
        t = np.where(lam > 0.35, 3, np.where(lam > -0.35, 2, 1))
        tone = np.where(m, t, tone)
        crown |= m
    crown &= umb | (tone > 0)
    crown[:, 0] = False
    crown[:, -1] = False
    crown[0, :] = False
    # whole-crown light: lower right in shade, upper left lit
    glam = ((px - cx) / rx) * L[0] + ((py - cy) / ry) * L[1]
    tone = np.where(crown & (glam < -0.55), np.minimum(tone, 1), tone)
    tone = np.where(crown & (glam > 0.5) & (tone == 3), 4, tone)
    sp = rng.random((H, Wc))
    tone = np.where(crown & (sp < 0.08) & (tone >= 2), 4, tone)        # open blossoms
    # paint: wood first, then the crown over it, then gaps where the branches show
    img[wood] = BARK[1]
    img[wood & (xx < cx)] = BARK[2]
    for t in range(1, 5):
        img[crown & (tone == t)] = pal[t]
    gaps = crown & wood & (py > cy) & (sp > 0.55)
    img[gaps] = BARK[0]
    solid = img[..., 3] > 0
    img[_outline(solid)] = pal[0]
    return img


def blossom_frames():
    out = []
    for W in TREE_WIDTHS:
        for H in TREE_HEIGHTS:
            if 0.9 * W <= H <= 2.6 * W + 6:      # the deciduous size grid
                for v in range(3):
                    out.append((f"b_{W}_{H}_{v}", blossom(W, H, v)))
    return out


def main():
    a = Atlas("blossom", max_w=1024)
    frames = blossom_frames()
    for key, img in frames:
        a.add(key, img)
    w, h = a.write(OUT)
    print(f"[blossom] {len(frames)} frames ({w}x{h}) -> {OUT}/blossom.png")


if __name__ == "__main__":
    main()

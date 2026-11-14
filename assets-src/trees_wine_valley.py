"""Tree sprites for the `wine_valley` theme (Wine Valley, Walla Walla WA: rolling dryland
wheat hills; the few trees are farm windbreaks and the planting round the clubhouse).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). s05 sorts lidar crowns
into "conifer" (narrow for their height) and "deciduous" (broad); this theme draws them as:

  c_*_*     Lombardy poplar: a tall narrow column of bright green, the windbreak tree of
            the Walla Walla valley (the narrow class, a drawing choice: hardly any conifers
            grow here)
  d_*_*     black locust: an open, irregular rounded crown of small leaves, olive green
            with a lit yellow-green side, on a dark furrowed trunk

palettes/wine_valley.json names these painters; `python3 assets-src/build_assets.py --theme
wine_valley` builds sprites/trees_wine_valley.*, and pipeline s09b draws the same painters
in the putting views. Nothing here is imported by another theme.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

POPLAR = [hex2rgba(c) for c in ("#18280f", "#2c4a1a", "#406a24", "#5a8a32", "#86b04c")]
POPLAR_BARK = [hex2rgba(c) for c in ("#2e2a24", "#5e574c", "#8a8274")]
COTTON = [hex2rgba(c) for c in ("#1f2a14", "#3a4d20", "#52682a", "#6f8838", "#99b25a")]
COTTON_GOLD = [hex2rgba(c) for c in ("#8f9a3a", "#b8c262")]
COTTON_BARK = [hex2rgba(c) for c in ("#2a221c", "#4e4236", "#6e5f50")]


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges (padded first)."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def locust(W: int, H: int, variant: int) -> np.ndarray:
    """Black locust: an open, irregular rounded crown on a dark trunk."""
    rng = np.random.default_rng(64900 * W + 43 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.22 * H), 2, 10))
    crown_bot = H - trunk_len + 2
    cx = Wc / 2 + (variant - 1) * 0.4
    rx = W / 2 - 0.5
    ry = crown_bot / 2 - 0.4
    cy = crown_bot / 2 + 0.3
    n = 7 + int(W / 4)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.26, 0.44, 0.45, 0.9, crown_bot,
                                  COTTON, 0.16, 0.65)
    yy, xx = np.mgrid[0:H, 0:Wc]
    # a few gold leaves on the lit upper left
    gold = mask & (xx + 0.5 < cx) & (yy < cy) & (rng.random((H, Wc)) < 0.06)
    img[gold] = COTTON_GOLD[variant % 2]
    tw = max(2, int(round(W / 7)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 3:H - 1, tx0:tx0 + tw] = True
    if W >= 16:   # a fork showing under the crown
        side = 1 if variant % 2 else -1
        for y in range(crown_bot - 3, H - 3):
            k = int(round((H - 3 - y) * 0.45))
            x = tx0 + (tw if side > 0 else -1) + side * k
            if 0 <= x < Wc:
                trunk[y, x] = True
    trunk &= ~mask
    img[trunk] = COTTON_BARK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = COTTON_BARK[1]
    img[H - 2, max(0, tx0 - 1)] = COTTON_BARK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = COTTON_BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = COTTON[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def poplar(W: int, H: int, variant: int) -> np.ndarray:
    """Lombardy poplar: a narrow column of upswept branches, tapering at both ends."""
    rng = np.random.default_rng(91700 * W + 53 * H + variant)
    Wc = W + 2
    img = np.zeros((H, Wc, 4), np.uint8)
    mask = np.zeros((H, Wc), bool)
    trunk_len = int(np.clip(round(0.07 * H), 1, 4))
    crown_bot = H - trunk_len
    cx = Wc / 2 + rng.uniform(-0.3, 0.3)
    n = 4 if H < 24 else (5 if H < 44 else 7)
    span = crown_bot - 1
    for i in range(n):
        f = (i + 0.5) / n
        widthf = 0.55 + 0.45 * np.sin(np.pi * min(1.0, 0.15 + 0.85 * f)) ** 0.6
        rx = max(1.4, (W / 2 - 0.5) * widthf * rng.uniform(0.85, 1.0))
        ry = max(1.6, span / n * 0.8)
        cy = 1 + span * f
        timg, tm = base._clump_crown(rng, Wc, H, cx + rng.uniform(-0.08, 0.08) * W, cy, rx, ry, 3 + int(W / 8),
                                     0.36, 0.56, 0.45, 0.95, min(H, int(cy + ry + 1)), POPLAR, 0.12, 0.6)
        img[tm] = timg[tm]
        mask |= tm
    tw = max(1, int(round(W / 8)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 2:H - 1, tx0:tx0 + tw] = True
    trunk &= ~mask
    img[trunk] = POPLAR_BARK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = POPLAR_BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = POPLAR[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img

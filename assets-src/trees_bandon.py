"""Tree sprites for the `bandon` theme (Bandon Trails, southern Oregon coast).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`), drawn for the
coastal forest and dunes behind Bandon:

  c_*_0     Sitka spruce: tiered crown in a cool blue-green
  c_*_1     Douglas fir: the pnw shape in a deeper, warmer green
  c_*_2     spruce in a darker, older-growth green
  d_*_*     shore pine: the trees the lidar finds with broad, rounded crowns.
            On this coast those are wind-shaped shore pine (Pinus contorta
            var. contorta), not broadleaves: a dense, lumpy, flat-topped crown
            on a short trunk, leaning downwind (east) by a variant-dependent
            amount, in a dark yellow-green.

The lidar's conifer / broad-crown split is by crown shape only (pipeline
s05), so these are a drawing choice for each crown shape, not a surveyed
species map.

palettes/bandon.json names these painters, so `make assets` builds
sprites/trees_bandon.* and pipeline s09b draws the same trees in the putting
views. The other themes' sheets are unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

SPRUCE = [hex2rgba(c) for c in ("#0c2224", "#17383a", "#214b49", "#2c5f58", "#437a6d")]
FIR = [hex2rgba(c) for c in ("#0d261b", "#1a412c", "#245637", "#2f6a41", "#438356")]
SPRUCE_OLD = [hex2rgba(c) for c in ("#0a1d1b", "#13302d", "#1c423b", "#26554b", "#3a6e5f")]
CON_TRUNK = [hex2rgba(c) for c in ("#221812", "#4c3a2c", "#6f5a46")]  # grey-brown spruce bark

SHORE = [hex2rgba(c) for c in ("#10220f", "#203d1c", "#2c5223", "#3a672b", "#55823a")]
SHORE_TRUNK = [hex2rgba(c) for c in ("#26170f", "#53321f", "#76492c")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    img = base.conifer(W, H, variant)
    img = _recolor(img, base.CON, (SPRUCE, FIR, SPRUCE_OLD)[variant % 3])
    return _recolor(img, base.TRUNK, CON_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    """Shore pine: dense, lumpy, flat-topped crown on a short leaning trunk."""
    rng = np.random.default_rng(53000 * W + 61 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.26 * H), 3, 16))
    crown_bot = H - trunk_len + 2
    lean = (0.4, 1.0, 1.6)[variant % 3]         # downwind (east, screen right)
    cx = Wc / 2 + lean * W / 24
    rx = W / 2 - 0.5 - abs(lean) * W / 48
    ry = max(2.5, 0.82 * (crown_bot / 2 - 1.0))  # wider than tall
    cy = crown_bot - ry - 1.0                   # flattish top, crown sits on the trunk
    n = 6 + int(W / 6)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.28, 0.40, 0.48, 0.90, crown_bot, SHORE, 0.15, 0.40)
    tw = max(2, int(round(W / 8)))
    base_x = Wc / 2 - tw / 2
    trunk = np.zeros((H, Wc), bool)
    for y in range(int(cy), H - 1):
        f = (H - 1 - y) / max(1, H - 1 - cy)    # 0 at the ground, 1 at the crown centre
        x0 = int(round(base_x + (cx - Wc / 2) * f))
        trunk[y, max(0, x0):min(Wc, x0 + tw)] = True
    trunk &= ~mask
    img[trunk] = SHORE_TRUNK[2]
    img[trunk & (np.roll(trunk, -1, 1) == False)] = SHORE_TRUNK[1]  # noqa: E712  right edge in shade
    img[H - 2, max(0, int(base_x) - 1)] = SHORE_TRUNK[1]
    img[H - 2, min(Wc - 1, int(base_x) + tw)] = SHORE_TRUNK[1]
    solid = img[..., 3] > 0
    img[base._outline(solid)] = SHORE[0]
    return img

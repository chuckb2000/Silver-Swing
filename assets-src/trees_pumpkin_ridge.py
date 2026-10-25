"""Tree sprites for the `pumpkin_ridge` theme (Pumpkin Ridge Golf Club, North
Plains, Oregon), drawn in late October.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the
pnw shapes; only the colours change:

  c_*_*     Douglas fir: the pnw conical shape in a deeper blue-green (the
            150-ft firs that line Witch Hollow and Ghost Creek)
  d_*_0     Oregon white oak: olive-brown, turning late, with a seeded patch
            of russet
  d_*_1     bigleaf maple: fully turned butter-yellow
  d_*_2     vine maple / red maple: pumpkin orange

The game draws a deciduous tree with variant i mod 3, so the leafy trees split
about evenly between the three. Colour by variant is a drawing choice, not a
surveyed species (the lidar gives only crown shape). palettes/pumpkin_ridge.json
names these painters, so `build_assets.py --theme pumpkin_ridge` builds
sprites/trees_pumpkin_ridge.* and pipeline s09b draws the same trees in the
putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0b211c", "#143a30", "#1c4d3d", "#28624b", "#3a7b5e")]
OAK = [hex2rgba(c) for c in ("#1f1d0e", "#4b4a1d", "#626126", "#7e7a31", "#9d9644")]
OAK_TURN = [hex2rgba(c) for c in ("#2a170c", "#6a3415", "#8c4a1c", "#a8642a", "#c4843c")]
MAPLE_GOLD = [hex2rgba(c) for c in ("#2c220c", "#8a6812", "#bb911b", "#deb62d", "#f3d65a")]
MAPLE_ORANGE = [hex2rgba(c) for c in ("#2d160b", "#8a3610", "#bb5418", "#df7727", "#f3a148")]
TRUNK = [hex2rgba(c) for c in ("#20140c", "#423020", "#634a34")]


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, FIR)


TURN_SHARE = 0.35  # share of an oak's leaf pixels that have gone russet


def _patch(img: np.ndarray, W: int, H: int, variant: int) -> np.ndarray:
    """A ragged area of about TURN_SHARE of the crown (seeded by size): a few
    soft blobs, tilted toward the sunlit upper crown, with pixel noise so the
    edge breaks up like leaves, not a stamp."""
    rng = np.random.default_rng(4231 * W + 37 * H + variant)
    leaf = np.zeros(img.shape[:2], bool)
    for c in base.DEC[1:]:
        leaf |= np.all(img == np.array(c, np.uint8), axis=-1)
    ys, xs = np.nonzero(leaf)
    if len(ys) < 8:
        return np.zeros_like(leaf)
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(float)
    span = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1.0
    field = np.zeros(leaf.shape)
    for _ in range(3):
        k = rng.integers(len(ys))
        s = span * rng.uniform(0.14, 0.24)
        field += rng.uniform(0.6, 1.0) * np.exp(-((xx - xs[k]) ** 2 + (yy - ys[k]) ** 2) / (2 * s * s))
    field += 0.25 * (1 - (yy - ys.min()) / span)
    field += rng.uniform(-0.18, 0.18, leaf.shape)
    cut = np.quantile(field[leaf], 1 - TURN_SHARE)
    return leaf & (field >= cut)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.deciduous(W, H, variant)
    v = variant % 3
    if v == 0:
        patch = _patch(img, W, H, variant)
        img = _recolor(img, base.DEC[1:], OAK_TURN[1:], patch)
        img = _recolor(img, base.DEC, OAK, ~patch)
    else:
        img = _recolor(img, base.DEC, (None, MAPLE_GOLD, MAPLE_ORANGE)[v])
    return _recolor(img, base.TRUNK, TRUNK)

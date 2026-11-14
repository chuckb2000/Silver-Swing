"""Tree sprites for the `reserve` theme (The Reserve Vineyards & Golf Club, Aloha,
Oregon), drawn in high summer.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the
pnw shapes; only the colours change:

  c_*_*     Douglas fir: the pnw conical shape in a deep, slightly blue green
            (the firs in the woods south and west of the South course)
  d_*_0     Oregon white oak: dark olive, dense, with a seeded patch of the
            dry, sun-faded leaves an oak shows by late July
  d_*_1     bigleaf maple: fresh mid-green
  d_*_2     Oregon ash (along the creeks): light yellow-green

The game draws a deciduous tree with variant i mod 3, so the leafy trees split
about evenly between the three. Colour by variant is a drawing choice, not a
surveyed species (the lidar gives only crown shape). palettes/reserve.json
names these painters, so `build_assets.py --theme reserve` builds
sprites/trees_reserve.* and pipeline s09b draws the same trees in the putting
views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0c241d", "#15402f", "#1d553d", "#2a6c4f", "#3f8664")]
OAK = [hex2rgba(c) for c in ("#1a220e", "#33441b", "#465c23", "#5d752c", "#7a9238")]
OAK_DRY = [hex2rgba(c) for c in ("#2a2410", "#5a5424", "#73692d", "#8e8238", "#aa9c4a")]
MAPLE = [hex2rgba(c) for c in ("#1a2e12", "#356023", "#46792b", "#5c9536", "#7fb24c")]
ASH = [hex2rgba(c) for c in ("#232e12", "#4b6526", "#62802f", "#7e9e3c", "#a3c05a")]
TRUNK = [hex2rgba(c) for c in ("#20140c", "#42301f", "#5f4630")]


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


DRY_SHARE = 0.18  # share of an oak's leaf pixels that are sun-faded


def _patch(img: np.ndarray, W: int, H: int, variant: int) -> np.ndarray:
    """A ragged area of about DRY_SHARE of the crown (seeded by size), toward the
    sunlit upper crown, with pixel noise so the edge breaks up like leaves."""
    rng = np.random.default_rng(7919 * W + 41 * H + variant)
    leaf = np.zeros(img.shape[:2], bool)
    for c in base.DEC[1:]:
        leaf |= np.all(img == np.array(c, np.uint8), axis=-1)
    ys, xs = np.nonzero(leaf)
    if len(ys) < 8:
        return np.zeros_like(leaf)
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(float)
    span = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1.0
    field = np.zeros(leaf.shape)
    for _ in range(2):
        k = rng.integers(len(ys))
        s = span * rng.uniform(0.12, 0.2)
        field += rng.uniform(0.6, 1.0) * np.exp(-((xx - xs[k]) ** 2 + (yy - ys[k]) ** 2) / (2 * s * s))
    field += 0.35 * (1 - (yy - ys.min()) / span)
    field += rng.uniform(-0.18, 0.18, leaf.shape)
    cut = np.quantile(field[leaf], 1 - DRY_SHARE)
    return leaf & (field >= cut)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.deciduous(W, H, variant)
    v = variant % 3
    if v == 0:
        patch = _patch(img, W, H, variant)
        img = _recolor(img, base.DEC[1:], OAK_DRY[1:], patch)
        img = _recolor(img, base.DEC, OAK, ~patch)
    else:
        img = _recolor(img, base.DEC, (None, MAPLE, ASH)[v])
    return _recolor(img, base.TRUNK, TRUNK)

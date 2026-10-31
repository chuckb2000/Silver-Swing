"""Tree sprites for the `spruce_peak` theme (The Mountain Course at Spruce Peak,
Stowe, Vermont), drawn in the first week of October, peak foliage.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`):

  c_*_*     red spruce / balsam fir: the pnw tiered cone drawn about 70 % as wide
            and centred in the frame (a narrow dark spire, the shape of the
            spruce-fir stands on the upper slopes), deep blue-green
  d_*_0     sugar maple at peak: scarlet to orange, a few leaves still amber
  d_*_1     yellow / paper birch: gold crown on a pale trunk with dark marks
  d_*_2     beech or a late maple: still green, with a seeded patch of orange
            (about a third of the crown)

The game draws a deciduous tree with variant i mod 3, so the leafy trees split
about evenly between the three. The colour by variant is a drawing choice, not
a surveyed species: the lidar gives only crown shape. palettes/spruce_peak.json
names these painters, so `build_assets.py --theme spruce_peak` builds
sprites/trees_spruce_peak.* and pipeline s09b draws the same trees in the
putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
SPRUCE = [hex2rgba(c) for c in ("#081c18", "#0f3229", "#174235", "#215643", "#326d55")]
MAPLE_RED = [hex2rgba(c) for c in ("#2a0f0a", "#7c1b12", "#a82a17", "#cf4a1f", "#ec7b33")]
MAPLE_AMBER = [hex2rgba(c) for c in ("#2c160a", "#8a3e12", "#b9601a", "#dd8526", "#f2ac46")]
BIRCH = [hex2rgba(c) for c in ("#2b220a", "#8a6a10", "#bb9318", "#dfba2a", "#f4dc5c")]
BEECH = [hex2rgba(c) for c in ("#172a12", "#335a1f", "#476f27", "#5f8a33", "#80a747")]
TURN = [hex2rgba(c) for c in ("#2c180b", "#8a4413", "#b8641c", "#dc8a2a", "#f1b04c")]
TRUNK = [hex2rgba(c) for c in ("#22150e", "#463021", "#685036")]
BIRCH_TRUNK = [hex2rgba(c) for c in ("#2a2622", "#b9b4a8", "#ece8dc")]

SPIRE = 0.70   # spruce crown width as a share of the frame's crown width


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    """The pnw cone, drawn narrower (a spire) and centred in a frame W + 2 wide."""
    w = max(6, int(round(W * SPIRE)))
    narrow = base.conifer(w, H, variant)
    img = np.zeros((H, W + 2, 4), np.uint8)
    x0 = (W + 2 - narrow.shape[1]) // 2
    img[:, x0:x0 + narrow.shape[1]] = narrow
    img = _recolor(img, base.CON, SPRUCE)
    return _recolor(img, base.TRUNK, TRUNK)


TURN_SHARE = 0.33


def _patch(img: np.ndarray, W: int, H: int, variant: int, share: float) -> np.ndarray:
    """A ragged area of about `share` of the leaf pixels (seeded by size), toward the sunlit top."""
    rng = np.random.default_rng(104729 * W + 37 * H + variant)
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
    cut = np.quantile(field[leaf], 1 - share)
    return leaf & (field >= cut)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.deciduous(W, H, variant)
    v = variant % 3
    if v == 0:      # sugar maple: red with an amber patch
        patch = _patch(img, W, H, variant, 0.25)
        img = _recolor(img, base.DEC[1:], MAPLE_AMBER[1:], patch)
        img = _recolor(img, base.DEC, MAPLE_RED, ~patch)
        return _recolor(img, base.TRUNK, TRUNK)
    if v == 1:      # birch: gold on a pale trunk
        img = _recolor(img, base.DEC, BIRCH)
        trunk = np.all(img == np.array(base.TRUNK[2], np.uint8), axis=-1) | np.all(img == np.array(base.TRUNK[1], np.uint8), axis=-1)
        img = _recolor(img, base.TRUNK, BIRCH_TRUNK)
        ys, xs = np.nonzero(trunk)
        for y, x in zip(ys, xs):           # dark horizontal lenticel marks every fourth row
            if y % 4 == 0 and (x + y // 4) % 2 == 0:
                img[y, x] = BIRCH_TRUNK[0]
        return img
    patch = _patch(img, W, H, variant, TURN_SHARE)   # beech / late maple
    img = _recolor(img, base.DEC[1:], TURN[1:], patch)
    img = _recolor(img, base.DEC, BEECH, ~patch)
    return _recolor(img, base.TRUNK, TRUNK)

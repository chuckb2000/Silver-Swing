"""Tree sprites for the `eugene_cc` theme (Eugene Country Club, Eugene, Oregon): giant
Douglas firs and Oregon white oaks lining the fairways.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_*     Douglas fir: deep blue-green
  d_*_0     Oregon white oak: olive
  d_*_1     bigleaf maple: a bright, yellow-leaning green
  d_*_2     Norway / sugar maple: golden yellow-green (the Emerald City's yellow and green)

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/eugene_cc.json names these painters, so `build_assets.py --theme
eugene_cc` builds sprites/trees_eugene_cc.* and pipeline s09b draws the same trees in the
putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0a1f1a", "#12362d", "#1a4a3a", "#245e48", "#36775a")]
OAK = [hex2rgba(c) for c in ("#1c1f10", "#3f4a1f", "#546228", "#6c7c33", "#8a9a46")]
MAPLE = [hex2rgba(c) for c in ("#17260d", "#33561b", "#447123", "#5a8e2d", "#7aad42")]
GOLD = [hex2rgba(c) for c in ("#29240c", "#5f6a17", "#7d8a1f", "#a3ac2b", "#d1cf4a")]
TRUNK = [hex2rgba(c) for c in ("#20140c", "#423020", "#634a34")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, FIR)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (OAK, MAPLE, GOLD)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

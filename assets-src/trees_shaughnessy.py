"""Tree sprites for the `shaughnessy` theme (Shaughnessy Golf and Country Club, Vancouver,
on the North Arm of the Fraser River).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_even  Douglas fir: deep blue-green
  c_*_odd   western red cedar: a warmer, yellower deep green
  d_*_0     black cottonwood: grey-green with silvery highlights (the river's trees)
  d_*_1     bigleaf maple: a bright, yellow-leaning green
  d_*_2     red alder: grey-olive

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/shaughnessy.json names these painters, so `build_assets.py --theme
shaughnessy` builds sprites/trees_shaughnessy.* and pipeline s09b draws the same trees in
the putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0a1f1a", "#12362d", "#1a4a3a", "#245e48", "#36775a")]
CEDAR = [hex2rgba(c) for c in ("#111c0c", "#22401c", "#2d5424", "#3a6a2c", "#528540")]
COTTONWOOD = [hex2rgba(c) for c in ("#162119", "#324a35", "#476447", "#62805d", "#a9bfa3")]
MAPLE = [hex2rgba(c) for c in ("#17260d", "#33561b", "#447123", "#5a8e2d", "#7aad42")]
ALDER = [hex2rgba(c) for c in ("#151f17", "#2f4733", "#3f5e42", "#557852", "#7a9874")]
TRUNK = [hex2rgba(c) for c in ("#1e1a16", "#47403a", "#6e665d")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, (FIR, CEDAR)[variant % 2])


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (COTTONWOOD, MAPLE, ALDER)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

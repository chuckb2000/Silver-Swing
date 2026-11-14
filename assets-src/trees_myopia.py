"""Tree sprites for the `myopia` theme (Myopia Hunt Club, South Hamilton MA): the North
Shore mixed woods round Leeds' open fields, late summer.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_*     eastern white pine: soft blue-green
  d_*_0     red oak: deep green
  d_*_1     red maple: green with the first red at the crown
  d_*_2     American elm: a fresh mid green

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/myopia.json names these painters, so `build_assets.py --theme myopia`
builds sprites/trees_myopia.* and pipeline s09b draws the same trees in the putting views.
Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
PINE = [hex2rgba(c) for c in ("#0f201d", "#1d3d36", "#2a5446", "#386a55", "#558a6e")]
OAK = [hex2rgba(c) for c in ("#132010", "#24401b", "#315423", "#40692c", "#5f8a42")]
MAPLE = [hex2rgba(c) for c in ("#22180f", "#3f4a1f", "#566126", "#8a6a2c", "#c2543a")]
ELM = [hex2rgba(c) for c in ("#16230f", "#335a22", "#43712b", "#588c37", "#80ab55")]
TRUNK = [hex2rgba(c) for c in ("#1f1b17", "#4a423a", "#71675c")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, PINE)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (OAK, MAPLE, ELM)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

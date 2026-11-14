"""Tree sprites for the `rose_city` theme (Rose City Golf Course, NE Portland, Oregon).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_*     Douglas fir: the pnw conical shape in a deep blue-green
  d_*_0     Oregon white oak: olive
  d_*_1     bigleaf maple: a bright, yellow-leaning green
  d_*_2     purple-leaf plum / copper beech: wine red, the ornamental street trees of
            the Rose City Park neighbourhood round the course

The game draws a deciduous tree with variant i mod 3, so the broadleaf trees split about
evenly between the three. Colour by variant is a drawing choice, not a surveyed species
(the lidar gives only crown shape). palettes/rose_city.json names these painters, so
`build_assets.py --theme rose_city` builds sprites/trees_rose_city.* and pipeline s09b
draws the same trees in the putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0a1f1a", "#12362d", "#1a4a3a", "#245e48", "#36775a")]
OAK = [hex2rgba(c) for c in ("#1c1f10", "#3f4a1f", "#546228", "#6c7c33", "#8a9a46")]
MAPLE = [hex2rgba(c) for c in ("#17260d", "#33561b", "#447123", "#5a8e2d", "#7aad42")]
PLUM = [hex2rgba(c) for c in ("#1c0e10", "#3e1c22", "#55282d", "#6d3738", "#8a4f4a")]
TRUNK = [hex2rgba(c) for c in ("#20140c", "#423020", "#634a34")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, FIR)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (OAK, MAPLE, PLUM)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

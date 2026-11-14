"""Tree sprites for the `capilano` theme (Capilano Golf and Country Club, West Vancouver,
British Columbia): the North Shore's coastal rainforest.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_even  Douglas fir: near-black blue-green
  c_*_odd   western red cedar: a warmer, slightly yellower deep green
  d_*_0     bigleaf maple: a bright, yellow-leaning green
  d_*_1     red alder: grey-green
  d_*_2     vine maple / cascara: a mid green

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/capilano.json names these painters, so `build_assets.py --theme capilano`
builds sprites/trees_capilano.* and pipeline s09b draws the same trees in the putting
views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#07160f", "#0e2a20", "#143a2c", "#1d4d3a", "#2d654d")]
CEDAR = [hex2rgba(c) for c in ("#0d1a0d", "#1b3a1d", "#244d25", "#306230", "#477c40")]
MAPLE = [hex2rgba(c) for c in ("#17260d", "#33561b", "#447123", "#5a8e2d", "#7aad42")]
ALDER = [hex2rgba(c) for c in ("#151f17", "#2f4733", "#3f5e42", "#557852", "#7a9874")]
VINE = [hex2rgba(c) for c in ("#132210", "#2a4c22", "#38632b", "#4a7d36", "#68984c")]
TRUNK = [hex2rgba(c) for c in ("#1d150f", "#3f2e22", "#5f4734")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, (FIR, CEDAR)[variant % 2])


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (MAPLE, ALDER, VINE)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

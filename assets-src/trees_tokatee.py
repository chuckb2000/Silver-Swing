"""Tree sprites for the `tokatee` theme (Tokatee Golf Club, McKenzie Bridge, Oregon): the
old-growth forest of the McKenzie River valley.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_even  Douglas fir: deep blue-green
  c_*_odd   western red cedar: a warmer, yellower deep green
  d_*_0     vine maple: bright yellow-green
  d_*_1     black cottonwood: grey-green with silvery highlights
  d_*_2     red alder: a mid olive green

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/tokatee.json names these painters, so `build_assets.py --theme tokatee`
builds sprites/trees_tokatee.* and pipeline s09b draws the same trees in the putting
views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0a1d17", "#123427", "#1a4734", "#235b42", "#357455")]
CEDAR = [hex2rgba(c) for c in ("#111c0c", "#22401c", "#2d5424", "#3a6a2c", "#528540")]
VINE = [hex2rgba(c) for c in ("#1a2a0d", "#3e6a1c", "#528a24", "#6aa830", "#93c84c")]
COTTONWOOD = [hex2rgba(c) for c in ("#162119", "#324a35", "#476447", "#62805d", "#a9bfa3")]
ALDER = [hex2rgba(c) for c in ("#1a1f10", "#3c4a20", "#50632a", "#677c35", "#859848")]
TRUNK = [hex2rgba(c) for c in ("#1d150f", "#3f2e22", "#5f4734")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, (FIR, CEDAR)[variant % 2])


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (VINE, COTTONWOOD, ALDER)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

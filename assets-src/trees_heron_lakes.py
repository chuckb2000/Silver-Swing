"""Tree sprites for the `heron_lakes` theme (Heron Lakes Golf Club, West Delta Park,
Portland): the planted broadleaves of a wetland course on the Columbia floodplain.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_*     Douglas fir: deep blue-green
  d_*_0     Oregon ash: a fresh green
  d_*_1     black cottonwood: grey-green with silvery highlights
  d_*_2     Pacific willow: a pale yellow-green

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/heron_lakes.json names these painters, so `build_assets.py --theme
heron_lakes` builds sprites/trees_heron_lakes.* and pipeline s09b draws the same trees in
the putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
FIR = [hex2rgba(c) for c in ("#0b1f1c", "#13372f", "#1b4b3d", "#255f4b", "#38785e")]
ASH = [hex2rgba(c) for c in ("#14240f", "#2f5a1f", "#3f7328", "#559035", "#7cb252")]
COTTONWOOD = [hex2rgba(c) for c in ("#162119", "#324a35", "#476447", "#62805d", "#a9bfa3")]
WILLOW = [hex2rgba(c) for c in ("#1e2a12", "#4a6a26", "#5f8530", "#7aa33f", "#a6c763")]
TRUNK = [hex2rgba(c) for c in ("#1e1a16", "#47403a", "#6e665d")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, FIR)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (ASH, COTTONWOOD, WILLOW)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

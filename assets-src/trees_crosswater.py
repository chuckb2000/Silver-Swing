"""Tree sprites for the `crosswater` theme (Crosswater, Sunriver OR): the high-desert pines
and riverside broadleaves round the Deschutes meadows.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). The shapes are the pnw shapes; only the
colours change:

  c_*_*     ponderosa and lodgepole pine: warm yellow-green
  d_*_0     quaking aspen: bright green with gold
  d_*_1     willow: grey-green
  d_*_2     ponderosa again, as a broad old crown

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/crosswater.json names these painters, so `build_assets.py --theme crosswater`
builds sprites/trees_crosswater.* and pipeline s09b draws the same trees in the putting views.
Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# outline, shade, mid, light, highlight (base.CON / base.DEC order)
PINE = [hex2rgba(c) for c in ("#18200f", "#2e4320", "#3e5a28", "#507134", "#73914a")]
OAK = [hex2rgba(c) for c in ("#1c2410", "#4a6a24", "#5f852c", "#7fa23a", "#d0c25a")]
MAPLE = [hex2rgba(c) for c in ("#1e2620", "#46574a", "#5c705d", "#7a8f78", "#a6b8a0")]
ELM = [hex2rgba(c) for c in ("#18200f", "#2e4320", "#3e5a28", "#507134", "#73914a")]
TRUNK = [hex2rgba(c) for c in ("#2a1a10", "#7a4a2a", "#a86a3c")]


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

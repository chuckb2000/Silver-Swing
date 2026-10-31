"""Tree sprites for the `yale` theme (Yale Golf Course, New Haven, Connecticut).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). High summer in the rocky hardwood hills
west of New Haven, where Raynor cut the course out of the Griest estate's woods:

  c_*_0, c_*_2   eastern white pine: the conical shape in a soft blue-green
  c_*_1          eastern hemlock: the conical shape in the darkest blue-green
  d_*_0          red and white oak: a deep, slightly cool summer green
  d_*_1          sugar maple: a brighter, yellower green crown
  d_*_2          beech and shagbark hickory: a dense dark olive green, grey bark

The lidar can't tell species apart (leaf-off split: needle or broadleaf); the variant (tree
index mod 3) picks the species, as flair, not survey. palettes/yale.json names these
painters, so `build_assets.py --theme yale` builds sprites/trees_yale.* and pipeline s09b
draws the same trees in the putting views.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


WHITE_PINE = _pal("#0f2620", "#1b4034", "#245442", "#2f684f", "#457f63")
HEMLOCK = _pal("#0b1d1a", "#142f2a", "#1c4137", "#255244", "#336855")
OAK = _pal("#12260f", "#244a1d", "#326127", "#437a32", "#5f9645")
MAPLE = _pal("#16290f", "#2f5a1d", "#427527", "#5a9032", "#80ad4a")
BEECH = _pal("#131f10", "#283c1d", "#364f25", "#47652f", "#617f40")
BARK = _pal("#22160e", "#463021", "#685036")
GREY_BARK = _pal("#262624", "#4d4b46", "#716d64")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    pal = HEMLOCK if variant % 3 == 1 else WHITE_PINE
    return _recolor(_recolor(base.conifer(W, H, variant), base.CON, pal), base.TRUNK, BARK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    img = _recolor(base.deciduous(W, H, variant), base.DEC, (OAK, MAPLE, BEECH)[v])
    return _recolor(img, base.TRUNK, GREY_BARK if v == 2 else BARK)

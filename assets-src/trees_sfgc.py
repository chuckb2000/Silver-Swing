"""Tree sprites for the `sfgc` theme (San Francisco Golf Club, by Lake Merced): the
fog-belt trees round Tillinghast's course, a shade cooler and greyer than Presidio's.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). Shapes come from
trees_monterey (pine, cypress) and trees_peninsula (eucalyptus); only the colours are this
theme's:

  c_*_0/2   Monterey pine
  c_*_1     blue gum eucalyptus: tall, blue-grey, pale bark
  d_*_0/1   Monterey cypress: flat, wind-shaped pads
  d_*_2     blue gum eucalyptus again (the broad-crowned ones)

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/sfgc.json names these painters, so `build_assets.py --theme sfgc` builds
sprites/trees_sfgc.* and pipeline s09b draws the same trees in the putting views.
"""
from __future__ import annotations

import numpy as np

import trees_monterey as mty
import trees_peninsula as pen
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


PINE = _pal("#0f231c", "#1c3d30", "#27513a", "#336446", "#4b7e5c")
CYPRESS = _pal("#0c1f1a", "#16362b", "#1f4a36", "#2a5e43", "#437a58")
EUC = _pal("#1a2828", "#324744", "#475f5a", "#5f7b74", "#86a39a")
EUC_TRUNK = _pal("#3a352f", "#aaa18c", "#ddd6c3")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def _euc(W: int, H: int, variant: int) -> np.ndarray:
    img = pen._eucalyptus(W, H, variant)
    return _recolor(_recolor(img, pen.EUC, EUC), pen.EUC_TRUNK, EUC_TRUNK)


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 1:
        return _euc(W, H, variant)
    return _recolor(mty.pine(W, H, variant), mty.PINE, PINE)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 2:
        return _euc(W, H, variant)
    return _recolor(mty._cypress(W, H, variant), mty.CYPRESS, CYPRESS)

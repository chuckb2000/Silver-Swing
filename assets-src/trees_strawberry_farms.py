"""Tree sprites for the `strawberry_farms` theme (Strawberry Farms Golf Club, Irvine CA).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). From the developer's
photos (release assorted-lidar-data, strawb.1-9): an Orange County canyon course on Sand
Canyon Wash and the reservoir, with tall eucalyptus on the ridges, sycamores and willows along
the wash and the water, dark coast live oaks on the slopes, and planted pines by the clubhouse.

  c_*_0     blue gum eucalyptus: a long pale trunk under a narrow, loose, blue-grey crown
            (the shape from trees_peninsula, in this theme's colours)
  c_*_1     Aleppo pine: the coastal theme's ragged pine in a dull grey-green
  c_*_2     eucalyptus again, leaning the other way (the commonest tall tree here)
  d_*_0     California sycamore: the pnw rounded crown in a pale yellow-green
  d_*_1     coast live oak: broad, dense, dark olive crown on a short trunk
  d_*_2     arroyo willow: the rounded crown in a bright, soft green

The lidar (class 1 only, Dec 2011) can't tell species apart; the crown-shape split decides
tall-narrow or broad and the variant (tree index mod 3) picks the species, as flair.
palettes/strawberry_farms.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
import trees_peninsula as pen
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


EUC = _pal("#1e2c28", "#3a554c", "#4f6e62", "#678878", "#8baa97")
EUC_TRUNK = _pal("#3d3832", "#b3a990", "#e3dcc8")
ALEPPO = _pal("#16241a", "#283f2c", "#365335", "#46683f", "#5d8150")
PINE_TRUNK = _pal("#2a1a12", "#56382a", "#7a523b")
SYCAMORE = _pal("#1f2c14", "#3e5a25", "#567a31", "#6f963d", "#8fb253")
SYC_TRUNK = _pal("#3a3530", "#b8b2a2", "#e8e3d6")   # pale, mottled bark
LIVE_OAK = _pal("#15240f", "#283f18", "#35521f", "#456628", "#5e8034")
OAK_TRUNK = _pal("#241a14", "#4a3a30", "#6a5848")
WILLOW = _pal("#1c2c12", "#3a5a1f", "#4f7a28", "#669632", "#86b244")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 1:
        img = base.pitch_pine(W, H, variant)
        return _recolor(_recolor(img, base.PINE, ALEPPO), base.PINE_TRUNK, PINE_TRUNK)
    img = pen._eucalyptus(W, H, variant)
    return _recolor(_recolor(img, pen.EUC, EUC), pen.EUC_TRUNK, EUC_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 1:
        return _recolor(_recolor(base.scrub_oak(W, H, variant), base.OAK, LIVE_OAK), base.OAK_TRUNK, OAK_TRUNK)
    img = base.deciduous(W, H, variant)
    return _recolor(_recolor(img, base.DEC, SYCAMORE if v == 0 else WILLOW), base.TRUNK, SYC_TRUNK if v == 0 else OAK_TRUNK)

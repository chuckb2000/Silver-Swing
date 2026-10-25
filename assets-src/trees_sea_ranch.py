"""Tree sprites for the `sea_ranch` theme (The Sea Ranch Golf Links, Sonoma County CA).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). From the developer's
photos (release assorted-lidar-data: sea-ranch-tee-shot, sea.ranch.34, sea.ranch.145 and the
course's own photo): Robert Muir Graves's links on the marine terrace, cut through the long
hedgerows of Monterey cypress planted as windbreaks across the old sheep ranch, with bishop
pines and redwoods inland toward the ridge.

  c_*_0     bishop pine: the coastal theme's ragged, flat-topped pine in a dark green
  c_*_1     coast redwood: the pnw conical shape in a deep cool green, red-brown trunk
  c_*_2     bishop pine again (the commonest pine of the Gualala headlands)
  d_*_0/1   Monterey cypress: Cypress Point's wind-sculpted pads (trees_monterey), slightly cooler
  d_*_2     Monterey cypress in the darkest green (the hedgerows' shaded side)

The lidar can't tell species apart; the crown-shape split decides needle or broad crown and the
variant (tree index mod 3) picks the species, as flair. palettes/sea_ranch.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
import trees_monterey as mty
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


BISHOP = _pal("#0f2219", "#1b3a28", "#264f31", "#31623a", "#46794a")
PINE_TRUNK = _pal("#2a1a12", "#55382a", "#7a523b")
REDWOOD = _pal("#0c2118", "#173628", "#1f4632", "#2a593b", "#3c714b")
REDWOOD_TRUNK = _pal("#2a120b", "#5e2a18", "#8a4426")
CYPRESS = _pal("#0a1e18", "#133426", "#1b4731", "#255b3b", "#38754b")
CYPRESS_DARK = _pal("#08191a", "#102c24", "#173c2d", "#1f4d36", "#2f6644")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 1:
        return _recolor(_recolor(base.conifer(W, H, variant), base.CON, REDWOOD), base.TRUNK, REDWOOD_TRUNK)
    return _recolor(_recolor(base.pitch_pine(W, H, variant), base.PINE, BISHOP), base.PINE_TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    img = mty._cypress(W, H, v if v < 2 else 0)
    return _recolor(img, mty.CYPRESS, CYPRESS if v < 2 else CYPRESS_DARK)

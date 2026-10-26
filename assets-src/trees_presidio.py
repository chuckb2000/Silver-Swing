"""Tree sprites for the `presidio` theme (Presidio Golf Course, San Francisco).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). From the developer's
photos (release assorted-lidar-data) and the club's history page: the course runs through the
Presidio's planted forest (the Army's 1880s-1930s plantings of Monterey pine, Monterey cypress
and eucalyptus), tall trees with high, open crowns over bright fairways.

  c_*_0     Monterey pine: Cypress Point's tall, bare-trunked pine (trees_monterey), a little brighter
  c_*_1     blue gum eucalyptus: Stanford's tall pale trunk and loose crown (trees_peninsula), in a
            darker grey-green
  c_*_2     Monterey pine again (the commonest tree of the forest)
  d_*_0/1   Monterey cypress: Cypress Point's layered pads on a grey trunk (trees_monterey)
  d_*_2     coast live oak: dense, rounded, dark olive crown (trees_monterey)

The lidar's crown-shape split decides needle-tall or broad crown and the variant (tree index
mod 3) picks the species, as flair. palettes/presidio.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees_monterey as mty
import trees_peninsula as pen
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


PINE = _pal("#0f241a", "#1c3f2a", "#275433", "#33673d", "#4a8150")
CYPRESS = _pal("#0b2118", "#153827", "#1e4d32", "#29623d", "#3f7e4e")
EUC = _pal("#1b2a25", "#33493f", "#465f53", "#5c7a69", "#7e9b87")
EUC_TRUNK = _pal("#3a352f", "#a69c86", "#d9d1bc")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 1:
        img = pen._eucalyptus(W, H, variant)
        return _recolor(_recolor(img, pen.EUC, EUC), pen.EUC_TRUNK, EUC_TRUNK)
    return _recolor(mty.pine(W, H, variant), mty.PINE, PINE)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 2:
        return mty._live_oak(W, H, variant)
    return _recolor(mty._cypress(W, H, variant), mty.CYPRESS, CYPRESS)

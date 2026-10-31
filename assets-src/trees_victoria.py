"""Tree sprites for the `victoria` theme (Victoria Golf Club, Oak Bay, British Columbia).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). The course sits on the
rocky point of Oak Bay in the Garry oak country of southern Vancouver Island: Douglas fir on
the inland side and round the clubhouse, Garry oak (Quercus garryana) in open, crooked groves
on the rock knolls, and a few shore pines on the outcrops by the sea (club pages: "a heritage
neighbourhood lined with Garry Oaks"; the CRD 2025 orthophoto).

  c_*_0/1   Douglas fir: the Pacific Northwest conifer (trees.py), unchanged
  c_*_2     shore pine: Cypress Point's open pine (trees_monterey), in a darker, cooler green
  d_*_*     Garry oak: a dense, rounded crown on a short trunk (trees_monterey's live-oak shape),
            in the oak's deep glossy green with a lighter olive top

The lidar's crown-shape split decides needle-tall or broad crown and the variant (tree index
mod 3) picks the species within the class, as flair. palettes/victoria.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
import trees_monterey as mty
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


SHORE_PINE = _pal("#0d1f17", "#183626", "#22492f", "#2d5c38", "#40744a")
GARRY = _pal("#141f12", "#26391c", "#354d24", "#46632d", "#61803c")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 2:
        return _recolor(mty.pine(W, H, variant), mty.PINE, SHORE_PINE)
    return base.conifer(W, H, variant)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(mty._live_oak(W, H, variant), mty.LIVE_OAK, GARRY)

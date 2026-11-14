"""Tree and bush sprites for the `lofoten` theme (Lofoten Links, Gimsøya, 68° N).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`):

  d_*_*   downy birch (Betula pubescens), the few low trees of the island: the
          deciduous shape with a white, black-flecked trunk and a light, yellow-
          green crown
  c_*_*   Norway spruce, planted in shelter belts: the conifer shape, darker
  s_*_*_* heather and crowberry (`heather`, the theme's bush painter, palette
          "trees": {"shrub": ...}): a low, dark mound with purple-pink heather
          flowers, variant = index % 8 from full bloom to none

Course chat's proposal, 2026-11-13. Every other theme's sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba
from trees_bandon_dunes import _outline, _recolor, gorse

BIRCH = [hex2rgba(c) for c in ("#1d3320", "#3b5f2a", "#557d34", "#73983f", "#97b65a")]
BIRCH_TRUNK = [hex2rgba(c) for c in ("#3a3a36", "#d9d6cc", "#f3f1ea")]
SPRUCE = [hex2rgba(c) for c in ("#0b1f19", "#15362a", "#1e4733", "#28583c", "#3a6e4a")]
HEATH = [hex2rgba(c) for c in ("#1b1a17", "#2f2b23", "#45402f", "#5a553b", "#6f6b46")]
HEATH_BLOOM = [hex2rgba(c) for c in ("#6e2f5a", "#9a4a82", "#c27aa8")]
BUSH_BLOOM = (0.30, 0.22, 0.16, 0.26, 0.10, 0.20, 0.05, 0.0)


def birch(W: int, H: int, variant: int) -> np.ndarray:
    img = _recolor(base.deciduous(W, H, variant), base.DEC, BIRCH)
    img = _recolor(img, base.TRUNK, BIRCH_TRUNK)
    # black flecks on the white trunk, every third row
    white = np.all(img == np.array(BIRCH_TRUNK[1], np.uint8), axis=-1)
    ys, xs = np.nonzero(white)
    for y, x in zip(ys, xs):
        if (y + variant) % 3 == 0:
            img[y, x] = BIRCH_TRUNK[0]
    return img


def spruce(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, SPRUCE)


def heather(W: int, H: int, variant: int) -> np.ndarray:
    """A heather and crowberry mound for the theme's bush sheet (sprites/shrubs_lofoten,
    trees.json c: 3), on the shrub size grid (W x H px plus the outline, H + 1 rows)."""
    img = gorse(W, H + 1, variant, share=BUSH_BLOOM[variant % len(BUSH_BLOOM)], fill=True)
    from trees_bandon_dunes import BLOOM, GORSE
    img = _recolor(img, GORSE, HEATH)
    img = _recolor(img, BLOOM, HEATH_BLOOM)
    solid = img[..., 3] > 0
    img[_outline(solid)] = HEATH[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img

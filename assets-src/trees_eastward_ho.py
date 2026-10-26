"""Tree sprites for the `eastward_ho` theme (Eastward Ho! Country Club, Chatham MA).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). From the developer's
photos (release assorted-lidar-data, eastward.1-5): Herbert Fowler's course on its moraine
between Pleasant Bay and Crows Pond after Kyle Franz's 2024 restoration, the native heath gone
copper and rust in late season, with scattered, wind-bent pitch pines and red cedars and clumps
of scrub oak and bayberry on the slopes.

  c_*_0     pitch pine, leaning: the coastal theme's ragged, flat-topped pine
  c_*_1     eastern red cedar: the pnw conical shape in a dark blue-green
  c_*_2     pitch pine in a lighter, yellower green (sunlit, exposed)
  d_*_0     scrub / black oak: broad, lumpy olive crown
  d_*_1     the same oak touched with bronze (late season)
  d_*_2     bayberry thicket: a low, dense, grey-green clump

The lidar's classes (3-5) and its leaf-off split decide needle or broadleaf; the variant (tree
index mod 3) picks the species within it, as flair. palettes/eastward_ho.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


PINE = _pal("#13251a", "#21422a", "#2e5832", "#3c6d3a", "#53884a")
PINE_SUN = _pal("#172818", "#284726", "#375e2d", "#4a7535", "#659244")
PINE_TRUNK = _pal("#2a170f", "#5a3420", "#7d4b2e")
CEDAR = _pal("#0e2420", "#183a30", "#21503c", "#2c6447", "#3e7c56")
CEDAR_TRUNK = _pal("#2a1a14", "#5a3a2c", "#7e5440")
OAK = _pal("#1b2a13", "#31481e", "#425e27", "#567631", "#71913f")
OAK_BRONZE = _pal("#2a2412", "#4a4220", "#64572a", "#7d6a33", "#9a8040")
BAYBERRY = _pal("#1a2a1f", "#2e4433", "#3e5a42", "#507252", "#6b8c68")
OAK_TRUNK = _pal("#2b2420", "#4e443c", "#6b5f54")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 1:
        return _recolor(_recolor(base.conifer(W, H, variant), base.CON, CEDAR), base.TRUNK, CEDAR_TRUNK)
    img = base.pitch_pine(W, H, variant)
    return _recolor(_recolor(img, base.PINE, PINE if v == 0 else PINE_SUN), base.PINE_TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.scrub_oak(W, H, variant)
    img = _recolor(img, base.OAK, (OAK, OAK_BRONZE, BAYBERRY)[variant % 3])
    return _recolor(img, base.OAK_TRUNK, OAK_TRUNK)

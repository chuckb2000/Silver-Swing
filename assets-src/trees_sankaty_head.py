"""Tree sprites for the `sankaty_head` theme (Sankaty Head Golf Club, Siasconset, Nantucket MA).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). The course itself is
treeless moorland (LINKS Magazine; NAIP); what the lidar finds stands in the windbreaks and
gardens round the 'Sconset houses beside it and in the scrub between holes:

  c_*_0     Japanese black pine, the island's planted windbreak pine: ragged, flat-topped, very dark
  c_*_1     eastern red cedar: the pnw conical shape in a dark blue-green
  c_*_2     pitch pine in a lighter, yellower green (sunlit, exposed)
  d_*_0     scrub oak: broad, lumpy olive crown
  d_*_1     the same oak gone russet (late season on the moors)
  d_*_2     bayberry thicket: a low, dense, grey-green clump

The lidar's leaf-on 2018 point cloud has no vegetation classes; crown shape decides needle or
broadleaf and the variant (tree index mod 3) picks the species within it, as flair.
palettes/sankaty_head.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


BLACK_PINE = _pal("#0f1f17", "#1a3324", "#24452c", "#315a36", "#457243")
PINE_SUN = _pal("#172818", "#284726", "#375e2d", "#4a7535", "#659244")
PINE_TRUNK = _pal("#241510", "#4d2e1e", "#704329")
CEDAR = _pal("#0e2420", "#183a30", "#21503c", "#2c6447", "#3e7c56")
CEDAR_TRUNK = _pal("#2a1a14", "#5a3a2c", "#7e5440")
OAK = _pal("#1b2a13", "#31481e", "#425e27", "#567631", "#71913f")
OAK_RUSSET = _pal("#2c1f12", "#4e3420", "#6a472a", "#865a33", "#a3713f")
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
    return _recolor(_recolor(img, base.PINE, BLACK_PINE if v == 0 else PINE_SUN), base.PINE_TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.scrub_oak(W, H, variant)
    img = _recolor(img, base.OAK, (OAK, OAK_RUSSET, BAYBERRY)[variant % 3])
    return _recolor(img, base.OAK_TRUNK, OAK_TRUNK)

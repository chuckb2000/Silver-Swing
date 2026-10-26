"""Tree sprites for the `fishers_island` theme (Fishers Island Club, NY).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks frames
the same way (`<c|d>_<w>_<h>_<variant>`). From the developer's photos (release
assorted-lidar-data, fishers.1-6): a nearly treeless headland of bright fairways and tawny
fescue, with dense thickets of bayberry and shadbush between the holes, a few gnarled,
wind-pruned oaks, and dark eastern red cedars and pitch pines on the island's interior.

  c_*_0     eastern red cedar: the pnw conical shape in a dark blue-green
  c_*_1     pitch pine: the coastal theme's ragged, flat-topped pine
  c_*_2     eastern red cedar in the darkest green (the shade side of a stand)
  d_*_0     black oak, wind-pruned: broad, lumpy olive crown on a short trunk
  d_*_1     the same oak in a lighter, yellower green (sunlit edge of a stand)
  d_*_2     bayberry / shadbush thicket: a low, dense, grey-green clump

The lidar can't tell species apart: the leaf-off split decides needle or broadleaf and the
variant (tree index mod 3) picks the species within it, as flair, not survey.
palettes/fishers_island.json names these painters, so
`python3 assets-src/build_assets.py --theme fishers_island` builds sprites/trees_fishers_island.*.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


CEDAR = _pal("#0e2420", "#183a30", "#21503c", "#2c6447", "#3e7c56")
CEDAR_DARK = _pal("#0b1d19", "#132f28", "#1a4132", "#22523b", "#326a4a")
CEDAR_TRUNK = _pal("#2a1a14", "#5a3a2c", "#7e5440")
PINE = _pal("#14261a", "#22422b", "#2f5933", "#3e6e3b", "#55894a")
PINE_TRUNK = _pal("#2a170f", "#5a3420", "#7d4b2e")
OAK = _pal("#18240f", "#2c401b", "#3b5524", "#4d6b2c", "#67873b")
OAK_LIGHT = _pal("#1d2a12", "#354b1e", "#486428", "#5d7d33", "#7b9a45")
OAK_TRUNK = _pal("#2b2420", "#4e443c", "#6b5f54")
BAYBERRY = _pal("#1a2a1f", "#2e4433", "#3e5a42", "#507252", "#6b8c68")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 1:
        return _recolor(_recolor(base.pitch_pine(W, H, variant), base.PINE, PINE), base.PINE_TRUNK, PINE_TRUNK)
    img = base.conifer(W, H, variant)
    return _recolor(_recolor(img, base.CON, CEDAR if v == 0 else CEDAR_DARK), base.TRUNK, CEDAR_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    img = base.scrub_oak(W, H, variant)
    img = _recolor(img, base.OAK, (OAK, OAK_LIGHT, BAYBERRY)[v])
    return _recolor(img, base.OAK_TRUNK, OAK_TRUNK)

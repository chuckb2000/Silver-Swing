"""Tree sprites for the `bayside` theme (Indian Island, Riverhead, Long Island).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`), drawn for the edge
of the Long Island pine barrens on the Peconic estuary:

  c_*_*     pitch pine: the coastal theme's ragged flat-topped pine, in a
            cooler blue-green
  d_*_0     white and black oak: deep summer green
  d_*_1     red maple and black locust: a lighter, yellower green
  d_*_2     oak in a darker, denser green

palettes/bayside.json names these painters, so `make assets` builds
sprites/trees_bayside.* and pipeline s09b draws the same trees in the putting
views. The pnw and coastal sheets are unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

PINE = [hex2rgba(c) for c in ("#10241d", "#1b3d30", "#265239", "#326845", "#478157")]
PINE_TRUNK = [hex2rgba(c) for c in ("#26160f", "#53301e", "#77462b")]
OAK = [hex2rgba(c) for c in ("#132a18", "#244e22", "#32662b", "#438037", "#5f9b49")]
MAPLE = [hex2rgba(c) for c in ("#1a2f16", "#36601f", "#497b29", "#619637", "#8ab650")]
OAK_DARK = [hex2rgba(c) for c in ("#0f2414", "#1f441f", "#2b5a28", "#3a7232", "#558d43")]
TRUNK = [hex2rgba(c) for c in ("#22150e", "#463021", "#685036")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    img = base.pitch_pine(W, H, variant)
    return _recolor(_recolor(img, base.PINE, PINE), base.PINE_TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.deciduous(W, H, variant)
    img = _recolor(img, base.DEC, (OAK, MAPLE, OAK_DARK)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

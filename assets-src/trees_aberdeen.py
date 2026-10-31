"""Tree sprites for the `aberdeen` theme (The Course at Aberdeen, Valparaiso, Indiana).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). High summer on the Valparaiso Moraine in
northwest Indiana: a parkland of oak and maple hardwoods, wetland edges with cottonwood and
silver maple, and the blue spruce and white pine planted along the houses of the Aberdeen
community (course chat, 2026-10-31; drawn from the setting, no club imagery used):

  c_*_0, c_*_2  Colorado blue spruce: the pnw conical shape in a cool blue-grey green
  c_*_1         eastern white pine: the conical shape in a soft, deep green
  d_*_0         bur / white oak: the broad, clumpy oak crown (trees.scrub_oak) in deep green
  d_*_1         sugar maple: the round crown in a fresh, bright summer green
  d_*_2         silver maple / cottonwood of the wetland edges: the round crown in a pale,
                silvery green with light undersides

The lidar can't tell species apart (crown shape gives needle or broadleaf); the variant (tree
index mod 3) picks the species, as flair, not survey. palettes/aberdeen.json names these
painters, so `build_assets.py --theme aberdeen` builds sprites/trees_aberdeen.* and pipeline
s09b draws the same trees in the putting views.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


SPRUCE = _pal("#0f2224", "#1d3a3c", "#2a504f", "#3a6763", "#5a8a82")
WHITE_PINE = _pal("#0d241b", "#193d2b", "#235236", "#2e6641", "#447f55")
CON_TRUNK = _pal("#26170f", "#4e3121", "#704a33")
OAK = _pal("#13260f", "#24441a", "#315a22", "#41702c", "#5c8c3c")
SUGAR_MAPLE = _pal("#152c10", "#2c5a1c", "#3d7426", "#529033", "#76b04a")
SILVER = _pal("#1b2c1c", "#3a5c35", "#517a48", "#6d975d", "#a3c08c")
OAK_BARK = _pal("#2a221d", "#4b3f36", "#695a4d")
MAPLE_BARK = _pal("#26201c", "#4f463f", "#7a6f64")
SILVER_BARK = _pal("#2e2c2a", "#6b665e", "#9c968b")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    pal = WHITE_PINE if variant % 3 == 1 else SPRUCE
    return _recolor(_recolor(base.conifer(W, H, variant), base.CON, pal), base.TRUNK, CON_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 0:      # bur / white oak
        return _recolor(_recolor(base.scrub_oak(W, H, variant), base.OAK, OAK), base.OAK_TRUNK, OAK_BARK)
    if v == 1:      # sugar maple
        return _recolor(_recolor(base.deciduous(W, H, variant), base.DEC, SUGAR_MAPLE), base.TRUNK, MAPLE_BARK)
    # silver maple / cottonwood
    return _recolor(_recolor(base.deciduous(W, H, variant), base.DEC, SILVER), base.TRUNK, SILVER_BARK)

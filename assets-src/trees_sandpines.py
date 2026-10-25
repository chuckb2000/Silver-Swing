"""Tree sprites for the `sandpines` theme (Sandpines Golf Links, Florence OR).

The woods round Sandpines are the same coastal mix as Bandon's: Sitka spruce
and shore pine on old dunes. This reuses the `bandon` shapes
(assets-src/trees_bandon.py, which stays unchanged) and recolours them a
little cooler and darker, as the stands look in the club's photos:

  c_*_*     Sitka spruce / Douglas fir: the bandon conifer shapes
  d_*_*     shore pine: the bandon wind-shaped shore pine (broad, flat-topped,
            leaning east), in a deeper blue-green

Same sizes, keys and anchors as the pnw set (trees.py). The lidar's
conifer / broad-crown split is by crown shape only (pipeline s05), so these
are a drawing choice per crown shape, not a surveyed species map.
palettes/sandpines.json names these painters; `python3
assets-src/build_assets.py --theme sandpines` builds sprites/trees_sandpines.*.
"""
from __future__ import annotations

import numpy as np

import trees_bandon as tb
from atlas import hex2rgba

# the bandon shore-pine ramp -> a deeper, bluer green (Sandpines' pines in shade)
SHORE = [hex2rgba(c) for c in ("#0e2114", "#1b3a22", "#26502b", "#336535", "#4c7f45")]


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return tb.conifer(W, H, variant)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    return tb._recolor(tb.deciduous(W, H, variant), tb.SHORE, SHORE)

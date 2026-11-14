"""Tree sprites for the `olympic_club` theme (The Olympic Club, San Francisco): the dense
cypress, pine and eucalyptus that line the Lake's corridors, darker and more saturated
than SFGC's next door.

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). Shapes come from
trees_monterey (pine, cypress) and trees_peninsula (eucalyptus); only the colours are this
theme's:

  c_*_0/2   Monterey pine
  c_*_1     blue gum eucalyptus: tall, blue-grey, pale bark
  d_*_0/1   Monterey cypress: flat, wind-shaped pads
  d_*_2     blue gum eucalyptus again (the broad-crowned ones)

Colour by variant is a drawing choice, not a surveyed species (the lidar gives only crown
shape). palettes/olympic_club.json names these painters, so `build_assets.py --theme olympic_club`
builds sprites/trees_olympic_club.* and pipeline s09b draws the same trees in the putting views.
"""
from __future__ import annotations

import numpy as np

import trees_monterey as mty
import trees_peninsula as pen
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


PINE = _pal("#0c1f16", "#173726", "#204b30", "#2a5f3a", "#3f7a4c")
CYPRESS = _pal("#091a13", "#122f20", "#1a422b", "#245637", "#387249")
EUC = _pal("#18262a", "#2f4547", "#435d5d", "#5a7977", "#80a09c")
EUC_TRUNK = _pal("#3a352f", "#aaa18c", "#ddd6c3")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def _euc(W: int, H: int, variant: int) -> np.ndarray:
    img = pen._eucalyptus(W, H, variant)
    return _recolor(_recolor(img, pen.EUC, EUC), pen.EUC_TRUNK, EUC_TRUNK)


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 1:
        return _euc(W, H, variant)
    return _recolor(mty.pine(W, H, variant), mty.PINE, PINE)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 2:
        return _euc(W, H, variant)
    return _recolor(mty._cypress(W, H, variant), mty.CYPRESS, CYPRESS)

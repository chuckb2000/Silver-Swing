"""Tree sprites for the `anacostia` theme (Langston Golf Course, Kingman Lake,
Washington DC).

Same sizes, keys and anchors as the other sets (`<c|d>_<w>_<h>_<variant>`),
drawn from the developer's photos in reference/langston/:

  c_*_0..2  loblolly / Virginia pines: the flat-topped, ragged pine shape of
            trees.pitch_pine, in a deeper blue-green with a grey-brown trunk
  d_*_0     oaks and elms: deep summer green
  d_*_1     sycamores and maples: a lighter, yellower green
  d_*_2     black willows and shoreline scrub: a soft olive yellow-green

No flowering trees (developer, 2026-10-19: no cherry blossoms at Langston).
palettes/anacostia.json names these painters, so `make assets` builds
sprites/trees_anacostia.* and pipeline s09b draws the same trees in the
putting views.
"""
from __future__ import annotations

import trees as base
from atlas import hex2rgba

LOBLOLLY = [hex2rgba(c) for c in ("#0f231d", "#1b3b31", "#264e3d", "#33624a", "#4a7c5a")]
PINE_TRUNK = [hex2rgba(c) for c in ("#24180f", "#4f3a2a", "#6f5643")]
OAK = [hex2rgba(c) for c in ("#132b17", "#22501f", "#30682a", "#438237", "#5f9c45")]
SYC = [hex2rgba(c) for c in ("#1b3117", "#375f21", "#4a792a", "#619337", "#88b24e")]
WILLOW = [hex2rgba(c) for c in ("#222f15", "#4c6326", "#63792f", "#7f923d", "#a3ad57")]
TRUNK = [hex2rgba(c) for c in ("#21150e", "#45311f", "#674b34")]


def _recolor(img, src, dst):
    import numpy as np
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int):
    img = base.pitch_pine(W, H, variant)
    return _recolor(_recolor(img, base.PINE, LOBLOLLY), base.PINE_TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int):
    img = base.deciduous(W, H, variant)
    img = _recolor(img, base.DEC, (OAK, SYC, WILLOW)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

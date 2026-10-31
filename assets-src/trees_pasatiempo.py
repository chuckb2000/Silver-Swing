"""Tree sprites for the `pasatiempo` theme (Pasatiempo Golf Club, Santa Cruz CA).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game
picks frames the same way (`<c|d>_<w>_<h>_<variant>`). The Santa Cruz hills a few
km from Monterey Bay: Monterey pines over the front nine, the planted Monterey
cypress groves (right of the 6th, the corridor on the 7th), coast live oaks (the
big oak behind the 13th green), and redwoods and eucalyptus down in the barrancas.

  c_*_0     Monterey pine: tall bare trunk, rounded open crown of dark tufts
            (the Cypress Point painter, recoloured a little bluer)
  c_*_1     coast redwood: the pnw conical shape in a deep cool green, red-brown trunk
  c_*_2     blue gum eucalyptus: long pale trunk, narrow loose blue-grey crown
  d_*_0     coast live oak: broad, dense, dark olive crown on a short trunk
  d_*_1     Monterey cypress: flat layered pads of very dark foliage on a grey trunk,
            only lightly swept (sheltered inland)
  d_*_2     coast live oak in the darkest green (shade side of a stand)

Lidar can't tell these species apart; the crown-shape split (pipeline s05) decides
conifer or broadleaf and the variant (tree index mod 3) picks the species within it,
as flair, not survey. The painters reuse the peninsula and monterey modules'
drawing code (imported, not changed) with Pasatiempo's own colours.
palettes/pasatiempo.json names these painters, so
`python3 assets-src/build_assets.py --theme pasatiempo` builds sprites/trees_pasatiempo.*
and pipeline s09b draws the same trees in the putting views.
"""
from __future__ import annotations

import numpy as np

import trees as base
import trees_monterey as mt
import trees_peninsula as pn
from atlas import hex2rgba

PINE = [hex2rgba(c) for c in ("#0d1f1b", "#173529", "#204834", "#2b5b3d", "#3f7550")]
REDWOOD = [hex2rgba(c) for c in ("#0c2118", "#163427", "#1e4531", "#29573a", "#3a6e49")]
CYPRESS = [hex2rgba(c) for c in ("#0a1c15", "#122f22", "#1a422c", "#245636", "#357046")]
LIVE_OAK = [hex2rgba(c) for c in ("#17240f", "#2a3f19", "#375320", "#47672a", "#5f8236")]
LIVE_OAK_DARK = [hex2rgba(c) for c in ("#0f1b0b", "#1e3112", "#294318", "#365520", "#4b6c2c")]


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 0:
        return pn._recolor(mt.pine(W, H, variant), mt.PINE, PINE)
    if v == 1:
        img = base.conifer(W, H, variant)
        return pn._recolor(pn._recolor(img, base.CON, REDWOOD), base.TRUNK, pn.REDWOOD_TRUNK)
    return pn._eucalyptus(W, H, variant)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 1:
        # variant 0 of the monterey painter is the lightly swept cypress
        return pn._recolor(mt._cypress(W, H, 0 if variant % 2 == 1 else 2), mt.CYPRESS, CYPRESS)
    return pn._recolor(mt._live_oak(W, H, variant), mt.LIVE_OAK, LIVE_OAK if v == 0 else LIVE_OAK_DARK)

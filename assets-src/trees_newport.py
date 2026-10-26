"""Tree sprites for the `newport` theme (Newport Country Club, RI).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). From the developer's
photos (release assorted-lidar-data, newport.1-7): open, rolling links-like ground with few
trees; broad, rounded deciduous trees by the clubhouse, the roads and the houses round the
edge; thickets on 7 and 8; dark pines toward the shore. Newport's old estates are known for
their copper beeches, so one broadleaf variant is a copper beech (flair, not survey).

  c_*_0     Japanese black pine: the coastal theme's ragged pine in a very dark green
  c_*_1     Norway spruce: the pnw conical shape in a cool blue-green
  c_*_2     black pine again (the commonest shore conifer)
  d_*_0     Norway maple: the pnw rounded crown in a deep summer green
  d_*_1     oak: broad, lumpy olive crown on a short trunk
  d_*_2     copper beech: the rounded crown in deep maroon-purple

The lidar can't tell species apart (class 1 only, leaf-off split); the variant (tree index mod 3)
picks the species within each class. palettes/newport.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


BLACK_PINE = _pal("#0f2018", "#1b3524", "#26492d", "#325c36", "#467445")
PINE_TRUNK = _pal("#2a1a12", "#56382a", "#7a523b")
SPRUCE = _pal("#0c2220", "#173a33", "#1f4d40", "#29614c", "#3b7a5e")
SPRUCE_TRUNK = _pal("#24160e", "#4a2e1d", "#6c4730")
MAPLE = _pal("#112a16", "#215025", "#2e6a30", "#3f843b", "#5a9f4c")
OAK = _pal("#18280f", "#2e451c", "#3e5c25", "#507530", "#6a9040")
OAK_TRUNK = _pal("#2b2420", "#4e443c", "#6b5f54")
BEECH = _pal("#24101a", "#431c26", "#5c2932", "#763a3c", "#93544c")
BEECH_TRUNK = _pal("#2c2a2a", "#585452", "#7c7774")   # smooth grey bark


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    if variant % 3 == 1:
        return _recolor(_recolor(base.conifer(W, H, variant), base.CON, SPRUCE), base.TRUNK, SPRUCE_TRUNK)
    return _recolor(_recolor(base.pitch_pine(W, H, variant), base.PINE, BLACK_PINE), base.PINE_TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 1:
        return _recolor(_recolor(base.scrub_oak(W, H, variant), base.OAK, OAK), base.OAK_TRUNK, OAK_TRUNK)
    img = base.deciduous(W, H, variant)
    if v == 0:
        return _recolor(_recolor(img, base.DEC, MAPLE), base.TRUNK, OAK_TRUNK)
    return _recolor(_recolor(img, base.DEC, BEECH), base.TRUNK, BEECH_TRUNK)

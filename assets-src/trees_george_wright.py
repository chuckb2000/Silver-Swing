"""Tree sprites for the `george_wright` theme (George Wright Golf Course, Hyde Park, Boston).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). The game's first full
autumn theme (CLAUDE.md 4 lists autumn as a planned theme), from the developer's photos
(release assorted-lidar-data, george.1-6; george.6 is the course in October): a Donald Ross
course cut through oak-maple woods on the Stony Brook ridges, the woods turning.

  c_*_0     eastern white pine: the pnw conical shape in a deep green
  c_*_1     eastern hemlock: the conical shape in the darkest blue-green
  c_*_2     white pine again (the commonest conifer of the reservation)
  d_*_0     red maple (scarlet) or an oak still green, alternating by frame size
  d_*_1     sugar maple (orange) or grey birch (yellow), alternating by frame size
  d_*_2     oak still green, or northern red oak gone russet, alternating by frame size
  (about half the broadleaves still green, as in the October photo george.6)

The lidar can't tell species apart (leaf-off split: needle or broadleaf); the variant (tree index
mod 3) and the frame size pick the species and colour, as flair, not survey. Seeded by frame, so
the sheet is the same on every build. palettes/george_wright.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


WHITE_PINE = _pal("#0d231b", "#183a2a", "#214d34", "#2b5f3d", "#3c7750")
HEMLOCK = _pal("#0c1f1c", "#15322d", "#1d4339", "#265545", "#356d57")
PINE_TRUNK = _pal("#26170f", "#4e3121", "#704a33")
RED_MAPLE = _pal("#3a0f0c", "#6e1c14", "#962a1a", "#bb3d22", "#d9613a")
SUGAR_MAPLE = _pal("#40200a", "#7a3c10", "#a85816", "#cc7a20", "#e8a036")
BIRCH = _pal("#3a3010", "#6c5a16", "#968020", "#bfa62c", "#e0cc4a")
RED_OAK = _pal("#2e1a0f", "#55301a", "#744423", "#91582e", "#ad743c")
LATE_GREEN = _pal("#16280f", "#2d451c", "#3d5b25", "#4f722f", "#6a8e3f")
BARK = _pal("#2b2420", "#4e443c", "#6b5f54")
BIRCH_BARK = _pal("#3a3836", "#a9a59c", "#e2ded4")


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    pal = HEMLOCK if variant % 3 == 1 else WHITE_PINE
    return _recolor(_recolor(base.conifer(W, H, variant), base.CON, pal), base.TRUNK, PINE_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    alt = (W // 4 + H // 6) % 2          # alternates between neighbouring frame sizes
    if v == 0:      # red maple turned scarlet, or an oak still green
        if alt:
            return _recolor(_recolor(base.deciduous(W, H, variant), base.DEC, RED_MAPLE), base.TRUNK, BARK)
        return _recolor(_recolor(base.scrub_oak(W, H, variant), base.OAK, LATE_GREEN), base.OAK_TRUNK, BARK)
    if v == 1:      # sugar maple orange, or a grey birch gone yellow
        if alt:
            return _recolor(_recolor(base.deciduous(W, H, variant), base.DEC, SUGAR_MAPLE), base.TRUNK, BARK)
        return _recolor(_recolor(base.deciduous(W, H, variant), base.DEC, BIRCH), base.TRUNK, BIRCH_BARK)
    # an oak still green, or one gone russet
    img = base.scrub_oak(W, H, variant)
    return _recolor(_recolor(img, base.OAK, LATE_GREEN if alt else RED_OAK), base.OAK_TRUNK, BARK)

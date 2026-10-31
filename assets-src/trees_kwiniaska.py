"""Tree sprites for the `kwiniaska` theme (Kwiniaska Golf Club, Shelburne, Vermont).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). A ridge-top parkland in the
Champlain Valley at the turn of the season (late September, the first colour): the hardwoods round
the course (sugar maple, red maple, paper birch, ash and oak; course chat 2026-10-30 from the leaf-off
VCGI and leaf-on NAIP photos and the Vermont setting) mostly still summer green, a few maples already
turning, with dark eastern white pine and hemlock in the woods and hedgerows.

  c_*_0     eastern white pine: the conical shape in a soft blue-green
  c_*_1     eastern hemlock: the conical shape in the darkest green
  c_*_2     white pine again (the commoner conifer)
  d_*_0     sugar maple: summer green, or (every other frame size) a crown starting to turn,
            with a ragged patch of flame orange on the sunlit top (about a third of the crown)
  d_*_1     paper birch (light yellow-green crown, white trunk), or a red maple gone scarlet
            (every other frame size: about one leafy tree in six)
  d_*_2     ash or oak in a deep, cool summer green

The lidar can't tell species apart (leaf-off split: needle or broadleaf); the variant (tree index
mod 3) and the frame size pick the species and colour, as flair, not survey. Seeded by frame, so
the sheet is the same on every build. palettes/kwiniaska.json names these painters.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


WHITE_PINE = _pal("#0e2621", "#1a4136", "#245444", "#306953", "#46836a")
HEMLOCK = _pal("#0b1d19", "#14302a", "#1c4136", "#275343", "#376a55")
PINE_TRUNK = _pal("#26170f", "#4e3121", "#704a33")
SUGAR_GREEN = _pal("#152b14", "#2b5420", "#3b6e29", "#4f8935", "#70a64a")
ASH_GREEN = _pal("#10240f", "#21451b", "#2e5c24", "#3e742e", "#58903f")
BIRCH = _pal("#1f2c12", "#4a6a24", "#64862f", "#81a23e", "#a7c25e")
RED_MAPLE = _pal("#3a0f0c", "#741c14", "#9e2b1a", "#c63f22", "#e2693c")
# the turning patch of a sugar maple: outline dark, then flame orange
TURN = _pal("#2e1a0c", "#8a3d12", "#bd5a17", "#e07f22", "#f4ad44")
BARK = _pal("#2b2420", "#4e443c", "#6b5f54")
BIRCH_BARK = _pal("#3a3836", "#b2aea4", "#ece8de")


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    pal = HEMLOCK if variant % 3 == 1 else WHITE_PINE
    return _recolor(_recolor(base.conifer(W, H, variant), base.CON, pal), base.TRUNK, PINE_TRUNK)


TURN_SHARE = 0.33


def _turning_mask(W: int, H: int, img: np.ndarray, variant: int) -> np.ndarray:
    """A ragged patch of about TURN_SHARE of the crown, leaning to the sunlit top (seeded by size)."""
    rng = np.random.default_rng(104729 * W + 37 * H + variant)
    leaf = np.zeros(img.shape[:2], bool)
    for c in base.DEC[1:]:
        leaf |= np.all(img == np.array(c, np.uint8), axis=-1)
    ys, xs = np.nonzero(leaf)
    if len(ys) < 8:
        return np.zeros_like(leaf)
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(float)
    span = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1.0
    field = np.zeros(leaf.shape)
    for _ in range(3):
        k = rng.integers(len(ys))
        s = span * rng.uniform(0.14, 0.24)
        field += rng.uniform(0.6, 1.0) * np.exp(-((xx - xs[k]) ** 2 + (yy - ys[k]) ** 2) / (2 * s * s))
    field += 0.35 * (1 - (yy - ys.min()) / span)          # tops turn first
    field += rng.uniform(-0.18, 0.18, leaf.shape)
    cut = np.quantile(field[leaf], 1 - TURN_SHARE)
    return leaf & (field >= cut)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    alt = (W // 4 + H // 6) % 2          # alternates between neighbouring frame sizes
    img = base.deciduous(W, H, variant)
    if v == 0:      # sugar maple: green, or starting to turn
        if alt:
            patch = _turning_mask(W, H, img, variant)
            img = _recolor(img, base.DEC[1:], TURN[1:], patch)
            img = _recolor(img, base.DEC, SUGAR_GREEN, ~patch)
        else:
            img = _recolor(img, base.DEC, SUGAR_GREEN)
        return _recolor(img, base.TRUNK, BARK)
    if v == 1:      # paper birch, or a red maple gone scarlet
        if alt:
            return _recolor(_recolor(img, base.DEC, RED_MAPLE), base.TRUNK, BARK)
        return _recolor(_recolor(img, base.DEC, BIRCH), base.TRUNK, BIRCH_BARK)
    # ash or oak, deep summer green, in the rounder clump shape
    img = base.scrub_oak(W, H, variant)
    return _recolor(_recolor(img, base.OAK, ASH_GREEN), base.OAK_TRUNK, BARK)

"""Tree sprites for the `burlington_cc` theme (Burlington Country Club, Vermont).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). Northern hardwoods at
Vermont's peak foliage, on the hill above Lake Champlain (course chat, 2026-10-30; the developer
asleep, gave the course chats a free hand with themes). Differs from George Wright's Boston
autumn (oak, half the trees still green, golden native rough): Vermont's maples are the show,
paper birch stands out by its white bark, and few broadleaves are still green.

  c_*_0     eastern white pine: deep green
  c_*_1     eastern hemlock: the darkest blue-green
  c_*_2     northern white cedar: a lighter olive green
  d_*_0     sugar maple: orange crown flecked with scarlet
  d_*_1     paper birch: golden-yellow crown on a white trunk with black marks
  d_*_2     red maple gone scarlet, or a maple still green, alternating by frame size

The lidar can't tell species apart (needle or broadleaf only); the variant (tree index mod 3)
and the frame size pick the species and colour, as flair, not survey. Seeded by frame size and
variant, so the sheet is the same on every build. palettes/burlington_cc.json names these.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


WHITE_PINE = _pal("#0c2219", "#163828", "#1f4b33", "#295e3d", "#3a7650")
HEMLOCK = _pal("#0b1e1b", "#14302b", "#1c4137", "#255344", "#346a55")
CEDAR = _pal("#15281a", "#264526", "#355a2e", "#486f37", "#628a47")
PINE_TRUNK = _pal("#26170f", "#4e3121", "#704a33")
SUGAR_MAPLE = _pal("#431c08", "#82380e", "#b55513", "#dd7a1e", "#f3a637")
SCARLET = _pal("#3c0c0a", "#741912", "#a1261a", "#c83a20", "#e46036")
BIRCH_GOLD = _pal("#3c3010", "#715d14", "#a3871c", "#cdb02a", "#ecd552")
LATE_GREEN = _pal("#16280f", "#2c4a1c", "#3c6126", "#4f7830", "#6c9442")
BARK = _pal("#2b2420", "#4e443c", "#6b5f54")
BIRCH_BARK = _pal("#2a2826", "#c9c5bb", "#f0ede4")


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    pal = WHITE_PINE if v == 0 else HEMLOCK if v == 1 else CEDAR
    return _recolor(_recolor(base.conifer(W, H, variant), base.CON, pal), base.TRUNK, PINE_TRUNK)


def _flecks(W: int, H: int, variant: int, share: float) -> np.ndarray:
    """A clumpy random mask (2 px blobs) for mixing two leaf colours in one crown."""
    rng = np.random.default_rng(5000 * W + 13 * H + variant)
    h2, w2 = (H + 1) // 2, (W + 3) // 2
    m = rng.random((h2, w2)) < share
    return np.kron(m, np.ones((2, 2), bool))[:H, :W + 2]


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    img = base.deciduous(W, H, variant)
    if v == 0:      # sugar maple: orange, flecked with scarlet
        fl = _flecks(W, H, variant, 0.22)
        out = _recolor(img, base.DEC[1:], SCARLET[1:], fl)
        out = _recolor(out, base.DEC, SUGAR_MAPLE)
        return _recolor(out, base.TRUNK, BARK)
    if v == 1:      # paper birch: golden leaves, white bark with black marks
        out = _recolor(_recolor(img, base.DEC, BIRCH_GOLD), base.TRUNK, BIRCH_BARK)
        rng = np.random.default_rng(9000 * W + 7 * H + variant)
        bark = np.all(out == np.array(BIRCH_BARK[2], np.uint8), axis=-1) | np.all(out == np.array(BIRCH_BARK[1], np.uint8), axis=-1)
        rows = np.where(bark.any(axis=1))[0]
        for y in rows[::2]:
            if rng.random() < 0.6:
                xs = np.where(bark[y])[0]
                out[y, xs[rng.integers(len(xs))]] = BIRCH_BARK[0]
        return out
    alt = (W // 4 + H // 6) % 2          # alternates between neighbouring frame sizes
    if alt:         # red maple, scarlet
        return _recolor(_recolor(img, base.DEC, SCARLET), base.TRUNK, BARK)
    return _recolor(_recolor(img, base.DEC, LATE_GREEN), base.TRUNK, BARK)

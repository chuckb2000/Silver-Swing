"""Tree sprites for the `seekonk` theme (Wannamoisett, Rumford, Rhode Island).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`). Very early fall in
a southern New England parkland (developer, 2026-10-19: "some light
yellowing/oranging of leaves, but not full fall"):

  c_*_*     eastern white pine: the pnw conical shape in a soft blue-green
  d_*_0     red and white oak: summer green, a touch tired
  d_*_1     maple starting to turn: a green crown with one or two seeded
            patches of yellow-orange (about a third of the crown)
  d_*_2     oak in a darker, denser green

The game draws tree i with variant i mod 3, so about a third of the leafy
trees show some colour and none is fully turned. palettes/seekonk.json names
these painters, so `make assets` builds sprites/trees_seekonk.* and pipeline
s09b draws the same trees in the putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

PINE = [hex2rgba(c) for c in ("#10261f", "#1d4134", "#285642", "#346b4f", "#4a8463")]
OAK = [hex2rgba(c) for c in ("#172a15", "#2e5121", "#3f6a2a", "#548436", "#749f48")]
MAPLE = [hex2rgba(c) for c in ("#1a2e15", "#365e20", "#4b782a", "#64923a", "#87b052")]
OAK_DARK = [hex2rgba(c) for c in ("#112414", "#22451f", "#2f5b28", "#3f7232", "#5a8c43")]
# the turning patch: outline stays dark, shade / mid / light / highlight go warm
TURN = [hex2rgba(c) for c in ("#2a2410", "#7a5a17", "#b07d1d", "#d9a52e", "#f0c752")]
TURN_ORANGE = [hex2rgba(c) for c in ("#2c1f0e", "#7c4416", "#b0611f", "#d9842e", "#efab4c")]
TRUNK = [hex2rgba(c) for c in ("#22150e", "#463021", "#685036")]


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    return _recolor(base.conifer(W, H, variant), base.CON, PINE)


TURN_SHARE = 0.30  # share of a turning maple's leaf pixels that go warm


def _turning_mask(W: int, H: int, img: np.ndarray, variant: int) -> np.ndarray:
    """A ragged area of about TURN_SHARE of the crown (seeded by size): a smooth
    random field from a few soft blobs, tilted toward the sunlit upper crown,
    plus pixel noise so the edge breaks up like leaves turning, not a stamp."""
    rng = np.random.default_rng(7919 * W + 31 * H + variant)
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
    field += 0.25 * (1 - (yy - ys.min()) / span)        # tops turn first
    field += rng.uniform(-0.18, 0.18, leaf.shape)         # ragged edge
    cut = np.quantile(field[leaf], 1 - TURN_SHARE)
    return leaf & (field >= cut)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.deciduous(W, H, variant)
    if variant % 3 == 1:
        patch = _turning_mask(W, H, img, variant)
        warm = TURN_ORANGE if (W + H) % 3 == 0 else TURN
        img = _recolor(img, base.DEC[1:], warm[1:], patch)
        img = _recolor(img, base.DEC, MAPLE, ~patch)
    else:
        img = _recolor(img, base.DEC, (OAK, None, OAK_DARK)[variant % 3])
    return _recolor(img, base.TRUNK, TRUNK)

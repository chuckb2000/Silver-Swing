"""Tree sprites for the `piedmont` theme (Rock Creek Park Golf, Washington DC).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`). Upland Piedmont
hardwood forest in mid-autumn (developer, 2026-10-22): green crowns with about
four in ten showing colour.

Rock Creek Park's canopy is tulip poplar, oaks, American beech and maples
(NPS, "Plants" and "Natural communities"); it has almost no conifers. The
pipeline's crown-shape rule (s05) still sorts the lidar crowns into a narrow,
tall class (`c`, "conifer") and a broad class (`d`). Here the narrow class is
drawn as tulip poplars, tall straight trees with an upright oval crown on a
grey trunk, and the broad class as oaks, maples and beech. That is a drawing
choice, not a species survey; physics treats both classes alike.

  c_*_0   tulip poplar, green with a turning patch of gold (~35 %)
  c_*_1   tulip poplar turned gold (a little green left in the shade)
  c_*_2   tulip poplar still green (a yellower green than the oaks)
  d_*_0   oak, olive green with a russet patch (~25 %)
  d_*_1   maple turned: scarlet (red maple) or orange (sugar maple), by size
  d_*_2   beech, green with a bronze-yellow patch (~35 %)

The game draws tree i with variant i mod 3. palettes/piedmont.json names these
painters, so `python3 assets-src/build_assets.py --theme piedmont` builds
sprites/trees_piedmont.* and pipeline s09b draws the same trees in the putting
views. Every other theme's sheets are unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


# 5 tones each: outline, shade, mid, light, highlight
OAK = _pal("#15270f", "#31501d", "#456826", "#5b8133", "#7a9d45")
POPLAR = _pal("#17290e", "#3b5a1b", "#537626", "#6f9234", "#91af4a")
BEECH = _pal("#152910", "#2e5420", "#416c2a", "#578737", "#76a44b")
GOLD = _pal("#2b200b", "#8a5f12", "#bf8a1c", "#e0b02e", "#f6d457")
RUSSET = _pal("#24160c", "#5e3a1c", "#7d5126", "#9c6a32", "#b98a45")
SCARLET = _pal("#2a0e0b", "#7a1f17", "#a8321f", "#cf4f28", "#ea7a3c")
ORANGE = _pal("#2c170a", "#8a3f12", "#bb5d1a", "#e07e26", "#f3a447")
BRONZE = _pal("#272009", "#6e5a17", "#94791f", "#b8992b", "#d3b84a")
BARK_GREY = _pal("#1f1c19", "#4a443d", "#736b60")
BARK_BROWN = _pal("#22150e", "#463021", "#685036")


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def _leaf(img: np.ndarray) -> np.ndarray:
    leaf = np.zeros(img.shape[:2], bool)
    for c in base.DEC[1:]:
        leaf |= np.all(img == np.array(c, np.uint8), axis=-1)
    return leaf


def _patch(img: np.ndarray, share: float, seed: int, top_bias: float = 0.25) -> np.ndarray:
    """A ragged area of about `share` of the crown's leaf pixels (seeded): a few
    soft blobs, tilted toward the sunlit top, with pixel noise so the edge breaks
    up like leaves turning rather than a stamp."""
    rng = np.random.default_rng(seed)
    leaf = _leaf(img)
    ys, xs = np.nonzero(leaf)
    if len(ys) < 8 or share <= 0:
        return np.zeros_like(leaf)
    if share >= 1:
        return leaf
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(float)
    span = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1.0
    field = np.zeros(leaf.shape)
    for _ in range(3):
        k = rng.integers(len(ys))
        s = span * rng.uniform(0.14, 0.26)
        field += rng.uniform(0.6, 1.0) * np.exp(-((xx - xs[k]) ** 2 + (yy - ys[k]) ** 2) / (2 * s * s))
    field += top_bias * (1 - (yy - ys.min()) / span)
    field += rng.uniform(-0.18, 0.18, leaf.shape)
    cut = np.quantile(field[leaf], 1 - share)
    return leaf & (field >= cut)


def _two_tone(img, green, warm, share, seed, top_bias=0.25):
    patch = _patch(img, share, seed, top_bias)
    out = _recolor(img, base.DEC[1:], warm[1:], patch)
    out = _recolor(out, base.DEC, green, ~patch)
    # the outline next to a warm patch goes warm-dark, so the colour reads as one mass
    return out


def tulip_poplar(W: int, H: int, variant: int) -> np.ndarray:
    """The lidar's narrow, tall crowns: tulip poplars (upright oval crown, grey trunk)."""
    img = base.deciduous(W, H, variant)
    seed = 7349 * W + 41 * H + variant
    if variant % 3 == 0:
        img = _two_tone(img, POPLAR, GOLD, 0.35, seed)
    elif variant % 3 == 1:
        img = _two_tone(img, POPLAR, GOLD, 0.82, seed, top_bias=0.6)
    else:
        img = _recolor(img, base.DEC, POPLAR)
    return _recolor(img, base.TRUNK, BARK_GREY)


def broadleaf(W: int, H: int, variant: int) -> np.ndarray:
    """The lidar's broad crowns: oak, maple and beech."""
    img = base.deciduous(W, H, variant)
    seed = 9173 * W + 23 * H + variant
    if variant % 3 == 0:
        img = _two_tone(img, OAK, RUSSET, 0.25, seed)
        return _recolor(img, base.TRUNK, BARK_BROWN)
    if variant % 3 == 1:
        warm = SCARLET if (W + H) % 2 == 0 else ORANGE
        img = _two_tone(img, OAK, warm, 0.85, seed, top_bias=0.6)
        return _recolor(img, base.TRUNK, BARK_BROWN)
    img = _two_tone(img, BEECH, BRONZE, 0.35, seed)
    return _recolor(img, base.TRUNK, BARK_GREY)

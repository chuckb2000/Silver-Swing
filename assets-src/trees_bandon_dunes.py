"""Tree sprites for the `bandon_dunes` theme (Bandon Dunes, on the bluffs above the Pacific).

(Not the `bandon` theme of Bandon Trails, palettes/bandon.json / trees_bandon.py.)

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`):

  c_*_*   shore pine (Pinus contorta var. contorta): a short, leaning, reddish
          trunk under a dense, dark blue-green crown of needle tufts, flat on
          top and swept east, away from the sea wind
  s_*_*_* gorse (Ulex europaeus), the theme's bush painter (`gorse_bush`, palette
          "trees": {"shrub": ...}): a low, spiny, dark green mound covered in
          yellow pea flowers, the thickets that line the holes (developer,
          2026-10-20: "an iconic part of this course"). `make assets` writes
          sprites/shrubs_bandon_dunes.* on the flowering-shrub size grid; the game
          draws trees.json c: 3 from it (course.json "shrubs"), variant =
          index % 8 from full bloom to a few flowers.
  d_*_*   gorse too (`gorse`: the mound in the bottom of a tree frame), in case a
          deciduous tree turns up; the course types every lidar tree a conifer
          (course_config `tree_type`).

The pipeline (pipeline/gorse.py) exports the gorse bushes as c: 3. s09b draws the
same painters in the putting views (at 6-24 px/m, so every size scales). Every
other theme's sheet is unchanged.
"""
from __future__ import annotations

import math

import numpy as np

import trees as base
from atlas import hex2rgba

PINE = [hex2rgba(c) for c in ("#0f2219", "#1a3a2a", "#244c33", "#2f603d", "#457a4c")]
PINE_TRUNK = [hex2rgba(c) for c in ("#2a160e", "#5c3320", "#83502f")]
# gorse: outline, shade, mid, lit, highlight
GORSE = [hex2rgba(c) for c in ("#17251a", "#25391f", "#344d27", "#466330", "#5a7a3a")]
# pea flowers: shade, base, lit
BLOOM = [hex2rgba(c) for c in ("#c08f12", "#f1c21c", "#ffe25a")]
BLOOM_SHARE = (0.34, 0.2, 0.07)   # variant 0, 1, 2: share of the mound's top and lit side in flower
BUSH_BLOOM = (0.34, 0.26, 0.2, 0.3, 0.14, 0.24, 0.08, 0.18)   # the bush sheet's 8 variants (index % 8)


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges (trees._outline
    rolls, so a solid bottom row would also outline the top row)."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def shore_pine(W: int, H: int, variant: int) -> np.ndarray:
    """The coastal pitch-pine shape in shore-pine colours, the crown sheared east
    (to the right) by up to W/6 px at the top: trees on the bluff lean away from
    the prevailing westerly wind."""
    img = _recolor(base.pitch_pine(W, H, variant), base.PINE, PINE)
    img = _recolor(img, base.PINE_TRUNK, PINE_TRUNK)
    Hh, Wc = img.shape[:2]
    shear = max(1.0, W / 6.0) * (0.7 + 0.15 * variant)
    trunk_top = int(Hh * 0.62)
    out = np.zeros_like(img)
    for y in range(Hh):
        k = int(round(shear * max(0.0, (trunk_top - y) / max(1, trunk_top))))
        if k <= 0:
            out[y] = img[y]
        else:
            out[y, k:] = img[y, :Wc - k]   # what leaves the frame on the right is cut, then re-outlined
    solid = out[..., 3] > 0
    out[_outline(solid)] = PINE[0]
    out[:, 0] = 0
    out[:, -1] = 0
    return out


def gorse_bush(W: int, H: int, variant: int) -> np.ndarray:
    """A gorse bush for the theme's bush sheet (sprites/shrubs_bandon_dunes, trees.json c: 3):
    the shrub size grid (assets-src/shrubs.py: W x H px plus the outline, H + 1 rows),
    the mound filling the frame. The game picks variant = index % 8: bloom from full
    to a few flowers (BUSH_BLOOM)."""
    return gorse(W, H + 1, variant, share=BUSH_BLOOM[variant % len(BUSH_BLOOM)], fill=True)


def gorse(W: int, H: int, variant: int, share: float | None = None, fill: bool = False) -> np.ndarray:
    """A gorse bush: a low lumpy mound across the frame's bottom, lit from the
    upper-left, dotted with yellow flowers on its top and lit side."""
    rng = np.random.default_rng(83000 * W + 61 * H + variant)
    Wc = W + 2
    mh = H if fill else int(min(H - 1, max(4, round(0.6 * W) + 2)))   # mound height in px
    top = H - mh
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = mh / 2 - 0.5
    cy = top + mh / 2
    n = 5 + int(W / 5)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.42, 0.58, 0.35, 0.85, H, GORSE, 0.12, 0.75)
    mask[:top] = False
    img[:top] = 0
    yy, xx = np.mgrid[0:H, 0:Wc]
    # flatter base: the bottom row is solid between the mound's ends
    cols = np.where(mask.any(axis=0))[0]
    if len(cols):
        y_b = H - 1
        img[y_b, cols[0] + 1:cols[-1]] = GORSE[1]
        mask[y_b, cols[0] + 1:cols[-1]] = True
    # flowers: clusters of 1-2 px (scaled with the bush) on the upper and left part of the mound
    share = BLOOM_SHARE[variant % 3] if share is None else share
    rel_y = (yy + 0.5 - top) / max(1.0, mh)                # 0 top .. 1 bottom
    rel_x = (xx + 0.5 - cx) / max(1.0, rx)                 # -1 left .. 1 right
    pref = (1.0 - rel_y) * 0.8 + (-rel_x) * 0.35 + 0.35     # tops and the sunny side flower most
    dot = max(1, int(round(W / 22)))
    seeds = mask & (rng.random((H, Wc)) < share * np.clip(pref, 0, 1.4) / (dot * dot))
    bloom = np.zeros((H, Wc), bool)
    for y, x in zip(*np.nonzero(seeds)):
        bloom[y:y + dot, x:x + dot] = True
    bloom &= mask
    lit = bloom & ((rel_x + rel_y) < 0.25)
    shade = bloom & ((rel_x + rel_y) > 0.95)
    img[bloom] = BLOOM[1]
    img[lit] = BLOOM[2]
    img[shade] = BLOOM[0]
    solid = img[..., 3] > 0
    img[_outline(solid)] = GORSE[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img

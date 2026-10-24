"""Tree sprites for the `peninsula` theme (Stanford Golf Course, the San
Francisco Peninsula foothills).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`). An oak woodland
in a dry Mediterranean summer, from the developer's photos (release
stanford-data): dense dark live oaks, broad grey-green valley oaks, tall
eucalyptus and a few redwoods and pines behind.

  c_*_0     coast redwood: the pnw conical shape in a deep cool green, red-brown trunk
  c_*_1     Monterey pine: the coastal theme's ragged flat-topped pine, dark green
  c_*_2     blue gum eucalyptus: a long pale trunk under a narrow, open crown of
            loose blue-grey clumps
  d_*_0     coast live oak: broad, dense, dark olive crown on a short trunk
  d_*_1     valley oak: a broad, open crown in a lighter grey-sage green
  d_*_2     coast live oak in the darkest green (shade side of a stand)

Lidar can't tell these species apart; the crown-shape split decides conifer or
broadleaf and the variant (tree index mod 3) picks the species within it, as
flair, not survey. palettes/peninsula.json names these painters, so
`python3 assets-src/build_assets.py --theme peninsula` builds
sprites/trees_peninsula.* and pipeline s09b draws the same trees in the
putting views. Every other sheet is unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

REDWOOD = [hex2rgba(c) for c in ("#0c2118", "#173628", "#1f4632", "#2a593b", "#3c714b")]
REDWOOD_TRUNK = [hex2rgba(c) for c in ("#2a120b", "#5e2a18", "#8a4426")]
PINE = [hex2rgba(c) for c in ("#10231a", "#1b3a27", "#264d2f", "#336238", "#4a7b45")]
PINE_TRUNK = [hex2rgba(c) for c in ("#28160e", "#55331f", "#7a4c2e")]
EUC = [hex2rgba(c) for c in ("#1a2a26", "#36514a", "#4b6a5f", "#628374", "#86a594")]
EUC_TRUNK = [hex2rgba(c) for c in ("#3a3530", "#a39a88", "#d8d1bf")]
LIVE_OAK = [hex2rgba(c) for c in ("#15240f", "#283f18", "#35521f", "#456628", "#5e8034")]
VALLEY_OAK = [hex2rgba(c) for c in ("#1d2a17", "#3d5530", "#506b3b", "#678448", "#88a35f")]
LIVE_OAK_DARK = [hex2rgba(c) for c in ("#101d0c", "#1f3313", "#2a4419", "#375721", "#4d6f2d")]
OAK_TRUNK = [hex2rgba(c) for c in ("#241a14", "#4a3a30", "#6a5848")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def _eucalyptus(W: int, H: int, variant: int) -> np.ndarray:
    """A tall pale trunk (about 40 % of the height) carrying a narrow, loose
    crown of blue-grey clumps with gaps between them; slight lean."""
    rng = np.random.default_rng(52000 * W + 37 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.4 * H), 4, 34))
    crown_bot = H - trunk_len + 3
    rx = W / 2 - 0.5
    ry = max(2.5, crown_bot / 2 - 1.0)
    cx = Wc / 2 + rng.uniform(-0.7, 0.7)
    cy = crown_bot / 2 + 0.5
    n = 5 + int(W / 7)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.28, 0.42, 0.35, 0.85, crown_bot, EUC, 0.16, 0.0)
    tw = max(2, int(round(W / 10)))
    base_x = Wc / 2 - tw / 2
    trunk = np.zeros((H, Wc), bool)
    for y in range(int(cy), H - 1):
        f = (H - 1 - y) / max(1, H - 1 - cy)
        x0 = int(round(base_x + (cx - Wc / 2) * f))
        trunk[y, max(0, x0):min(Wc, x0 + tw)] = True
    trunk &= ~mask
    img[trunk] = EUC_TRUNK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = EUC_TRUNK[1]  # right edge in shade
    img[H - 2, max(0, int(base_x) - 1)] = EUC_TRUNK[1]
    img[H - 2, min(Wc - 1, int(base_x) + tw)] = EUC_TRUNK[1]
    solid = img[..., 3] > 0
    img[base._outline(solid)] = EUC[0]
    return img


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 0:
        img = base.conifer(W, H, variant)
        return _recolor(_recolor(img, base.CON, REDWOOD), base.TRUNK, REDWOOD_TRUNK)
    if v == 1:
        img = base.pitch_pine(W, H, variant)
        return _recolor(_recolor(img, base.PINE, PINE), base.PINE_TRUNK, PINE_TRUNK)
    return _eucalyptus(W, H, variant)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    v = variant % 3
    if v == 1:
        img = base.deciduous(W, H, variant)
        img = _recolor(img, base.DEC, VALLEY_OAK)
        return _recolor(img, base.TRUNK, OAK_TRUNK)
    img = base.scrub_oak(W, H, variant)
    img = _recolor(img, base.OAK, LIVE_OAK if v == 0 else LIVE_OAK_DARK)
    return _recolor(img, base.OAK_TRUNK, OAK_TRUNK)

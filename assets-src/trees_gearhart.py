"""Tree sprites for the `gearhart` theme (Gearhart Golf Links, north Oregon coast).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game
picks frames the same way (`<c|d>_<w>_<h>_<variant>`). s05 sorts lidar crowns into
"conifer" (narrow for their height) and "deciduous" (broad); on the Clatsop Plains
nearly every tree is a conifer, so the two kinds are drawn as the coast's two trees:

  c_*_*     Sitka spruce: tall, conical, dark blue-green (the pnw conifer's shape)
  d_*_0, 1  shore pine: a broad, ragged, flat-topped crown, sheared by the onshore
            wind so it leans and spreads to the east (right), on a leaning trunk
  d_*_2     red alder (the creek's broadleaf): rounded, lighter grey-green, pale trunk

Which broad crowns are pines and which alders is flair (the variant is the tree's
index mod 3), not surveyed species. palettes/gearhart.json names these painters, so
`make assets` builds sprites/trees_gearhart.* and pipeline s09b draws the same trees
in the putting views. The other themes' sheets are unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

SPRUCE = [hex2rgba(c) for c in ("#0d2321", "#173a35", "#215046", "#2d6553", "#44806a")]
PINE = [hex2rgba(c) for c in ("#12251a", "#1e3c27", "#2a5130", "#386738", "#50804a")]
PINE_TRUNK = [hex2rgba(c) for c in ("#2a1a12", "#553622", "#7a5033")]
ALDER = [hex2rgba(c) for c in ("#192b18", "#33502b", "#476a36", "#5e8545", "#7ea25e")]
ALDER_TRUNK = [hex2rgba(c) for c in ("#2e2c2a", "#5d5a54", "#8a867e")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    """Sitka spruce: the pnw conifer in the spruce's blue-green."""
    return _recolor(base.conifer(W, H, variant), base.CON, SPRUCE)


def shore_pine(W: int, H: int, variant: int) -> np.ndarray:
    """Shore pine, wind-sheared: flat, ragged pads of needles stacked on a leaning
    trunk, each pad pushed a little further east (downwind) than the one below."""
    rng = np.random.default_rng(61000 * W + 37 * H + variant)
    Wc = W + 2
    lean = 0.08 * W + 0.4 * variant              # crown east of the trunk base (px)
    crown_h = int(np.clip(round(min(0.58 * H, 0.75 * W)), 4, H - 3))
    crown_bot = crown_h + 1
    npads = 1 if crown_h < 9 else (2 if crown_h < 22 else 3)
    img = np.zeros((H, Wc, 4), np.uint8)
    mask = np.zeros((H, Wc), bool)
    pad_h = crown_h / npads
    for i in reversed(range(npads)):             # lowest pad first, upper pads over it
        top = 1 + i * pad_h * 0.82
        ry = max(2.0, pad_h * 0.62)
        cy = top + ry
        frac = (i + 1) / npads                   # lower pads are wider
        rx = max(2.2, (W / 2 - 0.5) * (0.72 + 0.28 * frac) - lean * 0.4)
        cx = Wc / 2 + lean * (1.0 - 0.35 * frac) + rng.uniform(-0.4, 0.4)
        n = 4 + int(W / 7)
        pimg, pm = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.30, 0.46, 0.40, 0.85,
                                     min(H, int(cy + ry + 1)), PINE, 0.13, 0.55)
        img[pm] = pimg[pm]
        mask |= pm
    cx = Wc / 2 + lean
    rx = W / 2 - 0.5
    cy = crown_bot / 2
    yy, xx = np.mgrid[0:H, 0:Wc]
    # windward (west) edge thinner: knock out scattered pixels on the left of the crown
    sp = rng.random((H, Wc))
    thin = mask & (xx + 0.5 < cx - 0.55 * rx) & (sp < 0.35)
    img[thin] = 0
    mask &= ~thin
    tw = max(2, int(round(W / 9)))
    base_x = Wc / 2 - tw / 2 - 0.15 * W
    trunk = np.zeros((H, Wc), bool)
    for y in range(int(cy), H - 1):
        f = (H - 1 - y) / max(1, H - 1 - cy)     # 0 at the ground, 1 at the crown centre
        x0 = int(round(base_x + (cx - tw / 2 - base_x) * f))
        trunk[y, max(0, x0):min(Wc, x0 + tw)] = True
    trunk &= ~mask
    img[trunk] = PINE_TRUNK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = PINE_TRUNK[1]     # right edge in shade
    bx = int(round(base_x))
    img[H - 2, max(0, bx - 1)] = PINE_TRUNK[1]
    img[H - 2, min(Wc - 1, bx + tw)] = PINE_TRUNK[1]
    solid = img[..., 3] > 0
    img[base._outline(solid)] = PINE[0]
    return img


def alder(W: int, H: int, variant: int) -> np.ndarray:
    """Red alder: the pnw broadleaf's shape, lighter grey-green, pale grey bark."""
    img = _recolor(base.deciduous(W, H, variant), base.DEC, ALDER)
    return _recolor(img, base.TRUNK, ALDER_TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    return alder(W, H, variant) if variant % 3 == 2 else shore_pine(W, H, variant)

"""Tree sprites for the `astoria` theme (Astoria Golf & Country Club, Clatsop Plains,
north Oregon coast).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game
picks frames the same way (`<c|d>_<w>_<h>_<variant>`). s05 sorts lidar crowns into
"conifer" (narrow for their height) and "deciduous" (broad). The course's trees are
the dune ridges' conifers, standing singly or in short rows along the ridge tops
(OSIP 2024 photo; the club's own pictures show no broadleaves on the course), so both
classes are drawn as conifers:

  c_*_*     Sitka spruce: tall and conical, near-black blue-green as it reads on the
            2024 photo (darker and bluer than Gearhart's spruce)
  d_*_0, 1  shore pine: a broad, ragged crown in flat pads on a leaning trunk,
            sheared by the onshore wind so it spreads east (right)
  d_*_2     an old "flagged" shore pine: taller and thinner, with every branch on
            the lee (east) side of a bare windward trunk

Which broad crowns are flagged is flair (the variant is the tree's index mod 3),
not surveyed. palettes/astoria.json names these painters, so
`python3 assets-src/build_assets.py --theme astoria` builds sprites/trees_astoria.*
and pipeline s09b draws the same trees in the putting views. Gearhart's painters
(trees_gearhart.py) are not imported, so changing either theme leaves the other alone.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

SPRUCE = [hex2rgba(c) for c in ("#0a1c1d", "#13302f", "#1c4340", "#28584f", "#3b7264")]
PINE = [hex2rgba(c) for c in ("#10221b", "#1a3826", "#264d2e", "#356336", "#4c7d46")]
PINE_TRUNK = [hex2rgba(c) for c in ("#2a1a13", "#573925", "#7e5638")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        out[np.all(img == np.array(s, np.uint8), axis=-1)] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    """Sitka spruce: the pnw conifer's shape in the darker coastal spruce green."""
    img = _recolor(base.conifer(W, H, variant), base.CON, SPRUCE)
    return _recolor(img, base.TRUNK, PINE_TRUNK)


def _pine(W: int, H: int, variant: int, flagged: bool) -> np.ndarray:
    """Shore pine in flat, ragged pads of needles stacked on a leaning trunk, each pad
    pushed further east (downwind) than the one below. `flagged`: a narrower, taller
    crown with the windward half stripped, leaving a bare trunk on the west side."""
    rng = np.random.default_rng(71000 * W + 41 * H + variant)
    Wc = W + 2
    lean = (0.14 if flagged else 0.08) * W + 0.4 * variant   # crown east of the trunk base (px)
    crown_h = int(np.clip(round(min((0.66 if flagged else 0.58) * H, 0.8 * W)), 4, H - 3))
    crown_bot = crown_h + 1
    npads = 1 if crown_h < 9 else (2 if crown_h < 22 else 3)
    img = np.zeros((H, Wc, 4), np.uint8)
    mask = np.zeros((H, Wc), bool)
    pad_h = crown_h / npads
    for i in reversed(range(npads)):             # lowest pad first, upper pads over it
        top = 1 + i * pad_h * 0.82
        ry = max(2.0, pad_h * 0.6)
        cy = top + ry
        frac = (i + 1) / npads                   # lower pads are wider
        rx = max(2.2, (W / 2 - 0.5) * (0.72 + 0.28 * frac) - lean * 0.4)
        if flagged:
            rx = max(2.0, rx * 0.9)
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
    # windward (west) edge thinner; a flagged pine loses the whole windward side
    sp = rng.random((H, Wc))
    cut = (xx + 0.5 < cx - (0.3 if flagged else 0.55) * rx) & (sp < (0.6 if flagged else 0.35))
    thin = mask & cut
    img[thin] = 0
    mask &= ~thin
    tw = max(2, int(round(W / 9)))
    base_x = Wc / 2 - tw / 2 - 0.15 * W
    top_y = 2 if flagged else int(cy)            # a flagged pine's trunk shows near the top
    trunk = np.zeros((H, Wc), bool)
    for y in range(top_y, H - 1):
        f = (H - 1 - y) / max(1, H - 1 - top_y)  # 0 at the ground, 1 at the top
        x0 = int(round(base_x + (cx - tw / 2 - base_x) * f * (0.6 if flagged else 1.0)))
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


def shore_pine(W: int, H: int, variant: int) -> np.ndarray:
    return _pine(W, H, variant, flagged=False)


def flagged_pine(W: int, H: int, variant: int) -> np.ndarray:
    return _pine(W, H, variant, flagged=True)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    return flagged_pine(W, H, variant) if variant % 3 == 2 else shore_pine(W, H, variant)

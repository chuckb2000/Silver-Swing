"""Tree sprites for the `tcc_brookline` theme (The Country Club, Brookline MA: old New
England parkland, the holes framed by tall oaks, elms and white pines over puddingstone ledge).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py). s05 sorts lidar crowns
into "conifer" (narrow for their height) and "deciduous" (broad); this theme draws them as:

  c_*_*     eastern white pine: the pnw conifer's tiered spire repainted a soft blue-green,
            ragged-edged (wind-torn tiers), on a grey-brown trunk
  d_*_*     red oak / American elm: a broad lumpy crown, mid summer green with a lit side and
            a few early-autumn russet flecks, on a dark grey trunk

palettes/tcc_brookline.json names these painters; `python3 assets-src/build_assets.py
--theme tcc_brookline` builds sprites/trees_tcc_brookline.*, and pipeline s09b draws
the same painters in the putting views. Nothing here is imported by another theme.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

FIR = [hex2rgba(c) for c in ("#10241e", "#1d3d33", "#2a5444", "#3a6c56", "#58896f")]
FIR_BARK = [hex2rgba(c) for c in ("#2a221c", "#544638", "#776552")]
COTTON = [hex2rgba(c) for c in ("#172a12", "#2a4a1c", "#3d6626", "#548432", "#7aa64c")]
COTTON_GOLD = [hex2rgba(c) for c in ("#a0522a", "#c87038")]
COTTON_BARK = [hex2rgba(c) for c in ("#2a2826", "#4c4844", "#6e6862")]


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges (padded first)."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def red_oak(W: int, H: int, variant: int) -> np.ndarray:
    """Red oak / elm: a broad lumpy crown on a dark grey trunk."""
    rng = np.random.default_rng(64900 * W + 43 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.22 * H), 2, 10))
    crown_bot = H - trunk_len + 2
    cx = Wc / 2 + (variant - 1) * 0.4
    rx = W / 2 - 0.5
    ry = crown_bot / 2 - 0.4
    cy = crown_bot / 2 + 0.3
    n = 7 + int(W / 4)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.26, 0.44, 0.45, 0.9, crown_bot,
                                  COTTON, 0.16, 0.65)
    yy, xx = np.mgrid[0:H, 0:Wc]
    # a few gold leaves on the lit upper left
    gold = mask & (xx + 0.5 < cx) & (yy < cy) & (rng.random((H, Wc)) < 0.06)
    img[gold] = COTTON_GOLD[variant % 2]
    tw = max(2, int(round(W / 7)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 3:H - 1, tx0:tx0 + tw] = True
    if W >= 16:   # a fork showing under the crown
        side = 1 if variant % 2 else -1
        for y in range(crown_bot - 3, H - 3):
            k = int(round((H - 3 - y) * 0.45))
            x = tx0 + (tw if side > 0 else -1) + side * k
            if 0 <= x < Wc:
                trunk[y, x] = True
    trunk &= ~mask
    img[trunk] = COTTON_BARK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = COTTON_BARK[1]
    img[H - 2, max(0, tx0 - 1)] = COTTON_BARK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = COTTON_BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = COTTON[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def white_pine(W: int, H: int, variant: int) -> np.ndarray:
    """Eastern white pine: the pnw conifer's tiered spire, repainted soft blue-green and ragged-edged."""
    img = base.conifer(W, H, variant)
    rng = np.random.default_rng(61900 * W + 47 * H + variant)
    src = [tuple(c) for c in base.CON] if hasattr(base, "CON") else []
    out = img.copy()
    for i, c in enumerate(src):
        m = np.all(img[..., :4] == np.array(c, np.uint8), axis=-1)
        out[m] = FIR[min(i, 4)]
    if hasattr(base, "TRUNK"):
        for i, c in enumerate(base.TRUNK):
            m = np.all(img[..., :4] == np.array(c, np.uint8), axis=-1)
            out[m] = FIR_BARK[min(i, 2)]
    # ragged edges: bite a few outline pixels away
    solid = out[..., 3] > 0
    edge = solid & _outline(~solid)
    bite = edge & (rng.random(solid.shape) < 0.12)
    bite[-3:] = False
    out[bite] = 0
    solid = out[..., 3] > 0
    out[_outline(solid) & ~solid] = 0
    out[solid & _outline(~solid)] = FIR[0]
    return out

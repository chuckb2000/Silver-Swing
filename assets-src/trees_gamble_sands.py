"""Tree and bush sprites for the `gamble_sands` theme (Gamble Sands, Brewster WA: sand
hills and sagebrush steppe on a terrace above the Columbia River, with irrigated orchards
below and a few cottonwoods and pines round the clubhouse and along the creek).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). s05 sorts lidar crowns into "conifer"
(narrow for their height) and "deciduous" (broad); this theme draws them as:

  c_*_*     ponderosa pine: a tall orange-brown trunk under an open crown of dark
            tufted clumps, gaps showing through
  d_*_*     black cottonwood / orchard tree: a broad rounded crown, yellow-green with a
            silvery lit side and a few gold leaves, on a pale grey trunk
  s_*_*_*   the theme's bush (`steppe_bush`; palette "trees": {"shrub": ...}): big
            sagebrush (silver grey-green) on variants 0-4, rubber rabbitbrush (grey-green
            with mustard-yellow flower heads) on 5-7

palettes/gamble_sands.json names these painters; `python3 assets-src/build_assets.py
--theme gamble_sands` builds sprites/trees_gamble_sands.* and shrubs_gamble_sands.*, and
pipeline s09b draws the same painters in the putting views. Nothing here is imported by
another theme.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

PINE = [hex2rgba(c) for c in ("#132219", "#1f3824", "#2c4d2e", "#3d6438", "#577d48")]
PINE_BARK = [hex2rgba(c) for c in ("#3a1f12", "#7a4426", "#a8653a")]
COTTON = [hex2rgba(c) for c in ("#1e2a14", "#38501f", "#55722c", "#7a963d", "#a7b968")]
COTTON_GOLD = [hex2rgba(c) for c in ("#a8902c", "#d4b848")]
COTTON_BARK = [hex2rgba(c) for c in ("#3b3832", "#6e695e", "#9a9486")]
SAGE = [hex2rgba(c) for c in ("#363d33", "#5a6354", "#7a8470", "#9aa48e", "#c0c8b0")]
RABBIT = [hex2rgba(c) for c in ("#2f3a2a", "#4e5c40", "#6a7a52", "#879866", "#a6b47e")]
RABBIT_BLOOM = [hex2rgba(c) for c in ("#a4842a", "#d6b236", "#efd56a")]


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges (padded first)."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def ponderosa(W: int, H: int, variant: int) -> np.ndarray:
    """Ponderosa pine: a long bare orange-brown trunk under an open crown of dark clumps."""
    rng = np.random.default_rng(81300 * W + 37 * H + variant)
    Wc = W + 2
    img = np.zeros((H, Wc, 4), np.uint8)
    mask = np.zeros((H, Wc), bool)
    trunk_len = int(np.clip(round(0.30 * H), 3, 18))
    crown_bot = H - trunk_len
    cx = Wc / 2 + rng.uniform(-0.4, 0.4)
    # three to six clumps stacked up an irregular crown, widest a third of the way down
    nclump = 3 if H < 24 else (4 if H < 44 else 6)
    span = crown_bot - 1
    for i in range(nclump):
        f = (i + 0.5) / nclump                     # 0 top .. 1 bottom of the crown
        widthf = 0.45 + 0.55 * np.sin(np.pi * min(1.0, 0.25 + 0.75 * f)) ** 0.7
        rx = max(1.5, (W / 2 - 0.5) * widthf * rng.uniform(0.75, 1.0))
        ry = max(1.6, span / nclump * 0.75)
        cy = 1 + span * f
        tcx = cx + rng.uniform(-0.18, 0.18) * W * (0.3 + f)
        n = 3 + int(W / 7)
        timg, tm = base._clump_crown(rng, Wc, H, tcx, cy, rx, ry, n, 0.34, 0.55, 0.45, 0.95,
                                     min(H, int(cy + ry + 1)), PINE, 0.14, 0.5)
        img[tm] = timg[tm]
        mask |= tm
    # gaps through the open crown
    if W >= 12:
        holes = mask & (rng.random((H, Wc)) < 0.05) & ~_outline(~mask)
        img[holes] = PINE[1]
    # the trunk, with a branch stub or two on taller trees
    tw = max(1, int(round(W / 8)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[int(crown_bot * 0.55):H - 1, tx0:tx0 + tw] = True
    if H >= 30:
        for k in range(2):
            y = crown_bot + 2 + k * max(2, trunk_len // 3)
            if y < H - 3:
                x = tx0 - 1 if k == 0 else tx0 + tw
                trunk[y, x] = True
    trunk &= ~mask
    img[trunk] = PINE_BARK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = PINE_BARK[1]
    img[H - 2, max(0, tx0 - 1)] = PINE_BARK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = PINE_BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = PINE[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def cottonwood(W: int, H: int, variant: int) -> np.ndarray:
    """Cottonwood (and orchard tree when small): broad rounded crown on a pale grey trunk."""
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


def _bush(W: int, H: int, variant: int, pal, bloom: float) -> np.ndarray:
    rng = np.random.default_rng(58300 * W + 29 * H + variant)
    Wc = W + 2
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = H / 2 - 0.5
    cy = H / 2
    n = 6 + int(W / 4)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.3, 0.48, 0.4, 0.9, H, pal, 0.22, 0.6)
    cols = np.where(mask.any(axis=0))[0]
    if len(cols):
        img[H - 1, cols[0] + 1:cols[-1]] = pal[1]
        mask[H - 1, cols[0] + 1:cols[-1]] = True
    yy, xx = np.mgrid[0:H, 0:Wc]
    upper = mask & (yy < cy) & _outline(~mask)
    notch = upper & (rng.random((H, Wc)) < 0.3)
    img[notch] = 0
    mask &= ~notch
    if bloom:
        fl = mask & (yy + 0.5 < cy + 0.15 * H) & (rng.random((H, Wc)) < bloom)
        img[fl] = RABBIT_BLOOM[1]
        img[fl & (xx + 0.5 < cx)] = RABBIT_BLOOM[2]
        img[fl & (xx + 0.5 > cx + 0.3 * W)] = RABBIT_BLOOM[0]
    solid = img[..., 3] > 0
    img[_outline(solid)] = pal[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def steppe_bush(W: int, H: int, variant: int) -> np.ndarray:
    """The theme's bush sheet (sprites/shrubs_gamble_sands, trees.json c: 3), in the shrub
    size grid (assets-src/shrubs.py: W x H px plus the outline, H + 1 rows): big sagebrush on
    variants 0-4, rabbitbrush in flower on 5-7."""
    v = variant % 8
    if v < 5:
        return _bush(W, H + 1, v, SAGE, 0.0)
    return _bush(W, H + 1, v, RABBIT, 0.22 if v != 7 else 0.12)

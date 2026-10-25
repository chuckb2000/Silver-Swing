"""Tree sprites for the `monterey` theme (Cypress Point, Pebble Beach CA).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game
picks frames the same way (`<c|d>_<w>_<h>_<variant>`):

  c_*_*     Monterey pine: a tall, bare, slightly leaning trunk under a dark,
            rounded, open crown of needle tufts in the upper half (variants lean
            and thin differently).
  d_*_0/1   Monterey cypress: the wind-sculpted coastal tree. Two or three flat,
            layered pads of dense dark foliage on a twisted grey trunk that forks
            into them, swept away from the sea (screen right) by a variant amount.
  d_*_2     coast live oak: a dense, rounded, dark olive crown on a short trunk
            (the broadleaf of the Del Monte Forest).

The lidar's conifer / broad-crown split is by crown shape only (pipeline s05), so
these are a drawing choice for each crown shape, not a surveyed species map.

palettes/monterey.json names these painters, so `build_assets.py --theme monterey`
builds sprites/trees_monterey.* and pipeline s09b draws the same trees in the
putting views. The other themes' sheets are unchanged.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

PINE = [hex2rgba(c) for c in ("#0e2219", "#1a3a27", "#244c30", "#305f39", "#45784a")]
PINE_TRUNK = [hex2rgba(c) for c in ("#2a1a12", "#55382a", "#7a523b")]

CYPRESS = [hex2rgba(c) for c in ("#0b2018", "#143526", "#1d4a31", "#285f3b", "#3d7b4b")]
CYP_TRUNK = [hex2rgba(c) for c in ("#2a2522", "#5b514b", "#8a7e74")]   # weathered grey bark

LIVE_OAK = [hex2rgba(c) for c in ("#1a2714", "#2c4220", "#3a5627", "#4a6b30", "#62873f")]
OAK_TRUNK = [hex2rgba(c) for c in ("#2b2420", "#4e443c", "#6b5f54")]


def _limb(mask: np.ndarray, x0: float, y0: float, x1: float, y1: float, w: int) -> None:
    """Paint a straight limb of width w from (x0, y0) to (x1, y1) into mask."""
    H, Wc = mask.shape
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 2
    for t in np.linspace(0, 1, n):
        x = x0 + (x1 - x0) * t
        y = int(round(y0 + (y1 - y0) * t))
        xa = int(round(x - w / 2))
        if 0 <= y < H:
            mask[y, max(0, xa):min(Wc, xa + w)] = True


def _bark(img: np.ndarray, trunk: np.ndarray, pal: list) -> None:
    img[trunk] = pal[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = pal[1]   # right edge in shade


def pine(W: int, H: int, variant: int) -> np.ndarray:
    """Monterey pine: tall trunk, rounded open crown of tufts in the upper half."""
    rng = np.random.default_rng(81000 * W + 37 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.42 * H), 4, 36))
    crown_bot = H - trunk_len + 2
    lean = (-0.5, 0.6, 1.2)[variant % 3]
    cx = Wc / 2 + lean * W / 20
    rx = W / 2 - 0.5
    ry = max(2.5, crown_bot / 2 - 0.8)
    cy = crown_bot / 2 + 0.8
    n = 7 + int(W / 5)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.24, 0.36, 0.42, 0.88, crown_bot, PINE, 0.16, 0.30)
    tw = max(2, int(round(W / 10)))
    trunk = np.zeros((H, Wc), bool)
    _limb(trunk, Wc / 2, H - 2, cx, cy, tw)
    trunk &= ~mask
    _bark(img, trunk, PINE_TRUNK)
    bx = int(round(Wc / 2 - tw / 2))
    img[H - 2, max(0, bx - 1)] = PINE_TRUNK[1]
    img[H - 2, min(Wc - 1, bx + tw)] = PINE_TRUNK[1]
    solid = img[..., 3] > 0
    img[base._outline(solid)] = PINE[0]
    return img


def _pad(rng, Wc: int, H: int, cx: float, cy: float, rx: float, ry: float):
    """One flat, wind-clipped foliage pad: (mask, tone) with a flat lit top and a lumpy dark underside."""
    yy, xx = np.mgrid[0:H, 0:Wc]
    dx = (xx + 0.5 - cx) / rx
    dy = (yy + 0.5 - cy) / ry
    mask = dx * dx + dy * dy <= 1.0
    # lumps along the underside and the ends
    for k in range(4 + int(rx / 2.5)):
        a = rng.uniform(-0.15, 1.15) * np.pi                    # lower half of the rim and the ends
        br = max(1.3, ry * rng.uniform(0.55, 0.85))
        bx = np.clip(cx + np.cos(a) * rx * 0.88, 1.5 + br, Wc - 1.5 - br)
        by = cy + np.sin(a) * ry * 0.7
        mask |= (xx + 0.5 - bx) ** 2 + (yy + 0.5 - by) ** 2 <= br * br
    # sheared flat on top, with a tufted edge (0-1 px steps every few columns)
    steps = np.repeat(rng.integers(0, 2, Wc // 2 + 2), 2)[:Wc] + np.repeat(rng.integers(0, 2, Wc // 3 + 2), 3)[:Wc] * 0.6
    mask &= yy + 0.5 >= cy - ry * 0.62 - steps[None, :]
    # ragged ends: drop the corner pixels of every row end
    for y in np.where(mask.any(1))[0]:
        row = np.where(mask[y])[0]
        if len(row) > 6 and rng.random() < 0.5:
            mask[y, row[0] if rng.random() < 0.5 else row[-1]] = False
    tone = np.full((H, Wc), 2)
    rows = np.where(mask.any(1))[0]
    if len(rows):
        top, bot = rows[0], rows[-1]
        lit = dy * -0.78 + dx * -0.62                          # light from the upper-left
        tone = np.where(lit > 0.35, 3, tone)
        tone = np.where((yy <= top) & (dx < 0.2), 4, tone)
        tone = np.where((yy >= bot - max(0, round(ry * 0.3))) | (lit < -0.75), 1, tone)
    sp = rng.random((H, Wc))
    tone = np.where((sp < 0.12) & (tone > 1) & (tone < 4), tone - 1, tone)
    return mask, tone


def _cypress(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(91000 * W + 43 * H + variant)
    Wc = W + 2
    img = np.zeros((H, Wc, 4), np.uint8)
    sweep = (0.7, 1.5)[variant % 2]                 # swept to screen right (away from the sea)
    crown_h = min(H - 3.0, max(0.62 * W + 2, 0.55 * H))  # wind-shaped: wide, flat pads
    crown_top = 1.0
    pads = int(np.clip(round(crown_h / (0.26 * W + 3)), 2, 4))
    pad_ry = crown_h / (pads * 2 + 0.6)
    pads_info = []
    for k in range(pads):                            # k = 0 lowest
        f = k / max(1, pads - 1)
        cy = crown_top + crown_h - pad_ry * (1.15 + 1.95 * k) + rng.uniform(-0.4, 0.4)
        rx = (W / 2 - 0.5) * rng.uniform(0.62, 1.0) * (1.0 - 0.25 * f)
        if k == 0 or k == pads - 1:
            rx = max(rx, (W / 2 - 0.5) * (0.92 if k == 0 else 0.7))  # broad base and a broad flat top
        cx = Wc / 2 + sweep * W / 12 * (f - 0.3) + rng.uniform(-W / 10, W / 10)
        rx = max(2.0, min(rx, Wc - 1.5 - cx, cx - 0.5))
        pads_info.append((cx, cy, rx, pad_ry * rng.uniform(0.95, 1.2)))
    mask_all = np.zeros((H, Wc), bool)
    tone_all = np.zeros((H, Wc), int)
    for (cx, cy, rx, ry) in pads_info:               # lower pads first; upper pads drawn over them
        m, t = _pad(rng, Wc, H, cx, cy, rx, ry)
        tone_all = np.where(m, t, tone_all)
        mask_all |= m
    mask_all[:, 0] = mask_all[:, -1] = False
    mask_all[0, :] = False
    for t in range(1, 5):
        img[mask_all & (tone_all == t)] = CYPRESS[t]
    # twisted trunk from the base to the lowest pad, then limbs up into each pad
    tw = max(2, int(round(W / 9)))
    trunk = np.zeros((H, Wc), bool)
    bx = Wc / 2 - sweep * W / 22
    lo = pads_info[0]
    mid_y = (H - 2 + lo[1]) / 2
    _limb(trunk, bx, H - 2, bx + sweep * W / 18, mid_y, tw)
    _limb(trunk, bx + sweep * W / 18, mid_y, lo[0] - lo[2] * 0.2, lo[1], tw)
    for (cx, cy, rx, ry) in pads_info[1:]:
        _limb(trunk, lo[0] - lo[2] * 0.15, lo[1], cx - rx * 0.3, cy + ry * 0.3, max(1, tw - 1))
        _limb(trunk, lo[0] + lo[2] * 0.1, lo[1], cx + rx * 0.35, cy + ry * 0.3, 1)
    trunk &= ~mask_all
    _bark(img, trunk, CYP_TRUNK)
    xb = int(round(bx - tw / 2))
    img[H - 2, max(0, xb - 1)] = CYP_TRUNK[1]
    img[H - 2, min(Wc - 1, xb + tw)] = CYP_TRUNK[1]
    solid = img[..., 3] > 0
    img[base._outline(solid)] = CYPRESS[0]
    return img


def _live_oak(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(97000 * W + 47 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.24 * H), 3, 12))
    crown_bot = H - trunk_len + 2
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = crown_bot / 2 - 1
    cy = crown_bot / 2 + 0.5
    n = 7 + int(W / 6)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.32, 0.46, 0.55, 0.82, crown_bot, LIVE_OAK, 0.10, 0.74)
    tw = max(2, int(round(W / 7)))
    trunk = np.zeros((H, Wc), bool)
    tx0 = int(round(cx - tw / 2))
    trunk[crown_bot - 3:H - 1, tx0:tx0 + tw] = True
    trunk &= ~mask
    _bark(img, trunk, OAK_TRUNK)
    img[H - 2, max(0, tx0 - 1)] = OAK_TRUNK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = OAK_TRUNK[1]
    solid = img[..., 3] > 0
    img[base._outline(solid)] = LIVE_OAK[0]
    return img


def cypress(W: int, H: int, variant: int) -> np.ndarray:
    """Broad-crown class: Monterey cypress (variants 0, 1) or coast live oak (variant 2)."""
    return _live_oak(W, H, variant) if variant % 3 == 2 else _cypress(W, H, variant)

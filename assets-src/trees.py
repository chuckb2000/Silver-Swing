"""Procedural pixel-art trees (3/4 view): PNW conifers (Douglas fir / cedar)
and rounded deciduous trees (Oregon white oak / big-leaf maple).

Each sprite is anchored at the trunk base (bottom centre). Light comes from
the upper-left; dark 1 px outline; 3-4 tones per material, no gradients.
"""
from __future__ import annotations

import math

import numpy as np

from atlas import hex2rgba

CON = [hex2rgba(c) for c in ("#0d281f", "#1a4333", "#23573f", "#2d6b49", "#3f845a")]
DEC = [hex2rgba(c) for c in ("#13301a", "#275725", "#367332", "#4a8d3d", "#67a851")]
TRUNK = [hex2rgba(c) for c in ("#24160e", "#4a2e1d", "#6c4730")]

TREE_WIDTHS = list(range(10, 46, 4))      # 10..42 px
TREE_HEIGHTS = list(range(14, 92, 6))     # 14..86 px


def quant_w(w: float) -> int:
    return min(TREE_WIDTHS, key=lambda v: abs(v - w))


def quant_h(h: float) -> int:
    return min(TREE_HEIGHTS, key=lambda v: abs(v - h))


def _outline(mask: np.ndarray) -> np.ndarray:
    ring = np.zeros_like(mask)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(mask, dy, 0), dx, 1)
    return ring & ~mask


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(1000 * W + 17 * H + variant)
    img = np.zeros((H, W + 2, 4), np.uint8)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.28 * H), 3, 12))
    crown_h = H - trunk_len + 2
    cx = Wc / 2
    cy = crown_h / 2 + 0.5
    rx = W / 2 - 0.5
    ry = crown_h / 2 - 1
    yy, xx = np.mgrid[0:H, 0:Wc]
    # clumps around the rim give a lumpy silhouette
    n = 5 + int(W / 8)
    clumps = []
    for k in range(n):
        a = 2 * math.pi * k / n + rng.uniform(-0.3, 0.3)
        rr = rng.uniform(0.55, 0.75)
        ccx = cx + math.cos(a) * rx * rr
        ccy = cy + math.sin(a) * ry * rr
        cr = max(2.2, min(rx, ry) * rng.uniform(0.38, 0.5))
        clumps.append((ccx, ccy, cr))
    clumps.append((cx - rx * 0.12, cy - ry * 0.15, min(rx, ry) * 0.62))
    mask = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 0.78
    own = np.full((H, Wc), -1)
    for k, (ccx, ccy, cr) in enumerate(clumps):
        m = (xx + 0.5 - ccx) ** 2 + (yy + 0.5 - ccy) ** 2 <= cr * cr
        m &= (yy < crown_h)
        mask |= m
        # top-most clump wins (it is "in front" in the 3/4 view)
        own = np.where(m & ((own < 0) | (ccy < np.array([c[1] for c in clumps] + [1e9])[own])), k, own)
    mask[:, 0] = False
    mask[:, -1] = False
    mask[0, :] = False
    # shading
    tone = np.full((H, Wc), 2)
    L = np.array([-0.62, -0.78])
    for k, (ccx, ccy, cr) in enumerate(clumps):
        m = (own == k) & mask
        dx = (xx + 0.5 - ccx) / cr
        dy = (yy + 0.5 - ccy) / cr
        lam = dx * L[0] + dy * L[1]
        t = np.where(lam > 0.32, 3, np.where(lam > -0.42, 2, 1))
        tone = np.where(m, t, tone)
    # global: lower-right of the whole crown darker, top-left lighter
    gdx = (xx + 0.5 - cx) / rx
    gdy = (yy + 0.5 - cy) / ry
    glam = gdx * L[0] + gdy * L[1]
    tone = np.where(mask & (glam < -0.62), np.minimum(tone, 1), tone)
    tone = np.where(mask & (glam > 0.55) & (tone == 3), 4, tone)
    # speckle texture
    sp = rng.random((H, Wc))
    tone = np.where(mask & (sp < 0.06) & (tone > 1), tone - 1, tone)
    for t in range(1, 5):
        img[mask & (tone == t)] = DEC[t]
    # trunk
    tw = max(2, int(round(W / 7)))
    tx0 = int(round(cx - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_h - 3:H - 1, tx0:tx0 + tw] = True
    trunk &= ~mask
    img[trunk] = TRUNK[2]
    img[trunk & (xx >= tx0 + tw - max(1, tw // 2))] = TRUNK[1]
    # roots flare
    img[H - 2, max(0, tx0 - 1)] = TRUNK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = TRUNK[1]
    # shade of the crown on the trunk top
    top = trunk & (yy <= crown_h - 1)
    img[top] = TRUNK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = DEC[0]
    return img


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(7000 * W + 31 * H + variant)
    Wc = W + 2
    img = np.zeros((H, Wc, 4), np.uint8)
    trunk_len = int(np.clip(round(0.1 * H), 2, 6))
    crown_bot = H - trunk_len
    apex = 1
    crown_h = crown_bot - apex
    cx = Wc / 2
    tiers = int(np.clip(round(crown_h / 7.5), 3, 10))
    edges = np.linspace(apex, crown_bot, tiers + 1)
    jit = rng.uniform(-0.6, 0.6, tiers)
    yy, xx = np.mgrid[0:H, 0:Wc]
    mask = np.zeros((H, Wc), bool)
    tier_of = np.full((H, Wc), -1)
    frac_of = np.zeros((H, Wc))
    for y in range(apex, crown_bot):
        prof = (y + 1 - apex) / crown_h
        ti = min(tiers - 1, int(np.searchsorted(edges, y + 0.5) - 1))
        f = (y + 0.5 - edges[ti]) / max(1e-6, edges[ti + 1] - edges[ti])
        half = (W / 2 - 0.3) * (prof ** 0.92) * (0.66 + 0.34 * f) + jit[ti] * f
        half = max(0.6, half)
        row = np.abs(xx[y] + 0.5 - cx) <= half
        mask[y] = row
        tier_of[y] = np.where(row, ti, -1)
        frac_of[y] = f
    # droopy branch tips: knock out a few edge pixels at the top of each tier
    for ti in range(tiers):
        y = int(edges[ti]) + 1
        if 0 < y < crown_bot:
            row = np.where(mask[y])[0]
            if len(row) > 4:
                mask[y, row[0]] = False
                mask[y, row[-1]] = False
    tone = np.full((H, Wc), 2)
    rel = (xx + 0.5 - cx) / (W / 2)
    tone = np.where(rel < -0.35, 3, tone)
    tone = np.where(rel > 0.3, 1, tone)
    # underside of each tier is darker; top-left of each tier gets a highlight
    tone = np.where((frac_of > 0.72) & (rel > -0.5), np.maximum(1, tone - 1), tone)
    tone = np.where((frac_of < 0.4) & (rel < -0.15) & (rel > -0.75), 4, tone)
    sp = rng.random((H, Wc))
    tone = np.where((sp < 0.07) & (tone > 1), tone - 1, tone)
    for t in range(1, 5):
        img[mask & (tone == t)] = CON[t]
    tw = max(2, int(round(W / 9)))
    tx0 = int(round(cx - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 1:H - 1, tx0:tx0 + tw] = True
    trunk &= ~mask
    img[trunk] = TRUNK[2]
    img[trunk & (xx >= tx0 + tw - 1)] = TRUNK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = CON[0]
    return img


def tree_frames():
    """All (key, image) pairs for the tree atlas."""
    out = []
    for W in TREE_WIDTHS:
        for H in TREE_HEIGHTS:
            if H >= 1.15 * W:
                for v in range(3):
                    out.append((f"c_{W}_{H}_{v}", conifer(W, H, v)))
            if 0.9 * W <= H <= 2.6 * W + 6:
                for v in range(3):
                    out.append((f"d_{W}_{H}_{v}", deciduous(W, H, v)))
    return out

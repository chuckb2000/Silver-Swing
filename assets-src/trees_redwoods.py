"""Tree sprites for the `redwoods` theme (Northwood Golf Club, Monte Rio CA: MacKenzie's nine
in the second-growth coast redwood forest on a bend of the Russian River).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks frames
the same way (`<c|d>_<w>_<h>_<variant>`). s05 sorts lidar crowns into "conifer" (narrow for
their height) and "deciduous" (broad); the variant (tree index mod 3) picks the species, as
flair (the lidar can't tell species apart):

  c_*_0, 1  mature coast redwood: a straight, flared, fluted cinnamon-red trunk, bare for its
            lower part, under a narrow column of drooping, flat foliage sprays that step out to
            either side, the trunk showing between them; a blunt, ragged top
  c_*_2     young redwood: sprays almost to the ground, a narrow cone with a pointed top
  d_*_0     California bay laurel: a dense, rounded olive-green dome on a short grey trunk
  d_*_1     bigleaf maple: a looser, brighter green crown of big lumps (river flats and edges)
  d_*_2     tanoak: a dark, glossy green crown, taller than wide

Light from the upper left, a dark 1 px outline, four or five tones per material, no gradients.
palettes/redwoods.json names these painters; `python3 assets-src/build_assets.py --theme
redwoods` builds sprites/trees_redwoods.*, and pipeline s09b draws the same painters, larger, in
the putting views (so every shape is drawn in proportion to the frame, not in fixed pixels).
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba


def _pal(*h):
    return [hex2rgba(c) for c in h]


# redwood foliage: outline, shade, mid, lit, highlight (a deep, slightly yellow green)
REDWOOD = _pal("#0a1c14", "#14351f", "#1e4927", "#2b6030", "#467c3b")
YOUNG = _pal("#0b1f15", "#173c22", "#22532b", "#316c35", "#4f8942")
# fluted bark: fissure, shade, mid, lit
BARK = _pal("#2a0f08", "#5c2615", "#8a3c22", "#b05c3a")
# broadleaves
BAY = _pal("#18261a", "#2c4424", "#3d5b2c", "#527436", "#6f8f45")
MAPLE = _pal("#14301a", "#285a26", "#397532", "#4f923f", "#70ae55")
TANOAK = _pal("#102318", "#1f3d27", "#2c5331", "#3d6a3b", "#58864c")
GREY_TRUNK = _pal("#2c2723", "#544a42", "#786b5f")


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def _bark(H: int, Wc: int, cx: float, tw: int, y_top: int, flare: int) -> tuple[np.ndarray, np.ndarray]:
    """A straight trunk from y_top to the ground, a touch narrower near the top and flared at
    the foot; returns (mask, tone) with vertical flutes: 0 fissure, 1 shade, 2 mid, 3 lit."""
    mask = np.zeros((H, Wc), bool)
    x_lo = np.zeros(H, int)
    span = max(1, H - 1 - y_top)
    for y in range(max(0, y_top), H - 1):
        f = (y - y_top) / span                       # 0 top .. 1 ground
        w = tw - (1 if f < 0.25 and tw > 2 else 0)
        if y >= H - 1 - flare:                       # buttress flare, one px a side per row
            w += 2 * (y - (H - 2 - flare))
        x0 = int(round(cx - w / 2))
        mask[y, max(0, x0):min(Wc, x0 + w)] = True
        x_lo[y] = x0
    yy, xx = np.mgrid[0:H, 0:Wc]
    tone = np.full((H, Wc), 2)
    rel = xx - x_lo[:, None]                         # column within the trunk row
    right = mask & ~np.roll(mask, -1, 1)
    left = mask & ~np.roll(mask, 1, 1)
    tone[left] = 3
    tone[mask & (rel == 1) & (tw >= 4)] = 3
    tone[right] = 1
    # flutes: a dark groove every third column inside the trunk (wide trunks only)
    if tw >= 4:
        tone[mask & (rel % 3 == 2) & ~right & ~left] = 0
    return mask, tone


def _spray_crown(rng, W: int, H: int, Wc: int, cx: float, top: int, bot: int, young: bool, pal,
                 core_min: float = 0.8) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """A narrow redwood crown built from flat foliage sprays: a core along the trunk (at least
    core_min px each side, so it hides the trunk) and, every few rows, a drooping spray reaching
    out to one side or both, wider down the crown. Returns (rgba, mask, core-only mask)."""
    img = np.zeros((H, Wc, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:Wc]
    h = max(3, bot - top)
    half_max = W / 2 - 0.4
    sh = max(2.0, W / 7.0, h / 14.0)                 # spray thickness (rows)
    mask = np.zeros((H, Wc), bool)
    tone = np.full((H, Wc), 2)
    own_top = np.full((H, Wc), 1e9)                  # spray that owns a pixel: the higher one wins

    def prof(t: float) -> float:
        """Crown half-width at depth t (0 top .. 1 bottom), as a share of half_max."""
        if young:
            return 0.12 + 0.88 * t ** 0.95
        # mature: blunt top, columnar below, widest about two thirds down
        return 0.28 + 0.72 * min(1.0, (t / 0.62)) ** 0.55 * (1.0 - 0.18 * max(0.0, t - 0.62) / 0.38)

    # core: a thin, slightly ragged column of foliage hugging the trunk
    for y in range(top, bot):
        t = (y - top) / h
        lo = core_min if t > 0.12 else 0.8 + (core_min - 0.8) * t / 0.12   # the tip tapers
        c = max(lo, half_max * prof(t) * (0.42 if not young else 0.62) + rng.uniform(-0.4, 0.4))
        row = np.abs(xx[y] + 0.5 - cx) <= c
        mask[y] |= row
    # sprays, top to bottom; side alternates with a little randomness, both sides near the bottom
    y = float(top) + (0.4 if young else 0.9) * sh
    k = 0
    side = 1 if rng.random() < 0.5 else -1
    sprays = []
    while y < bot - 0.5:
        t = (y - top) / h
        reach = half_max * prof(t) * rng.uniform(0.7, 1.04)
        sides = [side] if (not young and rng.random() < (0.8 if t < 0.55 else 0.45)) else [-1, 1]
        for s in sides:
            r = reach * (1.0 if len(sides) == 1 else rng.uniform(0.62, 1.0))
            sprays.append((y + (0 if len(sides) == 1 else rng.uniform(-0.6, 0.6) * sh * 0.4), s, r))
        side = -side if rng.random() < 0.85 else side
        y += sh * rng.uniform(0.9, 1.25)
        k += 1
    for (sy, s, r) in sprays:
        ex = cx + s * r * 0.5                        # ellipse centre half way out
        rx = max(1.0, r * 0.55)
        ry = max(1.0, sh * 0.62)
        # droop: the outer end hangs lower
        u = np.clip((xx + 0.5 - cx) * s / max(1.0, r), 0, 1)
        dy = (yy + 0.5 - (sy + 0.8 * u * ry))
        m = (((xx + 0.5 - ex) / rx) ** 2 + (dy / ry) ** 2 <= 1.0) & (yy >= top) & (yy < bot + 1)
        # shading inside the spray: lit top, shaded underside, darker out on the right
        ft = np.clip(dy / ry, -1, 1)                 # -1 top .. 1 bottom of the spray
        t_sp = np.where(ft < -0.35, 3, np.where(ft > 0.35, 1, 2))
        newer = m & (sy < own_top)
        tone = np.where(newer, t_sp, tone)
        own_top = np.where(newer, sy, own_top)
        mask |= m
    mask[:, 0] = False
    mask[:, -1] = False
    # big frames (the putting views): ragged spray edges and short lit needle strokes, scaled
    # with the frame, so a 60 px redwood isn't a stack of smooth ellipses
    if W >= 30:
        k = max(1, int(round(W / 30)))
        for _ in range(k):
            edge = mask & _outline(~mask)
            bite = edge & (rng.random((H, Wc)) < 0.35) & (yy > top + 2)
            mask &= ~bite
            grow = _outline(mask) & (rng.random((H, Wc)) < 0.12) & (yy > top + 2) & (yy < bot)
            mask |= grow
            tone = np.where(grow, 1, tone)
            own_top = np.where(grow, own_top, own_top)
        dash = (rng.random((H, Wc)) < 0.035) & mask & (tone >= 2)
        for d in range(1, max(2, W // 18)):
            dash |= np.roll(dash, 1, 1) & mask
        tone = np.where(dash & ((xx + 0.5 - cx) < 0), 4, np.where(dash, 3, tone))
    # whole-crown light: left side lighter, right side darker
    rel = (xx + 0.5 - cx) / max(1.0, half_max)
    tone = np.where(mask & (rel > 0.28), np.maximum(1, tone - 1), tone)
    tone = np.where(mask & (rel < -0.2) & (tone == 3), 4, tone)
    tone = np.where(mask & (own_top > 1e8) & (rel < -0.05), np.maximum(tone, 3), tone)   # lit side of the core
    tone = np.where(mask & (own_top > 1e8) & (rel > 0.05), 1, tone)
    sp = rng.random((H, Wc))
    tone = np.where(mask & (sp < 0.07) & (tone > 1), tone - 1, tone)
    for t in range(1, 5):
        img[mask & (tone == t)] = pal[t]
    return img, mask, mask & (own_top > 1e8)


def _redwood(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(83000 * W + 41 * H + variant)
    Wc = W + 2
    young = variant % 3 == 2
    cx = Wc / 2 + (0.5 if variant % 3 == 1 else 0.0)
    bare = 0.07 if young else (0.30 if variant % 3 == 0 else 0.24)   # bare lower trunk, share of H
    bot = int(np.clip(round(H * (1 - bare)), 4, H - 2))
    top = 0 if young else int(round(rng.uniform(0.0, 1.2)))
    img = np.zeros((H, Wc, 4), np.uint8)
    tw = max(2, int(round(W / (7.5 if young else 5.5))))
    flare = 0 if (young or W < 14) else max(1, int(round(W / 13)))
    tmask, ttone = _bark(H, Wc, cx, tw, top + 2, flare)
    crown, cmask, core_only = _spray_crown(rng, W, H, Wc, cx, top, bot, young, YOUNG if young else REDWOOD,
                                           core_min=0.8 if young else tw / 2 + 1.0)
    # bark first, the crown over it; then the trunk shows through a few short gaps between sprays
    for t in range(4):
        img[tmask & (ttone == t)] = BARK[t]
    img[cmask] = crown[cmask]
    yy, xx = np.mgrid[0:H, 0:Wc]
    if not young and W >= 14:
        n_gap = 2 + int(H > 60) + int(rng.random() < 0.5)
        cand = [y for y in range(int(top + 0.25 * (bot - top)), bot - 3) if (core_only[y] & tmask[y]).sum() >= tw]
        rng.shuffle(cand)
        holes = np.zeros_like(cmask)
        used = []
        for y in cand:
            if len(used) >= n_gap:
                break
            if any(abs(y - u) < 5 for u in used):
                continue
            used.append(y)
            holes[y:y + 2] |= core_only[y:y + 2] & tmask[y:y + 2]
        for t in range(4):
            img[holes & (ttone == t)] = BARK[t]
    # the crown's shadow on the trunk just below it
    under = tmask & ~cmask & (yy >= bot) & (yy < bot + 2)
    img[under] = BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = (YOUNG if young else REDWOOD)[0]
    img[:, 0] = 0
    img[:, -1] = 0
    img[H - 1] = 0
    return img


def redwood(W: int, H: int, variant: int) -> np.ndarray:
    """The theme's conifer: coast redwood (variants 0 and 1 mature, 2 young)."""
    return _redwood(W, H, variant)


def _broadleaf(W: int, H: int, variant: int, pal, trunk_frac: float, lumps: float, r_lo: float, r_hi: float, fill: float, speckle: float,
               ring: tuple = (0.5, 0.72)) -> np.ndarray:
    rng = np.random.default_rng(61000 * W + 23 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(trunk_frac * H), 2, max(2, H // 3)))
    crown_bot = H - trunk_len + 2
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = crown_bot / 2 - 0.8
    cy = crown_bot / 2 + 0.4
    n = 5 + int(W / lumps)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, r_lo, r_hi, ring[0], ring[1], crown_bot, pal, speckle, fill)
    yy, xx = np.mgrid[0:H, 0:Wc]
    tw = max(2, int(round(W / 8)))
    tx0 = int(round(cx - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 3:H - 1, tx0:tx0 + tw] = True
    trunk &= ~mask
    img[trunk] = GREY_TRUNK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = GREY_TRUNK[1]
    img[trunk & (yy <= crown_bot - 1)] = GREY_TRUNK[1]
    img[H - 2, max(0, tx0 - 1)] = GREY_TRUNK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = GREY_TRUNK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = pal[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def broadleaf(W: int, H: int, variant: int) -> np.ndarray:
    """The theme's broad crowns: bay laurel, bigleaf maple, tanoak (variant % 3)."""
    v = variant % 3
    if v == 0:
        return _broadleaf(W, H, variant, BAY, 0.2, 7, 0.32, 0.42, 0.72, 0.06, (0.48, 0.64))
    if v == 1:
        return _broadleaf(W, H, variant, MAPLE, 0.26, 5, 0.3, 0.42, 0.6, 0.08, (0.55, 0.78))
    return _broadleaf(W, H, variant, TANOAK, 0.22, 8, 0.3, 0.42, 0.7, 0.07, (0.48, 0.66))

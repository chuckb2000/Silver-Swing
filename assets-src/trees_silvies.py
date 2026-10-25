"""Tree and bush sprites for the `silvies` theme (Silvies Valley Ranch, Seneca OR: high
desert in the Blue Mountains, ponderosa pine forest edges, juniper and sagebrush).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). s05 sorts lidar crowns into "conifer"
(narrow for their height) and "deciduous" (broad). Around the course nearly every tree is
a conifer: ponderosa pine on the ridges and in the draws, western juniper on the dry
slopes. So both classes are drawn as conifers (a drawing choice, not a surveyed split):

  c_*_0, 1  mature ponderosa pine: a tall, straight trunk of cinnamon-orange plated bark,
            bare for its lower part, under an open crown of big rounded needle tufts with
            sky between them
  c_*_2     a younger ponderosa: crown lower down the trunk and fuller, still tufted
  d_*_*     western juniper: a short, often forked grey trunk under a dense, shaggy,
            blue-grey-green crown, round to irregular
  s_*_*_*   big sagebrush, the theme's bush painter (`sage_bush`; palette "trees":
            {"shrub": ...}): a low silvery grey-green mound; variants 5 and 6 carry a few
            of its small yellow-tan autumn flower heads (index % 8 picks the variant)

palettes/silvies.json names these painters; `python3 assets-src/build_assets.py --theme
silvies` builds sprites/trees_silvies.* and shrubs_silvies.*, and pipeline s09b draws the
same painters in the putting views. Nothing here is imported by another theme.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# ponderosa needles: outline, shade, mid, lit, highlight (a deep, slightly yellow green)
PONDEROSA = [hex2rgba(c) for c in ("#10241a", "#1d3e26", "#2a5530", "#3a6c38", "#558a46")]
# cinnamon bark: fissure, shade, plate
BARK = [hex2rgba(c) for c in ("#3b2014", "#7c4426", "#b0673b")]
# juniper: blue-grey-green, shaggy
JUNIPER = [hex2rgba(c) for c in ("#1a2823", "#2c4036", "#3d5446", "#536c59", "#6f8a71")]
JUN_TRUNK = [hex2rgba(c) for c in ("#2e2722", "#5a4e44", "#7d7064")]
# big sagebrush: outline, shade, mid, lit, highlight (silvery)
SAGE = [hex2rgba(c) for c in ("#343c30", "#566050", "#748068", "#949f86", "#b8c1a8")]
SAGE_BLOOM = [hex2rgba(c) for c in ("#9a8240", "#c4aa58", "#e2cb7a")]
SAGE_FLOWERS = (0.0, 0.0, 0.0, 0.0, 0.0, 0.10, 0.18, 0.0)   # share of the lit top in flower, per variant


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def _trunk(H: int, Wc: int, x_mid: float, tw: int, y_top: int, rng) -> tuple[np.ndarray, np.ndarray]:
    """A straight trunk from y_top to the ground, tapering one pixel near the top;
    returns (mask, tone) with tone 0 fissure, 1 shade, 2 plate."""
    yy, xx = np.mgrid[0:H, 0:Wc]
    mask = np.zeros((H, Wc), bool)
    for y in range(max(0, y_top), H - 1):
        w = tw if y > y_top + 0.25 * (H - y_top) else max(1, tw - 1)
        x0 = int(round(x_mid - w / 2))
        mask[y, max(0, x0):min(Wc, x0 + w)] = True
    tone = np.full((H, Wc), 2)
    right = mask & ~np.roll(mask, -1, 1)
    tone[right] = 1
    # bark plates: short dark fissures, staggered
    fiss = mask & (rng.random((H, Wc)) < 0.16) & ~right
    tone[fiss] = 0
    return mask, tone


def _ponderosa(W: int, H: int, variant: int) -> np.ndarray:
    rng = np.random.default_rng(91000 * W + 37 * H + variant)
    Wc = W + 2
    young = variant % 3 == 2
    crown_frac = 0.72 if young else 0.56            # share of the height in crown
    crown_bot = int(np.clip(round(crown_frac * H), 5, H - 3))
    cx = Wc / 2 + rng.uniform(-0.5, 0.5)
    img = np.zeros((H, Wc, 4), np.uint8)
    mask = np.zeros((H, Wc), bool)
    # the crown in tiers of tufts, widest a little below the middle of the crown;
    # mature crowns round off on top, the young one keeps a pointed top
    ntier = 2 if crown_bot < 14 else (3 if crown_bot < 30 else 4)
    tier_h = (crown_bot - 1) / ntier
    order = list(range(ntier))[::-1]                # lowest first, upper tiers over it
    for i in order:
        f = (i + 0.5) / ntier                       # 0 top .. 1 bottom
        if young:
            widthf = 0.35 + 0.65 * f
        else:
            widthf = 0.62 + 0.38 * np.sin(np.pi * min(1.0, 0.25 + 0.85 * f))
        rx = max(1.8, (W / 2 - 0.5) * widthf)
        ry = max(1.8, tier_h * 0.62)
        cy = 1 + tier_h * (i + 0.5)
        tcx = cx + rng.uniform(-0.06, 0.06) * W
        n = 3 + int(W / 9)
        timg, tm = base._clump_crown(rng, Wc, H, tcx, cy, rx, ry, n, 0.34, 0.5, 0.35, 0.9,
                                     min(H, int(cy + ry + 1)), PONDEROSA, 0.12, 0.35)
        img[tm] = timg[tm]
        mask |= tm
    # open crown: knock a few holes through the interior (sky between the tufts)
    if W >= 14:
        inner = mask & ~_outline(~mask) & (rng.random((H, Wc)) < 0.035)
        holes = np.zeros_like(mask)
        for y, x in zip(*np.nonzero(inner)):
            holes[y:y + 2, x:x + 2] = True
        holes &= mask
        img[holes] = 0
        mask &= ~holes
    tw = max(2, int(round(W / 8)))
    tmask, ttone = _trunk(H, Wc, Wc / 2, tw, int(crown_bot * 0.45), rng)
    # trunk shows below the crown and through the holes
    show = tmask & ~mask
    for t in range(3):
        img[show & (ttone == t)] = BARK[t]
    # a couple of bare branch stubs on the bare trunk of a mature tree
    if not young and H - crown_bot > 8:
        for k in range(1 + (W > 22)):
            y = int(crown_bot + 1 + rng.uniform(0.1, 0.5) * (H - crown_bot - 3))
            side = 1 if (k + variant) % 2 else -1
            x = int(round(Wc / 2 + side * (tw / 2 + 0.5)))
            for j in range(max(1, W // 16)):
                xx = x + side * j
                if 0 <= xx < Wc and not mask[y - j // 2, xx]:
                    img[y - j // 2, xx] = BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = PONDEROSA[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def ponderosa(W: int, H: int, variant: int) -> np.ndarray:
    return _ponderosa(W, H, variant)


def juniper(W: int, H: int, variant: int) -> np.ndarray:
    """Western juniper: short forked grey trunk, dense shaggy rounded crown."""
    rng = np.random.default_rng(53000 * W + 43 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.2 * H), 2, 10))
    crown_bot = H - trunk_len + 2
    cx = Wc / 2 + (variant - 1) * 0.5
    rx = W / 2 - 0.5
    ry = crown_bot / 2 - 0.8
    cy = crown_bot / 2 + 0.4
    n = 7 + int(W / 5)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.3, 0.44, 0.5, 0.88, crown_bot, JUNIPER, 0.16, 0.7)
    # shaggy edge: a few single pixels added and removed around the rim
    rim = _outline(mask)
    add = rim & (rng.random((H, Wc)) < 0.22)
    add[crown_bot:] = False
    img[add] = JUNIPER[2]
    mask |= add
    yy, xx = np.mgrid[0:H, 0:Wc]
    tw = max(2, int(round(W / 8)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 3:H - 1, tx0:tx0 + tw] = True
    if W >= 18:                                   # a forked trunk: a second stem leaning out
        for y in range(crown_bot - 3, H - 3):
            k = int(round((H - 3 - y) * 0.45))
            x = tx0 + tw + k - 1
            if 0 <= x < Wc:
                trunk[y, x] = True
    trunk &= ~mask
    img[trunk] = JUN_TRUNK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = JUN_TRUNK[1]
    img[H - 2, max(0, tx0 - 1)] = JUN_TRUNK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = JUN_TRUNK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = JUNIPER[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def sage(W: int, H: int, variant: int, fill: bool = False) -> np.ndarray:
    """Big sagebrush: a low, lumpy silver-green mound across the frame's bottom, lit from
    the upper-left, its top broken into small twiggy tufts."""
    rng = np.random.default_rng(67000 * W + 29 * H + variant)
    Wc = W + 2
    mh = H if fill else int(min(H - 1, max(4, round(0.55 * W) + 2)))
    top = H - mh
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = mh / 2 - 0.5
    cy = top + mh / 2
    n = 6 + int(W / 4)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.3, 0.46, 0.4, 0.9, H, SAGE, 0.2, 0.6)
    mask[:top] = False
    img[:top] = 0
    cols = np.where(mask.any(axis=0))[0]
    if len(cols):
        img[H - 1, cols[0] + 1:cols[-1]] = SAGE[1]
        mask[H - 1, cols[0] + 1:cols[-1]] = True
    # twiggy top: single-pixel notches along the upper rim
    yy, xx = np.mgrid[0:H, 0:Wc]
    upper = mask & (yy < cy) & _outline(~mask)
    notch = upper & (rng.random((H, Wc)) < 0.25)
    img[notch] = 0
    mask &= ~notch
    share = SAGE_FLOWERS[variant % len(SAGE_FLOWERS)]
    if share:
        rel_y = (yy + 0.5 - top) / max(1.0, mh)
        lit_top = mask & (rel_y < 0.45)
        fl = lit_top & (rng.random((H, Wc)) < share)
        img[fl] = SAGE_BLOOM[1]
        img[fl & (xx + 0.5 < cx)] = SAGE_BLOOM[2]
    solid = img[..., 3] > 0
    img[_outline(solid)] = SAGE[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def sage_bush(W: int, H: int, variant: int) -> np.ndarray:
    """A sagebrush for the theme's bush sheet (sprites/shrubs_silvies, trees.json c: 3):
    the shrub size grid (assets-src/shrubs.py: W x H px plus the outline, H + 1 rows)."""
    return sage(W, H + 1, variant, fill=True)

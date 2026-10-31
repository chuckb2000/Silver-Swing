"""Tree and bush sprites for the `pronghorn` theme (Pronghorn, now Juniper Preserve, Bend OR:
high desert east of the Cascades at about 3,200 ft, an old western-juniper woodland over
sagebrush, bitterbrush and bunchgrass, with basalt outcrops).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the game picks
frames the same way (`<c|d>_<w>_<h>_<variant>`). s05 sorts lidar crowns into "conifer"
(narrow for their height) and "deciduous" (broad). Nearly every tree round the course is a
western juniper (a few ponderosa pines by the clubhouse and the Fazio course), so both
classes are drawn as junipers in two growth forms (a drawing choice, not a surveyed split):

  c_*_*     upright juniper: a young or crowded tree, a narrow, shaggy, slightly
            flame-shaped crown down to near the ground, dense blue-grey-green
  d_*_*     old juniper: the open-grown veteran, a short twisted silver-grey trunk
            (often forked) under a broad, ragged, flat-topped crown with a dead grey limb
            showing through on some variants
  s_*_*_*   the theme's bush (`desert_bush`; palette "trees": {"shrub": ...}): big
            sagebrush (silver grey-green) on variants 0-4, antelope bitterbrush (darker
            olive, a few pale-yellow flowers on variant 6) on 5-7

palettes/pronghorn.json names these painters; `python3 assets-src/build_assets.py --theme
pronghorn` builds sprites/trees_pronghorn.* and shrubs_pronghorn.*, and pipeline s09b draws
the same painters in the putting views. Nothing here is imported by another theme.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

# juniper foliage: outline, shade, mid, lit, highlight (blue-grey-green; the upright ones a
# shade greener than the old trees)
JUN_UP = [hex2rgba(c) for c in ("#152522", "#273f37", "#385548", "#4d6b5a", "#6a8873")]
JUN_OLD = [hex2rgba(c) for c in ("#1a2724", "#2d3f38", "#3f5449", "#566b5c", "#748a74")]
# silver-grey juniper bark (shreddy), and its dead wood
BARK = [hex2rgba(c) for c in ("#2f2924", "#5e554c", "#8a8074")]
DEAD = [hex2rgba(c) for c in ("#4e4943", "#8c867c", "#b9b2a4")]
# big sagebrush (silvery) and bitterbrush (olive)
SAGE = [hex2rgba(c) for c in ("#343c30", "#566050", "#748068", "#949f86", "#b8c1a8")]
BITTER = [hex2rgba(c) for c in ("#28301f", "#414d2e", "#59663c", "#72804b", "#8f9a60")]
BITTER_BLOOM = [hex2rgba(c) for c in ("#a89a48", "#d8c86a", "#efe3a0")]


def _outline(mask: np.ndarray) -> np.ndarray:
    """1 px ring around a mask, without wrapping round the frame edges (padded first)."""
    m = np.pad(mask, 1)
    ring = np.zeros_like(m)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return (ring & ~m)[1:-1, 1:-1]


def _shag(img, mask, rng, pal, crown_bot, p_add=0.22, p_cut=0.12):
    """Ragged juniper rim: single pixels added and bitten out round the crown."""
    H, Wc = mask.shape
    rim = _outline(mask)
    add = rim & (rng.random((H, Wc)) < p_add)
    add[crown_bot:] = False
    img[add] = pal[2]
    mask |= add
    edge = mask & _outline(~mask)
    cut = edge & (rng.random((H, Wc)) < p_cut)
    img[cut] = 0
    mask &= ~cut
    return img, mask


def upright(W: int, H: int, variant: int) -> np.ndarray:
    """Upright western juniper: a narrow, flame-shaped shaggy crown from near the ground up."""
    rng = np.random.default_rng(71000 * W + 41 * H + variant)
    Wc = W + 2
    img = np.zeros((H, Wc, 4), np.uint8)
    mask = np.zeros((H, Wc), bool)
    crown_bot = H - max(1, int(round(0.08 * H)))
    cx = Wc / 2 + rng.uniform(-0.4, 0.4)
    # stacked clumps, widest in the lower third, tapering to a blunt, often leaning top
    ntier = 3 if H < 24 else (4 if H < 44 else 5)
    tier_h = (crown_bot - 1) / ntier
    lean = rng.uniform(-0.08, 0.08) * W
    for i in range(ntier - 1, -1, -1):            # lowest first, upper tiers drawn over it
        f = (i + 0.5) / ntier                       # 0 top .. 1 bottom
        widthf = 0.30 + 0.70 * min(1.0, f * 1.15) ** 0.8   # a broad skirt tapering to the top
        rx = max(1.6, (W / 2 - 0.5) * widthf * rng.uniform(0.9, 1.05))
        ry = max(1.8, tier_h * 0.95)
        cy = 1 + tier_h * (i + 0.5)
        tcx = cx + lean * (1 - f) + rng.uniform(-0.05, 0.05) * W
        n = 4 + int(W / 8)
        timg, tm = base._clump_crown(rng, Wc, H, tcx, cy, rx, ry, n, 0.32, 0.5, 0.4, 0.9,
                                     min(H, int(cy + ry + 1)), JUN_UP, 0.16, 0.6)
        img[tm] = timg[tm]
        mask |= tm
    img, mask = _shag(img, mask, rng, JUN_UP, crown_bot)
    # a stub of grey trunk under the skirt
    tw = max(1, int(round(W / 9)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    trunk[crown_bot - 2:H - 1, tx0:tx0 + tw] = True
    trunk &= ~mask
    img[trunk] = BARK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = BARK[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = JUN_UP[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def old_juniper(W: int, H: int, variant: int) -> np.ndarray:
    """Old open-grown western juniper: short twisted trunk, broad ragged flat-topped crown."""
    rng = np.random.default_rng(57000 * W + 47 * H + variant)
    Wc = W + 2
    trunk_len = int(np.clip(round(0.26 * H), 2, 12))
    crown_bot = H - trunk_len + 2
    cx = Wc / 2 + (variant - 1) * 0.5
    rx = W / 2 - 0.5
    ry = crown_bot / 2 - 0.6
    cy = crown_bot / 2 + 0.8                       # crown sits low: a flattened top
    n = 7 + int(W / 5)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.28, 0.46, 0.5, 0.92, crown_bot, JUN_OLD, 0.18, 0.6)
    # flatten the top a little: shave the highest rows of the crown
    rows = np.where(mask.any(axis=1))[0]
    if len(rows) and H >= 16:
        shave = rows[0] + max(1, int(0.06 * H))
        cut = mask.copy()
        cut[shave:] = False
        cut &= rng.random((H, Wc)) < 0.7
        img[cut] = 0
        mask &= ~cut
    img, mask = _shag(img, mask, rng, JUN_OLD, crown_bot, 0.26, 0.14)
    # twisted trunk, forked on bigger trees
    tw = max(2, int(round(W / 7)))
    tx0 = int(round(Wc / 2 - tw / 2))
    trunk = np.zeros((H, Wc), bool)
    for y in range(crown_bot - 4, H - 1):
        sway = int(round(0.6 * np.sin((y - crown_bot) * 0.7 + variant)))
        trunk[y, max(0, tx0 + sway):min(Wc, tx0 + sway + tw)] = True
    if W >= 16:
        side = 1 if variant % 2 else -1
        for y in range(crown_bot - 4, H - 3):
            k = int(round((H - 3 - y) * 0.5))
            x = tx0 + (tw if side > 0 else -1) + side * k
            if 0 <= x < Wc:
                trunk[y, x] = True
    trunk &= ~mask
    img[trunk] = BARK[2]
    img[trunk & ~np.roll(trunk, -1, 1)] = BARK[1]
    img[H - 2, max(0, tx0 - 1)] = BARK[1]
    img[H - 2, min(Wc - 1, tx0 + tw)] = BARK[1]
    # a dead silver limb poking out of the crown on some old trees
    if variant % 3 == 1 and W >= 14:
        side = -1 if variant % 2 else 1
        y0 = int(cy - ry * 0.3)
        for j in range(max(3, W // 4)):
            x = int(round(Wc / 2 + side * (rx * 0.55 + j)))
            y = y0 - j // 2
            if 0 <= x < Wc and 0 <= y < H:
                img[y, x] = DEAD[2] if j % 3 else DEAD[1]
    solid = img[..., 3] > 0
    img[_outline(solid)] = JUN_OLD[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def _bush(W: int, H: int, variant: int, pal, bloom: float, fill: bool) -> np.ndarray:
    rng = np.random.default_rng(67100 * W + 31 * H + variant)
    Wc = W + 2
    mh = H if fill else int(min(H - 1, max(4, round(0.55 * W) + 2)))
    top = H - mh
    cx = Wc / 2
    rx = W / 2 - 0.5
    ry = mh / 2 - 0.5
    cy = top + mh / 2
    n = 6 + int(W / 4)
    img, mask = base._clump_crown(rng, Wc, H, cx, cy, rx, ry, n, 0.3, 0.46, 0.4, 0.9, H, pal, 0.2, 0.6)
    mask[:top] = False
    img[:top] = 0
    cols = np.where(mask.any(axis=0))[0]
    if len(cols):
        img[H - 1, cols[0] + 1:cols[-1]] = pal[1]
        mask[H - 1, cols[0] + 1:cols[-1]] = True
    yy, xx = np.mgrid[0:H, 0:Wc]
    upper = mask & (yy < cy) & _outline(~mask)
    notch = upper & (rng.random((H, Wc)) < 0.25)
    img[notch] = 0
    mask &= ~notch
    if bloom:
        rel_y = (yy + 0.5 - top) / max(1.0, mh)
        fl = mask & (rel_y < 0.5) & (rng.random((H, Wc)) < bloom)
        img[fl] = BITTER_BLOOM[1]
        img[fl & (xx + 0.5 < cx)] = BITTER_BLOOM[2]
    solid = img[..., 3] > 0
    img[_outline(solid)] = pal[0]
    img[:, 0] = 0
    img[:, -1] = 0
    return img


def desert_bush(W: int, H: int, variant: int) -> np.ndarray:
    """The theme's bush sheet (sprites/shrubs_pronghorn, trees.json c: 3), in the shrub size
    grid (assets-src/shrubs.py: W x H px plus the outline, H + 1 rows): sagebrush on
    variants 0-4, bitterbrush on 5-7 (a few flowers on 6)."""
    v = variant % 8
    if v < 5:
        return _bush(W, H + 1, v, SAGE, 0.0, True)
    return _bush(W, H + 1, v, BITTER, 0.12 if v == 6 else 0.0, True)

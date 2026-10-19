"""Tree sprites for the `potomac` theme (East Potomac Golf Links, Washington DC).

Same sizes, keys and anchors as the Pacific Northwest set (trees.py), so the
game picks frames the same way (`<c|d>_<w>_<h>_<variant>`), but drawn for a
Mid-Atlantic riverside park:

  c_*_0..2  pines (loblolly / white pine): the conifer shape, blue-green
  d_*_0     oaks and elms: deep summer green
  d_*_1     sycamores, willows, maples: a lighter, yellower green
  d_*_2     flowering cherries in bloom (Yoshino pale pink; Kwanzan deep pink
            on every other width), the island's famous ring of cherry trees

The game draws tree i with variant i % 3, and pipeline s05 orders the trees
so that the cherries sit at those indices (DECISIONS.md, East Potomac).
The trees.py (pnw) output is not changed by this module.
"""
from __future__ import annotations

import numpy as np

import trees as pnw
from atlas import hex2rgba
from trees import TREE_HEIGHTS, TREE_WIDTHS

PINE = [hex2rgba(c) for c in ("#0f2621", "#1c3f36", "#255244", "#30654f", "#457d5f")]
OAK = [hex2rgba(c) for c in ("#132c17", "#24521f", "#336b29", "#468536", "#64a147")]
SYC = [hex2rgba(c) for c in ("#1a3016", "#35601f", "#477a28", "#5f9435", "#86b34c")]
TRUNK = [hex2rgba(c) for c in ("#21140d", "#46301f", "#6a4a33")]
# cherry blossoms: outline, shade, mid, light, highlight
YOSHINO = [hex2rgba(c) for c in ("#5a2c43", "#d98fb0", "#efb7cd", "#f9d7e4", "#fff3f7")]
KWANZAN = [hex2rgba(c) for c in ("#55203a", "#c4547f", "#df7aa1", "#f0a6c2", "#fbd3e2")]
CHERRY_TRUNK = [hex2rgba(c) for c in ("#1e1210", "#3f2a22", "#5e4134")]


def _recolor(img: np.ndarray, src: list, dst: list) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    img = pnw.conifer(W, H, variant)
    return _recolor(_recolor(img, pnw.CON, PINE), pnw.TRUNK, TRUNK)


def cherry(W: int, H: int) -> np.ndarray:
    """A cherry in bloom: the rounded deciduous crown in pink with blossom speckles."""
    img = pnw.deciduous(W, H, 2)
    pal = KWANZAN if (W // 4) % 2 == 0 else YOSHINO
    # pnw.DEC tones 0..4 = outline, dark, mid, light, highlight
    img = _recolor(img, pnw.DEC, pal)
    img = _recolor(img, pnw.TRUNK, CHERRY_TRUNK)
    rng = np.random.default_rng(31 * W + 7 * H + 2)
    crown = np.zeros(img.shape[:2], bool)
    for c in pal[1:]:
        crown |= np.all(img == np.array(c, np.uint8), axis=-1)
    sp = rng.random(img.shape[:2])
    img[crown & (sp < 0.10)] = pal[4]          # open blossoms catching the light
    img[crown & (sp > 0.965)] = pal[1]         # gaps in the canopy
    # a few dark branch tips showing through on the lower right of the crown
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    lower_right = (xx > img.shape[1] * 0.55) & (yy > img.shape[0] * 0.35)
    img[crown & lower_right & (sp > 0.985)] = CHERRY_TRUNK[1]
    return img


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    if variant == 2:
        return cherry(W, H)
    img = pnw.deciduous(W, H, variant)
    img = _recolor(img, pnw.DEC, OAK if variant == 0 else SYC)
    return _recolor(img, pnw.TRUNK, TRUNK)


def tree_frames():
    """All (key, image) pairs for the potomac tree atlas (same keys as trees.tree_frames)."""
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

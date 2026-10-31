"""Tree sprites for the `marovitz` theme (Sydney R. Marovitz, Lincoln Park,
Chicago lakefront; course chat, 2026-10-31).

Same sizes, keys and anchors as the other sets (`<c|d>_<w>_<h>_<variant>`):

  c_*_*     blue spruce and Austrian pine of the lakefront plantings: the
            conical trees.conifer shape in a cool blue-green
  d_*_0     American elm: a deep, slightly blue summer green
  d_*_1     honey locust, the city's street and park tree: a light yellow-green
            with an open, airy crown (a scatter of leaf pixels dropped to the
            shade tone so the fine leaflets read as see-through)
  d_*_2     eastern cottonwood of the shore: a bright mid green

palettes/marovitz.json names these painters, so
`python3 assets-src/build_assets.py --theme marovitz` builds
sprites/trees_marovitz.* and pipeline s09b draws the same trees in the putting
views. Nothing shared changes.
"""
from __future__ import annotations

import numpy as np

import trees as base
from atlas import hex2rgba

SPRUCE = [hex2rgba(c) for c in ("#0c2224", "#173a3a", "#22504c", "#2f665e", "#4a8378")]
ELM = [hex2rgba(c) for c in ("#112a19", "#1f4a24", "#2b622d", "#3c7b38", "#57964a")]
LOCUST = [hex2rgba(c) for c in ("#1d3215", "#3f6a22", "#56842c", "#73a03a", "#9dc055")]
COTTON = [hex2rgba(c) for c in ("#14301a", "#2a5d27", "#3a7a32", "#50953f", "#71b052")]
TRUNK = [hex2rgba(c) for c in ("#20160f", "#4a3527", "#6e5340")]


def _recolor(img: np.ndarray, src: list, dst: list, where: np.ndarray | None = None) -> np.ndarray:
    out = img.copy()
    for s, d in zip(src, dst):
        m = np.all(img == np.array(s, np.uint8), axis=-1)
        if where is not None:
            m &= where
        out[m] = d
    return out


def conifer(W: int, H: int, variant: int) -> np.ndarray:
    img = base.conifer(W, H, variant)
    return _recolor(_recolor(img, base.CON, SPRUCE), base.TRUNK, TRUNK)


def deciduous(W: int, H: int, variant: int) -> np.ndarray:
    img = base.deciduous(W, H, variant)
    v = variant % 3
    if v == 1:
        # honey locust: drop about one leaf pixel in seven (mid and light tones) to the shade
        # tone, seeded by the frame size, so the crown looks open and fine-leaved
        rng = np.random.default_rng(4241 * W + 37 * H + variant)
        lit = np.zeros(img.shape[:2], bool)
        for c in base.DEC[2:]:
            lit |= np.all(img == np.array(c, np.uint8), axis=-1)
        holes = lit & (rng.random(lit.shape) < 0.14)
        img[holes] = base.DEC[1]
    img = _recolor(img, base.DEC, (ELM, LOCUST, COTTON)[v])
    return _recolor(img, base.TRUNK, TRUNK)

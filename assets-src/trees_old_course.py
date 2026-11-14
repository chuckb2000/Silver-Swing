"""Tree sprites for the `old_course` theme (the Old Course, St Andrews).

The links are almost treeless; the few lidar trees stand in the town and along the
Old Course Hotel's grounds. Conifers use the `bandon_dunes` shore pine and the whins
(gorse) its gorse bush (palette "trees"); the broadleaves here are sycamore and ash,
drawn as the Pacific Northwest deciduous shape in a darker, cooler green.
Course chat's proposal, 2026-11-13.
"""
from __future__ import annotations

import trees as base
from atlas import hex2rgba
from trees_bandon_dunes import _recolor

LEAF = [hex2rgba(c) for c in ("#132516", "#23401f", "#30552a", "#416c35", "#5a8644")]


def sycamore(W: int, H: int, variant: int):
    return _recolor(base.deciduous(W, H, variant), base.DEC, LEAF)

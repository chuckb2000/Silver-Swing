"""Flowering shrubs of a garden beside the course (course_config.json `garden`).

Used for the Crystal Springs Rhododendron Garden beside Eastmoreland
(developer, 2026-10-19: "pretty and have flowers"). The bushes are exported as
trees.json entries with `c: 3` (tree type "shrub"), which the game draws from
sprites/shrubs.png (design chat, assets-src/shrubs.py). The game picks a bush's
bloom colour from its index in trees.json: variant = index % 8
(0 pink, 1 magenta, 2 purple, 3 white, 4 red, 5 coral, 6 pale pink,
7 leaves only). So each bush gets its colour here (seeded, by `colours`
weights) and `order_trees()` places every bush at an index whose % 8 is that
colour, filling the other indices with the lidar trees.

Where: inside the listed OSM polygons, where the lidar canopy height model
shows the shrub layer (`shrub_min_m`-`shrub_max_m`), plus, at
`understory_density`, under taller canopy (rhododendrons grow beneath the
garden's conifers, which highest-hit lidar cannot see). Positions on a
jittered grid (`spacing_m`), crown radius `r_min_m`-`r_max_m`, height from the
CHM clamped to 1-4.5 m (2 m under canopy). The garden is outside the golf
boundary, so the bushes are out of bounds; physics treats them as small
deciduous trees.

    "garden": {"osm": ["w133795912"], "shrub_min_m": 0.6, "shrub_max_m": 7.0,
               "spacing_m": 2.6, "r_min_m": 1.1, "r_max_m": 1.9, "understory_density": 0.5,
               "colours": {"pink": 3, "magenta": 3, "purple": 2.5, "white": 1.5, "red": 1.2,
                           "coral": 1, "pale pink": 2, "leaves": 1}}
"""
from __future__ import annotations

import zlib
from collections import deque

import numpy as np
from scipy import ndimage
from shapely import prepared
from shapely.geometry import Point
from shapely.ops import unary_union

from common import build_dir

# the game's shrub variants (game/src/ui/shrubs.ts, assets-src/shrubs.py): index % 8
VARIANTS = ["pink", "magenta", "purple", "white", "red", "coral", "pale pink", "leaves"]
SHRUB_H_MIN, SHRUB_H_MAX = 1.0, 4.5   # m: bush height from the CHM, clamped
UNDERSTORY_H = 2.0                    # m: a bush under taller canopy (the CHM sees the tree)

_CHM: dict = {}


def _chm(cfg) -> np.ndarray:
    if cfg["id"] not in _CHM:
        _CHM[cfg["id"]] = np.load(build_dir(cfg["id"]) / "chm_local.npy")  # 1 m, rows south->north
    return _CHM[cfg["id"]]


def enabled(cfg) -> bool:
    return bool(cfg.get("garden"))


def shrub_trees(cfg, g, chm: np.ndarray | None = None) -> list[dict]:
    """The garden bushes as tree records: type "shrub", `v` = bloom variant (VARIANTS).

    `chm`: the canopy height model s05 is working on (1 m, rows south->north). s05
    passes it in because it only saves build/chm_local.npy later, so on a first build
    from an empty build/ that file doesn't exist yet."""
    gd = cfg["garden"]
    polys = unary_union([geom for geom in g[g.osm.isin(gd["osm"])].geometry if geom is not None])
    if polys.is_empty:
        return []
    chm = _chm(cfg) if chm is None else chm
    H, W = chm.shape
    lo, hi = float(gd.get("shrub_min_m", 0.6)), float(gd.get("shrub_max_m", 7.0))
    shrub = ndimage.binary_closing((chm >= lo) & (chm <= hi), iterations=1)
    rng = np.random.default_rng(zlib.crc32(("garden:" + cfg["id"]).encode()))
    sp = float(gd.get("spacing_m", 2.6))
    x0, y0, x1, y1 = polys.bounds
    cx, cy = np.meshgrid(np.arange(x0, x1 + sp, sp), np.arange(y0, y1 + sp, sp))
    cx = cx.ravel() + rng.uniform(-0.45, 0.45, cx.size) * sp
    cy = cy.ravel() + rng.uniform(-0.45, 0.45, cy.size) * sp
    r = rng.uniform(float(gd.get("r_min_m", 1.1)), float(gd.get("r_max_m", 1.9)), cx.size)
    weights = gd.get("colours", {v: 1 for v in VARIANTS})
    unknown = set(weights) - set(VARIANTS)
    if unknown:
        raise SystemExit(f"[garden] unknown colours {sorted(unknown)}; use {VARIANTS}")
    w = np.array([float(weights.get(v, 0)) for v in VARIANTS])
    col = rng.choice(len(VARIANTS), cx.size, p=w / w.sum())
    j = np.clip(cy.astype(int), 0, H - 1)
    i = np.clip(cx.astype(int), 0, W - 1)
    canopy = chm[j, i] > hi
    pick = shrub[j, i] | (canopy & (rng.random(cx.size) < float(gd.get("understory_density", 0.0))))
    pp = prepared.prep(polys)
    out = []
    for k in np.where(pick)[0]:
        if not pp.contains(Point(cx[k], cy[k])):
            continue
        c = float(chm[j[k], i[k]])
        h = UNDERSTORY_H if c > hi else float(np.clip(c, SHRUB_H_MIN, SHRUB_H_MAX))
        out.append({"x": round(float(cx[k]), 2), "y": round(float(cy[k]), 2), "h": round(h, 1),
                    "r": round(float(r[k]), 2), "type": "shrub", "v": int(col[k]), "in": False, "from": "garden"})
    return out


def order_trees(trees: list[dict]) -> tuple[list[dict], int]:
    """Put every shrub at an index i with i % 8 == its colour `v`, keeping the other
    trees in their order in between. Returns (list, shrubs that could not get their
    slot: placed at the end in any colour, once the trees to fill with ran out)."""
    shrubs = [t for t in trees if t["type"] == "shrub"]
    if not shrubs:
        return trees, 0
    others = deque(t for t in trees if t["type"] != "shrub")
    queues = [deque(s for s in shrubs if s["v"] == v) for v in range(len(VARIANTS))]
    out: list[dict] = []
    while others or any(queues):
        q = queues[len(out) % len(VARIANTS)]
        if q:
            out.append(q.popleft())
        elif others:
            out.append(others.popleft())
        else:
            break
    rest = [s for q in queues for s in q]
    return out + rest, len(rest)


def colour_counts(trees: list[dict]) -> dict:
    """Shrubs per colour as the game will draw them (index % 8)."""
    n = {v: 0 for v in VARIANTS}
    for k, t in enumerate(trees):
        if t["type"] == "shrub":
            n[VARIANTS[k % len(VARIANTS)]] += 1
    return n

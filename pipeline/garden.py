"""Flowering shrub beds painted into the terrain art (course_config.json `garden`).

Art only: the beds are drawn on out-of-bounds ground (surfaces ob and
ob_woods) inside the listed OSM polygons, so physics, the surface map and
every other course are unchanged. Used for the Crystal Springs Rhododendron
Garden beside Eastmoreland (developer, 2026-10-19: "pretty and have flowers").

Where: the garden polygon(s) where the lidar canopy height model shows low
vegetation (`shrub_min_m`-`shrub_max_m`, the shrub layer), plus, at
`understory_density`, under the taller canopy (rhododendrons grow beneath the
garden's conifers, which highest-hit lidar cannot see; the tree sprites cover
part of them in the game). How: seeded clumps on a jittered grid
(`spacing_m`, radius `r_min_m`-`r_max_m`), each a rounded bush with a dark
outline, lit from the upper left, dotted with blossom in one colour from
`flowers` (weights `weights`; an entry of null is a bush not in flower),
casting a short shadow to the lower right. Positions, colours and blossom
dots are functions of world metres, so the course art (2 px/m) and the
putting views (6-24 px/m) show the same beds. The flower colours are the
course's own (`colors`), not the theme palette, so no theme changes.

    "garden": {"osm": ["w133795912"], "shrub_min_m": 0.6, "shrub_max_m": 7.0,
               "spacing_m": 2.6, "r_min_m": 1.1, "r_max_m": 1.9,
               "understory_density": 0.5,
               "leaf": ["#..", "#..", "#.."], "outline": "#..",
               "flowers": [["shade", "base", "lit"], ...], "weights": [...]}
"""
from __future__ import annotations

import zlib

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
from shapely import prepared
from shapely.geometry import Point
from shapely.ops import unary_union

from common import SURF as S, build_dir

_CHM: dict = {}
SHADOW_OFF_M = 0.55       # bush shadow: offset to the lower right (sun upper left)
SHADOW_MULT = 0.62


def _rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def _chm(cfg) -> np.ndarray:
    if cfg["id"] not in _CHM:
        _CHM[cfg["id"]] = np.load(build_dir(cfg["id"]) / "chm_local.npy")  # 1 m, rows south->north
    return _CHM[cfg["id"]]


def _hash01(i: np.ndarray, j: np.ndarray, salt: int) -> np.ndarray:
    """Deterministic 0..1 noise per integer cell (i, j)."""
    h = (i.astype(np.int64) * 73856093) ^ (j.astype(np.int64) * 19349663) ^ salt
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h & 0xFFFF).astype(np.float64) / 65535.0


def clumps(cfg, g):
    """Bush centres (x, y), radii and colour index (-1 = not in flower), in world metres."""
    gd = cfg["garden"]
    polys = unary_union([geom for geom in g[g.osm.isin(gd["osm"])].geometry if geom is not None])
    if polys.is_empty:
        return polys, np.zeros((0, 2)), np.zeros(0), np.zeros(0, int)
    chm = _chm(cfg)
    lo, hi = float(gd.get("shrub_min_m", 0.6)), float(gd.get("shrub_max_m", 7.0))
    shrub = (chm >= lo) & (chm <= hi)
    shrub = ndimage.binary_closing(shrub, iterations=1)
    rng = np.random.default_rng(zlib.crc32(("garden:" + cfg["id"]).encode()))
    sp = float(gd.get("spacing_m", 2.2))
    x0, y0, x1, y1 = polys.bounds
    xs = np.arange(x0, x1 + sp, sp)
    ys = np.arange(y0, y1 + sp, sp)
    cx, cy = np.meshgrid(xs, ys)
    cx = cx.ravel() + rng.uniform(-0.45, 0.45, cx.size) * sp
    cy = cy.ravel() + rng.uniform(-0.45, 0.45, cy.size) * sp
    r = rng.uniform(float(gd.get("r_min_m", 0.8)), float(gd.get("r_max_m", 1.4)), cx.size)
    w = np.array(gd.get("weights", [1] * len(gd["flowers"])), float)
    col = rng.choice(len(w), cx.size, p=w / w.sum())
    H, W = chm.shape
    j = np.clip(cy.astype(int), 0, H - 1)
    i = np.clip(cx.astype(int), 0, W - 1)
    pp = prepared.prep(polys)
    under = float(gd.get("understory_density", 0.0))
    canopy = chm[j, i] > hi
    keep = (shrub[j, i] | (canopy & (rng.random(cx.size) < under))) & np.array([pp.contains(Point(a, b)) for a, b in zip(cx, cy)])
    flw = gd["flowers"]
    col = np.array([c if flw[c] is not None else -1 for c in col])
    return polys, np.c_[cx[keep], cy[keep]], r[keep], col[keep]


def paint_garden(rgb: np.ndarray, cfg, g, surf: np.ndarray, X: np.ndarray, Y: np.ndarray, ppm: float) -> np.ndarray:
    """Paint the beds into `rgb` (H x W x 3, row 0 north) whose pixel centres are at world
    metres X, Y. Only pixels on ob / ob_woods change. Returns the bush mask."""
    H, W = surf.shape
    out = np.zeros((H, W), bool)
    gd = cfg.get("garden")
    if not gd:
        return out
    polys, C, R, col = clumps(cfg, g)
    if not len(C):
        return out
    x0, y0, x1, y1 = polys.bounds
    pad = 3.0
    rows = np.where((Y[:, 0] >= y0 - pad) & (Y[:, 0] <= y1 + pad))[0]
    cols_ = np.where((X[0] >= x0 - pad) & (X[0] <= x1 + pad))[0]
    if not len(rows) or not len(cols_):
        return out
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols_[0], cols_[-1] + 1
    xs, ys = X[r0:r1, c0:c1], Y[r0:r1, c0:c1]
    ok = np.isin(surf[r0:r1, c0:c1], [S["ob"], S["ob_woods"]])
    tree = cKDTree(C)

    def bush_at(px, py):
        d, k = tree.query(np.c_[px.ravel(), py.ravel()], k=1)
        d, k = d.reshape(px.shape), k.reshape(px.shape)
        dx, dy = px - C[k, 0], py - C[k, 1]
        ang = np.arctan2(dy, dx)
        wob = 1.0 + 0.12 * np.sin(3 * ang + k) + 0.06 * np.sin(5 * ang + 2 * k)
        return d <= R[k] * wob, k, dx / R[k], dy / R[k], d / (R[k] * wob)

    bush, k, ux, uy, rel = bush_at(xs, ys)
    bush &= ok
    leaf = [_rgb(c) for c in gd["leaf"]]
    outline = _rgb(gd["outline"])
    flowers = [None if f is None else [_rgb(c) for c in f] for f in gd["flowers"]]
    # shadow first (lower right of each bush, on the ground around it)
    so = SHADOW_OFF_M
    sb, _, _, _, _ = bush_at(xs - so, ys + so)
    shade = sb & ~bush & ok
    sub = rgb[r0:r1, c0:c1]
    sub[shade] = (sub[shade].astype(np.float32) * SHADOW_MULT).astype(np.uint8)
    # light: +1 toward the upper left (sun), -1 toward the lower right
    light = (-ux + uy) / np.sqrt(2)
    q = 1.0 / min(ppm, 6.0)  # blossom grain: 1 px at 2 px/m, 1/6 m from 6 px/m up
    ci, cj = np.floor(xs / q).astype(np.int64), np.floor(ys / q).astype(np.int64)
    n_f = _hash01(ci, cj, 0x5EED)
    n_l = _hash01(ci, cj, 0xBEEF)
    lt = np.where(light > 0.35, 2, np.where(light < -0.30, 0, 1))
    lt = np.where((n_l < 0.15) & (lt > 0), lt - 1, lt)
    px_ = np.zeros(sub.shape, np.uint8)
    for t_ in range(3):
        px_[lt == t_] = leaf[t_]
    ck = col[k]
    bloom = bush & (ck >= 0) & (n_f < 0.70 + 0.2 * (light > 0))
    for c, f in enumerate(flowers):
        if f is None:
            continue
        m = bloom & (ck == c)
        if not m.any():
            continue
        ft = np.where(light > 0.25, 2, np.where(light < -0.35, 0, 1))
        for t_ in range(3):
            px_[m & (ft == t_)] = f[t_]
    # outline: bush pixels next to non-bush or to another bush
    edge = np.zeros_like(bush)
    seam = np.zeros_like(bush)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = np.roll(np.roll(bush, dy, 0), dx, 1)
        nk = np.roll(np.roll(k, dy, 0), dx, 1)
        edge |= bush & ~nb
        seam |= bush & nb & (nk != k)
    if ppm > 6:  # keep the outline about 1/6 m wide up close, as the textures are
        w_ = 1.0 / (R[k] * 6.0)
        edge = bush & ((rel > 1.0 - w_) | edge) & ~(seam & (rel <= 1.0 - w_))
        seam = bush & ~edge & (rel > 1.0 - w_)
    px_[seam & (light < 0.2)] = leaf[0]
    px_[edge] = outline
    sub[bush] = px_[bush]
    out[r0:r1, c0:c1] = bush
    return out

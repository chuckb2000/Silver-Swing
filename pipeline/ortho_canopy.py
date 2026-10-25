"""Canopy from the orthophoto where the lidar has no points (course_config.json `trees_ortho`).

Used for Strawberry Farms (course chat, 2026-10-25): the only point cloud there, the 2011
USGS Orange County lidar, stops in a straight line south of the reservoir, so about a third
of the course (holes 10-17) has no canopy heights, and NOAA has no newer point cloud (the
developer checked the Data Access Viewer). CLAUDE.md 5.4 puts imagery second after lidar,
so the lidar's own canopy teaches a photo classifier, which then fills the gap.

On s05's 1 m world grid (rows south->north):
  covered     cells with lidar returns (s00 build/veg_returns_1m.tif), dilated 3 m,
              closed over `close_m` and their holes filled (open water inside the
              survey has no returns but is covered)
  photo       the orthophoto at 0.5 m (gorse.ortho_on_world): V = (R+G+B)/3,
              excess green E = (2G-R-B)/(R+G+B), texture T = std of V over 2.5 m; then
              averaged to 1 m
  classifier  canopy = E > e_min and V < v_max and T > t_min. The three thresholds are
              chosen on the covered part, where the lidar says what is canopy (CHM >
              `canopy_m`), as the best F-beta over a grid (beta 0.5: precision counts
              more, so scrub isn't read as woods), on a seeded sample of cells away
              from open water
  heights     where the classifier says canopy on the covered part, the median lidar
              height per metre of distance in from the canopy edge (1 m bins, made
              non-decreasing): a dome per crown, so s05's local maxima and watershed
              find tree tops and crown radii in the filled cells as in the lidar ones
  fill        the uncovered cells get that height where the classifier says canopy
              (patches under `min_patch_m2` dropped), else nothing

Lower fidelity than lidar: heights follow crown size, not measurement, and dense
scrub can read as trees. The report gives the classifier's F1 on the lidar part and
how many trees came from the photo. Keys (defaults): {"close_m": 15, "canopy_m": 3.0,
"min_patch_m2": 12, "beta": 0.5, "sample": 200000}. Without `trees_ortho`, nothing changes.
"""
from __future__ import annotations

import numpy as np
import rasterio
from scipy import ndimage

from common import build_dir

DEFAULTS = {"close_m": 15, "canopy_m": 3.0, "min_patch_m2": 12, "beta": 0.5, "sample": 200000}


def _crop(path, world, r0, c0, H, W):
    with rasterio.open(path) as r:
        a = r.read(1).astype(np.float64)
    return np.flipud(a[r0:r0 + H, c0:c0 + W])


def photo_features(cfg, world, H, W):
    """V, E, T on the 1 m world grid, rows south->north."""
    from gorse import ortho_on_world
    rgb = ortho_on_world(cfg, world).astype(np.float64)          # 3 x 2H x 2W, row 0 = north
    R, G, B = rgb
    V = (R + G + B) / 3
    E = (2 * G - R - B) / np.maximum(R + G + B, 1.0)
    m = ndimage.uniform_filter(V, 5)
    T = np.sqrt(np.maximum(ndimage.uniform_filter(V * V, 5) - m * m, 0))
    out = []
    for a in (V, E, T):
        a = a[:2 * H, :2 * W].reshape(H, 2, W, 2).mean(axis=(1, 3))
        out.append(np.flipud(a))
    return out


def fill_chm(name, cfg, world, chm, water, crop):
    """chm (rows south->north, metres) with the uncovered cells filled from the photo, a report,
    and the uncovered mask (None when nothing was filled)."""
    p = {**DEFAULTS, **(cfg["trees_ortho"] if isinstance(cfg["trees_ortho"], dict) else {})}
    r0, c0, H, W = crop
    ret = _crop(build_dir(name) / "veg_returns_1m.tif", world, r0, c0, H, W)
    covered = ndimage.binary_dilation(ret > 0, iterations=3)
    covered = ndimage.binary_closing(covered, structure=np.ones((3, 3)), iterations=int(p["close_m"]))
    covered = ndimage.binary_fill_holes(covered)
    gap = ~covered
    if gap.sum() < 100:
        return chm, {"filled_cells": 0, "note": "the lidar covers the world; nothing filled"}, None
    V, E, T = photo_features(cfg, world, H, W)

    # calibrate on the covered part, away from water and the survey's edge
    target = chm > p["canopy_m"]
    usable = ndimage.binary_erosion(covered, iterations=10) & ~ndimage.binary_dilation(water, iterations=3) & (V > 0)
    idx = np.flatnonzero(usable)
    rng = np.random.default_rng(20261025)
    idx = rng.choice(idx, size=min(int(p["sample"]), idx.size), replace=False)
    v, e, t, y = V.flat[idx], E.flat[idx], T.flat[idx], target.flat[idx]
    best = (-1.0, None)
    for e_min in np.arange(-0.02, 0.16, 0.01):
        me = e > e_min
        for v_max in np.arange(60, 171, 5):
            mv = me & (v < v_max)
            for t_min in (0, 2, 4, 6, 8, 10, 12):
                pred = mv & (t > t_min)
                tp = np.count_nonzero(pred & y)
                if tp == 0:
                    continue
                prec, rec = tp / np.count_nonzero(pred), tp / np.count_nonzero(y)
                b2 = p["beta"] ** 2
                fb = (1 + b2) * prec * rec / (b2 * prec + rec)
                if fb > best[0]:
                    best = (fb, (float(e_min), float(v_max), float(t_min), prec, rec))
    fb, (e_min, v_max, t_min, prec, rec) = best
    f1 = 2 * prec * rec / (prec + rec)

    def classify(sel):
        m = (E > e_min) & (V < v_max) & (T > t_min) & sel
        m = ndimage.binary_opening(m)
        lab, n = ndimage.label(m)
        if n:
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            m = np.isin(lab, 1 + np.flatnonzero(sizes >= p["min_patch_m2"]))
        return m

    # heights: lidar median per metre in from the classifier's canopy edge
    cm = classify(covered & ~water)
    dist = ndimage.distance_transform_edt(cm)
    sel = cm & (chm > 0.5)
    bins = np.clip(np.floor(dist[sel]).astype(int), 1, 12)
    hs = chm[sel]
    model = {}
    for b in range(1, 13):
        hb = hs[bins == b]
        if hb.size >= 50:
            model[b] = float(np.median(hb))
    if not model:
        return chm, {"filled_cells": 0, "note": "no canopy on the lidar part to learn heights from; nothing filled"}, None
    xs = np.array(sorted(model))
    ys = np.maximum.accumulate(np.array([model[b] for b in xs]))

    gm = classify(gap & ~water)
    gd = ndimage.distance_transform_edt(gm)
    fill = np.where(gm, np.interp(np.clip(gd, 1, xs[-1]), xs, ys), 0.0)
    out = chm.copy()
    out[gap] = fill[gap]
    report = {
        "uncovered_m2": int(gap.sum()),
        "filled_cells": int(gm.sum()),
        "classifier": {"e_min": round(e_min, 2), "v_max": v_max, "t_min": t_min,
                       "f1_on_lidar": round(f1, 3), "precision": round(prec, 3), "recall": round(rec, 3)},
        "height_by_metre_in": {int(b): round(float(h), 1) for b, h in zip(xs, ys)},
    }
    return out, report, gap

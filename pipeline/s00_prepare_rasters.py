"""Step 0: bring every input raster onto the world grid.

Writes (build/):
  dtm_1m.tif  bare earth, metres
  chm_1m.tif  canopy height above bare earth, metres (only when a canopy source exists)

Both are float64, 1 m pixels in the course EPSG with pixel edges on whole
metres, covering the world extent plus MARGIN m on every side. Steps s04 and
s05 read these instead of the raw downloads.

Canopy sources, first match wins (COURSE_BUILD.md 3.2):
  cfg.chm  a canopy height model raster
  cfg.dsm  a highest-hit surface raster; CHM = DSM - DTM
  cfg.laz  lidar point clouds; CHM = highest vegetation return per 1 m cell - DTM
           (classes in cfg.laz.classes, default 3, 4, 5)
  none     s05 falls back to OSM woods and tree points (lower fidelity)

A source raster that is already in the course EPSG at 1 m with pixel edges on
whole metres is copied cell for cell (no resampling), so a course built before
this step existed (Oswego Lake) rebuilds unchanged. Anything else is warped
with bilinear resampling.
"""
from __future__ import annotations

import glob
import json
import warnings

import numpy as np
import rasterio
from affine import Affine
from rasterio.crs import CRS
from rasterio.warp import Resampling, reproject

from common import FT, World, build_dir, course_dir, course_name_from_argv, load_config

warnings.filterwarnings("ignore")

MARGIN = 32  # metres of raster beyond the world on every side (s04's smoothing reaches 4 m)
VEG_CLASSES = (3, 4, 5)  # ASPRS low / medium / high vegetation


class Grid:
    def __init__(self, world: World):
        self.x0 = world.x0 - MARGIN
        self.y1 = world.y0 + world.height + MARGIN
        self.W = int(world.width) + 2 * MARGIN
        self.H = int(world.height) + 2 * MARGIN
        self.crs = CRS.from_epsg(world.epsg)
        self.transform = Affine(1.0, 0, self.x0, 0, -1.0, self.y1)


def _aligned_window(r, grid: Grid):
    """(row0, col0) of the grid inside raster r if it can be copied cell for cell, else None."""
    t = r.transform
    if r.crs is None or r.crs.to_epsg() != grid.crs.to_epsg():
        return None
    if abs(t.a - 1.0) > 1e-9 or abs(t.e + 1.0) > 1e-9 or t.b or t.d:
        return None
    c0, r0 = grid.x0 - t.c, t.f - grid.y1
    if abs(c0 - round(c0)) > 1e-6 or abs(r0 - round(r0)) > 1e-6:
        return None
    c0, r0 = int(round(c0)), int(round(r0))
    if c0 < 0 or r0 < 0 or c0 + grid.W > r.width or r0 + grid.H > r.height:
        return None
    return r0, c0


def load_on_grid(path, units: str, grid: Grid) -> tuple[np.ndarray, str]:
    """Raster -> float64 metres on the grid; returns (array, how)."""
    with rasterio.open(path) as r:
        win = _aligned_window(r, grid)
        if win is not None:
            r0, c0 = win
            a = r.read(1).astype(np.float64)[r0:r0 + grid.H, c0:c0 + grid.W]
            if r.nodata is not None:
                a[a == r.nodata] = np.nan
            how = "copied (already on the grid)"
        else:
            src = r.read(1).astype(np.float64)
            nod = r.nodata
            if nod is not None:
                src[src == nod] = np.nan
            a = np.full((grid.H, grid.W), np.nan)
            reproject(src, a, src_transform=r.transform, src_crs=r.crs, src_nodata=np.nan,
                      dst_transform=grid.transform, dst_crs=grid.crs, dst_nodata=np.nan,
                      resampling=Resampling.bilinear)
            how = f"warped from {r.crs.to_string()} at {r.res[0]:g} m (bilinear)"
    if units == "ft":
        a *= FT
    return a, how


def laz_highest(paths, classes, grid: Grid) -> tuple[np.ndarray, dict]:
    """Highest return of the given classes per 1 m grid cell (NaN where none)."""
    import laspy
    from pyproj import Transformer
    zmax = np.full(grid.H * grid.W, -np.inf)
    n_all = np.zeros(grid.H * grid.W, np.float64)   # returns of these classes per cell
    n_last = np.zeros(grid.H * grid.W, np.float64)  # ... that were the last return of their pulse
    info = {"files": [], "points_used": 0, "points_read": 0, "classes_present": {}}
    for p in paths:
        with laspy.open(p) as f:
            crs = f.header.parse_crs()
            tf = None
            if crs is not None and CRS.from_user_input(crs.to_wkt()).to_epsg() != grid.crs.to_epsg():
                tf = Transformer.from_crs(crs, grid.crs.to_wkt(), always_xy=True)
            info["files"].append({"file": str(p).split("/")[-1], "crs": crs.to_string() if crs else None,
                                  "points": int(f.header.point_count)})
            for chunk in f.chunk_iterator(5_000_000):
                cls = np.asarray(chunk.classification)
                for c, k in zip(*np.unique(cls, return_counts=True)):
                    info["classes_present"][int(c)] = info["classes_present"].get(int(c), 0) + int(k)
                info["points_read"] += len(cls)
                keep = np.isin(cls, classes)
                if not keep.any():
                    continue
                x, y, z = np.asarray(chunk.x)[keep], np.asarray(chunk.y)[keep], np.asarray(chunk.z)[keep]
                is_last = (np.asarray(chunk.return_number) == np.asarray(chunk.number_of_returns))[keep]
                if tf is not None:
                    x, y = tf.transform(x, y)
                col = np.floor(x - grid.x0).astype(np.int64)
                row = np.floor(grid.y1 - y).astype(np.int64)
                ok = (col >= 0) & (col < grid.W) & (row >= 0) & (row < grid.H)
                np.maximum.at(zmax, row[ok] * grid.W + col[ok], z[ok])
                cell = row[ok] * grid.W + col[ok]
                n_all += np.bincount(cell, minlength=grid.H * grid.W)
                n_last += np.bincount(cell, weights=is_last[ok].astype(np.float64), minlength=grid.H * grid.W)
                info["points_used"] += int(ok.sum())
    zmax = zmax.reshape(grid.H, grid.W)
    zmax[~np.isfinite(zmax)] = np.nan
    return zmax, (n_all.reshape(grid.H, grid.W), n_last.reshape(grid.H, grid.W)), info


def write(path, a: np.ndarray, grid: Grid, desc: str):
    with rasterio.open(path, "w", driver="GTiff", width=grid.W, height=grid.H, count=1, dtype="float64",
                       crs=grid.crs, transform=grid.transform, nodata=np.nan, compress="deflate") as d:
        d.write(a, 1)
        d.update_tags(DESCRIPTION=desc)


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    cdir, bdir = course_dir(name), build_dir(name)
    grid = Grid(world)
    report = {"grid": {"x0": grid.x0, "y1": grid.y1, "width": grid.W, "height": grid.H, "epsg": world.epsg, "margin_m": MARGIN}}

    dtm, how = load_on_grid(cdir / cfg["dtm"]["path"], cfg["dtm"]["units"], grid)
    holes = int(np.isnan(dtm).sum())
    report["dtm"] = {"how": how, "nodata_cells": holes, "min": float(np.nanmin(dtm)), "max": float(np.nanmax(dtm))}
    if holes:
        raise SystemExit(f"[s00] DTM has {holes} nodata cells over the world extent + {MARGIN} m; get a raster that covers it")
    write(bdir / "dtm_1m.tif", dtm, grid, "bare earth, metres")

    chm, src = None, "none"
    if cfg.get("chm"):
        chm, how = load_on_grid(cdir / cfg["chm"]["path"], cfg["chm"]["units"], grid)
        src = f"chm raster ({how})"
    elif cfg.get("dsm"):
        dsm, how = load_on_grid(cdir / cfg["dsm"]["path"], cfg["dsm"]["units"], grid)
        chm = dsm - dtm
        src = f"dsm - dtm ({how})"
    elif cfg.get("laz"):
        paths = sorted(p for pat in cfg["laz"]["paths"] for p in glob.glob(str(cdir / pat)))
        if not paths:
            raise SystemExit(f"[s00] no LAZ files match {cfg['laz']['paths']}")
        classes = tuple(cfg["laz"].get("classes", VEG_CLASSES))
        top, (n_all, n_last), info = laz_highest(paths, classes, grid)
        # Vegetation returns per cell and how many ended their pulse. With leaf-off lidar a
        # needle-leaved crown stops many pulses (the crown holds their last return), while bare
        # deciduous branches let nearly all of them through to the ground. s05 uses the share.
        write(bdir / "veg_returns_1m.tif", n_all, grid, "vegetation returns per 1 m cell")
        write(bdir / "veg_last_1m.tif", n_last, grid, "vegetation returns that were the last of their pulse, per 1 m cell")
        info["leaf_off"] = bool(cfg["laz"].get("leaf_off", False))
        if cfg["laz"].get("units", "m") == "ft":
            top *= FT
        chm = np.where(np.isnan(top), 0.0, top - dtm)
        report["laz"] = info
        report["laz"]["classes_used"] = list(classes)
        report["laz"]["cells_with_returns"] = int((~np.isnan(top)).sum())
        src = f"lidar points, highest return of classes {list(classes)} per 1 m cell - dtm"
    if chm is not None:
        chm = np.where(np.isnan(chm), 0.0, chm)
        write(bdir / "chm_1m.tif", chm, grid, "canopy height above bare earth, metres")
        report["chm"] = {"source": src, "max": float(chm.max()), "cells_over_4m": int((chm > 4).sum())}
    else:
        (bdir / "chm_1m.tif").unlink(missing_ok=True)
        report["chm"] = {"source": "none: s05 uses the OSM fallback"}
    (bdir / "rasters_report.json").write_text(json.dumps(report, indent=1) + "\n")
    print(f"[s00] grid {grid.W}x{grid.H} m at ({grid.x0:.0f}, {grid.y1:.0f}) EPSG:{world.epsg}; "
          f"dtm {report['dtm']['how']}, {report['dtm']['min']:.1f}..{report['dtm']['max']:.1f} m; canopy: {report['chm']['source']}")


if __name__ == "__main__":
    main()

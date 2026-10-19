"""Steps 6-7: bare-earth heightmap.

Bare-earth DTM on the world grid (build/dtm_1m.tif from s00, metres) ->
light smoothing, sampled on the 1 m world grid (vertices at whole metres,
(W+1) x (H+1)). Water bodies
are flattened, tee boxes are levelled. Greens are NOT shaped here: their
analytic model (s07) is blended in at runtime and when rendering, so the
engine and the art always agree.

Outputs (build/):
  heightmap.png   16-bit greyscale, row 0 = north edge  (spec format)
  heightmap.json  resolution, extent, min/max elevation
  height_base.npy float32 array [rows=y (south->north), cols=x]
"""
from __future__ import annotations

import warnings

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image
from rasterio.features import rasterize
from scipy import ndimage

from common import FT, World, build_dir, course_name_from_argv, load_config, write_json

warnings.filterwarnings("ignore")


def load_raster_m(path, units):
    with rasterio.open(path) as r:
        a = r.read(1).astype(np.float64)
        t = r.transform
    if units == "ft":
        a *= FT
    return a, t


def sample_grid(a, t, xs, ys, order=1):
    """Sample raster a (with affine t) at UTM coords (xs, ys) arrays."""
    inv = ~t
    cols, rows = inv * (xs, ys)
    # pixel centres are at +0.5 in rasterio's pixel space
    return ndimage.map_coordinates(a, [rows - 0.5, cols - 0.5], order=order, mode="nearest")


def mask_from(geoms, world: World, res=1.0):
    """Rasterise local-metre geometries on the 1 m vertex grid (rows south->north)."""
    from affine import Affine
    W, H = int(world.width) + 1, int(world.height) + 1
    # vertex (i, j) at local (i, j): treat it as a pixel centred there
    tr = Affine(res, 0, -0.5 * res, 0, res, -0.5 * res)
    if not geoms:
        return np.zeros((H, W), bool)
    m = rasterize([(g, 1) for g in geoms], out_shape=(H, W), transform=tr, fill=0, dtype="uint8")
    return m.astype(bool)  # row j == local y = j (south->north because transform has +res)


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    dtm, t = load_raster_m(build_dir(name) / "dtm_1m.tif", "m")  # s00: metres on the world grid
    dtm_s = ndimage.gaussian_filter(dtm, 1.0)
    W, H = int(world.width) + 1, int(world.height) + 1
    jj, ii = np.mgrid[0:H, 0:W]
    xs = world.x0 + ii.astype(np.float64)
    ys = world.y0 + jj.astype(np.float64)
    z = sample_grid(dtm_s, t, xs, ys)
    raw = sample_grid(dtm, t, xs, ys)

    g = gpd.read_file(build_dir(name) / "course_local.geojson")
    # Lake (off-course): flat low area connected to the raster minimum
    lake_max = float(cfg.get("lake_level_max_m", -1e9))
    lake = raw < lake_max
    if lake.any():
        lab, n = ndimage.label(lake)
        sizes = ndimage.sum(lake, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.where(sizes > 2000)[0])
        lake = ndimage.binary_opening(keep, iterations=2)
        lake = ndimage.binary_fill_holes(lake)
        z[lake] = float(np.percentile(raw[lake], 5))
    # Ponds / pools: flatten to the 10th percentile of their footprint
    water = g[g.kind.isin(["lateral_water_hazard", "water_hazard", "water", "pool"])]
    for geom in water.geometry:
        m = mask_from([geom], world)
        if m.sum() < 3:
            continue
        lvl = float(np.percentile(z[m], 10))
        mm = ndimage.binary_dilation(m, iterations=1)
        z[mm] = np.minimum(z[mm], lvl)
        z[m] = lvl
    # Level tee boxes (blend 2 m)
    for geom in g[g.kind == "tee"].geometry:
        m = mask_from([geom], world)
        if m.sum() < 3:
            continue
        lvl = float(np.median(z[m]))
        d = ndimage.distance_transform_edt(~m)
        w = np.clip(1.0 - d / 2.0, 0, 1)
        sel = w > 0
        z[sel] = z[sel] * (1 - w[sel]) + lvl * w[sel]

    zmin, zmax = float(z.min()), float(z.max())
    q = np.round((z - zmin) / (zmax - zmin) * 65535).astype(np.uint16)
    bdir = build_dir(name)
    np.save(bdir / "height_base.npy", z.astype(np.float32))
    np.save(bdir / "lake_mask.npy", lake)
    Image.fromarray(np.flipud(q), mode="I;16").save(bdir / "heightmap.png")
    meta = {
        "resolution_m": 1.0,
        "cols": W, "rows": H,
        "extent_local": [0, 0, world.width, world.height],
        "extent_utm": [world.x0, world.y0, world.x0 + world.width, world.y0 + world.height],
        "epsg": world.epsg,
        "min_elev_m": round(zmin, 3), "max_elev_m": round(zmax, 3),
        "encoding": "uint16 linear between min and max; heightmap.png row 0 is the north edge",
        "source": cfg["dtm"]["source"],
        "processing": ("feet->m, " if cfg["dtm"]["units"] == "ft" else "") + "gaussian sigma 1 m, water flattened, tees levelled (2 m blend); greens shaped at runtime (s07)",
    }
    write_json(bdir / "heightmap.json", meta, indent=1)
    # quick slope report on playing surfaces
    gy, gx = np.gradient(z)
    slope = np.hypot(gx, gy) * 100
    for kind in ("fairway", "green", "tee"):
        m = mask_from(list(g[g.kind == kind].geometry), world)
        print(f"[s04] {kind:8s} slope % p50 {np.percentile(slope[m], 50):5.1f}  p90 {np.percentile(slope[m], 90):5.1f}  p99 {np.percentile(slope[m], 99):5.1f}")
    print(f"[s04] heightmap {W}x{H} @1 m, elev {zmin:.1f}..{zmax:.1f} m, lake cells {int(lake.sum())}")


if __name__ == "__main__":
    main()

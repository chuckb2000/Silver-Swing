"""Helper (not a pipeline step): cut a large downloaded raster down to the
area a course needs, keeping its CRS and pixel grid (no resampling).

    python3 clip_raster.py SRC DST --epsg 32618 --bbox x0 y0 x1 y1 [--margin 100]

The bbox is in the course EPSG (normally the world extent); it is grown by
--margin metres, transformed to the source CRS and snapped outward to whole
source pixels. Values are written as float32 (deflate, floating-point
predictor) with the source nodata. Used for East Potomac, whose DC-wide 1 m
rasters (~550 MB each) are archived as GitHub release assets; the clips are
what `make course` reads.
"""
from __future__ import annotations

import argparse
import math

import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import Window


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--epsg", type=int, required=True)
    ap.add_argument("--bbox", type=float, nargs=4, required=True, metavar=("X0", "Y0", "X1", "Y1"))
    ap.add_argument("--margin", type=float, default=100.0)
    a = ap.parse_args()
    x0, y0, x1, y1 = a.bbox
    m = a.margin
    with rasterio.open(a.src) as r:
        b = transform_bounds(f"EPSG:{a.epsg}", r.crs, x0 - m, y0 - m, x1 + m, y1 + m, densify_pts=41)
        inv = ~r.transform
        c0, r0 = inv * (b[0], b[3])
        c1, r1 = inv * (b[2], b[1])
        c0, r0 = max(0, math.floor(c0)), max(0, math.floor(r0))
        c1, r1 = min(r.width, math.ceil(c1)), min(r.height, math.ceil(r1))
        win = Window(c0, r0, c1 - c0, r1 - r0)
        data = r.read(1, window=win).astype(np.float32)
        prof = r.profile.copy()
        prof.update(width=win.width, height=win.height, transform=r.window_transform(win), dtype="float32",
                    compress="deflate", predictor=3, tiled=True, blockxsize=256, blockysize=256, zlevel=9)
        with rasterio.open(a.dst, "w", **prof) as d:
            d.write(data, 1)
            d.update_tags(CLIPPED_FROM=a.src.split("/")[-1], CLIP_BBOX=f"EPSG:{a.epsg} {x0} {y0} {x1} {y1} +{m} m")
    print(f"[clip] {a.src} -> {a.dst}: window cols {c0}-{c1}, rows {r0}-{r1} ({win.width}x{win.height} px)")


if __name__ == "__main__":
    main()

"""Bare earth for Sankaty Head (course-chat helper; run by `make fetch`).

    python3 data/sankaty_head/make_dem.py <x41y457.tif> <x41y458.tif>  ->  raw/dem_3dep_2013_1m.tif

The two USGS 3DEP 1 m DEM tiles of project MA_NE_CMGP_Sandy_Z19_2013 (EPSG:26919, NAVD88
metres) meet at northing 4,570,000, across the middle of the course. This mosaics them, cuts
the mosaic to the world + 100 m (course_config.json) and stores it with DEFLATE + floating-point
predictor, small enough to commit.
"""
import json
import sys
from pathlib import Path

import rasterio
from rasterio.merge import merge

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
m = 100
bounds = (w["x0"] - m, w["y0"] - m, w["x0"] + w["width"] + m, w["y0"] + w["height"] + m)
srcs = [rasterio.open(p) for p in sys.argv[1:3]]
arr, tr = merge(srcs, bounds=bounds, res=1.0, nodata=-9999.0)
prof = srcs[0].profile.copy()
prof.update(height=arr.shape[1], width=arr.shape[2], transform=tr, compress="deflate", predictor=3, nodata=-9999.0,
            tiled=True, blockxsize=256, blockysize=256, driver="GTiff", count=1)
out = HERE / "raw" / "dem_3dep_2013_1m.tif"
with rasterio.open(out, "w", **prof) as d:
    d.write(arr[:1])
print(out, arr.shape, srcs[0].crs, out.stat().st_size // 1024, "KB")

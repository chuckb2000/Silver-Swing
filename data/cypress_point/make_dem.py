"""Store the 3DEP DEM export losslessly compressed (course-chat helper; run by `make fetch`).

    python3 data/cypress_point/make_dem.py <exportImage.tiff>  ->  raw/usgs_dem_1m.tif

The export is already the world + 100 m at 1 m in EPSG:26910 (NAVD88 metres); this only
rewrites it with DEFLATE + floating-point predictor so it is small enough to commit.
"""
import sys
from pathlib import Path

import rasterio

out = Path(__file__).resolve().parent / "raw" / "usgs_dem_1m.tif"
with rasterio.open(sys.argv[1]) as s:
    prof = s.profile.copy()
    prof.update(compress="deflate", predictor=3, tiled=True, blockxsize=256, blockysize=256)
    with rasterio.open(out, "w", **prof) as d:
        d.write(s.read())
print(out, out.stat().st_size // 1024, "KB")

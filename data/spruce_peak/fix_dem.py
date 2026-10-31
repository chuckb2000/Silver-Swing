"""Spruce Peak: the VCGI lidar DEM export with its pits filled.

The 1 m export of the VCGI DEM image service (release asset spruce_peak_vcgi_dem_1m.tif) has
three small pits by the 11th green / 12th tee (rows 837-852, cols 479-504 of the export, about
local (420-440, 1123-1133)), 100-160 m below the ground around them (352-407 m against ~510 m):
voids in the service's mosaic, not ground. Read as they are, they would be holes in the
heightmap and, under the DSM, three "trees" 100-158 m tall. Every cell more than 8 m from the
median of its 9 x 9 neighbourhood is replaced by that median (45 cells; the rest of the
raster is unchanged, which this script checks).

    python3 data/spruce_peak/fix_dem.py SRC.tif     # -> data/spruce_peak/raw/vcgi_dem_1m.tif
"""
import sys
from pathlib import Path

import numpy as np
import rasterio
from scipy import ndimage

OUT = Path(__file__).resolve().parent / "raw" / "vcgi_dem_1m.tif"
THRESH_M = 8.0


def main():
    with rasterio.open(sys.argv[1]) as r:
        a = r.read(1)
        prof = r.profile
    med = ndimage.median_filter(a, size=9)
    bad = np.abs(a - med) > THRESH_M
    if bad.sum() > 200:
        raise SystemExit(f"[fix_dem] {bad.sum()} cells off their median: not the known pits, look first")
    out = np.where(bad, med, a).astype(np.float32)
    prof.update(compress="deflate", predictor=3, tiled=False)
    OUT.parent.mkdir(exist_ok=True)
    with rasterio.open(OUT, "w", **prof) as w:
        w.write(out, 1)
    print(f"[fix_dem] {int(bad.sum())} pit cells filled -> {OUT.relative_to(OUT.parents[2])}")


if __name__ == "__main__":
    main()

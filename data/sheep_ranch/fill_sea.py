"""Fill the sea in the shared DOGAMI DTM for Sheep Ranch (run by
`make fetch NAME=sheep_ranch` through release.json; output raw/dogami_dtm_ft.tif).

    python3 data/sheep_ranch/fill_sea.py <shared DTM .tif>

The DOGAMI 2009 South Coast lidar has no data over the ocean (it is not
hydro-flattened). Sheep Ranch sits on a headland, and its world box (+ s00's
32 m margin) reaches about 667 cells of open sea at its north-west corner, so
s00 stops. The nodata cells joined to the raster's west edge are the sea: they
get the median height of the valid cells along their edge (the water line in
the survey), which s04 then flattens with the rest of the sea
(`lake_level_max_m`). Nodata anywhere else is left alone. Pacific Dunes and Old
Macdonald use the raster as downloaded (their worlds hold no nodata).
"""
import sys
from pathlib import Path

import numpy as np
import rasterio
from scipy import ndimage

HERE = Path(__file__).resolve().parent


def main(src_path):
    with rasterio.open(src_path) as src:
        prof = src.profile.copy()
        a = src.read(1)
        nd = src.nodata
    hole = a == nd
    lab, _ = ndimage.label(hole)
    sea_labels = np.unique(lab[:, 0][lab[:, 0] > 0])
    sea = np.isin(lab, sea_labels)
    shore = ndimage.binary_dilation(sea) & ~hole
    level = float(np.median(a[shore]))
    out = a.copy()
    out[sea] = level
    dst = HERE / "raw" / "dogami_dtm_ft.tif"
    dst.parent.mkdir(exist_ok=True)
    with rasterio.open(dst, "w", **prof) as d:
        d.write(out, 1)
    print(f"[fill_sea] {dst}: {int(sea.sum())} sea cells set to {level:.2f} ft (median of the water line); "
          f"{int((hole & ~sea).sum())} other nodata cells left")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])

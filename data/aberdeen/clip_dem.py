"""One-off helper (not a `make course` step): mosaic the two USGS 3DEP 1 m DEM
tiles that cover The Course at Aberdeen and clip them to the world extent + 100 m, keeping
the source CRS (the tiles' own CRS) and pixel grid (no resampling).

    python3 data/aberdeen/clip_dem.py

Reads  data/aberdeen/incoming/USGS_1M_16_x4{8,9}y459_IN_Indiana_Statewide_LiDAR_2017_B17.tif
       (10 km tiles, ~310 MB each; fetched by the GitHub Actions workflow into the release
       `data-aberdeen`, not in git; `remote_fetch.py pull aberdeen <tile>` puts them in incoming/)
Writes data/aberdeen/raw/usgs_dem_2017_1m_clip.tif (committed; what s00 reads)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.warp import transform_bounds

HERE = Path(__file__).resolve().parent
TILES = ["USGS_1M_16_x48y459_IN_Indiana_Statewide_LiDAR_2017_B17.tif",
         "USGS_1M_16_x49y459_IN_Indiana_Statewide_LiDAR_2017_B17.tif"]
MARGIN = 100.0


def main():
    cfg = json.loads((HERE / "course_config.json").read_text())
    w = cfg["world"]
    srcs = [rasterio.open(HERE / "incoming" / t) for t in TILES]
    b = transform_bounds(f"EPSG:{cfg['epsg']}", srcs[0].crs,
                         w["x0"] - MARGIN, w["y0"] - MARGIN,
                         w["x0"] + w["width"] + MARGIN, w["y0"] + w["height"] + MARGIN,
                         densify_pts=41)
    # snap outward to whole source pixels of the first tile's grid
    t0 = srcs[0].transform
    ox, oy = t0.c, t0.f
    x0 = ox + np.floor((b[0] - ox) / t0.a) * t0.a
    x1 = ox + np.ceil((b[2] - ox) / t0.a) * t0.a
    y1 = oy - np.floor((oy - b[3]) / -t0.e) * -t0.e
    y0 = oy - np.ceil((oy - b[1]) / -t0.e) * -t0.e
    arr, tr = merge(srcs, bounds=(x0, y0, x1, y1), res=(t0.a, -t0.e), nodata=srcs[0].nodata)
    prof = srcs[0].profile.copy()
    prof.update(driver="GTiff", height=arr.shape[1], width=arr.shape[2], transform=tr,
                compress="deflate", predictor=3, tiled=True, blockxsize=256, blockysize=256,
                dtype="float32", BIGTIFF="NO")
    out = HERE / "raw" / "usgs_dem_2017_1m_clip.tif"
    with rasterio.open(out, "w", **prof) as dst:
        dst.write(arr.astype("float32"))
    nod = int((arr == srcs[0].nodata).sum())
    print(f"{out.name}: {arr.shape[2]} x {arr.shape[1]} px, nodata cells {nod}, "
          f"{np.nanmin(np.where(arr == srcs[0].nodata, np.nan, arr)):.2f}.."
          f"{np.nanmax(np.where(arr == srcs[0].nodata, np.nan, arr)):.2f} m")


if __name__ == "__main__":
    main()

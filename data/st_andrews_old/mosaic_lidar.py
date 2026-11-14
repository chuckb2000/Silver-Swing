"""Mosaic and clip the Scottish lidar tiles for the Old Course (course-chat helper,
run by release.json, not a make step).

    python3 data/st_andrews_old/mosaic_lidar.py dtm data/st_andrews_old/incoming/NO41NE_50CM_DTM_PHASE5.tif NO51NW_50CM_DTM_PHASE5.tif
    python3 data/st_andrews_old/mosaic_lidar.py dsm ... (the DSM tiles)

The course straddles the NO41 / NO51 line (easting 350,000 in the British National
Grid), so two 5 km tiles of the Scottish Public Sector LiDAR Phase 5 (50 cm, EPSG:27700)
are needed. pipeline/intake.py raster clips one source, so this merges the tiles
(they share one pixel grid) over the world + 100 m (as intake.py does) and writes
raw/<kind>_clip.tif in the tiles' own CRS and grid (s00 reprojects). Values float32,
the source nodata kept, deflate with the floating-point predictor.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.warp import transform_bounds

HERE = Path(__file__).resolve().parent
MARGIN = 100.0


def main(kind: str, srcs: list[str]):
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    x0, y0 = w["x0"] - MARGIN, w["y0"] - MARGIN
    x1, y1 = w["x0"] + w["width"] + MARGIN, w["y0"] + w["height"] + MARGIN
    files = [rasterio.open(s) for s in srcs]
    crs = files[0].crs
    b = transform_bounds(f"EPSG:{cfg['epsg']}", crs, x0, y0, x1, y1, densify_pts=41)
    res = files[0].res[0]
    b = (np.floor(b[0] / res) * res, np.floor(b[1] / res) * res, np.ceil(b[2] / res) * res, np.ceil(b[3] / res) * res)
    nod = files[0].nodata
    arr, tr = merge(files, bounds=b, nodata=nod, dtype="float32")
    prof = files[0].profile.copy()
    prof.update(driver="GTiff", height=arr.shape[1], width=arr.shape[2], transform=tr, count=1,
                dtype="float32", nodata=nod, compress="deflate", predictor=3, tiled=True,
                blockxsize=256, blockysize=256, BIGTIFF="NO")
    for k in ("photometric", "interleave"):
        prof.pop(k, None)
    out = HERE / "raw" / f"{kind}_clip.tif"
    out.parent.mkdir(exist_ok=True)
    with rasterio.open(out, "w", **prof) as d:
        d.write(arr[0], 1)
        d.update_tags(SOURCE=", ".join(Path(s).name for s in srcs), CLIP="world + 100 m, data/st_andrews_old/mosaic_lidar.py")
    a = arr[0]
    valid = a != nod if nod is not None else np.isfinite(a)
    print(f"[mosaic] {out.relative_to(HERE.parent.parent)}: {a.shape[1]} x {a.shape[0]} px at {res} m, "
          f"{valid.mean() * 100:.1f} % valid, {a[valid].min():.2f} to {a[valid].max():.2f} m")


if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[1] not in ("dtm", "dsm"):
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])

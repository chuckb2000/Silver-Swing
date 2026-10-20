"""Mosaic the two OSIP 2024 halves onto the Waverley world grid (course-chat tool,
not a `make course` step; the output is committed as raw/osip2024_032m.tif).

    python3 data/waverley/make_ortho.py <south.tif> <north.tif>

Inputs: the developer's exportImage downloads from the GitHub release
waverley-data (`_ags_0230fb21...tif` = south half, `_ags_bc54798d...tif` =
north half; SHA-256 in DATA_REQUEST.md). Both are EPSG:32610, 0.3048 m, 4 bands
(R, G, B, near-infrared). Output: R, G, B only, resampled bilinearly to 0.32 m
on the world extent from course_config.json (4000 x 5600 px), JPEG-compressed
GeoTIFF, as Indian Island's raw/nys_ortho_032m.tif.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

HERE = Path(__file__).resolve().parent
RES = 0.32


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    srcs = [rasterio.open(p) for p in sys.argv[1:3]]
    mos, tr = merge(srcs, indexes=[1, 2, 3])
    W, H = int(round(w["width"] / RES)), int(round(w["height"] / RES))
    dst_tr = from_origin(w["x0"], w["y0"] + w["height"], RES, RES)
    out = np.zeros((3, H, W), np.uint8)
    for b in range(3):
        reproject(mos[b], out[b], src_transform=tr, src_crs=srcs[0].crs, dst_transform=dst_tr,
                  dst_crs=f"EPSG:{cfg['epsg']}", resampling=Resampling.bilinear)
    prof = dict(driver="GTiff", width=W, height=H, count=3, dtype="uint8", crs=f"EPSG:{cfg['epsg']}",
                transform=dst_tr, compress="JPEG", jpeg_quality=90, photometric="YCBCR", tiled=True,
                blockxsize=512, blockysize=512)
    dst = HERE / "raw" / "osip2024_032m.tif"
    with rasterio.open(dst, "w", **prof) as d:
        d.write(out)
    print(f"[ortho] {dst} {W}x{H} at {RES} m, {dst.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()

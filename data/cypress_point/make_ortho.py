"""Mosaic the two NAIP halves onto the world grid (course-chat helper; run by `make fetch`).

    python3 data/cypress_point/make_ortho.py <west.jpg> <east.jpg>  ->  raw/naip_05m.tif

The halves came from the USGS NAIP ImageServer `exportImage` (JPEG, no georeferencing) with
these boxes in EPSG:32610 (DATA_REQUEST.md): west 591231-592355 E, east 592355-593479 E, both
4047906-4049386 N, 2248 x 2960 px (0.5 m). The bbox in the request fixes each image's corners
(COURSE_LESSONS.md 15). Output: the world + 100 m at 0.5 m, EPSG:32610, JPEG-compressed GeoTIFF.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
west, east = (np.asarray(Image.open(p).convert("RGB")) for p in sys.argv[1:3])
assert west.shape == east.shape == (2960, 2248, 3), (west.shape, east.shape)
img = np.concatenate([west, east], axis=1)
tr = from_origin(591231, 4049386, 0.5, 0.5)
out = HERE / "raw" / "naip_05m.tif"
with rasterio.open(out, "w", driver="GTiff", width=img.shape[1], height=img.shape[0], count=3, dtype="uint8",
                   crs="EPSG:32610", transform=tr, compress="JPEG", jpeg_quality=90, photometric="YCBCR",
                   tiled=True, blockxsize=512, blockysize=512) as d:
    d.write(np.moveaxis(img, 2, 0))
print(f"{out}: {img.shape[1]} x {img.shape[0]} px, 0.5 m")

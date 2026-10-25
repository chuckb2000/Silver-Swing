"""OSIP 2024 orthophoto (exportImage JPEG, 2448 x 2960 px, 0.5 m) -> raw/osip2024_05m.jpg
(a copy) and raw/osip2024_05m.tif (georeferenced).

The JPEG carries no georeferencing; its corners are the request's bbox
(EPSG:32610, x 508813-510037, y 5057547-5059027; DATA_REQUEST.md), so the
transform is set from it. Run by `make fetch` (release.json):

    python3 data/wildwood/make_ortho.py <exportImage.jpg>
"""
import shutil
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_bounds

BBOX = (508813, 5057547, 510037, 5059027)
OUT = Path(__file__).resolve().parent / "raw" / "osip2024_05m.tif"

im = np.asarray(Image.open(sys.argv[1]).convert("RGB"))
h, w, _ = im.shape
assert (w, h) == (2448, 2960), (w, h)
with rasterio.open(OUT, "w", driver="GTiff", width=w, height=h, count=3, dtype="uint8",
                   crs="EPSG:32610", transform=from_bounds(*BBOX, w, h),
                   compress="jpeg", jpeg_quality=92, photometric="YCBCR", tiled=True) as dst:
    for b in range(3):
        dst.write(im[..., b], b + 1)
shutil.copyfile(sys.argv[1], OUT.with_suffix(".jpg"))
print(f"[make_ortho] {OUT.name}: {w} x {h} px, 0.5 m, EPSG:32610")

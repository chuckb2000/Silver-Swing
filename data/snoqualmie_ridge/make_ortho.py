"""TPC Snoqualmie Ridge (course chat 2026-11-13): the four NAIP exports have slightly different
pixel sizes (0.6000 and 0.6006 m: their boxes don't divide evenly into the requested image
sizes), which `intake.py ortho` refuses. This places each by its request box and resamples
them onto one 0.6 m grid (EPSG:32610, nearest neighbour), cut to the world + 100 m, and
writes raw/naip.tif. Same inputs, same file.

    python3 data/snoqualmie_ridge/make_ortho.py IMG x0 y0 x1 y1 [IMG x0 y0 x1 y1 ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

D = Path(__file__).resolve().parent
cfg = json.load(open(D / "course_config.json"))
w = cfg["world"]
RES = 0.6
X0, Y0 = w["x0"] - 100, w["y0"] - 100
X1, Y1 = w["x0"] + w["width"] + 100, w["y0"] + w["height"] + 100
W, H = int(round((X1 - X0) / RES)), int(round((Y1 - Y0) / RES))
dst_t = from_origin(X0, Y1, RES, RES)
out = np.zeros((3, H, W), np.uint8)
a = sys.argv[1:]
for k in range(0, len(a), 5):
    im = np.asarray(Image.open(a[k]).convert("RGB"))
    x0, y0, x1, y1 = map(float, a[k + 1:k + 5])
    t = from_origin(x0, y1, (x1 - x0) / im.shape[1], (y1 - y0) / im.shape[0])
    for b in range(3):
        band = np.zeros((H, W), np.uint8)
        reproject(im[..., b], band, src_transform=t, src_crs=cfg["epsg"], dst_transform=dst_t,
                  dst_crs=cfg["epsg"], resampling=Resampling.nearest, src_nodata=None, dst_nodata=0)
        fill = band > 0
        out[b][fill] = band[fill]
with rasterio.open(D / "raw" / "naip.tif", "w", driver="GTiff", width=W, height=H, count=3, dtype="uint8",
                   crs=f"EPSG:{cfg['epsg']}", transform=dst_t, compress="deflate") as f:
    f.write(out)
print(f"[make_ortho] raw/naip.tif {W} x {H} px at {RES} m")

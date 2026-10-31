"""MassGIS 2023 orthophoto (15 cm, leaf-off, JPEG 2000 tiles in zips) -> build/ortho_massgis2023_05m.tif (review only):
the world + 100 m at 0.5 m in EPSG:32619, RGB. Usage (release.json run line with all four zips:
the mosaic is rewritten from every zip present in incoming/):
    python3 data/cyprian_keyes/make_ortho.py ZIP [ZIP ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject

C = Path(__file__).resolve().parent
cfg = json.load(open(C / "course_config.json"))
w = cfg["world"]
x0, y0, x1, y1 = w["x0"] - 100, w["y0"] - 100, w["x0"] + w["width"] + 100, w["y0"] + w["height"] + 100
res = 0.5
W, H = int((x1 - x0) / res), int((y1 - y0) / res)
dst_t = from_origin(x0, y1, res, res)
out = np.zeros((3, H, W), np.uint8)
for z in sys.argv[1:]:
    name = Path(z).name[:-4]
    with rasterio.open(f"/vsizip/{z}/{name}.jp2") as src:
        for b in range(3):
            band = np.zeros((H, W), np.float32)
            reproject(rasterio.band(src, b + 1), band, dst_transform=dst_t, dst_crs="EPSG:32619",
                      resampling=Resampling.average, src_nodata=0, dst_nodata=0)
            scale = 255.0 / 65535 if src.dtypes[b] == "uint16" else 1.0
            v = np.clip(band * scale, 0, 255).astype(np.uint8)
            out[b] = np.where(v > 0, v, out[b])
    print(f"[ortho] {name}")
dst = C / "build" / "ortho_massgis2023_05m.tif"  # review aid (tees, trees), not a build input: kept out of git
with rasterio.open(dst, "w", driver="GTiff", width=W, height=H, count=3, dtype="uint8", crs="EPSG:32619",
                   transform=dst_t, compress="deflate", tiled=True) as d:
    d.write(out)
print(f"[ortho] -> {dst} {W}x{H}")

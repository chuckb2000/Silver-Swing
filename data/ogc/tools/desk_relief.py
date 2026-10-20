"""Background for the tracing desk until an orthophoto is available: a lidar
relief picture on the world grid (EPSG:32610, 0.5 m), written to
build/desk_relief.tif (rebuildable; build/ is not committed).

Ground: a posterised hillshade of the bare-earth DTM (light from the north-west)
tinted green; canopy: the DOGAMI canopy height model (wires removed by s05,
build/chm_local.npy) drawn darker green with height. Mown turf, rough and paths
are not in lidar, so fairway edges show only where the ground is shaped or trees
line them.

    python3 data/ogc/tools/desk_relief.py        (after s05)
"""
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin
from scipy import ndimage

D = Path(__file__).resolve().parents[1]
cfg = json.load(open(D / "course_config.json"))
w = cfg["world"]
x0, y0, W, H = w["x0"], w["y0"], int(w["width"]), int(w["height"])
z = np.load(D / "build" / "height_base.npy")[:H, :W]          # rows south -> north, 1 m
chm = np.load(D / "build" / "chm_local.npy")[:H, :W]
gy, gx = np.gradient(ndimage.gaussian_filter(z, 1.0))
shade = np.clip(0.62 + (-gx + gy) * 0.9, 0.15, 1.0)         # NW light (y grows north)
ground = np.stack([0.55 * shade, 0.72 * shade, 0.45 * shade], -1)
c = np.clip(chm / 30.0, 0, 1)[..., None]
tree = np.array([0.10, 0.28, 0.14]) + (1 - c) * np.array([0.10, 0.12, 0.06])
rgb = np.where(chm[..., None] > 2.0, tree * (0.75 + 0.35 * shade[..., None]), ground)
rgb = np.flipud(np.clip(rgb * 255, 0, 255).astype(np.uint8))  # row 0 = north
rgb = np.kron(rgb, np.ones((2, 2, 1), np.uint8))               # 0.5 m pixels
out = D / "build" / "desk_relief.tif"
with rasterio.open(out, "w", driver="GTiff", width=W * 2, height=H * 2, count=3, dtype="uint8",
                   crs=f"EPSG:{cfg['epsg']}", transform=from_origin(x0, y0 + H, 0.5, 0.5),
                   compress="JPEG", photometric="YCBCR", tiled=True) as dst:
    dst.write(np.transpose(rgb, (2, 0, 1)))
print(f"[desk_relief] {out} {W * 2}x{H * 2} px")

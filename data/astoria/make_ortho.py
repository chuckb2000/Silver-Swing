"""Astoria: the OSIP 2024 photo as a GeoTIFF.

The developer's export (GitHub release astoria-data,
_ags_e53832b4_84fc_423d_9297_6414e722b2c3.jpg) is a 3200 x 3600 JPEG at 0.5 m of the
box x 427800-429400 / y 5105200-5107000 in EPSG:32610 (OSIP_2024_WM exportImage,
format=jpg); a JPEG carries no georeferencing, so its corners come from that request
box (as at Langdon Farms and the Muni). Writes raw/osip2024_05m.tif (JPEG-compressed
GeoTIFF), which s05 (trees_need_ortho) and the course scripts read.

    python3 data/astoria/make_ortho.py <jpg>      (run by make fetch, release.json)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
BOX = (427800.0, 5105200.0, 429400.0, 5107000.0)   # x0, y0, x1, y1 (EPSG:32610)
SIZE = (3200, 3600)                                # px (width, height) as requested


def main(src: str):
    im = np.asarray(Image.open(src).convert("RGB"))
    if (im.shape[1], im.shape[0]) != SIZE:
        raise SystemExit(f"expected {SIZE} px, got {im.shape[1]} x {im.shape[0]}")
    res = (BOX[2] - BOX[0]) / SIZE[0]
    dest = HERE / "raw" / "osip2024_05m.tif"
    with rasterio.open(dest, "w", driver="GTiff", width=SIZE[0], height=SIZE[1], count=3, dtype="uint8",
                       crs="EPSG:32610", transform=from_origin(BOX[0], BOX[3], res, res),
                       compress="JPEG", jpeg_quality=92, photometric="YCBCR", tiled=True) as dst:
        dst.write(np.moveaxis(im, 2, 0))
    print(f"[ortho] {dest.relative_to(HERE.parent.parent)}: {SIZE[0]} x {SIZE[1]} px at {res} m, "
          f"{dest.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1])

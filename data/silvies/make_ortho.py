"""Silvies: the OSIP 2024 photo as one GeoTIFF.

The developer's four exports (GitHub release silvies-data, OSIP_2024_WM exportImage,
format=jpg, 2550 x 2350 px each at 0.5 m) are the quarters of the box x 339750-342300 /
y 4879200-4881550 in EPSG:32611 (data/silvies/DATA_REQUEST.md item 3). A JPEG carries
no georeferencing, so each quarter's corners come from its request box (as at Astoria
and Langdon Farms). Which file is which quarter was settled by looking (2026-10-25): the
NW holds the irrigation pond by the Craddock 12th tee, the NE the US 395 bend over the
Silvies River, the SW Camp Creek and the barns, the SE the pond of the par-3 course.
Writes raw/osip2024_05m.tif (JPEG-compressed GeoTIFF, 5100 x 4700 px).

    python3 data/silvies/make_ortho.py NW=<jpg> NE=<jpg> SW=<jpg> SE=<jpg>   (run by make fetch)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
X0, Y0, X1, Y1 = 339750.0, 4879200.0, 342300.0, 4881550.0
Q = (2550, 2350)   # quarter size in px (width, height)
RES = 0.5


def main(args: list[str]):
    parts = dict(a.split("=", 1) for a in args)
    if set(parts) != {"NW", "NE", "SW", "SE"}:
        raise SystemExit("need NW=, NE=, SW=, SE=")
    W, H = 2 * Q[0], 2 * Q[1]
    out = np.zeros((H, W, 3), np.uint8)
    for k, (c, r) in {"NW": (0, 0), "NE": (1, 0), "SW": (0, 1), "SE": (1, 1)}.items():
        im = np.asarray(Image.open(parts[k]).convert("RGB"))
        if (im.shape[1], im.shape[0]) != Q:
            raise SystemExit(f"{k}: expected {Q} px, got {im.shape[1]} x {im.shape[0]}")
        out[r * Q[1]:(r + 1) * Q[1], c * Q[0]:(c + 1) * Q[0]] = im
    dest = HERE / "raw" / "osip2024_05m.tif"
    with rasterio.open(dest, "w", driver="GTiff", width=W, height=H, count=3, dtype="uint8",
                       crs="EPSG:32611", transform=from_origin(X0, Y1, RES, RES),
                       compress="JPEG", jpeg_quality=90, photometric="YCBCR", tiled=True) as dst:
        dst.write(np.moveaxis(out, 2, 0))
    print(f"[ortho] {dest.relative_to(HERE.parent.parent)}: {W} x {H} px at {RES} m, {dest.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1:])

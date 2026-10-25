"""Pumpkin Ridge: place the OSIP 2024 orthophoto JPEG on the map.

The developer's export (GitHub release pumpkin_ridge-data, exportImage.jpg) is a
3999 x 3999 JPEG of the request box x 497849-501848 / y 5049150-5053149 in
EPSG:32610 (1.0 m per pixel). A JPEG carries no georeferencing, but the bbox in
the request fixes its corners (COURSE_LESSONS.md 15). This writes the part over
the world + 100 m as a GeoTIFF the pipeline can read (`ortho` in course_config.json;
s05 trees_need_ortho and the fescue art read it). Run by `make fetch`
(release.json).

    python3 data/pumpkin_ridge/make_ortho.py <exportImage.jpg> raw/osip2024_1m.tif
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
BOX = (497849, 5049150, 501848, 5053149)   # request bbox (EPSG:32610), 3999 x 3999 px
MARGIN = 100


def main():
    src, dst = Path(sys.argv[1]), HERE / sys.argv[2]
    Image.MAX_IMAGE_PIXELS = None
    im = np.asarray(Image.open(src).convert("RGB"))
    h, w = im.shape[:2]
    res_x, res_y = (BOX[2] - BOX[0]) / w, (BOX[3] - BOX[1]) / h
    assert abs(res_x - 1) < 1e-9 and abs(res_y - 1) < 1e-9, (w, h)
    world = json.load(open(HERE / "course_config.json"))["world"]
    x0, y0 = world["x0"] - MARGIN, world["y0"] - MARGIN
    x1, y1 = world["x0"] + world["width"] + MARGIN, world["y0"] + world["height"] + MARGIN
    c0, c1 = int(x0 - BOX[0]), int(x1 - BOX[0])
    r0, r1 = int(BOX[3] - y1), int(BOX[3] - y0)
    assert c0 >= 0 and r0 >= 0 and c1 <= w and r1 <= h, (c0, r0, c1, r1)
    clip = im[r0:r1, c0:c1]
    dst.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(dst, "w", driver="GTiff", width=clip.shape[1], height=clip.shape[0], count=3,
                       dtype="uint8", crs="EPSG:32610", transform=from_origin(x0, y1, 1.0, 1.0),
                       compress="deflate", tiled=True) as out:
        for b in range(3):
            out.write(clip[:, :, b], b + 1)
    print(f"[make_ortho] {dst.name}: {clip.shape[1]} x {clip.shape[0]} px at 1 m, origin ({x0}, {y1})")


if __name__ == "__main__":
    main()

"""Georeference the OSIP 2024 JPEG export onto the raster box shared by Shorty's
and Bandon Preserve (run by `make fetch NAME=shortys` through release.json;
output raw/osip2024_05m.tif). Copied from data/bandon_dunes/make_ortho.py.

    python3 data/shortys/make_ortho.py <exportImage.jpg>

The developer's download (GitHub release bandon-par-threes-data,
`exportImage.jpg`, SHA-256 in release.json) is the OSIP_2024_WM exportImage
request in DATA_REQUEST.md item 3: bbox 386050,4780850,387300,4782700 in
EPSG:32610, 2500 x 3700 px, so 0.5 m pixels whose corners are that bbox. A JPEG carries no
georeferencing; the transform comes from the request's bbox (as at Langdon
Farms, where the same service's JPEG lined up with OSM within 1-2 m).
"""
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
BBOX = (386050, 4780850, 387300, 4782700)   # x0, y0, x1, y1, EPSG:32610
SIZE = (2500, 3700)                           # px


def main():
    im = Image.open(sys.argv[1]).convert("RGB")
    if im.size != SIZE:
        raise SystemExit(f"[ortho] expected {SIZE} px, got {im.size}")
    a = np.asarray(im).transpose(2, 0, 1)
    res = (BBOX[2] - BBOX[0]) / SIZE[0]
    tr = from_origin(BBOX[0], BBOX[3], res, res)
    dst = HERE / "raw" / "osip2024_05m.tif"
    dst.parent.mkdir(exist_ok=True)
    prof = dict(driver="GTiff", width=SIZE[0], height=SIZE[1], count=3, dtype="uint8", crs="EPSG:32610",
                transform=tr, compress="DEFLATE", tiled=True, blockxsize=512, blockysize=512)
    with rasterio.open(dst, "w", **prof) as d:
        d.write(a)
    print(f"[ortho] {dst} {SIZE[0]}x{SIZE[1]} at {res} m")


if __name__ == "__main__":
    main()

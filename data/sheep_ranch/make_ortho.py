"""Georeference the two shared OSIP 2024 JPEG tiles and cut this course's
orthophoto from them (run by `make fetch NAME=<id>` through release.json;
output raw/osip2024_05m.tif).

    python3 data/<id>/make_ortho.py SOUTH.jpg NORTH.jpg

Pacific Dunes, Old Macdonald and Sheep Ranch share two OSIP_2024_WM exportImage
requests (DATA_REQUEST.md items 3 and 4), each 3760 x 4000 px in EPSG:32610:
south bbox 386100,4782960,387980,4784960 and north bbox
386100,4784960,387980,4786960, so 0.5 m pixels whose corners are those boxes.
A JPEG carries no georeferencing; the transform comes from the request's bbox
(as at Langdon Farms and Bandon Dunes, where the same service's JPEG lined up
with OSM within 1-2 m). The two tiles are stacked and cut to the world box
grown by 100 m (clipped to the tiles).
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
X0, X1 = 386100, 387980
SOUTH_Y = (4782960, 4784960)
NORTH_Y = (4784960, 4786960)
SIZE = (3760, 4000)  # px per tile
RES = 0.5
MARGIN_M = 100


def load(path):
    im = Image.open(path).convert("RGB")
    if im.size != SIZE:
        raise SystemExit(f"[ortho] {path}: expected {SIZE} px, got {im.size}")
    return np.asarray(im)


def main(south, north):
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    a = np.concatenate([load(north), load(south)], axis=0)       # rows north -> south
    top = NORTH_Y[1]
    bx0 = max(X0, w["x0"] - MARGIN_M)
    bx1 = min(X1, w["x0"] + w["width"] + MARGIN_M)
    by0 = max(SOUTH_Y[0], w["y0"] - MARGIN_M)
    by1 = min(NORTH_Y[1], w["y0"] + w["height"] + MARGIN_M)
    c0, c1 = int(round((bx0 - X0) / RES)), int(round((bx1 - X0) / RES))
    r0, r1 = int(round((top - by1) / RES)), int(round((top - by0) / RES))
    cut = a[r0:r1, c0:c1].transpose(2, 0, 1)
    tr = from_origin(X0 + c0 * RES, top - r0 * RES, RES, RES)
    dst = HERE / "raw" / "osip2024_05m.tif"
    dst.parent.mkdir(exist_ok=True)
    prof = dict(driver="GTiff", width=cut.shape[2], height=cut.shape[1], count=3, dtype="uint8",
                crs=f"EPSG:{cfg['epsg']}", transform=tr, compress="DEFLATE", tiled=True,
                blockxsize=512, blockysize=512)
    with rasterio.open(dst, "w", **prof) as d:
        d.write(np.ascontiguousarray(cut))
    print(f"[ortho] {dst} {cut.shape[2]}x{cut.shape[1]} px at {RES} m, "
          f"x {X0 + c0 * RES:.0f}-{X0 + c1 * RES:.0f}, y {top - r1 * RES:.0f}-{top - r0 * RES:.0f}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])

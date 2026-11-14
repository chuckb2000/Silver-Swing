"""Chicago Golf Club: the NAIP 2023 aerial photo (USDA, public domain) as the course's ortho.

Run by `make fetch NAME=chicago_golf` through release.json, once per tile (the
second run writes the photo once both tiles are in raw/naip/):

    python3 data/chicago_golf/make_ortho.py <tile.tif>

The two 0.3 m tiles (m_4108815_ne and m_4108816_nw, 16 and 24 August 2023; four
bands R, G, B, near-infrared, EPSG:26916) are joined and warped to the course's
EPSG:32616 at 0.5 m over the world plus 100 m. Writes raw/naip2023_05m.tif
(4 bands, uint8). NAD83 and WGS84 UTM differ by about 1 m here, inside what the
photo's own alignment with OSM shows.
"""
import shutil
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

HERE = Path(__file__).resolve().parent
TILES = ["naip2023_4108815_ne.tif", "naip2023_4108816_nw.tif"]
RES, PAD = 0.5, 100.0


def main(arg):
    import json
    nd = HERE / "raw" / "naip"
    nd.mkdir(parents=True, exist_ok=True)
    src = Path(arg)
    if src.resolve() != (nd / src.name).resolve():
        shutil.copy(src, nd / src.name)
    if not all((nd / t).exists() for t in TILES):
        print("[ortho] waiting for the other tile")
        return
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    x0, y0 = w["x0"] - PAD, w["y0"] - PAD
    x1, y1 = w["x0"] + w["width"] + PAD, w["y0"] + w["height"] + PAD
    W, H = int(round((x1 - x0) / RES)), int(round((y1 - y0) / RES))
    dst_tr = from_origin(x0, y1, RES, RES)
    srcs = [rasterio.open(nd / t) for t in TILES]
    mos, tr = merge(srcs, bounds=(x0 - 20, y0 - 20, x1 + 20, y1 + 20))  # NAD83 vs WGS84: about 1 m
    out = np.zeros((mos.shape[0], H, W), np.uint8)
    for b in range(mos.shape[0]):
        reproject(mos[b], out[b], src_transform=tr, src_crs=srcs[0].crs, dst_transform=dst_tr,
                  dst_crs=f"EPSG:{cfg['epsg']}", resampling=Resampling.average)
    prof = dict(driver="GTiff", width=W, height=H, count=out.shape[0], dtype="uint8", crs=f"EPSG:{cfg['epsg']}",
                transform=dst_tr, compress="deflate", predictor=2, tiled=True, photometric="RGB" if out.shape[0] == 3 else "minisblack")
    with rasterio.open(HERE / "raw" / "naip2023_05m.tif", "w", **prof) as d:
        d.write(out)
    print(f"[ortho] raw/naip2023_05m.tif {W} x {H} px, {out.shape[0]} bands")


if __name__ == "__main__":
    main(sys.argv[1])

"""Proposal (course chat, 2026-10-25): the thicket north of the Craddock 9th green, by the 14th tee.

Both club maps draw an orange-hatched band here; on the OSIP 2024 photo it is a dense dark
green thicket of riparian shrubs in a draw. The developer: "craddock 9 green 14 tee area
should just be shrubs" (2026-10-25). The lidar sees it only as a few short crowns at its
edges (2020, class 1), and the sagebrush colour rule (make_native.py, gorse key) skips it
(it is green, not grey).

The thicket's outline comes from the photo: inside BOX, pixels whose smoothed (1.5 m)
brightness V = (R+G+B)/3 is under V_MAX and green minus red over GR_MIN, closed over 2 m;
the largest piece, smoothed. It is written as `riparian_c9` (kind "shrub_area"), which
course_config.json uses twice:
  - `gorse` `extra_areas`: added to the bush area whatever its colour or canopy (s05,
    pipeline/gorse.py), bushes drawn with the theme's bush painter (sprites/shrubs_silvies);
  - `not_trees_areas`: lidar crowns inside it are shrubs, not trees (dropped from the trees).
Physics treats bushes as small deciduous trees; the ground under them stays rough.

Writes proposed/riparian_c9.geojson (WGS84) and proposed/riparian_c9.jpg.

    python3 data/silvies/make_riparian.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import shapes
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.geometry import shape

HERE = Path(__file__).resolve().parent
BOX = (630, 930, 830, 1030)          # local metres, north of the Craddock 9th green
V_MAX, GR_MIN = 105.0, 4.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    X0, Y0 = cfg["world"]["x0"], cfg["world"]["y0"]
    xa, ya, xb, yb = BOX
    with rasterio.open(HERE / cfg["ortho"]["path"]) as s:
        w = from_bounds(X0 + xa, Y0 + ya, X0 + xb, Y0 + yb, s.transform)
        im = s.read(window=w).astype(np.float64)
        res = s.transform.a
    r, g, b = (ndimage.gaussian_filter(c, 1.5 / res) for c in im)
    V = (r + g + b) / 3
    m = (V < V_MAX) & ((g - r) > GR_MIN)
    m = ndimage.binary_closing(m, iterations=int(2 / res))
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    big = lab == 1 + int(np.argmax(sizes))
    big = ndimage.binary_fill_holes(big)
    tr = Affine(res, 0, xa, 0, -res, yb)
    poly = max((shape(gm) for gm, v in shapes(big.astype(np.uint8), mask=big, transform=tr) if v == 1), key=lambda p: p.area)
    poly = poly.buffer(1.0).buffer(-1.5).buffer(0.5).simplify(0.5)
    print(f"[riparian] thicket {poly.area:.0f} m2, bounds {[round(v) for v in poly.bounds]}")
    out = gpd.GeoDataFrame([{"osm": "riparian_c9", "kind": "shrub_area",
                             "tags": json.dumps({"natural": "scrub", "name": "thicket by the Craddock 9th green",
                                                 "source": "OSIP 2024 photo (make_riparian.py)"})}], geometry=[poly], crs=None)
    out = out.set_geometry(out.geometry.translate(X0, Y0)).set_crs(cfg["epsg"]).to_crs(4326)
    out.to_file(HERE / "proposed" / "riparian_c9.geojson", driver="GeoJSON")
    pic = Image.fromarray(np.moveaxis(im.astype(np.uint8), 0, 2))
    d = ImageDraw.Draw(pic)
    P = lambda x, y: ((x - xa) / res, (yb - y) / res)  # noqa: E731
    d.line([P(*c) for c in poly.exterior.coords], fill=(255, 0, 255), width=3)
    pic.save(HERE / "proposed" / "riparian_c9.jpg", quality=88)


if __name__ == "__main__":
    main()

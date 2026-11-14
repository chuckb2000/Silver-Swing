"""Chicago Golf Club: tee boxes OSM doesn't map, from the NAIP 2023 photo.

Course-chat helper (not a `make course` step; its output is a proposal, used only
after the developer approves it, tee by tee, with its hole and tee set):

    python3 data/chicago_golf/make_tees.py     (after s02: reads build/course_local.geojson)

OSM maps 34 tee boxes; the photo shows many more: small squares and oblongs of
closely mown turf set in the rough and fescue. In the photo (raw/naip2023_05m.tif,
0.5 m) the mapped tees are the greenest turf on the course: green minus red,
smoothed over 1 m, 20-26 (10th-90th percentile; fairways 15-20, the mown rough
11-21, the fescue 2-19), green minus blue 41-45 (fairways 38-41), NDVI 0.24-0.29
(trees above 0.42). A pixel is tee turf where green minus red is above GR_MIN,
green minus blue above GB_MIN, NDVI below NDVI_MAX and the brightness 105-140. A
candidate is a patch of such turf inside the boundary, at least 3 m from every
mapped fairway, green, tee and bunker, MIN_M2-MAX_M2 in area, compact (its area at
least FILL of its minimum rotated rectangle) and no longer than MAX_LEN_M. Each
is written as that rectangle, with the nearest hole line and how far along it lies.

Writes proposed/tees_photo.geojson (WGS84) and proposed/tees_photo.jpg (photo with
the boxes in red, numbered).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import rasterize, shapes
from scipy import ndimage
from shapely.geometry import Point, shape

HERE = Path(__file__).resolve().parent
PHOTO = HERE / "raw" / "naip2023_05m.tif"
GR_MIN, GB_MIN, NDVI_MAX = 19.5, 40.0, 0.33
MIN_M2, MAX_M2, FILL, MAX_LEN_M = 40.0, 900.0, 0.7, 60.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    with rasterio.open(PHOTO) as src:
        im = src.read().astype(np.float32)
        ptr = src.transform
    RES = ptr.a
    H, W = im.shape[1:]
    tr = Affine(RES, 0, ptr.c - wx, 0, -RES, ptr.f - wy)
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    g["tags"] = g.tags.apply(lambda t: t if isinstance(t, dict) else json.loads(t or "{}"))

    def mask(geoms, buf=0.0):
        gs = [x.buffer(buf) for x in geoms if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    r, gg, b, n = im
    s = 1.0 / RES
    gr = ndimage.gaussian_filter(gg - r, s)
    bright = ndimage.gaussian_filter((r + gg + b) / 3, s)
    ndvi = ndimage.gaussian_filter((n - r) / (n + r + 1), s)
    inside = mask(g[g.kind == "boundary"].geometry)
    skip = mask(g[g.kind.isin(["fairway", "green", "tee", "bunker", "building", "parking", "water_hazard", "driving_range"])].geometry, 3.0)
    gb = ndimage.gaussian_filter(gg - b, s)
    turf = inside & ~skip & (gr > GR_MIN) & (gb > GB_MIN) & (ndvi < NDVI_MAX) & (bright > 105) & (bright < 140)
    turf = ndimage.binary_opening(turf, iterations=2)
    holes = g[g.kind == "hole"]
    out = []
    for sh, v in shapes(turf.astype(np.uint8), mask=turf, transform=tr):
        p = shape(sh).buffer(0)
        if not (MIN_M2 <= p.area <= MAX_M2):
            continue
        rect = p.minimum_rotated_rectangle
        xs, ys = rect.exterior.coords.xy
        sides = sorted({round(Point(xs[i], ys[i]).distance(Point(xs[i + 1], ys[i + 1])), 1) for i in range(4)})
        if p.area < FILL * rect.area or sides[-1] > MAX_LEN_M:
            continue
        c = rect.centroid
        hd = holes.geometry.distance(c)
        h = holes.loc[hd.idxmin()]
        along = h.geometry.project(c)
        out.append({"rect": rect, "hole": h.tags.get("ref"), "off_m": round(float(hd.min()), 1),
                    "from_start_m": round(float(along), 1), "area_m2": round(p.area)})
    out.sort(key=lambda o: (int(o["hole"] or 0), o["from_start_m"]))
    gdf = gpd.GeoDataFrame({"osm": [f"tee_photo_{i}" for i in range(len(out))], "kind": "tee",
                            "tags": [json.dumps({"golf": "tee", "near_hole": o["hole"], "off_hole_line_m": o["off_m"],
                                                 "from_line_start_m": o["from_start_m"], "source": "NAIP 2023 photo (make_tees.py)"}) for o in out]},
                           geometry=[o["rect"] for o in out], crs=None)
    gdf = gdf.set_geometry(gdf.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    gdf.to_file(HERE / "proposed" / "tees_photo.geojson", driver="GeoJSON")
    for i, o in enumerate(out):
        print(f"tee_photo_{i}: near hole {o['hole']} ({o['off_m']} m off its line, {o['from_start_m']} m from its start), {o['area_m2']} m2")
    img = Image.fromarray(np.moveaxis(im[:3].astype(np.uint8), 0, -1))
    d = ImageDraw.Draw(img)
    inv = ~tr
    for i, o in enumerate(out):
        d.line([inv * q for q in o["rect"].exterior.coords], fill=(255, 30, 30), width=2)
        x, y = inv * (o["rect"].centroid.x, o["rect"].centroid.y)
        d.text((x + 8, y - 6), str(i), fill=(255, 255, 0))
    tb = g[g.kind == "boundary"].total_bounds
    p0, p1 = inv * (tb[0] - 20, tb[3] + 20), inv * (tb[2] + 20, tb[1] - 20)
    img.crop((int(p0[0]), int(p0[1]), int(p1[0]), int(p1[1]))).save(HERE / "proposed" / "tees_photo.jpg", quality=88)


if __name__ == "__main__":
    main()

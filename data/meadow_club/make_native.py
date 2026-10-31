"""Meadow Club: the unirrigated native grass inside the course, from the NAIP photo.

Between the holes Meadow Club leaves wide areas of native grass that are golden in the
dry season, the same grass as the hillsides outside. OSM maps none of it (only a few
golf=rough), so the areas are read from the photo (USDA NAIP via the USGS exportImage
service, release data-meadow_club, meadow_club_naip.jpg; 0.6 m, course EPSG). Art only:
s09/s09b draw rough inside these areas in the theme's straw tones (config fescue_areas)
and the rest of the rough as mown rough; physics treats all of it as rough.

Rule, calibrated on the photo itself (2026-10-30): fairways have green minus red of +15
to +33 (10th-95th percentile), greens +11 to +19; the dry grass is below 0. A pixel is
native grass where green minus red, smoothed over 1.5 m, is below +4. Only the course's
rough counts (inside the boundary, outside every fairway, green + fringe, tee, bunker,
penalty area, range, building and cart path); patches under 60 m2 dropped, gaps under 2 m
closed, outlines simplified to 0.75 m. (Gearhart's make_fescue.py, adapted.)

Writes proposed/native.geojson (WGS84) and proposed/native.png (photo with outlines).

    python3 data/meadow_club/make_native.py PHOTO.jpg     (after s02: reads build/course_local.geojson)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import rasterize, shapes
from scipy import ndimage
from shapely.geometry import shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
X0, Y1, RES = 532695, 4203386, 0.6      # photo: west and north edges (m), metres per pixel
THRESH = 4.0
SIGMA_M, MIN_AREA_M2, CLOSE_M, SIMPLIFY_M = 1.5, 60.0, 2.0, 0.75


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    img = Image.open(sys.argv[1]).convert("RGB")
    im = np.asarray(img).astype(np.float32)
    H, W = im.shape[:2]
    tr = Affine(RES, 0, X0 - wx, 0, -RES, Y1 - wy)
    g = gpd.read_file(HERE / "build" / "course_local.geojson")

    def mask(geoms, buf=0.0):
        gs = [x.buffer(buf) for x in geoms if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    inside = mask(g[g.kind == "boundary"].geometry)
    played = mask(g[g.kind.isin(["fairway", "tee", "bunker", "lateral_water_hazard", "water_hazard", "water",
                                 "building", "driving_range"])].geometry)
    played |= mask(g[g.kind == "green"].geometry, 1.5)
    played |= mask(g[g.kind == "cartpath"].geometry, 1.2)
    rough = inside & ~played
    gr = ndimage.gaussian_filter(im[..., 1] - im[..., 0], SIGMA_M / RES)
    nat = rough & (gr < THRESH)
    k = int(round(CLOSE_M / RES))
    nat = ndimage.binary_closing(nat, iterations=k) & rough
    nat = ndimage.binary_opening(nat, iterations=2)
    lab, n = ndimage.label(nat)
    sizes = ndimage.sum(nat, lab, range(1, n + 1)) * RES * RES
    nat = np.isin(lab, 1 + np.where(sizes >= MIN_AREA_M2)[0])
    polys = [shape(s).simplify(SIMPLIFY_M) for s, v in shapes(nat.astype(np.uint8), mask=nat, transform=tr) if v == 1]
    polys = [p for p in polys if p.is_valid and p.area >= MIN_AREA_M2]
    u = unary_union(polys)
    parts = list(getattr(u, "geoms", [u]))
    rough_m2 = rough.sum() * RES * RES
    print(f"[native] {len(parts)} areas, {u.area:.0f} m2 = {u.area / rough_m2 * 100:.0f} % of the course's rough ({rough_m2:.0f} m2)")
    out = gpd.GeoDataFrame({"osm": [f"native_{i}" for i in range(len(parts))], "kind": "fescue",
                            "tags": [json.dumps({"golf": "rough", "grass": "native", "source": "NAIP photo (make_native.py)"})] * len(parts)},
                           geometry=parts, crs=None)
    out = out.set_geometry(out.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    out.to_file(HERE / "proposed" / "native.geojson", driver="GeoJSON")
    d = ImageDraw.Draw(img)
    inv = ~tr
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            d.line([inv * q for q in ring.coords], fill=(255, 0, 255), width=2)
    img.crop((500, 400, 2700, 2300)).save(HERE / "proposed" / "native.png")


if __name__ == "__main__":
    main()

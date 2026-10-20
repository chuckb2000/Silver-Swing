"""Gearhart: the fescue areas of the rough, from the OSIP 2024 orthophoto.

Gearhart's rough is of two kinds: mown green rough beside the fairways and wide
areas of fine fescue left long, which is straw-coloured in the summer photo. OSM
maps some of the fescue as golf=rough (most of the front nine) but not most of the
back nine's, so the areas are read from the photo instead (open data, COURSE_BUILD.md
1.1-1.2). They change only the art: s09 and s09b draw rough inside these areas in
the theme's fescue tones and the rest of the rough as mown rough (config key
`fescue_areas`); physics treats all of it as rough.

Rule, calibrated on the photo itself (2026-10-20): fairways and greens have green
minus red of +10 to +26 (10th-90th percentile); the OSM-mapped fescue has -10 to +1.
A pixel is fescue where green minus red, smoothed over 1.5 m, is below +5. Only the
course's rough counts (inside the boundary, outside every fairway, green, fringe,
tee, bunker, water and cart path); patches under 40 m2 are dropped, gaps under 2 m
closed, the outlines simplified to 0.75 m.

Writes proposed/fescue.geojson (WGS84) and proposed/fescue.png (photo with outlines).

    python3 data/gearhart/make_fescue.py      (after s02: reads build/course_local.geojson)
"""
from __future__ import annotations

import json
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
X0, Y1, RES = 428161, 5099091, 0.5      # photo: west and north edges (m), metres per pixel
THRESH = 5.0                            # green minus red below this: fescue
SIGMA_M, MIN_AREA_M2, CLOSE_M, SIMPLIFY_M = 1.5, 40.0, 2.0, 0.75


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    img = Image.open(HERE / "raw" / "osip2024_05m.jpg").convert("RGB")
    im = np.asarray(img).astype(np.float32)
    H, W = im.shape[:2]
    tr = Affine(RES, 0, X0 - wx, 0, -RES, Y1 - wy)          # photo pixel -> local metres
    g = gpd.read_file(HERE / "build" / "course_local.geojson")

    def mask(geoms, buf=0.0):
        gs = [x.buffer(buf) for x in geoms if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    inside = mask(g[g.kind == "boundary"].geometry)
    played = mask(g[g.kind.isin(["fairway", "tee", "bunker", "lateral_water_hazard", "water_hazard", "building"])].geometry)
    played |= mask(g[g.kind == "green"].geometry, 1.5)       # green + fringe
    played |= mask(g[g.kind == "cartpath"].geometry, 1.2)
    rough = inside & ~played
    gr = ndimage.gaussian_filter(im[..., 1] - im[..., 0], SIGMA_M / RES)
    fes = rough & (gr < THRESH)
    k = int(round(CLOSE_M / RES))
    fes = ndimage.binary_closing(fes, iterations=k) & rough
    fes = ndimage.binary_opening(fes, iterations=2)
    lab, n = ndimage.label(fes)
    sizes = ndimage.sum(fes, lab, range(1, n + 1)) * RES * RES
    fes = np.isin(lab, 1 + np.where(sizes >= MIN_AREA_M2)[0])
    polys = [shape(s).simplify(SIMPLIFY_M) for s, v in shapes(fes.astype(np.uint8), mask=fes, transform=tr) if v == 1]
    polys = [p for p in polys if p.is_valid and p.area >= MIN_AREA_M2]
    u = unary_union(polys)
    parts = list(getattr(u, "geoms", [u]))
    rough_m2 = rough.sum() * RES * RES
    print(f"[fescue] {len(parts)} areas, {u.area:.0f} m2 = {u.area / rough_m2 * 100:.0f} % of the course's rough ({rough_m2:.0f} m2)")
    out = gpd.GeoDataFrame({"osm": [f"fescue_{i}" for i in range(len(parts))], "kind": "fescue",
                            "tags": [json.dumps({"golf": "rough", "grass": "fescue", "source": "OSIP 2024 photo (make_fescue.py)"})] * len(parts)},
                           geometry=parts, crs=None)
    out = out.set_geometry(out.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    out.to_file(HERE / "proposed" / "fescue.geojson", driver="GeoJSON")
    d = ImageDraw.Draw(img)
    inv = ~tr
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            d.line([inv * q for q in ring.coords], fill=(255, 0, 255), width=2)
    img.crop((500, 900, 1450, 3600)).save(HERE / "proposed" / "fescue.png")


if __name__ == "__main__":
    main()

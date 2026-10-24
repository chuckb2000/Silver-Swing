"""Pumpkin Ridge: the native-grass areas of the rough, from the OSIP 2024 orthophoto.

Both courses have mown green rough beside the fairways and wide areas of native
grass left long between the holes (the "native fescue" carried on Witch Hollow 9
and 10, the tan meadow in front of Ghost Creek 3 and 4 and Witch Hollow 18).
OSM maps all of it as plain rough. The areas are read from the photo instead
(open data, COURSE_BUILD.md 1.1-1.2), as at Gearhart (data/gearhart/make_fescue.py).
They change only the art: s09 and s09b draw rough inside these areas in the
theme's straw tones (F0-F2) and the rest of the rough as mown rough (config key
`fescue_areas`); physics treats all of it as rough.

Rule, calibrated on the photo itself (2026-10-24): fairways have green minus red
of +12 to +23 (10th-90th percentile); the course's rough is bimodal, -13 to +4
where it is tan and +12 to +17 where it is mown. A pixel is native grass where
green minus red, smoothed over 1.5 m, is below +4. Only the course's rough counts
(inside the boundary, outside every fairway, green, fringe, tee, bunker, water,
cart path and building); patches under 40 m2 are dropped, gaps under 2 m closed,
the outlines simplified to 0.75 m.

Writes proposed/fescue.geojson (WGS84) and proposed/fescue.jpg (photo with outlines).

    python3 data/pumpkin_ridge/make_fescue.py      (after s02: reads build/course_local.geojson)
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
from shapely.geometry import shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
THRESH = 4.0                            # green minus red below this: native grass
SIGMA_M, MIN_AREA_M2, CLOSE_M, SIMPLIFY_M = 1.5, 40.0, 2.0, 0.75


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    with rasterio.open(HERE / cfg["ortho"]["path"]) as src:
        im = np.stack([src.read(b + 1) for b in range(3)], axis=-1).astype(np.float32)
        t0 = src.transform
    RES = t0.a
    H, W = im.shape[:2]
    tr = Affine(RES, 0, t0.c - wx, 0, -RES, t0.f - wy)       # photo pixel -> local metres
    g = gpd.read_file(HERE / "build" / "course_local.geojson")

    def mask(geoms, buf=0.0):
        gs = [x.buffer(buf) for x in geoms if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    inside = mask(g[g.kind == "boundary"].geometry)
    played = mask(g[g.kind.isin(["fairway", "tee", "bunker", "lateral_water_hazard", "water_hazard",
                                 "building", "driving_range"])].geometry)
    played |= mask(g[g.kind == "green"].geometry, 1.5)       # green + fringe
    played |= mask(g[g.kind == "cartpath"].geometry, 1.2)
    rough = inside & ~played
    gr = ndimage.gaussian_filter(im[..., 1] - im[..., 0], SIGMA_M / RES)
    fes = rough & (gr < THRESH)
    k = int(round(CLOSE_M / RES))
    fes = ndimage.binary_closing(fes, iterations=k) & rough
    fes = ndimage.binary_opening(fes, iterations=1)
    lab, n = ndimage.label(fes)
    sizes = ndimage.sum(fes, lab, range(1, n + 1)) * RES * RES
    fes = np.isin(lab, 1 + np.where(sizes >= MIN_AREA_M2)[0])
    polys = [shape(s).simplify(SIMPLIFY_M) for s, v in shapes(fes.astype(np.uint8), mask=fes, transform=tr) if v == 1]
    polys = [p for p in polys if p.is_valid and p.area >= MIN_AREA_M2]
    u = unary_union(polys)
    parts = sorted(getattr(u, "geoms", [u]), key=lambda p: (round(p.bounds[0], 1), round(p.bounds[1], 1)))
    rough_m2 = rough.sum() * RES * RES
    print(f"[fescue] {len(parts)} areas, {u.area:.0f} m2 = {u.area / rough_m2 * 100:.0f} % of the course's rough ({rough_m2:.0f} m2)")
    out = gpd.GeoDataFrame({"osm": [f"fescue_{i}" for i in range(len(parts))], "kind": "fescue",
                            "tags": [json.dumps({"golf": "rough", "grass": "native", "source": "OSIP 2024 photo (make_fescue.py)"})] * len(parts)},
                           geometry=parts, crs=None)
    out = out.set_geometry(out.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "fescue.geojson", driver="GeoJSON")
    img = Image.fromarray(im.astype(np.uint8))
    d = ImageDraw.Draw(img)
    inv = ~tr
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            d.line([inv * q for q in ring.coords], fill=(255, 0, 255), width=1)
    img.save(HERE / "proposed" / "fescue.jpg", quality=80)


if __name__ == "__main__":
    main()

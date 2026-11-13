"""Chicago Golf Club: the native fescue of the rough, from the NAIP 2023 photo.

Course-chat helper (not a `make course` step; its output is a proposal, used only
after the developer approves it):

    python3 data/chicago_golf/make_fescue.py     (after s02: reads build/course_local.geojson)

Chicago's rough is of two kinds (developer's aerial, 2026-11-13): a mown band of
green rough beside each fairway, green and tee, and wide areas of tawny native
fescue between the holes. OSM maps neither. They change only the art (config key
`fescue_areas`, as Gearhart and Sandpines): s09 and s09b draw rough inside the
areas in the theme's fescue tones and the rest of the rough as mown rough;
physics treats all of it as rough.

Rule, calibrated on this photo (2026-11-13; raw/naip2023_05m.tif, 0.5 m, from
make_ortho.py): green minus red, smoothed over 1 m, is 15-20 on fairways (10th-90th
percentile) and 11-21 (median 17) in the rough 2-6 m from a fairway, but 5-19
(median 10) 10-20 m out and 2-19 beyond 40 m. A pixel of the course's rough
(inside the boundary, outside every fairway, tee, bunker, water and building, the
green + 1.5 m fringe, and the trees: near-infrared NDVI above 0.42 and darker than
95) is fescue where that value is below THRESH. Gaps under 2 m are closed, specks
opened, patches under 80 m2 dropped, greener islands under 150 m2 inside the
fescue filled, the outlines simplified to 1 m.

Writes proposed/fescue.geojson (WGS84) and proposed/fescue.jpg (photo with outlines).
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
PHOTO = HERE / "raw" / "naip2023_05m.tif"
THRESH = 12.0
SIGMA_M, MIN_AREA_M2, CLOSE_M, SIMPLIFY_M = 1.0, 80.0, 2.0, 1.0
TREE_NDVI, TREE_DARK = 0.42, 95.0
HOLE_M2 = 150.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    with rasterio.open(PHOTO) as src:
        im = src.read().astype(np.float32)
        ptr = src.transform
    RES = ptr.a
    H, W = im.shape[1:]
    tr = Affine(RES, 0, ptr.c - wx, 0, -RES, ptr.f - wy)        # photo pixel -> local metres
    g = gpd.read_file(HERE / "build" / "course_local.geojson")

    def mask(geoms, buf=0.0):
        gs = [x.buffer(buf) for x in geoms if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    r, gg, b, n = im
    s = SIGMA_M / RES
    ndvi = ndimage.gaussian_filter((n - r) / (n + r + 1), s)
    bright = ndimage.gaussian_filter((r + gg + b) / 3, s)
    trees = (ndvi > TREE_NDVI) & (bright < TREE_DARK)
    inside = mask(g[g.kind == "boundary"].geometry)
    played = mask(g[g.kind.isin(["fairway", "tee", "bunker", "lateral_water_hazard", "water_hazard", "building"])].geometry)
    played |= mask(g[g.kind == "green"].geometry, 1.5)
    played |= mask(g[g.kind == "cartpath"].geometry, 1.2)
    rough = inside & ~played & ~trees
    gr = ndimage.gaussian_filter(gg - r, s)
    fes = rough & (gr < THRESH)
    k = int(round(CLOSE_M / RES))
    fes = ndimage.binary_closing(fes, iterations=k) & inside & ~played
    fes = ndimage.binary_opening(fes, iterations=2)
    # mown islands under HOLE_M2 inside the fescue are filled (specks of greener grass, not mown)
    gaps = ~fes & rough
    gl, gn = ndimage.label(gaps)
    gs = ndimage.sum(gaps, gl, range(1, gn + 1)) * RES * RES
    fes |= np.isin(gl, 1 + np.where(gs < HOLE_M2)[0])
    lab, nl = ndimage.label(fes)
    sizes = ndimage.sum(fes, lab, range(1, nl + 1)) * RES * RES
    fes = np.isin(lab, 1 + np.where(sizes >= MIN_AREA_M2)[0])
    polys = [shape(sh).simplify(SIMPLIFY_M) for sh, v in shapes(fes.astype(np.uint8), mask=fes, transform=tr) if v == 1]
    polys = [p.buffer(0) for p in polys if p.area >= MIN_AREA_M2]
    u = unary_union(polys)
    parts = list(getattr(u, "geoms", [u]))
    rough_m2 = (inside & ~played).sum() * RES * RES
    print(f"[fescue] {len(parts)} areas, {u.area:.0f} m2 = {u.area / rough_m2 * 100:.0f} % of the course's rough ({rough_m2:.0f} m2)")
    out = gpd.GeoDataFrame({"osm": [f"fescue_{i}" for i in range(len(parts))], "kind": "fescue",
                            "tags": [json.dumps({"golf": "rough", "grass": "fescue", "source": "NAIP 2023 photo (make_fescue.py)"})] * len(parts)},
                           geometry=parts, crs=None)
    out = out.set_geometry(out.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "fescue.geojson", driver="GeoJSON")
    img = Image.fromarray(np.moveaxis(im[:3].astype(np.uint8), 0, -1))
    d = ImageDraw.Draw(img)
    inv = ~tr
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            d.line([inv * q for q in ring.coords], fill=(255, 0, 255), width=2)
    bx = inv * (g[g.kind == "boundary"].total_bounds[0] - 20, g[g.kind == "boundary"].total_bounds[3] + 20)
    bx2 = inv * (g[g.kind == "boundary"].total_bounds[2] + 20, g[g.kind == "boundary"].total_bounds[1] - 20)
    img.crop((int(bx[0]), int(bx[1]), int(bx2[0]), int(bx2[1]))).save(HERE / "proposed" / "fescue.jpg", quality=85)


if __name__ == "__main__":
    main()

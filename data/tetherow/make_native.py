"""Tetherow: the native areas (bunchgrass, fescue, sage and bitterbrush on pumice), from the
OSIP 2024 orthophoto. Course-chat helper, run after s02 (reads build/course_local.geojson):

    python3 data/tetherow/make_native.py

Art only, through the config key `fescue_areas`: s09/s09b draw the rough inside these areas
in the theme's native tones (F0-F2) and the rest of the rough as mown rough. Physics is
unchanged (the native areas play as rough; the game has no "native area" lie).

Rule, calibrated on this photo (2026-10-31, late-summer 2024): the excess-green index
2G - R - B separates the irrigated turf from the dry native ground cleanly. Inside the
boundary it measures 60-101 on fairways (5th-95th percentile), 54-81 on greens, 58-95 on
tees, 4-29 in the pumice bunkers, and 3-53 in the rest (median 19). A pixel of the course's
rough (inside the boundary, outside every fairway, tee, bunker, green + 1.5 m, cart path +
1.5 m, building, range and water) is native where that index, smoothed over ~1.5 m, is below
EXG. A mown band of BAND_M is kept along every fairway, tee and green; specks are opened,
mown gaps under HOLE_M2 inside a native area are filled, patches under MIN_AREA_M2 dropped,
outlines simplified.

Writes proposed/native.geojson (WGS84) and proposed/native_overview.jpg.
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
EXG = 40.0
SMOOTH_M = 1.5
BAND_M = 2.0
MIN_AREA_M2, HOLE_M2, SIMPLIFY_M, ROUND_M = 80.0, 60.0, 0.75, 1.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    with rasterio.open(HERE / cfg["ortho"]["path"]) as src:
        im = src.read().astype(np.float32).transpose(1, 2, 0)
        T = src.transform
    res = T.a
    H, W = im.shape[:2]
    tr = Affine(res, 0, T.c - wx, 0, T.e, T.f - wy)  # photo pixel -> local metres
    g = gpd.read_file(HERE / "build" / "course_local.geojson")

    def mask(kinds, buf=0.0):
        gs = [x.buffer(buf) for x in g[g.kind.isin(kinds)].geometry if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    inside = mask(["boundary"])
    played = mask(["fairway", "tee", "bunker", "water_hazard", "lateral_water_hazard", "building", "driving_range", "sand"])
    played |= mask(["green"], 1.5) | mask(["cartpath"], 1.5)
    rough = inside & ~played
    exg = 2 * im[..., 1] - im[..., 0] - im[..., 2]
    exg = ndimage.gaussian_filter(exg, SMOOTH_M / res / 2)
    kept = mask(["fairway", "tee"], BAND_M) | mask(["green"], 1.5 + BAND_M)
    nat = rough & (exg < EXG) & ~kept
    nat = ndimage.binary_opening(nat, iterations=2)
    holes = ndimage.binary_fill_holes(nat) & ~nat
    hl, hn = ndimage.label(holes)
    hs = ndimage.sum(holes, hl, range(1, hn + 1)) * res * res
    nat |= np.isin(hl, 1 + np.where(hs < HOLE_M2)[0])
    nat &= rough & ~kept
    lab, n = ndimage.label(nat)
    sizes = ndimage.sum(nat, lab, range(1, n + 1)) * res * res
    nat = np.isin(lab, 1 + np.where(sizes >= MIN_AREA_M2)[0])
    polys = [shape(s).simplify(SIMPLIFY_M) for s, v in shapes(nat.astype(np.uint8), mask=nat, transform=tr) if v == 1]
    polys = [p.buffer(ROUND_M).buffer(-2 * ROUND_M).buffer(ROUND_M) for p in polys]
    polys = [p for p in polys if p.is_valid and p.area >= MIN_AREA_M2]
    u = unary_union(polys)
    parts = list(getattr(u, "geoms", [u]))
    rough_m2 = rough.sum() * res * res
    print(f"[native] {len(parts)} areas, {u.area:.0f} m2 = {u.area / rough_m2 * 100:.0f} % of the course's rough ({rough_m2:.0f} m2)")
    out = gpd.GeoDataFrame({"osm": [f"native_{i}" for i in range(len(parts))], "kind": "fescue",
                            "tags": [json.dumps({"golf": "rough", "natural": "grassland",
                                                 "source": "OSIP 2024 photo (make_native.py)"})] * len(parts)},
                           geometry=parts, crs=None)
    out = out.set_geometry(out.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "native.geojson", driver="GeoJSON")

    img = Image.fromarray(im.astype(np.uint8))
    d = ImageDraw.Draw(img)
    inv = ~tr
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            d.line([inv * q for q in ring.coords], fill=(255, 0, 255), width=2)
    for x in g[g.kind == "boundary"].geometry:
        d.line([inv * q for q in x.exterior.coords], fill=(255, 140, 0), width=3)
    img.resize((W // 3, H // 3)).save(HERE / "proposed" / "native_overview.jpg", quality=85)


if __name__ == "__main__":
    main()

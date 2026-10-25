"""Sandpines: the native (non-kept) dune-grass areas, from the OSIP 2024 orthophoto.

Course-chat helper (not a `make course` step; its output is a proposal, used only
after the developer approves it):

    python3 data/sandpines/make_native.py     (after s02: reads build/course_local.geojson)

The card's local rule: "All non-kept areas of the course are played as lateral
hazards." The game has no dry penalty area, so (developer, 2026-10-24) these areas
are drawn as tawny dune grass and played as rough: art only, through the config
key `fescue_areas` (s09 and s09b draw rough inside them in the theme's F tones and
the rest of the rough as mown rough). Physics is unchanged.

Rule, calibrated on this photo (2026-10-24). In the dry summer photo colour does
not separate the kinds: fairways measure green minus red -3 to +17 (10th-90th
percentile) and the rough -10 to +18. Texture does: the local standard deviation
of brightness over 2.5 m, smoothed over 1 m (calibration), is 1.7-9.9 on fairways (median 3.5),
0.9-4.7 on greens, and a median of 7-9 in the rough. A pixel of the course's rough
(inside the boundary, outside every fairway, green + 1.5 m fringe, tee, bunker,
water, building, cart path + 1.5 m and OSM wood) is native where that texture is
above TEX. Gaps under 2 m are closed, specks opened, patches under 60 m2 dropped,
the outlines simplified to 0.75 m.

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
X0, Y1, RES = 410050, 4873450, 0.5      # photo: west and north edges (m), metres per pixel
TEX = 5.5                               # local brightness std above this: native grass
WIN_PX, SMOOTH_PX = 5, 2                # 2.5 m window, 1 m smoothing
VOTE_SIGMA_M, VOTE = 3.0, 0.55          # share of textured rough within ~3 m that makes an area native
BAND_M = 2.5                            # mown rough kept along every fairway, green and tee
MIN_AREA_M2, HOLE_M2, SIMPLIFY_M, ROUND_M = 150.0, 250.0, 1.0, 1.5


def local_std(a: np.ndarray, size: int) -> np.ndarray:
    mu = ndimage.uniform_filter(a, size)
    return np.sqrt(np.maximum(ndimage.uniform_filter(a * a, size) - mu * mu, 0))


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    with rasterio.open(HERE / cfg["ortho"]["path"]) as src:
        im = src.read().astype(np.float32).transpose(1, 2, 0)
    H, W = im.shape[:2]
    tr = Affine(RES, 0, X0 - wx, 0, -RES, Y1 - wy)          # photo pixel -> local metres
    g = gpd.read_file(HERE / "build" / "course_local.geojson")

    def mask(kinds, buf=0.0):
        gs = [x.buffer(buf) for x in g[g.kind.isin(kinds)].geometry if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    inside = mask(["boundary"])
    played = mask(["fairway", "tee", "bunker", "water_hazard", "lateral_water_hazard", "building", "wood", "driving_range"])
    played |= mask(["green"], 1.5) | mask(["cartpath"], 1.5)
    rough = inside & ~played
    tex = ndimage.gaussian_filter(local_std(im.mean(-1), WIN_PX), SMOOTH_PX)
    fine = rough & (tex > TEX)
    # majority vote over ~3 m of rough, so the areas come out as areas rather than speckle
    sig = VOTE_SIGMA_M / RES
    share = ndimage.gaussian_filter(fine.astype(np.float32), sig) / np.maximum(
        ndimage.gaussian_filter(rough.astype(np.float32), sig), 1e-3)
    kept = mask(["fairway", "tee"], BAND_M) | mask(["green"], 1.5 + BAND_M)
    nat = rough & (share > VOTE) & ~kept
    nat = ndimage.binary_opening(nat, iterations=2)
    # fill mown specks inside a native area (holes under HOLE_M2)
    holes = ndimage.binary_fill_holes(nat) & ~nat
    hl, hn = ndimage.label(holes)
    hs = ndimage.sum(holes, hl, range(1, hn + 1)) * RES * RES
    nat |= np.isin(hl, 1 + np.where(hs < HOLE_M2)[0])
    nat &= rough
    lab, n = ndimage.label(nat)
    sizes = ndimage.sum(nat, lab, range(1, n + 1)) * RES * RES
    nat = np.isin(lab, 1 + np.where(sizes >= MIN_AREA_M2)[0])
    polys = [shape(s).simplify(SIMPLIFY_M) for s, v in shapes(nat.astype(np.uint8), mask=nat, transform=tr) if v == 1]
    polys = [p.buffer(ROUND_M).buffer(-2 * ROUND_M).buffer(ROUND_M) for p in polys]  # round the pixel steps
    polys = [p for p in polys if p.is_valid and p.area >= MIN_AREA_M2]
    u = unary_union(polys)
    parts = list(getattr(u, "geoms", [u]))
    rough_m2 = rough.sum() * RES * RES
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
    img.crop((360, 500, 2600, 2700)).save(HERE / "proposed" / "native_overview.jpg", quality=88)


if __name__ == "__main__":
    main()

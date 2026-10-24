"""Propose the open dune sand from the NAIP photo (developer, 2026-10-24: option a). Course-chat
helper, not a make step; the developer corrects the result in the dune desk before anything
goes into the build.

    python3 data/cypress_point/make_dunes.py   ->  proposed/dunes.geojson, proposed/dunes_*.png

OSM maps the bunkers (149) but not the open sand of the dunes around holes 2-9 and 13. Sand is
bright and grey-white on the photo; the thresholds come from the course's own mapped bunkers
(their eroded interiors). Pixels already a fairway, green (+ its 1.5 m fringe), tee, bunker,
cart path, road, parking, building or the sea are left out, so the dunes never paint over play.
Inside the boundary the shapes are golf=bunker + sand=waste (bunkers until the design chat adds a
waste-sand surface); outside it, natural=sand (scenery, drawn as off-course sand).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pyproj
import rasterio
from rasterio.features import rasterize, shapes
from rasterio.transform import from_origin
from scipy import ndimage
from shapely.geometry import box, mapping, shape
from shapely.ops import transform, unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
RES = 0.5
W, H = int(w["width"] / RES), int(w["height"] / RES)
tr_local = from_origin(0, w["height"], RES, RES)          # local metres, row 0 = north

with rasterio.open(HERE / cfg["ortho"]["path"]) as src:
    win = rasterio.windows.from_bounds(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"], src.transform)
    rgb = src.read(window=win, out_shape=(3, H, W)).astype(np.float32)
L = ndimage.gaussian_filter(rgb.mean(0), 1.0)
S = ndimage.gaussian_filter(rgb.max(0) - rgb.min(0), 1.0)
B = ndimage.gaussian_filter(rgb[2] - rgb[1], 1.0)       # blue minus green: sand is not green

g = gpd.read_file(HERE / "build" / "course_local.geojson")
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
# only the mapped layout: leave out this script's own shapes (and the sea/shore) once they are in the build
g = g[~g.osm.str.startswith(("dune_", "sea_", "shore_"))]


def mask(geoms):
    geoms = [x for x in geoms if x is not None and not x.is_empty]
    if not geoms:
        return np.zeros((H, W), bool)
    return rasterize([(x, 1) for x in geoms], out_shape=(H, W), transform=tr_local, fill=0, dtype="uint8").astype(bool)


bnd = g[g.osm == "w36435651"].geometry.iloc[0]
inside = mask([bnd])
bunk = mask(list(g[g.kind == "bunker"].geometry))
core = ndimage.binary_erosion(bunk, iterations=3) & inside
lo_L = float(np.percentile(L[core], 5)) - 2
hi_S = float(np.percentile(S[core], 95)) + 1
lo_B = float(np.percentile(B[core], 5))
print(f"[dunes] calibration on {core.sum()} bunker pixels: L >= {lo_L:.0f}, S <= {hi_S:.0f}, B-G >= {lo_B:.1f}")

greens = list(g[g.kind == "green"].geometry)
play = list(g[g.kind.isin(["fairway", "tee", "bunker", "building", "parking"])].geometry) + [x.buffer(1.5) for x in greens]
play += [x.buffer(1.8) for x in g[g.kind.isin(["cartpath", "highway"])].geometry]
excl = mask(play)
to_utm = pyproj.Transformer.from_crs(4326, cfg["epsg"], always_xy=True).transform
sea_f = json.load(open(HERE / "proposed" / "sea.geojson"))["features"][0]
sea = transform(lambda x, y, z=None: (x - w["x0"], y - w["y0"]), transform(to_utm, shape(sea_f["geometry"])))
excl |= mask([sea.buffer(2)])


def trace(dL, dS, r_close):
    """Sand mask: bright, grey, not green, with sparse scrub closed over (radius r_close px)."""
    sand = (L >= lo_L - dL) & (S <= hi_S + dS) & (B >= lo_B) & ~excl
    disk = np.hypot(*np.mgrid[-r_close:r_close + 1, -r_close:r_close + 1]) <= r_close
    sand = ndimage.binary_closing(sand, structure=disk)
    sand = ndimage.binary_opening(sand, iterations=2)
    sand &= ~excl
    lab, n = ndimage.label(sand)
    sizes = ndimage.sum(sand, lab, range(1, n + 1)) * RES * RES
    sand = np.isin(lab, 1 + np.where(sizes >= 120)[0])
    holes = ndimage.binary_fill_holes(sand) & ~sand
    hl, hn = ndimage.label(holes)
    hs = ndimage.sum(holes, hl, range(1, hn + 1)) * RES * RES
    return sand | (np.isin(hl, 1 + np.where(hs < 60)[0]) & ~excl)     # scrub tufts inside the sand


# in play: the trace the developer approved (2026-10-24); off the course (scenery only) a looser
# one, so the dunes carry on past the out-of-bounds line instead of stopping at it (developer:
# "include the out of bounds sand above hole 8 so it doesn't just cut off at ob")
play_sand = trace(0, 0, 3)
# trees standing in the dunes stay trees: cut the lidar canopy (over 3 m) out of the sand in play,
# so s05 doesn't drop them as crowns "in a bunker" (when the lidar is there)
chm_p = HERE / "build" / "chm_local.npy"
if chm_p.exists():
    chm = np.load(chm_p)                                # 1 m, rows south -> north
    canopy = np.flipud(chm > 3.0)
    canopy = ndimage.binary_dilation(np.kron(canopy, np.ones((2, 2), bool))[:H, :W], iterations=2)
    play_sand &= ~canopy
    lab_, n_ = ndimage.label(play_sand)
    sz_ = ndimage.sum(play_sand, lab_, range(1, n_ + 1)) * RES * RES
    play_sand = np.isin(lab_, 1 + np.where(sz_ >= 60)[0])
scen_sand = trace(12, 3, 7) | play_sand
sand = np.where(inside, play_sand, scen_sand)
polys = [shape(geom).simplify(0.6) for geom, v in shapes(sand.astype(np.uint8), mask=sand, transform=tr_local) if v]
polys = [p.buffer(1.5).buffer(-1.5).simplify(0.4) for p in polys if p.area >= 120]
world_box = box(0, 0, w["width"], w["height"])
feats, area_in, area_out = [], 0.0, 0.0
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
k = 0
for p in polys:
    for part, where in ((p.intersection(bnd), "in"), (p.difference(bnd), "out")):
        for q in getattr(part, "geoms", [part]):
            if q.geom_type != "Polygon" or q.area < 60:
                continue
            k += 1
            if where == "in":
                tags = {"golf": "bunker", "sand": "waste", "source": "NAIP, course chat 2026-10-24"}
                kind = "bunker"
                area_in += q.area
            else:
                tags = {"natural": "sand", "source": "NAIP, course chat 2026-10-24"}
                kind = "sand"
                area_out += q.area
            geo = transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), q))
            feats.append({"type": "Feature", "id": f"dune_{k}",
                          "properties": {"osm": f"dune_{k}", "kind": kind, "tags": tags}, "geometry": mapping(geo)})
json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "proposed" / "dunes.geojson", "w"))
print(f"[dunes] {len(feats)} shapes: {area_in / 1e4:.2f} ha inside the boundary (bunker, sand=waste), "
      f"{area_out / 1e4:.2f} ha outside (natural=sand); mapped bunkers {unary_union(list(g[g.kind == 'bunker'].geometry)).area / 1e4:.2f} ha")
np.save(HERE / "build" / "dunes_mask.npy", sand)

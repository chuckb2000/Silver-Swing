"""Propose the rocky shore between the course and the sea as part of the red penalty area
(developer, 2026-10-31: "the ocean is a water hazard, not out of bounds"; the club stakes the shore red, so a ball on the
rocks, gorse or beach between the turf and the water is in the penalty area). Adapted from data/cypress_point/make_shore.py.

    python3 data/victoria/make_shore.py   ->  proposed/shore.geojson, proposed/shore.png

OSM's course boundary runs along the clifftop; the coastline (proposed/sea.geojson) is the water's
edge. Between them lie rocks, cliffs and small beaches, out of bounds as mapped. The shore strip is
the land outside the boundary, within 60 m of the sea, not on a road, path, building or parking,
within 120 m of the boundary and 15 m clear of houses, in pieces that touch both the boundary and the
sea (nothing whose straight line to the course crosses a road, so the coast past Beach Drive stays
out of bounds). It is added to the sea polygon (the same red penalty area as `sea`).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pyproj
from rasterio.features import rasterize, shapes
from rasterio.transform import from_origin
from scipy import ndimage
from shapely.geometry import mapping, shape
from shapely.ops import transform, unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
RES = 0.5
W, H = int(w["width"] / RES), int(w["height"] / RES)
tr = from_origin(0, w["height"], RES, RES)
g = gpd.read_file(HERE / "build" / "course_local.geojson")
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))


def mask(geoms):
    geoms = [x for x in geoms if x is not None and not x.is_empty]
    return rasterize([(x, 1) for x in geoms], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool) \
        if geoms else np.zeros((H, W), bool)


to_utm = pyproj.Transformer.from_crs(4326, cfg["epsg"], always_xy=True).transform
# the course line before the sea was added to it (make_sea_ob.py): proposed/boundary.geojson
bnd = transform(lambda x, y, z=None: (x - w["x0"], y - w["y0"]), transform(to_utm, shape(json.load(open(HERE / "proposed" / "boundary.geojson"))["features"][0]["geometry"])))
sea_g = json.load(open(HERE / "proposed" / "sea.geojson"))["features"][0]
sea = transform(lambda x, y, z=None: (x - w["x0"], y - w["y0"]), transform(to_utm, shape(sea_g["geometry"])))
inside, sea_m = mask([bnd]), mask([sea])
block = mask([x.buffer(4.0) for x in g[g.kind.isin(["highway", "cartpath"])].geometry]
             + [x.buffer(15.0) for x in g[g.kind == "building"].geometry]
             + list(g[g.kind == "parking"].geometry))
d_sea = ndimage.distance_transform_edt(~sea_m) * RES
d_bnd, (ir, ic) = ndimage.distance_transform_edt(~inside, return_indices=True)
d_bnd = d_bnd * RES
allowed = ~inside & ~sea_m & ~block & (d_sea <= 60) & (d_bnd <= 120)
# no shore across a road: drop cells whose straight line to the nearest boundary point crosses
# a public road (Beach Drive)
roads = mask([x.buffer(3.0) for x in g[g.kind == "highway"].geometry
              if x.length > 0 and g.loc[g.geometry == x, "tags"].iloc[0].get("highway") in
              ("secondary", "tertiary", "residential", "unclassified", "primary")])
rr, cc = np.nonzero(allowed)
cross = np.zeros(len(rr), bool)
for t in np.linspace(0.05, 0.95, 24):
    r_ = np.round(rr + (ir[rr, cc] - rr) * t).astype(int)
    c_ = np.round(cc + (ic[rr, cc] - cc) * t).astype(int)
    cross |= roads[r_, c_]
allowed[rr[cross], cc[cross]] = False
lab, n = ndimage.label(allowed)
touch_b = np.unique(lab[ndimage.binary_dilation(inside, iterations=3) & allowed])
touch_s = np.unique(lab[ndimage.binary_dilation(sea_m, iterations=3) & allowed])
keep = np.intersect1d(touch_b[touch_b > 0], touch_s[touch_s > 0])
shore = np.isin(lab, keep)
polys = [shape(geom) for geom, v in shapes(shore.astype(np.uint8), mask=shore, transform=tr) if v]
shore_poly = unary_union([p.buffer(0.3) for p in polys]).buffer(-0.3).simplify(0.4)
# close the raster seam against the boundary (and the sea): reach up to the boundary line, never past it
shore_poly = shore_poly.buffer(1.5, join_style=2).difference(bnd).intersection(shore_poly.buffer(1.5, join_style=2))
print(f"[shore] {len(keep)} pieces, {shore_poly.area / 1e4:.2f} ha between the boundary and the sea")
# the penalty area: the sea plus the shore, with the offshore rocks kept inside it
pen = unary_union([sea, shore_poly.buffer(0.6)]).buffer(-0.5)
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
geo = transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), shore_poly))
json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "id": "shore_strait", "properties": {
    "osm": "shore_strait", "kind": "water", "tags": {"natural": "water", "water": "sea", "name": "Strait shore",
    "penalty": "red", "flatten": "no", "source": "land between the OSM course boundary and the coastline (developer 2026-10-31: the ocean is a red penalty area, not out of bounds (Street View photo of red stakes on the shore))"}},
    "geometry": mapping(geo)}]}, open(HERE / "proposed" / "shore.geojson", "w"))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(14, 10), dpi=100)
img = np.full((H, W, 3), 240, np.uint8)
img[sea_m] = (61, 143, 192)
img[shore] = (200, 40, 40)
img[inside] = (205, 228, 190)
for kind, col in (("fairway", (124, 195, 90)), ("green", (47, 154, 47)), ("tee", (160, 80, 208)), ("bunker", (232, 220, 160))):
    m = mask(list(g[g.kind == kind].geometry))
    img[m] = col
ax.imshow(img, extent=(0, w["width"], 0, w["height"]))
xs, ys = bnd.exterior.xy
ax.plot(xs, ys, color="orange", lw=1.2)
for _, h in g[g.kind == "hole"].iterrows():
    if h.geometry.intersection(bnd.buffer(30)).length / h.geometry.length > 0.5:
        xs, ys = h.geometry.xy
        ax.plot(xs, ys, color="k", lw=0.6)
        if True:
            ax.text(xs[0], ys[0], h.tags["ref"], fontsize=11, weight="bold")
ax.set_aspect("equal")
ax.set_title("blue: sea   red: shore between the course and the sea   pale green: inside the boundary   orange: boundary")
plt.tight_layout(); plt.savefig(HERE / "proposed" / "shore.png")

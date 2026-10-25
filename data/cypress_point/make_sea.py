"""Propose the Pacific as one red penalty area (developer, 2026-10-24: "the Pacific should
absolutely be a water hazard in all circumstances"). Course-chat helper, not a make step.

    python3 data/cypress_point/make_sea.py   ->  proposed/sea.geojson, proposed/sea.png

OSM maps the ocean only as natural=coastline ways (land on the left, sea on the right of each
way's direction). This cuts the world + 300 m box by every coastline way, keeps the faces on the
sea side, and writes them as one natural=water feature `sea_pacific` (WGS84). The config lists it
in `red_water_osm`, so s08 paints it as a penalty area inside and outside the boundary and s10
exports it red (never out of bounds). Rocks mapped as closed coastline ways stay land.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pyproj
from shapely.geometry import LineString, Point, box, mapping, shape
from shapely.ops import polygonize, transform, unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
M = 300
to_utm = pyproj.Transformer.from_crs(4326, cfg["epsg"], always_xy=True).transform
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
area = box(w["x0"] - M, w["y0"] - M, w["x0"] + w["width"] + M, w["y0"] + w["height"] + M)

lines = []
for f in json.load(open(HERE / "raw" / "overpass.geojson"))["features"]:
    if f["properties"].get("natural") != "coastline":
        continue
    g = transform(to_utm, shape(f["geometry"]))
    if g.geom_type == "Polygon":
        g = g.exterior
    for part in getattr(g, "geoms", [g]):
        if part.geom_type == "LineString" and part.intersects(area):
            lines.append(part)
# cut at a box a little inside the clip (the export was clipped in WGS84, so line ends sit
# just outside the UTM box) so every coastline way crosses the box edge
inner = area.buffer(-20, join_style=2)
lines = [ln.intersection(inner) for ln in lines]
lines = [p for ln in lines for p in getattr(ln, "geoms", [ln]) if p.geom_type == "LineString" and p.length > 0]
faces = list(polygonize(unary_union(lines + [inner.exterior])))


def sea_side(face) -> bool:
    """True if the face lies on the right of the nearest coastline segment (the sea side)."""
    p = face.representative_point()
    best = None
    for ln in lines:
        d = ln.distance(p)
        if best is None or d < best[0]:
            best = (d, ln)
    ln = best[1]
    t = ln.project(p)
    a, b = ln.interpolate(max(0, t - 0.5)), ln.interpolate(min(ln.length, t + 0.5))
    q = ln.interpolate(t)
    cross = (b.x - a.x) * (p.y - q.y) - (b.y - a.y) * (p.x - q.x)
    return cross < 0   # right of the direction of travel


sea = unary_union([f for f in faces if sea_side(f)])
# offshore rocks mapped as closed coastline ways are holes in the sea: fill them, so a ball on a
# rock in the Pacific is in the penalty area too ("in all circumstances", developer 2026-10-24)
from shapely.geometry import MultiPolygon, Polygon
sea = unary_union([Polygon(p.exterior) for p in getattr(sea, "geoms", [sea])])
print(f"{len(lines)} coastline ways, {len(faces)} faces, sea {sea.area / 1e4:.1f} ha "
      f"({'%d parts' % len(sea.geoms) if sea.geom_type == 'MultiPolygon' else 'one part'})")
out = {"type": "FeatureCollection", "features": [{
    "type": "Feature", "id": "sea_pacific",
    "properties": {"osm": "sea_pacific", "kind": "water",
                   "tags": {"natural": "water", "water": "sea", "name": "Pacific Ocean", "penalty": "red",
                            "source": "OSM natural=coastline, sea side (course chat 2026-10-24)"}},
    "geometry": mapping(transform(to_wgs, sea))}]}
(HERE / "proposed").mkdir(exist_ok=True)
json.dump(out, open(HERE / "proposed" / "sea.geojson", "w"))

# picture: the sea over the boundary and holes
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import geopandas as gpd
g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
fig, ax = plt.subplots(figsize=(14, 9), dpi=100)
for poly in getattr(sea, "geoms", [sea]):
    xs, ys = poly.exterior.xy
    ax.fill(np.array(xs) - w["x0"], np.array(ys) - w["y0"], color="#3d8fc0", alpha=0.6, lw=0)
    for r in poly.interiors:
        xs, ys = r.xy
        ax.fill(np.array(xs) - w["x0"], np.array(ys) - w["y0"], color="#ffffff", lw=0)
for kind, col in (("fairway", "#7cc35a"), ("green", "#2f9a2f"), ("tee", "#a050d0"), ("bunker", "#e8dca0")):
    for geom in g[g.kind == kind].geometry:
        for p in getattr(geom, "geoms", [geom]):
            xs, ys = p.exterior.xy
            ax.fill(np.array(xs) - w["x0"], np.array(ys) - w["y0"], color=col, lw=0)
b = g[g.osm == "w36435651"].geometry.iloc[0]
xs, ys = b.exterior.xy
ax.plot(np.array(xs) - w["x0"], np.array(ys) - w["y0"], color="orange", lw=1.2)
for _, h in g[g.kind == "hole"].iterrows():
    if h.geometry.intersection(b.buffer(30)).length / h.geometry.length > 0.5:
        xs, ys = h.geometry.xy
        ax.plot(np.array(xs) - w["x0"], np.array(ys) - w["y0"], color="red", lw=0.8)
        ax.text(xs[0] - w["x0"], ys[0] - w["y0"], h.tags["ref"] if isinstance(h.tags, dict) else json.loads(h.tags)["ref"], color="red")
ax.set_xlim(0, 1000); ax.set_ylim(250, 1280); ax.set_aspect("equal"); ax.grid(alpha=0.3)
ax.set_title("proposed red penalty area: the Pacific (blue); boundary orange")
plt.tight_layout(); plt.savefig(HERE / "proposed" / "sea.png")

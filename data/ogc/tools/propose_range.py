"""Proposal: the driving range polygon for Oregon Golf Club (OSM maps none).

The developer (2026-10-19): the range takes in the target greens P3-P9 of
proposed/osm_labelled.png. Its edge is taken from mapped OSM geometry, not drawn:
the face of the road / cart-path network that holds those seven greens, minus the
short-game area inside it (practice fairway relation/14014798 with greens P1/P2
and bunkers w984701647-9, each grown 4 m). The mown collar around target P3
(fairway relation/14014795) is part of the range.
Writes proposed/range.geojson (EPSG:32610) and proposed/range.png.
Run: python3 data/ogc/tools/propose_range.py
"""
import json
from pathlib import Path

import geopandas as gpd
import matplotlib
import pyproj
from shapely.geometry import shape
from shapely.ops import polygonize, transform, unary_union

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

D = Path(__file__).resolve().parents[1]
TARGETS = ["way/866037971", "way/866037973", "way/866037974", "way/866037975",
           "way/866037976", "way/866037977", "way/866037978"]
SHORT_GAME = ["relation/14014798", "way/865190437", "way/865190439",
              "way/984701647", "way/984701648", "way/984701649"]

fs = json.load(open(D / "raw" / "overpass.geojson"))["features"]
tr = pyproj.Transformer.from_crs(4326, 32610, always_xy=True).transform
P = lambda f: transform(tr, shape(f["geometry"]))  # noqa: E731
by_id = {f["id"]: f for f in fs}
pts = [P(by_id[i]).centroid for i in TARGETS]
lines = [P(f) for f in fs if f["geometry"]["type"] == "LineString"
         and (f["properties"].get("highway") or f["properties"].get("golf") in ("cartpath", "path"))]
faces = sorted(polygonize(unary_union(lines)), key=lambda F: -sum(p.within(F) for p in pts))
face = faces[0]
assert all(p.within(face) for p in pts), "the path loop does not hold every target green"
cut = unary_union([P(by_id[i]).buffer(4) for i in SHORT_GAME])
rng = face.difference(cut)
if rng.geom_type == "MultiPolygon":
    rng = max(rng.geoms, key=lambda p: p.area)
rng = rng.simplify(0.3)
g = gpd.GeoDataFrame({"osm": ["range_paths"], "kind": ["driving_range"],
                      "tags": [json.dumps({"golf": "driving_range", "source": "osm_path_loop"})]},
                     geometry=[rng], crs=32610)
g.to_file(D / "proposed" / "range.geojson", driver="GeoJSON")
print(f"range: {rng.area:.0f} m2, bounds {[round(v) for v in rng.bounds]}")

fig, ax = plt.subplots(figsize=(8, 5), dpi=110)
for f in fs:
    p = f["properties"]
    geo = P(f)
    if not geo.intersects(face.buffer(80)):
        continue
    col = {"green": "#2e9e3a", "tee": "#c9a0dc", "fairway": "#8fd16a", "bunker": "#e8d9a0"}.get(p.get("golf"))
    for q in getattr(geo, "geoms", [geo]):
        if q.geom_type == "Polygon" and col:
            ax.fill(*q.exterior.xy, color=col)
        elif q.geom_type == "Polygon" and "building" in p:
            ax.fill(*q.exterior.xy, color="#888")
        elif q.geom_type == "LineString":
            ax.plot(*q.xy, color="#999", lw=.6)
ax.fill(*rng.exterior.xy, color="#d9534f", alpha=.25)
ax.plot(*rng.exterior.xy, color="#d9534f", lw=1.2)
ax.set_aspect("equal"); ax.set_xticks([]); ax.set_yticks([])
ax.set_title("Proposed driving range (red, out of bounds): OSM path loop around P3-P9, short-game area excluded", fontsize=8)
plt.tight_layout(); plt.savefig(D / "proposed" / "range.png")

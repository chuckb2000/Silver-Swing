"""Proposal (course chat, 2026-10-31; not approved): OSM has no leisure=golf_course
polygon at Pronghorn, so the out-of-bounds line is built from the Nicklaus course's own
mapped play: every OSM fairway, green, tee and bunker whose centre is within 90 m of a
Nicklaus hole line (refs 1-18 with a par), and the hole lines themselves, each grown
GROW_M; gaps under CLOSE_M closed; then every building grown HOUSE_M (a house and its
yard) and the driving range taken out. Desert between the corridors that the closing
doesn't reach stays out of bounds.

The Fazio course's few mapped holes (west; lines with no par) are not used.

    python3 data/pronghorn_nicklaus/make_boundary.py   (after s01 + merge_edits)

Writes proposed/boundary.geojson (WGS84) and proposed/boundary.png.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from shapely.geometry import Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
GROW_M = 35.0     # round mapped play
LINE_M = 40.0     # round each hole line (the tee shot's landing zone may be wider than the mapped fairway)
CLOSE_M = 25.0    # close gaps narrower than ~2x this between corridors
HOUSE_M = 12.0    # a building and its yard

cfg = json.load(open(HERE / "course_config.json"))
g = gpd.read_file(HERE / "edited" / "course.geojson").to_crs(cfg["epsg"])
tags = g.tags.apply(lambda t: t if isinstance(t, dict) else json.loads(t or "{}"))
lines = g[(g.kind == "hole") & tags.apply(lambda t: bool(t.get("par")))]
near = unary_union(list(lines.geometry)).buffer(90)
play = g[g.kind.isin(["fairway", "green", "tee", "bunker", "water_hazard"]) & g.geometry.centroid.within(near)]
grow = unary_union(list(play.geometry.buffer(GROW_M)) + list(lines.geometry.buffer(LINE_M)))
grow = grow.buffer(CLOSE_M).buffer(-CLOSE_M)
houses = unary_union(list(g[g.kind == "building"].geometry.buffer(HOUSE_M)))
rng = unary_union(list(g[g.kind == "driving_range"].geometry))
new = grow.difference(houses).difference(rng)
parts = sorted(getattr(new, "geoms", [new]), key=lambda p: -p.area)
print("parts (m2):", [round(p.area) for p in parts[:8]])
new = parts[0]
new = Polygon(new.exterior, [i for i in new.interiors if Polygon(i).area > 400]).simplify(0.8)
# every mapped play feature should be inside
outside = [r.osm for _, r in play.iterrows() if r.geometry.difference(new).area > 2]
print("play features partly outside:", outside)
out = gpd.GeoDataFrame([{"osm": "pronghorn_boundary", "kind": "boundary",
                         "tags": {"leisure": "golf_course", "name": "Pronghorn Nicklaus",
                                  "source": "course chat proposal: Nicklaus play grown 35 m, hole lines 40 m, gaps closed 25 m, buildings + 12 m and the range removed (make_boundary.py)"}}],
                       geometry=[new], crs=cfg["epsg"])
out.to_crs(4326).to_file(HERE / "proposed" / "boundary.geojson", driver="GeoJSON")
print(f"boundary {new.area/1e4:.1f} ha")
fig, ax = plt.subplots(figsize=(14, 14))
col = {"fairway": "#8fd18f", "green": "#2e9e2e", "tee": "#d04fd0", "bunker": "#e8d890", "water_hazard": "#4060ff", "building": "#555555"}
for _, r in g[g.kind.isin(list(col))].iterrows():
    gm = r.geometry
    for p in getattr(gm, "geoms", [gm]):
        if p.geom_type == "Polygon":
            ax.fill(*p.exterior.xy, color=col[r.kind], lw=0)
for _, r in lines.iterrows():
    ax.plot(*r.geometry.xy, "r-", lw=0.8)
ax.plot(*new.exterior.xy, color="blue", lw=1.2)
for i in new.interiors:
    ax.plot(*i.xy, color="blue", lw=0.8)
ax.set_aspect("equal"); ax.grid(alpha=0.3)
plt.tight_layout(); plt.savefig(HERE / "proposed" / "boundary.png", dpi=70)

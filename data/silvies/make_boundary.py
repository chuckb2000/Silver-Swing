"""Proposal (course chat, 2026-10-25; not yet approved): the OSM boundary w904342362 is a
coarse 11-point outline; at the 18th and 6th tees it runs 1-15 m from mown grass, and one
49 m2 fairway piece by the 6th tee crosses it. Grow it to take in 30 m round every OSM
fairway, green, tee and bunker whose centre is inside it and within 100 m of a Craddock
hole line, and every hole line, so no ball
on grass that looks in play is out of bounds. Writes proposed/boundary_grown.geojson
(WGS84) and proposed/boundary_grown.png.

    python3 data/silvies/make_boundary.py      (after s01 + make_edits + merge_edits)
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
COURSE = "w904342362"
GROW_M = 30.0

cfg = json.load(open(HERE / "course_config.json"))
g = gpd.read_file(HERE / "edited" / "course.geojson").to_crs(cfg["epsg"])
B = g[g.osm == COURSE].geometry.iloc[0]
lines = g[g.kind == "hole"]
near = unary_union(list(lines.geometry)).buffer(100)  # Craddock play only: McVeigh's Gauntlet pieces on the south edge stay out
play = g[g.kind.isin(["fairway", "green", "tee", "bunker"]) & g.geometry.centroid.within(B) & g.geometry.centroid.within(near)]
grow = unary_union(list(play.geometry.buffer(GROW_M)) + list(lines.geometry.buffer(GROW_M)))
new = unary_union([B, grow]).buffer(10).buffer(-10)
new = max(getattr(new, "geoms", [new]), key=lambda p: p.area)
from shapely.geometry import Polygon
new = Polygon(new.exterior).simplify(1.0)
out = gpd.GeoDataFrame([{"osm": COURSE + "_grown", "kind": "boundary",
                         "tags": {"leisure": "golf_course", "name": "Silvies Ranch", "source": "OSM w904342362 grown 30 m round play (proposal)"}}],
                       geometry=[new], crs=cfg["epsg"])
out.to_crs(4326).to_file(HERE / "proposed" / "boundary_grown.geojson", driver="GeoJSON")
added = new.difference(B)
print(f"OSM {B.area/1e4:.1f} ha -> {new.area/1e4:.1f} ha (+{added.area:.0f} m2 in {len(getattr(added, 'geoms', [added]))} pieces)")
fig, ax = plt.subplots(figsize=(14, 12))
for _, r in g[g.kind.isin(["fairway", "green", "tee", "bunker"])].iterrows():
    gm = r.geometry
    for p in getattr(gm, "geoms", [gm]):
        if p.geom_type == "Polygon":
            ax.fill(*p.exterior.xy, color={"fairway": "#8fd18f", "green": "#2e9e2e", "tee": "#d04fd0", "bunker": "#e8d890"}[r.kind], lw=0)
for _, r in lines.iterrows():
    ax.plot(*r.geometry.xy, "r-", lw=0.8)
    ax.text(*r.geometry.coords[0], r.tags.get("ref") if isinstance(r.tags, dict) else "", color="red", fontsize=10)
ax.plot(*B.exterior.xy, color="orange", lw=2, label="OSM boundary")
ax.plot(*new.exterior.xy, color="blue", lw=1.2, ls="--", label=f"grown {GROW_M:.0f} m round play (proposal)")
for p in getattr(added, "geoms", [added]):
    if p.area > 1:
        ax.fill(*p.exterior.xy, color="blue", alpha=0.25, lw=0)
ax.set_aspect("equal"); ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout(); plt.savefig(HERE / "proposed" / "boundary_grown.png", dpi=80)

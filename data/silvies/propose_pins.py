"""Silvies: one pin per green that ends a hole of any layout, at the green's centre (or the
point deepest inside an odd-shaped green). OSM maps no golf=pin; the game adds its own pin
positions round each centre pin (pins.ts). Craddock and Hankins share nine greens: one pin
each. Writes proposed/pins.geojson; make_edits.py adds it. Run after merge_edits:

    python3 data/silvies/propose_pins.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import polylabel

D = Path(__file__).resolve().parent
EPSG = json.load(open(D / "course_config.json"))["epsg"]
g = gpd.read_file(D / "edited" / "course.geojson").to_crs(EPSG)
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
greens = g[g.kind == "green"]
rows, seen = [], set()
for _, h in g[g.kind == "hole"].iterrows():
    gi = greens.distance(Point(h.geometry.coords[-1])).idxmin()
    gosm = greens.loc[gi].osm
    if gosm in seen:
        continue
    seen.add(gosm)
    poly = greens.loc[gi].geometry
    c = poly.centroid
    p = c if poly.buffer(-3.5).contains(c) else polylabel(poly, 0.1)   # the game wants the centre pin 10 ft (3.05 m) inside the edge (pins.ts)
    rows.append({"osm": f"pin_{gosm}", "kind": "pin",
                 "tags": json.dumps({"golf": "pin", "source": f"proposal: centre of green {gosm}"}), "geometry": p})
out = gpd.GeoDataFrame(rows, geometry="geometry", crs=EPSG).to_crs(4326).sort_values("osm")
out.to_file(D / "proposed" / "pins.geojson", driver="GeoJSON")
print(f"[propose_pins] {len(out)} pins -> proposed/pins.geojson")

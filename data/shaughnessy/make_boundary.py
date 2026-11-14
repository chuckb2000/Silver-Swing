"""Course chat, 2026-11-13: OSM's boundary (relation 1425001) cuts through the 4th hole's
back tee box (w687491740): 105 of its 260 m2 lie outside, so the back of the tee would be
out of bounds. The boundary is copied with the tee joined to it (the convex hull of the
tee and the stretch of the boundary within 5 m of it; no road runs there), as the
COURSE_LESSONS repair. `python3 data/shaughnessy/make_boundary.py` (after s01) writes
proposed/boundary.geojson (WGS84).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
b = g[g.osm == "r1425001"].iloc[0]
tee = g[g.osm == "w687491740"].geometry.iloc[0]
patch = unary_union([tee, b.geometry.intersection(tee.buffer(5.0))]).convex_hull
new = unary_union([b.geometry, patch])
print(f"boundary {b.geometry.area:.0f} -> {new.area:.0f} m2; tee outside before {tee.difference(b.geometry).area:.0f} m2, after {tee.difference(new).area:.1f} m2")
out = gpd.GeoDataFrame([{"osm": "r1425001_tee4", "kind": "boundary", "tags": {**b.tags, "note": "OSM boundary with the 4th hole's back tee joined (make_boundary.py)"}}],
                       geometry=[new], crs=cfg["epsg"]).to_crs(4326)
out["tags"] = out["tags"].apply(json.dumps)
(HERE / "proposed").mkdir(exist_ok=True)
out.to_file(HERE / "proposed" / "boundary.geojson", driver="GeoJSON")

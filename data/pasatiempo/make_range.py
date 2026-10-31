"""The practice range east of hole 1 (course-chat helper, not a make step).

OSM maps it as two golf=fairway areas that belong to no hole: the 120 m mown strip
w1041848694 and the hitting area r14043909 at its south end by the clubhouse (the audit:
"more than 30 m from every hole line"). The scouting notes the club's driving range left
of hole 1 (out of bounds, in play on 1 and 9), and the NAIP photo shows a wide mown strip
with a hitting area at the clubhouse end. Copies both as golf=driving_range into
proposed/range.geojson (WGS84) for edits.json, which drops the fairways, so the standing
default (driving_range_is_ob) makes the range out of bounds. No shape is drawn.
"""
from pathlib import Path

import geopandas as gpd

D = Path(__file__).resolve().parent
g = gpd.read_file(D / "raw" / "osm.geojson")
t = g[g["osm"].isin(["w1041848694", "r14043909"])].copy()
assert len(t) == 2, t["osm"].tolist()
t["kind"] = "driving_range"
t["tags"] = [{"golf": "driving_range", "source": f"OSM {o} (mapped as golf=fairway), NAIP"} for o in t["osm"]]
t["osm"] = ["range_" + o for o in t["osm"]]
t[["osm", "kind", "tags", "geometry"]].to_file(D / "proposed" / "range.geojson", driver="GeoJSON")
print("proposed/range.geojson:", t["osm"].tolist())

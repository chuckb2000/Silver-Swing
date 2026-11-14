"""Wine Valley (course chat 2026-11-13): the OSM course boundary (way 436979104) cuts across the
9th hole's back tee (way 1324649618; 22 m2 of it lies outside, so the Gold tee would be out of
bounds). This joins the hull of that tee box and the boundary edge next to it onto the
boundary (COURSE_LESSONS 2, "Repairing the boundary") and writes proposed/boundary.geojson
(WGS84), added in edits.json in place of the original.

    python3 data/wine_valley/make_boundary.py      (reads raw/osm.geojson)
"""
import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

D = Path(__file__).resolve().parent
g = gpd.read_file(D / "raw" / "osm.geojson").to_crs(32611)
b = g[g.osm == "w436979104"].geometry.iloc[0]
tee = g[g.osm == "w1324649618"].geometry.iloc[0]
patch = unary_union([tee.buffer(2.0), b.intersection(tee.buffer(12.0))]).convex_hull
nb = unary_union([b, patch]).buffer(0)
assert nb.geom_type == "Polygon"
row = g[g.osm == "w436979104"].copy()
row["osm"] = "w436979104_fixed"
row["tags"] = [json.dumps({"leisure": "golf_course", "name": "Wine Valley Golf Club",
                           "source": "OSM way 436979104 joined with the hull of the 9th hole's back tee (w1324649618) +2 m"})]
row["geometry"] = [nb]
row[["osm", "kind", "tags", "geometry"]].to_crs(4326).to_file(D / "proposed" / "boundary.geojson", driver="GeoJSON")
print(f"boundary {b.area:.0f} -> {nb.area:.0f} m2")

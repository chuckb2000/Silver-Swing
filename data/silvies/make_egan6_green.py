"""Silvies: Chief Egan 6's green as the developer traced it in the green desk (2026-10-25,
data/silvies/desk/greens/E6-green.json, 172 m2; OSM w904342360 is 154 m2). Writes
proposed/egan6_green.geojson (WGS84); make_edits.py swaps it for the OSM green.

    python3 data/silvies/make_egan6_green.py
"""
import json
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Polygon
HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
d = json.load(open(HERE / "desk" / "greens" / "E6-green.json"))
p = Polygon(d["features"][0]["poly"]).buffer(0)
out = gpd.GeoDataFrame([{"osm": "w904342360_traced", "kind": "green",
                         "tags": json.dumps({"golf": "green", "source": "developer, green desk 2026-10-25 (traced over OSIP 2024)"})}],
                       geometry=[p], crs=None)
out = out.set_geometry(out.geometry.translate(cfg["world"]["x0"], cfg["world"]["y0"])).set_crs(cfg["epsg"]).to_crs(4326)
out.to_file(HERE / "proposed" / "egan6_green.geojson", driver="GeoJSON")
print(f"egan 6 green {p.area:.0f} m2")

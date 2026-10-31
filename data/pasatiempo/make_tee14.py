"""OSM way w1041814063 (tagged golf=bunker + natural=sand) is the 14th's White tee: the
USDA NAIP photo shows a mown green rectangle there, beside the cart path, 48 m ahead of
the Gold tee, and no sand. Copies it as a tee polygon into proposed/tee14_white.geojson
(WGS84) for edits.json, which drops the bunker."""
from pathlib import Path

import geopandas as gpd

D = Path(__file__).resolve().parent
g = gpd.read_file(D / "raw" / "osm.geojson")
t = g[g["osm"] == "w1041814063"].copy()
t["kind"] = "tee"
t["osm"] = "tee14_white"
t["tags"] = [{"golf": "tee", "source": "OSM w1041814063 (mapped as a bunker), NAIP"}]
t[["osm", "kind", "tags", "geometry"]].to_file(D / "proposed" / "tee14_white.geojson", driver="GeoJSON")
print("proposed/tee14_white.geojson")

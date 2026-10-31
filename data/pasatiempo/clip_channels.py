"""Cut the barranca channel proposals (pipeline/propose_channels.py, run as
`python3 propose_channels.py pasatiempo w42855499 w265532264`) to the course boundary
+ 25 m, so the creeks don't run on for kilometres through the scenery as open water.
Writes proposed/channels_clipped.geojson (WGS84, same ids and tags)."""
import json
from pathlib import Path

import geopandas as gpd

D = Path(__file__).resolve().parent
cfg = json.load(open(D / "course_config.json"))
osm = gpd.read_file(D / "raw" / "overpass.geojson")
b = osm[osm["id"] == "relation/13921737"].to_crs(cfg["epsg"]).geometry.iloc[0].buffer(25)
ch = gpd.read_file(D / "proposed" / "channels_lidar.geojson").to_crs(cfg["epsg"])
ch["geometry"] = ch.geometry.intersection(b)
ch = ch[~ch.geometry.is_empty]
ch.to_crs(4326).to_file(D / "proposed" / "channels_clipped.geojson", driver="GeoJSON")
for _, r in ch.iterrows():
    print(r["osm"], round(r.geometry.area), "m2 inside the boundary + 25 m")

"""Areas where the lidar's crowns are not trees, for s05 (course_config not_trees_areas).

    python3 data/chambers_bay/make_not_trees.py

The BNSF main line along Puget Sound: a freight train stood on it when the 2020
lidar was flown (a row of 4.7 m "crowns" all along the track). OSM railway=rail
lines from raw/overpass.geojson inside the world, buffered 4 m, written to
proposed/not_trees.geojson (WGS84). Deterministic; rerun after a new OSM export.
"""
import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import box, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
world = box(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"])
feats = json.load(open(HERE / "raw" / "overpass.geojson"))["features"]
rails = [shape(f["geometry"]) for f in feats
         if f["properties"].get("railway") == "rail" and f["geometry"]["type"] in ("LineString", "MultiLineString")]
g = gpd.GeoSeries(rails, crs=4326).to_crs(cfg["epsg"])
area = unary_union([r.buffer(4.0) for r in g if r.intersects(world)]).intersection(world)
out = gpd.GeoDataFrame({"what": ["BNSF railway, 4 m either side (a train on the track in the 2020 lidar)"]}, geometry=[area], crs=cfg["epsg"]).to_crs(4326)
out.to_file(HERE / "proposed" / "not_trees.geojson", driver="GeoJSON")
print(f"[not_trees] {len(rails)} OSM rail lines, {area.area:,.0f} m2 -> proposed/not_trees.geojson")

"""Propose the area of the cypress clump in the middle of the 17th fairway, whose trees the
standing default (trees_off_fairways_m, and the drop of crowns in bunkers) would remove
(course-chat helper, not a make step; config keep_trees_areas).

    python3 data/cypress_point/make_keep_trees.py   ->  proposed/keep_trees.geojson

The clump stands among bunkers in OSM fairway r19320968, about 330 m from the 17th tee; it is
the hole's signature (the drive is played left or right of it), visible on the NAIP photo
and in the developer's aerial 55c3d0764759c60c08235293_cypress-point.jpg. The area is the
convex hull of the lidar crowns there (local x 300-345, y 530-595) grown by 3 m.
"""
import json
from pathlib import Path

import pyproj
from shapely.geometry import MultiPoint, mapping
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
r = json.load(open(HERE / "build" / "trees_report.json"))
pts = [(t["x"], t["y"]) for t in r["dropped_on_playing_surfaces"] if 300 <= t["x"] <= 345 and 530 <= t["y"] <= 595]
pts += [(t["x"], t["y"]) for t in json.load(open(HERE / "build" / "trees.json")) if 300 <= t["x"] <= 345 and 530 <= t["y"] <= 595]
area = MultiPoint(pts).convex_hull.buffer(3.0)
print(f"{len(pts)} crowns, area {area.area:.0f} m2")
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
geo = transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), area))
json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {
    "name": "17th fairway cypress clump", "source": "lidar crowns, course chat 2026-10-24"}, "geometry": mapping(geo)}]},
    open(HERE / "proposed" / "keep_trees.geojson", "w"))

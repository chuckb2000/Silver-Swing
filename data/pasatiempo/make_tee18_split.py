"""Split the 18th's long curved teeing ground (OSM w1041819911, 377 m2) where the card's
tees fall, so the Gold and White sets each get their own end (course-chat helper, not a
make step; the Cypress Point method, data/cypress_point/make_tee_split.py).

    python3 data/pasatiempo/make_tee18_split.py   ->  proposed/tee18_split.geojson

The strip runs 138-185 yd from the 18th green centre. Gold (173) sits in its back part,
White (145; also Gold/White and White/Green) at its front tip; s06 gave the whole strip to
Gold and played White from the hole line's start, 177 yd (+22 %). Cut across at 139 m
(152 yd) from the green centre: the front piece (138-152 yd) is White, the back piece
(152-185 yd) Gold. No shape is invented: the two pieces are the OSM box.
"""
import json
from pathlib import Path

import geopandas as gpd
import pyproj
from shapely.geometry import Point, mapping
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
g = gpd.read_file(HERE / "build" / "course_local.geojson")
B = g[g.osm == "w1041819911"].geometry.iloc[0]
GREEN = Point(937.44, 1443.16)   # the 18th green's centre (w1043272729), local metres
R = 139.0                        # 152 yd
disk = GREEN.buffer(R, 256)
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
feats = []
for fid, part, tee_set in (("tee_w1041819911_front", B.intersection(disk), "White"),
                           ("tee_w1041819911_back", B.difference(disk), "Gold")):
    geo = transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), part))
    feats.append({"type": "Feature", "id": fid, "properties": {"osm": fid, "kind": "tee", "tags": {
        "golf": "tee", "hole": "18", "tee_set": tee_set, "was": "w1041819911",
        "source": "OSM w1041819911 cut at 139 m from the 18th green centre (course chat 2026-10-31)"}},
        "geometry": mapping(geo)})
    print(fid, tee_set, part.geom_type, round(part.area), "m2,",
          round(part.centroid.distance(GREEN) / 0.9144), "yd from the green centre")
json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "proposed" / "tee18_split.geojson", "w"))

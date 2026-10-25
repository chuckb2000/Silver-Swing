"""Propose splitting the long curved tee box shared by holes 2 and 14 (OSM w281499468, 406 m2)
at a line across it, so each hole has its own end (course-chat helper, not a make step).

    python3 data/cypress_point/make_tee_split.py   ->  proposed/tee_split.geojson

s06 gives each hole one box per tee set, so the shared strip went to 14 and hole 2 played from
its line start (552 yd vs Middle 535). Along the strip, hole 2 measures 528 yd at the south end
and 577 at the north end, hole 14 412 to 383: 2 plays from the south half (Middle 535 at
y 919), 14 from the north half (Middle 384 near y 950). Cut across at local y = 932 (hole 2
Championship 549 sits on the cut). No shape is invented: the two pieces are the OSM box.
"""
import json
from pathlib import Path

import geopandas as gpd
import pyproj
from shapely.geometry import box, mapping
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
g = gpd.read_file(HERE / "build" / "course_local.geojson")
B = g[g.osm == "w281499468"].geometry.iloc[0]
CUT = 932.0
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
feats = []
for fid, part, hole in (("tee_w281499468_s", B.intersection(box(0, 0, 3000, CUT)), 2),
                        ("tee_w281499468_n", B.intersection(box(0, CUT, 3000, 3000)), 14)):
    geo = transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), part))
    feats.append({"type": "Feature", "id": fid, "properties": {"osm": fid, "kind": "tee", "tags": {
        "golf": "tee", "hole": str(hole), "tee_set": "Middle", "was": "w281499468",
        "source": "OSM w281499468 cut at local y 932 (course chat 2026-10-24)"}}, "geometry": mapping(geo)})
    print(fid, "hole", hole, round(part.area), "m2")
json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "proposed" / "tee_split.geojson", "w"))

"""The developer's 6th green and its surround from the tracing desk (2026-11-08). Course-chat helper.

    python3 data/spruce_peak/make_desk_green6.py   ->  proposed/desk_green6.geojson

desk/hole06.json is what the developer saved (local metres): a green of about 330 m2 (the round end
under the bunker and the first part of the tongue, OSM's 169 m2 green was too small) and a fairway
round it out to the end of the tongue by the pond, which replaces OSM's fairway r19828147 there.
The page offered the course chat's trace from the VCGI photo (green6_vcgi, 805 m2, the whole light
shape as green); the developer redrew it as green + fairway, so that trace is not used.
"""
import json
from pathlib import Path

import pyproj
from shapely.geometry import Polygon, mapping
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
desk = json.load(open(HERE / "desk" / "hole06.json"))
feats = []
for f in desk["features"]:
    P = Polygon(f["poly"]).buffer(0)
    geo = transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), P))
    fid = {"green": "desk_green_6", "fairway": "desk_fairway_6"}[f["kind"]]
    print(f"[desk6] {fid}: {P.area:.0f} m2")
    feats.append({"type": "Feature", "id": fid, "properties": {"osm": fid, "kind": f["kind"], "tags": {
        "golf": f["kind"], "hole": "6", "source": "tracing desk (developer 2026-11-08)", "approved": "developer 2026-11-08"}},
        "geometry": mapping(geo)})
json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "proposed" / "desk_green6.geojson", "w"))

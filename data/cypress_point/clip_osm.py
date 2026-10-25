"""Cut the developer's Overpass export to the world (course-chat helper; run by `make fetch`).

    python3 data/cypress_point/clip_osm.py <export.3.geojson>  ->  data/cypress_point/raw/overpass.geojson

The export (release cypress-point-data, export.3.geojson, 16 MB) holds coastline ways
that run the length of California. Keep every feature that touches the world + 300 m,
clip the coastline lines to that box (they are scenery only), and keep only `@id` among
the metadata properties (COURSE_LESSONS.md 17: @user/@timestamp would become OSM tags).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pyproj
from shapely.geometry import box, mapping, shape
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
M = 300
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
area = transform(to_wgs, box(w["x0"] - M, w["y0"] - M, w["x0"] + w["width"] + M, w["y0"] + w["height"] + M))

src = json.load(open(sys.argv[1]))
out = []
for f in src["features"]:
    if f.get("geometry") is None:
        continue
    g = shape(f["geometry"])
    if not g.intersects(area):
        continue
    props = {k: v for k, v in f["properties"].items() if not k.startswith("@") or k == "@id"}
    if props.get("natural") == "coastline" and not area.contains(g):
        g = g.intersection(area)
        if g.is_empty:
            continue
    out.append({"type": "Feature", "id": f.get("id", props.get("@id")), "properties": props,
                "geometry": mapping(g)})

dst = HERE / "raw" / "overpass.geojson"
dst.parent.mkdir(exist_ok=True)
json.dump({"type": "FeatureCollection", "features": out}, open(dst, "w"), separators=(",", ":"))
print(f"{len(out)} of {len(src['features'])} features -> {dst}")

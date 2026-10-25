"""Cut the developer's Overpass export to the world (course-chat helper; run by `make fetch`).

    python3 data/silvies/clip_osm.py <export.geojson>  ->  data/silvies/raw/overpass.geojson

The export (release silvies-data, export.geojson, 7.8 MB, 2026-10-25) holds route
relations (US 395, "NHS High Priority Corridor 19") whose member ways run hundreds of
kilometres. Keep every feature that touches the world + 300 m, clip anything not wholly
inside that box to it (scenery only: roads and rivers), and keep only `@id` among the
metadata properties (COURSE_LESSONS.md 17).
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
    if not area.contains(g):
        if g.geom_type in ("Polygon", "MultiPolygon") and (props.get("golf") or props.get("leisure") == "golf_course"):
            pass  # course features stay whole
        else:
            g = g.intersection(area)
            if g.is_empty:
                continue
    out.append({"type": "Feature", "id": f.get("id", props.get("@id")), "properties": props,
                "geometry": mapping(g)})

dst = HERE / "raw" / "overpass.geojson"
dst.parent.mkdir(exist_ok=True)
json.dump({"type": "FeatureCollection", "features": out}, open(dst, "w"), separators=(",", ":"))
print(f"{len(out)} of {len(src['features'])} features -> {dst}")

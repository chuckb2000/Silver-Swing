"""Write raw/overpass.geojson for this course from one or more Overpass Turbo
exports (course-chat helper, not a `make course` step; the output is committed).

    python3 data/<id>/make_osm.py EXPORT.geojson [MORE.geojson ...]

Copied from data/pacific_dunes/make_osm.py. Sandpines: the developer's export
`export.2.geojson` (GitHub release `florence-data`) covers a whole region
(15.8 MB); this keeps the features near the world. The exports are merged in order (a feature
already taken from an earlier file, by its `@id`, is skipped), metadata
properties (@user, @uid, @timestamp, @version, @changeset) are dropped so they
can't become OSM tags (COURSE_LESSONS.md 17), and only features that touch the
world box grown by 300 m are kept (the coastline way of the whole state coast
is dropped with the rest of the far-off features).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import box, shape

HERE = Path(__file__).resolve().parent
META = {"@user", "@uid", "@timestamp", "@version", "@changeset", "timestamp", "user", "uid", "version", "changeset"}
MARGIN_M = 300


def main(paths: list[str]):
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    tr = Transformer.from_crs(cfg["epsg"], 4326, always_xy=True)
    area = box(*tr.transform_bounds(w["x0"] - MARGIN_M, w["y0"] - MARGIN_M,
                                    w["x0"] + w["width"] + MARGIN_M, w["y0"] + w["height"] + MARGIN_M, densify_pts=21))
    seen, out = set(), []
    for p in paths:
        for f in json.load(open(p))["features"]:
            fid = f["properties"].get("@id") or f.get("id")
            if fid in seen or not f.get("geometry"):
                continue
            seen.add(fid)
            if f["properties"].get("natural") == "coastline":
                continue
            if not shape(f["geometry"]).intersects(area):
                continue
            f = {"type": "Feature", "id": fid, "geometry": f["geometry"],
                 "properties": {k: v for k, v in f["properties"].items() if k not in META}}
            out.append(f)
    out.sort(key=lambda f: f["id"])
    dst = HERE / "raw" / "overpass.geojson"
    dst.parent.mkdir(exist_ok=True)
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}, ensure_ascii=False) + "\n")
    print(f"[osm] {dst}: {len(out)} features from {len(paths)} export(s)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1:])

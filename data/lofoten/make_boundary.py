"""The out-of-bounds line for Lofoten Links (course-chat helper, not a make step).

    python3 data/lofoten/make_boundary.py      (after s01; writes proposed/boundary.geojson)

OSM's course polygon (relation 5314623) leaves part of the 3rd hole's back tee box
(w699713796, on the rocks above the bay) outside it, so the tee itself played as out of
bounds. The line is the OSM polygon joined with every mapped tee box grown by 3 m
(COURSE_LESSONS.md 2: "a tee or green outside: join the feature and the boundary edge").
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
OSM = "r5314623"


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
    b = g[g.osm == OSM].geometry.iloc[0]
    tees = [t.buffer(3.0) for t in g[g.kind == "tee"].geometry if t.intersects(b.buffer(10.0))]
    u = unary_union([b] + [t for t in tees if not b.contains(t)])
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    added = u.area - b.area
    tags = {"leisure": "golf_course", "name": "Lofoten Golf Links",
            "note": "OB line: OSM relation 5314623 joined with its tee boxes grown 3 m (make_boundary.py)"}
    out = gpd.GeoDataFrame([{"osm": "boundary", "kind": "boundary", "tags": json.dumps(tags), "geometry": u}],
                           geometry="geometry", crs=f"EPSG:{cfg['epsg']}").to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "boundary.geojson", driver="GeoJSON")
    print(f"[boundary] {added:.0f} m2 added to the OSM polygon")


if __name__ == "__main__":
    main()

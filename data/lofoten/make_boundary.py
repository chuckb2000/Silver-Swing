"""The out-of-bounds line for Lofoten Links (course-chat helper, not a make step).

    python3 data/lofoten/make_boundary.py      (after s01; writes proposed/boundary.geojson)

OSM's course polygon (relation 5314623) leaves part of the 3rd hole's back tee box
(w699713796, on the rocks above the bay) outside it, so the tee itself played as out of
bounds. The line is the OSM polygon joined with every mapped tee box grown by 3 m
(COURSE_LESSONS.md 2: "a tee or green outside: join the feature and the boundary edge").

Its corners are then rounded with a ROUND_M radius (developer, 2026-11-13: "can we round the
corners on the reddish part"; OSM's polygon is a few dozen straight runs): inside corners are
filled (a closing, but never over the sea: land only, from the DTM as in make_shore.py), outside
corners cut off (an opening, keeping any cut piece over CORNER_MAX_M2, so a narrow strip of the
course is never lost), and every tee, green, fairway and bunker stays inside with 3 m to spare, and every hole line
with 6 m (the 61 tees are set back along it).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))

HERE = Path(__file__).resolve().parent
OSM = "r5314623"
ROUND_M = 30.0
CORNER_MAX_M2 = 2500.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
    b = g[g.osm == OSM].geometry.iloc[0]
    tees = [t.buffer(3.0) for t in g[g.kind == "tee"].geometry if t.intersects(b.buffer(10.0))]
    u = unary_union([b] + [t for t in tees if not b.contains(t)])
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    joined = u
    # round the corners
    from make_shore import sea_from_dtm
    wet = sea_from_dtm(cfg, g)
    closed = u.buffer(ROUND_M, quad_segs=16).buffer(-ROUND_M, quad_segs=16)
    u = unary_union([u, closed.difference(u).difference(wet.buffer(1.0))])
    opened = u.buffer(-ROUND_M, quad_segs=16).buffer(ROUND_M, quad_segs=16)
    cut = u.difference(opened)
    keep = [p for p in getattr(cut, "geoms", [cut]) if p.area > CORNER_MAX_M2]
    played = [x.buffer(3.0) for x in g[g.kind.isin(["tee", "green", "fairway", "bunker"])].geometry if x.intersects(joined)]
    played += [x.buffer(6.0) for x in g[g.kind == "hole"].geometry if x.intersects(joined)]  # tees set back along the line (61)
    u = unary_union([opened] + keep + [x.intersection(joined.buffer(3.0)) for x in played]).buffer(0)
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    print(f"[boundary] rounding: {u.difference(joined).area:.0f} m2 filled in, {joined.difference(u).area:.0f} m2 cut off")
    added = u.area - b.area
    tags = {"leisure": "golf_course", "name": "Lofoten Golf Links",
            "note": "OB line: OSM relation 5314623 joined with its tee boxes grown 3 m, corners rounded (make_boundary.py)"}
    out = gpd.GeoDataFrame([{"osm": "boundary", "kind": "boundary", "tags": json.dumps(tags), "geometry": u}],
                           geometry="geometry", crs=f"EPSG:{cfg['epsg']}").to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "boundary.geojson", driver="GeoJSON")
    print(f"[boundary] {added:.0f} m2 added to the OSM polygon")


if __name__ == "__main__":
    main()

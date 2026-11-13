"""The out-of-bounds line for the Old Course (course-chat helper, not a make step):
the union of the St Andrews Links' course polygons, cut to the world box.

    python3 data/st_andrews_old/make_boundary.py      (after s01; writes proposed/links_boundary.geojson)

The Old Course's own OSM polygon (w1019045811) hugs its holes, but the Old Course has
out of bounds only by the town (the right of 1 and 18), the Old Course Hotel (17) and the
Links' outer edge: a wide shot onto the New or Jubilee Course is in play (developer's brief,
2026-11-13: "out of bounds by the town and the hotel"). The 2026 card's local rule 1: out of
bounds beyond any wall, fence or white posts bounding the course (the wall and fence along the
right of 14-16, by the Eden, Strathtyrum and Balgove courses), the burn and stakes right of 1
and 2, the fence behind 18 and the 1st tee. So the line is the union of the Old, New and
Jubilee polygons (the Old Course's own edge stays the line on the west side), closed over the
paths and gaps between them (a 6 m close), cut to the world box less 2 m. The other courses' greens inside it are wrong greens (relief required).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import box
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
PARTS = ["w1019045811", "w68283334", "w68283454"]  # Old, New, Jubilee
CLOSE_M = 6.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    gu = g.to_crs(cfg["epsg"])
    parts = gu[gu.osm.isin(PARTS)]
    assert len(parts) == len(PARTS), sorted(set(PARTS) - set(parts.osm))
    u = unary_union(list(parts.geometry)).buffer(CLOSE_M).buffer(-CLOSE_M)
    world = box(w["x0"] + 2, w["y0"] + 2, w["x0"] + w["width"] - 2, w["y0"] + w["height"] - 2)
    u = u.intersection(world)
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    u = type(u)(u.exterior)  # no holes: the Links are one area
    tags = {"leisure": "golf_course", "name": "Old Course",
            "note": "OB line: the St Andrews Links' course polygons joined and cut to the world (make_boundary.py)"}
    out = gpd.GeoDataFrame([{"osm": "links_boundary", "kind": "boundary", "tags": json.dumps(tags), "geometry": u}],
                           geometry="geometry", crs=f"EPSG:{cfg['epsg']}").to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "links_boundary.geojson", driver="GeoJSON")
    print(f"[boundary] links_boundary: {u.area / 1e4:.1f} ha (the Old Course's own polygon "
          f"{parts[parts.osm == PARTS[0]].geometry.iloc[0].area / 1e4:.1f} ha)")


if __name__ == "__main__":
    main()

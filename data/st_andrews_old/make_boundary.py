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
from shapely.geometry import Point, box
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
PARTS = ["w1019045811", "w68283334", "w68283454"]  # Old, New, Jubilee
CLOSE_M = 6.0
GREEN17 = (511824.0, 6244293.0)  # UTM 30N, the 17th green's centre
ROAD17_R = 75.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    gu = g.to_crs(cfg["epsg"])
    parts = gu[gu.osm.isin(PARTS)]
    assert len(parts) == len(PARTS), sorted(set(PARTS) - set(parts.osm))
    u = unary_union(list(parts.geometry)).buffer(CLOSE_M).buffer(-CLOSE_M)
    world = box(w["x0"] + 2, w["y0"] + 2, w["x0"] + w["width"] - 2, w["y0"] + w["height"] - 2)
    (HERE / "proposed").mkdir(exist_ok=True)
    u = u.intersection(world)
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    u = type(u)(u.exterior)  # no holes: the Links are one area
    # the road and path behind the 17th green are in play up to the wall (2026 card, local rules 1 and 4:
    # integral objects, out of bounds beyond the wall): the Old Station Road (w30712459, 5 m of fine gravel)
    # and the path beside it (w1053387973), within ROAD17_R m of the green, join the line
    raw = gpd.read_file(HERE / "raw" / "overpass.geojson").to_crs(cfg["epsg"])
    near17 = Point(*GREEN17).buffer(ROAD17_R)
    road = unary_union([raw[raw["id"] == "way/30712459"].geometry.iloc[0].buffer(2.5),
                        raw[raw["id"] == "way/1053387973"].geometry.iloc[0].buffer(1.0)]).intersection(near17)
    u = unary_union([u, road]).buffer(0.5).buffer(-0.5)
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    u = type(u)(u.exterior)
    # the wall behind the road: a thin building (0.7 m wide, 1.5 m high) the ball strikes
    wall = raw[raw["id"] == "way/404359910"].geometry.iloc[0].intersection(near17.buffer(15)).buffer(0.35, cap_style=2)
    wtags = {"building": "wall", "barrier": "wall", "height": "1.5",
             "note": "the wall behind the 17th green as a thin building (OSM way/404359910, make_boundary.py)"}
    gpd.GeoDataFrame([{"osm": "wall17", "kind": "building", "tags": json.dumps(wtags), "geometry": wall}],
                     geometry="geometry", crs=f"EPSG:{cfg['epsg']}").to_crs(4326).to_file(
        HERE / "proposed" / "wall17.geojson", driver="GeoJSON")
    tags = {"leisure": "golf_course", "name": "Old Course",
            "note": "OB line: the St Andrews Links' course polygons joined and cut to the world (make_boundary.py)"}
    out = gpd.GeoDataFrame([{"osm": "links_boundary", "kind": "boundary", "tags": json.dumps(tags), "geometry": u}],
                           geometry="geometry", crs=f"EPSG:{cfg['epsg']}").to_crs(4326)
    out.to_file(HERE / "proposed" / "links_boundary.geojson", driver="GeoJSON")
    print(f"[boundary] links_boundary: {u.area / 1e4:.1f} ha (the Old Course's own polygon "
          f"{parts[parts.osm == PARTS[0]].geometry.iloc[0].area / 1e4:.1f} ha)")


if __name__ == "__main__":
    main()

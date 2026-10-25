"""Astoria: the OSM course boundary with the 9th hole's back tee brought inside it.

The 9th tee box (OSM w1151403990, box 6 on proposed/osm_labelled.jpg) stands on
the bank between US 101 and Neacoxie Creek, 16.8 m (its centre 26 m) outside the mapped boundary
(w285375235); the drive carries the creek (GolfClubAtlas: "drive over a swamp").
A tee in out of bounds can't be played, and the developer wants the ground the
drive crosses in play (2026-10-24: "that water between the tee should be in
bounds"), so the boundary takes in the box and the creek in front of it: the
convex hull of the box grown by TEE_MARGIN_M and the boundary edge within
REACH_M of the box, less a ROAD_M strip either side of US 101 (w5317352, which
stays out of bounds). The creek's ponds there are red penalty areas (config
red_water_osm), so a drive into the creek takes red relief and one on the bank
is played as it lies. Everything else about the boundary is OSM's.

Writes proposed/boundary_9th_tee.geojson (WGS84), which edits.json adds in place
of the OSM boundary.

    python3 data/astoria/make_boundary.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import MultiPoint
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
BOUNDARY = "w285375235"
TEE = "w1151403990"
ROAD = "w5317352"    # US 101 (Oregon Coast Highway)
TEE_MARGIN_M = 4.0   # ground kept in bounds round the tee box
REACH_M = 110.0      # boundary edge within this of the box is joined to it (the creek the drive crosses)
ROAD_M = 9.0         # half-width of the strip along US 101 kept out of bounds


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    gu = gpd.GeoDataFrame(g, crs=4326).to_crs(32610)
    if (gu.osm == BOUNDARY).sum() != 1 or (gu.osm == TEE).sum() != 1 or (gu.osm == ROAD).sum() != 1:
        raise SystemExit("boundary, 9th tee or US 101 not found in raw/osm.geojson")
    poly = gu[gu.osm == BOUNDARY].geometry.iloc[0]
    box = gu[gu.osm == TEE].geometry.iloc[0]
    tee = box.buffer(TEE_MARGIN_M, join_style=2)
    edge = poly.exterior.intersection(box.buffer(REACH_M))
    pts = list(tee.exterior.coords) + [c for part in getattr(edge, "geoms", [edge]) for c in part.coords]
    road = gu[gu.osm == ROAD].geometry.iloc[0].buffer(ROAD_M)
    add = MultiPoint(pts).convex_hull.difference(road)
    if not add.contains(box):
        raise SystemExit("the US 101 strip cuts into the 9th tee box")
    joined = unary_union([poly, add])
    if joined.geom_type == "MultiPolygon":       # slivers cut off by the road strip
        joined = max(joined.geoms, key=lambda p: p.area)
    if joined.geom_type != "Polygon":
        raise SystemExit(f"the joined boundary is a {joined.geom_type}")
    print(f"[boundary] {poly.area:.0f} m2 -> {joined.area:.0f} m2 (+{joined.area - poly.area:.0f} m2 to the 9th tee); "
          f"tee {gu[gu.osm == TEE].geometry.iloc[0].distance(poly):.1f} m outside the OSM boundary")
    row = g[g.osm == BOUNDARY].iloc[0]
    out = gpd.GeoDataFrame(
        {"osm": ["bd_" + BOUNDARY], "kind": [row.kind],
         "tags": [json.dumps({**row.tags, "note": "OSM boundary taking in the 9th tee box and the creek in front of it"})]},
        geometry=[joined], crs=32610).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    dest = HERE / "proposed" / "boundary_9th_tee.geojson"
    out.to_file(dest, driver="GeoJSON")
    print(f"[boundary] wrote {dest.relative_to(HERE.parent.parent)}")


if __name__ == "__main__":
    main()

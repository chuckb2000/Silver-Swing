"""Astoria: the OSM course boundary with the 9th hole's back tee brought inside it.

The 9th tee box (OSM w1151403990, box 6 on proposed/osm_labelled.jpg) stands on
the bank between US 101 and Neacoxie Creek, 16.8 m (its centre 26 m) outside the mapped boundary
(w285375235); the drive carries the creek (GolfClubAtlas: "drive over a swamp").
A tee in out of bounds can't be played, so the boundary is joined to the box:
the convex hull of the box grown by TEE_MARGIN_M and the boundary edge within
EDGE_M of it. The creek's ponds stay red penalty areas (config red_water_osm,
checked before out of bounds), so a topped drive into the creek takes red relief.
Everything else about the boundary is OSM's.

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
TEE_MARGIN_M = 4.0   # ground kept in bounds round the tee box
EDGE_M = 45.0        # the stretch of boundary edge the tee is joined to


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    gu = gpd.GeoDataFrame(g, crs=4326).to_crs(32610)
    if (gu.osm == BOUNDARY).sum() != 1 or (gu.osm == TEE).sum() != 1:
        raise SystemExit("boundary or 9th tee not found in raw/osm.geojson")
    poly = gu[gu.osm == BOUNDARY].geometry.iloc[0]
    tee = gu[gu.osm == TEE].geometry.iloc[0].buffer(TEE_MARGIN_M, join_style=2)
    edge = poly.exterior.intersection(tee.buffer(EDGE_M))
    pts = list(tee.exterior.coords) + [c for part in getattr(edge, "geoms", [edge]) for c in part.coords]
    joined = unary_union([poly, MultiPoint(pts).convex_hull])
    if joined.geom_type != "Polygon":
        raise SystemExit(f"the joined boundary is a {joined.geom_type}")
    print(f"[boundary] {poly.area:.0f} m2 -> {joined.area:.0f} m2 (+{joined.area - poly.area:.0f} m2 to the 9th tee); "
          f"tee {gu[gu.osm == TEE].geometry.iloc[0].distance(poly):.1f} m outside the OSM boundary")
    row = g[g.osm == BOUNDARY].iloc[0]
    out = gpd.GeoDataFrame(
        {"osm": ["bd_" + BOUNDARY], "kind": [row.kind],
         "tags": [json.dumps({**row.tags, "note": "OSM boundary joined to the 9th tee box across Neacoxie Creek"})]},
        geometry=[joined], crs=32610).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    dest = HERE / "proposed" / "boundary_9th_tee.geojson"
    out.to_file(dest, driver="GeoJSON")
    print(f"[boundary] wrote {dest.relative_to(HERE.parent.parent)}")


if __name__ == "__main__":
    main()

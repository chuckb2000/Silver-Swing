"""Gearhart: the course boundary with the three mapped parking lots cut out.

The club's card (local rules): "The inside edge of Public Roads and Parking Lots
define Out of Bounds". The pipeline paints a parking lot inside the boundary as a
cart path (free relief), so the lots are cut out of the OSM boundary instead; the
developer agreed on 2026-10-20 (intake question 2). Gearhart Lane, the public road
inside the boundary, is made out of bounds with the config key `ob_highways`.

Geometry comes only from OSM (way 158904851 minus amenity=parking ways
891581592, 891581593, 891681298). Writes proposed/boundary_no_parking.geojson
(WGS84), which edits.json adds in place of the OSM boundary.

    python3 data/gearhart/make_boundary.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
BOUNDARY = "w158904851"
LOTS = ["w891581592", "w891581593", "w891681298"]


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    b = g[g.osm == BOUNDARY]
    lots = g[g.osm.isin(LOTS)]
    if len(b) != 1 or len(lots) != len(LOTS):
        raise SystemExit("boundary or parking lots not found in raw/osm.geojson")
    gu = gpd.GeoDataFrame(g, crs=4326).to_crs(32610)
    poly = gu[gu.osm == BOUNDARY].geometry.iloc[0]
    cut = poly.difference(unary_union(list(gu[gu.osm.isin(LOTS)].geometry)))
    if cut.geom_type != "Polygon":
        # drop slivers left between a lot and the boundary edge
        parts = sorted(getattr(cut, "geoms", [cut]), key=lambda p: -p.area)
        slivers = [round(p.area, 1) for p in parts[1:]]
        if any(a > 5.0 for a in slivers):
            raise SystemExit(f"cutting the lots splits the course: parts {[round(p.area) for p in parts]} m2")
        cut = parts[0]
        print(f"[boundary] dropped slivers {slivers} m2")
    print(f"[boundary] {poly.area:.0f} m2 -> {cut.area:.0f} m2 ({poly.area - cut.area:.0f} m2 of parking), "
          f"{len(cut.interiors)} inner ring(s)")
    row = b.iloc[0]
    out = gpd.GeoDataFrame(
        {"osm": ["bd_" + BOUNDARY], "kind": [row.kind],
         "tags": [json.dumps({**row.tags, "note": "OSM boundary minus the parking lots (club local rule)"})]},
        geometry=[cut], crs=32610).to_crs(4326)
    dest = HERE / "proposed" / "boundary_no_parking.geojson"
    out.to_file(dest, driver="GeoJSON")
    print(f"[boundary] wrote {dest.relative_to(HERE.parent.parent)}")


if __name__ == "__main__":
    main()

"""Victoria: the OSM course boundary with the edges of four tee boxes it clips added back.

s03 found four OSM tee boxes reaching 2-30 m2 past the boundary (the 2nd/12th/16th tees on the
west property line, and one by the 15th green): the tee boxes are course, the line simply clips
them, so a ball teed on the box's edge would be out of bounds. The boundary is joined with those
tee polygons (plus 0.5 m); nothing else changes. Geometry only from OSM (relation 2579054 and the
golf=tee ways listed in TEES).

Writes proposed/boundary.geojson (WGS84), which edits.json adds in place of the OSM boundary.

    python3 data/victoria/make_boundary.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
BOUNDARY = "r2579054"
TEES = ["w1115614424", "w1115614425", "w1115614432", "w1115614433"]


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    if (g.osm == BOUNDARY).sum() != 1 or g.osm.isin(TEES).sum() != len(TEES):
        raise SystemExit("boundary or tees not found in raw/osm.geojson")
    gu = gpd.GeoDataFrame(g, crs=4326).to_crs(32610)
    poly = gu[gu.osm == BOUNDARY].geometry.iloc[0]
    tees = unary_union([t.buffer(0.5, join_style=2) for t in gu[gu.osm.isin(TEES)].geometry])
    new = unary_union([poly, tees])
    if new.geom_type != "Polygon":
        raise SystemExit(f"joined boundary is a {new.geom_type}")
    print(f"[boundary] {poly.area:.0f} m2 -> {new.area:.0f} m2 (+{new.area - poly.area:.0f} m2 of tee box edges)")
    row = g[g.osm == BOUNDARY].iloc[0]
    out = gpd.GeoDataFrame(
        {"osm": ["bd_" + BOUNDARY], "kind": [row.kind],
         "tags": [json.dumps({**row.tags, "note": "OSM boundary plus the edges of four OSM tee boxes it clipped"})]},
        geometry=[new], crs=32610).to_crs(4326)
    dest = HERE / "proposed" / "boundary.geojson"
    out.to_file(dest, driver="GeoJSON")
    print(f"[boundary] wrote {dest.relative_to(HERE.parent.parent)}")


if __name__ == "__main__":
    main()

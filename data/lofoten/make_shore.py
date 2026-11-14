"""The sea with its shore, for Lofoten Links (course-chat helper, not a make step).

    python3 data/lofoten/make_shore.py      (after pipeline/propose_sea.py and make_boundary.py)

OSM's sea (pipeline/propose_sea.py) stops at the coastline, and the course polygon stops short
of it, so the bare rock between them played as out of bounds: the 17th's tee shot crossed 25 m
of it before the inlet. As at Cypress Point (COURSE_LESSONS.md 2, "add the shore up to the
boundary, stop at roads"), the land outside the boundary, inside its convex hull, that lies
within SHORE_M of both the sea and the boundary joins the sea, less roads and buildings: one red penalty area, the sea
(developer's brief, 2026-11-13). Writes proposed/sea_shore.geojson (id `sea`).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
SHORE_M = 40.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    epsg = cfg["epsg"]
    sea = gpd.read_file(HERE / "proposed" / "sea.geojson").to_crs(epsg).geometry.iloc[0]
    bnd = gpd.read_file(HERE / "proposed" / "boundary.geojson").to_crs(epsg).geometry.iloc[0]
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(epsg)
    roads = unary_union([r.buffer(3.0) for r in g[g.kind == "highway"].geometry])
    bld = unary_union(list(g[g.kind == "building"].geometry.buffer(2.0)))
    shore = sea.buffer(SHORE_M).intersection(bnd.buffer(SHORE_M)).intersection(bnd.convex_hull).difference(bnd).difference(roads).difference(bld)
    out = unary_union([sea, shore]).buffer(0.5).buffer(-0.5)
    print(f"[shore] {shore.difference(sea).area / 1e4:.2f} ha of shore joined to the sea")
    gpd.GeoDataFrame([{"osm": "sea", "kind": "water", "tags": json.dumps({"natural": "water", "name": "the Norwegian Sea",
                       "source": "OSM coastline (propose_sea.py) + the shore up to the boundary (make_shore.py)"}), "geometry": out}],
                     geometry="geometry", crs=f"EPSG:{epsg}").to_crs(4326).to_file(HERE / "proposed" / "sea_shore.geojson", driver="GeoJSON")


if __name__ == "__main__":
    main()

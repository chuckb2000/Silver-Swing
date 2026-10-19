"""Course-chat tool for Eastmoreland (not a `make course` step).

Crystal Springs Lake is mapped in OSM as natural=water, which the pipeline only
paints outside the course boundary (off-course water). About 90 % of it lies
inside the golf boundary and is in play on holes 11, 12, 13, 17 and 18, so this
writes the part inside the boundary as a red penalty area
(golf=lateral_water_hazard, penalty=red; developer 2026-10-19: every hazard is
red) to proposed/water.geojson, which edits.json adds. The part outside the
boundary (along the rhododendron garden) stays off-course water.

    python3 data/eastmoreland/make_water.py      (from the repo root, after s01)
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
LAKE = "w133795911"


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    lake = g[g.osm == LAKE].geometry.iloc[0].buffer(0)
    boundary = unary_union(list(g[g.kind == "boundary"].geometry)).buffer(0)
    inside = lake.intersection(boundary)
    polys = [p for p in getattr(inside, "geoms", [inside]) if p.geom_type == "Polygon" and p.area > 1.0]
    rows = [{"osm": f"lake_{LAKE}_{i + 1}", "kind": "lateral_water_hazard",
             "tags": {"golf": "lateral_water_hazard", "penalty": "red", "name": "Crystal Springs Lake",
                      "source": f"OSM {LAKE} (natural=water) inside the golf boundary (make_water.py)"},
             "geometry": p} for i, p in enumerate(sorted(polys, key=lambda q: -q.area))]
    out = gpd.GeoDataFrame(rows, crs=cfg["epsg"]).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "water.geojson", driver="GeoJSON")
    print(f"[make_water] lake {lake.area:.0f} m2, inside the boundary {sum(p.area for p in polys):.0f} m2 "
          f"in {len(polys)} part(s): {[r['osm'] for r in rows]} ({[round(p.area) for p in polys]})")


if __name__ == "__main__":
    main()

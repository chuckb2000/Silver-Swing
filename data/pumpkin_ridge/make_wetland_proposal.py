"""Pumpkin Ridge: a proposal (not in edits.json) to make the native-grass areas
that Ghost Creek 3 and 4 play over red penalty areas.

golfclubatlas.com and golfcoursegurus.com describe protected wetlands on Ghost
Creek 3 and carried from the 4th tee. OSM maps no wetland or water there; the
OSIP 2024 photo shows unmown native grass with small lidar channels. The build
draws these areas as native grass (rough, fescue art). If the developer wants
them as penalty areas, add this file in edits.json:

    {"from": "proposed/wetlands_gc34.geojson", "ids": [...], "reason": "developer: ..."}

The polygons are make_fescue.py's native-grass areas crossed by the Blue tee
shots (fescue_363 on 3, fescue_339 and fescue_368 on 4), read from
proposed/fescue.geojson by area and position, so rerun this after make_fescue.py.

    python3 data/pumpkin_ridge/make_wetland_proposal.py   (after s06: reads the layouts' holes.json)
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString
from shapely.ops import substring

HERE = Path(__file__).resolve().parent
LAY = "pumpkin_ridge_ghost_creek"
CARRY = {3: 1.0, 4: 0.35}   # share of each hole's line, from the Blue tee, that the tee shot carries


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    x0, y0, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    f = gpd.read_file(HERE / "proposed" / "fescue.geojson").to_crs(epsg)
    f["geometry"] = f.geometry.translate(-x0, -y0)
    holes = {h["number"]: h for h in json.load(open(HERE / "build" / "layouts" / LAY / "holes.json"))}
    rows = []
    for n, frac in CARRY.items():
        cl = LineString(holes[n]["tees"]["Blue"]["centerline"])
        part = substring(cl, 0, cl.length * frac)
        for _, r in f[f.intersects(part)].iterrows():
            rows.append({"osm": f"wetland_gc{n}_{r.osm}", "kind": "lateral_water_hazard",
                         "tags": json.dumps({"golf": "lateral_water_hazard", "penalty": "red", "natural": "wetland",
                                             "approved": "pending", "hole": f"ghost creek {n}",
                                             "source": "OSIP 2024 native-grass area (make_fescue.py), proposal"}),
                         "geometry": r.geometry})
    out = gpd.GeoDataFrame(rows, geometry="geometry", crs=None)
    out = out.set_geometry(out.geometry.translate(x0, y0)).set_crs(epsg).to_crs(4326)
    out.to_file(HERE / "proposed" / "wetlands_gc34.geojson", driver="GeoJSON")
    print(f"[wetland proposal] {len(out)} areas, {sum(r['geometry'].area for r in rows):.0f} m2: {[r['osm'] for r in rows]}")


if __name__ == "__main__":
    main()

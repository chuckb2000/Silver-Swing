"""Proposal (not a make step): the clubhouse as a building.

OSM maps the clubhouse (relation 7106970) with both golf=clubhouse and
building=yes; s01 classifies by the golf key first, so it would not be a
building (no roof drawn, no obstruction relief). This copies its OSM outline
unchanged as a building feature into proposed/buildings.geojson; edits.json
adds it. Run from the repo root:

    python3 data/wannamoisett/propose_buildings.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

D = Path(__file__).resolve().parent
IDS = ["r7106970"]


def main():
    g = gpd.read_file(D / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    rows = []
    for oid in IDS:
        f = g[g.osm == oid].iloc[0]
        tags = {k: v for k, v in f.tags.items() if k != "golf"}
        tags["source"] = f"proposal: OSM {oid} (golf=clubhouse + building=yes) as a building"
        rows.append({"osm": f"bld_{oid}", "kind": "building", "tags": json.dumps(tags), "geometry": f.geometry})
    out = gpd.GeoDataFrame(rows, geometry="geometry", crs=4326)
    out.to_file(D / "proposed" / "buildings.geojson", driver="GeoJSON")
    print(f"[propose_buildings] {len(out)} -> proposed/buildings.geojson")


if __name__ == "__main__":
    main()

"""Proposal (not a make step): one pin per green at the green's centre.

OSM maps no golf=pin at Wannamoisett. Each green that ends a hole line gets a
pin at its centroid (or, if the centroid falls outside an odd-shaped green, at
the point farthest inside it). Writes proposed/pins.geojson; edits.json adds
the pins, so `make course` rebuilds them. Run from the repo root:

    python3 data/wannamoisett/propose_pins.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import polylabel
from shapely.geometry import Point

D = Path(__file__).resolve().parent
EPSG = json.load(open(D / "course_config.json"))["epsg"]


def main():
    g = gpd.read_file(D / "raw" / "osm.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    greens = g[g.kind == "green"]
    rows = []
    for _, h in g[g.kind == "hole"].iterrows():
        end = Point(h.geometry.coords[-1])
        gi = greens.distance(end).idxmin()
        poly = greens.loc[gi].geometry
        c = poly.centroid
        p = c if poly.buffer(-2.0).contains(c) else polylabel(poly, 0.1)
        ref = int(h.tags["ref"])
        rows.append({"osm": f"pin_{ref:02d}", "kind": "pin",
                     "tags": {"golf": "pin", "ref": str(ref), "source": f"proposal: centre of green {greens.loc[gi].osm}"},
                     "geometry": p})
    out = gpd.GeoDataFrame(rows, geometry="geometry", crs=EPSG).to_crs(4326).sort_values("osm")
    out["tags"] = out["tags"].apply(json.dumps)
    (D / "proposed").mkdir(exist_ok=True)
    out.to_file(D / "proposed" / "pins.geojson", driver="GeoJSON")
    print(f"[propose_pins] {len(out)} pins -> proposed/pins.geojson")


if __name__ == "__main__":
    main()

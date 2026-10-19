"""Franklin CC: propose a pin on every hole's green (OSM maps the 5 pins only on
the practice range).

    python3 data/franklin/make_pins.py      (after s02)

The pin is the green's centroid, or a point inside it if the centroid falls
outside (a proposal, as at Highland Links and Tualatin). The green is the OSM
green the hole line ends on. Writes proposed/pins.geojson (WGS84; kind pin,
ids x_pin_<n>); edits.json adds them.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.affinity import translate
from shapely.geometry import Point

HERE = Path(__file__).resolve().parent


def main():
    cfg = json.loads((HERE / "course_config.json").read_text())
    x0, y0 = cfg["world"]["x0"], cfg["world"]["y0"]
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    greens = g[g.kind == "green"]
    rows = []
    for _, h in g[g.kind == "hole"].iterrows():
        n = int(h.tags["ref"])
        end = Point(h.geometry.coords[-1])
        d = greens.geometry.distance(end)
        gr = greens.loc[d.idxmin()]
        if d.min() > 5:
            raise SystemExit(f"hole {n}: line ends {d.min():.1f} m from a green")
        c = gr.geometry.centroid
        if not gr.geometry.buffer(-1.0).contains(c):
            c = gr.geometry.representative_point()
        rows.append({"osm": f"x_pin_{n}", "kind": "pin",
                     "tags": {"golf": "pin", "ref": str(n), "source": f"centre of green {gr.osm} (proposal)"},
                     "geometry": translate(c, x0, y0)})
        print(f"hole {n:2d}: pin at ({c.x:.1f}, {c.y:.1f}) on green {gr.osm}")
    out = gpd.GeoDataFrame(rows, crs=cfg["epsg"]).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    out.sort_values("osm", key=lambda s: s.str.slice(6).astype(int)).to_file(HERE / "proposed" / "pins.geojson", driver="GeoJSON")


if __name__ == "__main__":
    main()

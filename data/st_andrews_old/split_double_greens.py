"""Split the double greens OSM maps as one polygon into one part per hole
(course-chat helper, not a `make course` step; writes proposed/greens_split.geojson
and prints the edits to put in course_edits.json).

    python3 data/<id>/split_double_greens.py        (after s02)

OSM maps a green two holes share as a single polygon, with one golf=pin for each
hole on it. s06 takes the pin nearest the green for every hole, so both holes got
the same pin, and s09b centres the putting views on the whole green, so one
hole's pin fell outside them. As at Langdon Farms (COURSE_LESSONS.md 15), the
green is cut in two with the perpendicular bisector of the two holes' OSM pins
(each hole's line ends on its own pin): each hole gets the part on its pin's side,
its own centre, pin and putting views. The surface is still one green (s08 paints
both parts as green).

double_greens.json: [{"green": "<osm id>", "pins": {"<hole>": "<pin osm id>", ...}}]
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.affinity import translate
from shapely.geometry import LineString
from shapely.ops import split

HERE = Path(__file__).resolve().parent


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    spec = json.load(open(HERE / "double_greens.json"))
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    g["tags"] = g.tags.apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    feats, add_ids, drops = [], [], []
    for dg in spec:
        green = g[g.osm == dg["green"]].iloc[0]
        (ha, pa), (hb, pb) = dg["pins"].items()
        A = g[g.osm == pa].geometry.iloc[0]
        B = g[g.osm == pb].geometry.iloc[0]
        mx, my = (A.x + B.x) / 2, (A.y + B.y) / 2
        dx, dy = B.x - A.x, B.y - A.y
        k = 500.0 / (dx * dx + dy * dy) ** 0.5
        cut = LineString([(mx - dy * k, my + dx * k), (mx + dy * k, my - dx * k)])
        parts = list(split(green.geometry, cut).geoms)
        for hole, pin in ((ha, A), (hb, B)):
            part = [p for p in parts if p.contains(pin)]
            if len(part) != 1:
                raise SystemExit(f"[split] {dg['green']}: hole {hole}'s pin is not in exactly one part")
            other = hb if hole == ha else ha
            oid = f"p_green_{hole}"
            feats.append({"osm": oid, "kind": "green", "geometry": translate(part[0], w["x0"], w["y0"]),
                          "tags": {**green.tags, "golf": "green", "hole": hole, "split_from": dg["green"],
                                   "double_green": f"with hole {other}: the part on hole {hole}'s side of the perpendicular bisector of the two holes' OSM pins"}})
            add_ids.append(oid)
            print(f"[split] {dg['green']} hole {hole}: {part[0].area:.0f} m2 (whole {green.geometry.area:.0f} m2)")
        drops.append(dg["green"])
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{cfg['epsg']}")
    out["tags"] = out.tags.apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "greens_split.geojson", driver="GeoJSON")
    print(json.dumps({"add_ids": add_ids, "drop": drops}))


if __name__ == "__main__":
    main()

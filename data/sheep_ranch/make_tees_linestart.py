"""Tee boxes at the start of the OSM hole lines, where OSM maps none (course-chat
helper, not a `make course` step; writes proposed/tees_linestart.geojson and
prints the holes it placed).

    python3 data/<id>/make_tees_linestart.py [--at HOLE=METRES ...]

The developer, 2026-10-21, looking at the course chat's first proposals: "the
tees are at the end of the red line", i.e. the OSM hole lines start on the
tees. Measured from there both Old Macdonald and Sheep Ranch match the Black
card (course totals within 3 %), so the developer chose the Black tees for these
two courses. OSM maps tee polygons on only a few holes, so where no mapped box
within 15 m of the line start measures within 8 % of the Black card, a
12 x 8 m box aligned with the line's first segment is placed on the line start.

`--at HOLE=METRES` puts that hole's box METRES ahead of the line start along
its first segment instead: for a line that measures more than 8 % over the
Black card from its start (Old Macdonald 1 and 13, Sheep Ranch 3), the box goes
where the Black card distance falls on the line. Those are the course chat's
calls (checked on the 2024 photo: mown ground, no bunker or path), listed as
open items.
"""
from __future__ import annotations

import csv
import json
import math
import sys
import warnings
from pathlib import Path

import geopandas as gpd
from shapely.affinity import translate
from shapely.geometry import Point, Polygon

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from s06_holes import box_centre, path_from  # noqa: E402

warnings.filterwarnings("ignore")
YD = 0.9144
BOX_L, BOX_W = 12.0, 8.0
TEE_SET = "Black"


def main(at: dict[int, float]):
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    card = {int(r["hole"]): r for r in csv.DictReader(open(HERE / "scorecard.csv"))}
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    g["tags"] = g.tags.apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    hl = g[g.kind == "hole"].copy()
    hl["ref"] = hl.tags.apply(lambda t: int(t["ref"]))
    greens = g[g.kind == "green"]
    # only OSM's own tee polygons count as mapped (earlier proposals are ignored)
    tees = g[(g.kind == "tee") & ~g.osm.astype(str).str.startswith("p_")]
    feats, report = [], []
    for _, h in hl.sort_values("ref").iterrows():
        n = int(h.ref)
        L = h.geometry
        start = Point(L.coords[0])
        gc = greens.loc[greens.distance(Point(L.coords[-1])).idxmin()].geometry.centroid
        target = float(card[n][TEE_SET.lower()])
        mapped = []
        for _, t in tees.iterrows():
            if t.geometry.distance(start) < 15:
                yd = path_from(box_centre(t.geometry)[0], L, gc)[0] / YD
                if abs(yd - target) / target <= 0.08:
                    mapped.append((abs(yd - target), t.osm, yd))
        if mapped and n not in at:
            d, osm, yd = min(mapped)
            report.append(f"hole {n}: mapped box {osm} at the line start, {yd:.0f} yd vs Black {target:.0f}")
            continue
        (ax, ay), (bx, by) = L.coords[0], L.coords[1]
        ln = math.hypot(bx - ax, by - ay)
        ux, uy = (bx - ax) / ln, (by - ay) / ln
        vx, vy = -uy, ux
        s = at.get(n, 0.0)
        cx, cy = ax + ux * s, ay + uy * s
        poly = Polygon([(cx + ux * da * BOX_L / 2 + vx * db * BOX_W / 2, cy + uy * da * BOX_L / 2 + vy * db * BOX_W / 2)
                        for da, db in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        yd = path_from(box_centre(poly)[0], L, gc)[0] / YD
        where = "the line start" if not s else f"{s:.0f} m ahead of the line start (the Black card distance on the line)"
        feats.append({"osm": f"p_tee_black_{n}", "kind": "tee", "geometry": translate(poly, w["x0"], w["y0"]),
                      "tags": {"golf": "tee", "hole": str(n), "tee_set": TEE_SET,
                               "assigned_by": "the course chat (2026-10-21; developer: the tees are at the start of the OSM hole lines)"
                               if not s else "the course chat (2026-10-21; the line start measures over 8 % beyond the Black card)",
                               "source": f"12 x 8 m box at {where}, aligned with the line's first segment"}})
        report.append(f"hole {n}: box at {where}: {yd:.0f} yd vs Black {target:.0f} ({(yd - target) / target * 100:+.1f}%)")
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{cfg['epsg']}")
    out["tags"] = out.tags.apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "tees_linestart.geojson", driver="GeoJSON")
    print("\n".join(report))
    print(json.dumps(sorted(out.osm, key=lambda s: int(s.rsplit("_", 1)[1]))))


if __name__ == "__main__":
    at = {}
    for a in sys.argv[1:]:
        if a.startswith("--at"):
            continue
        k, v = a.split("=")
        at[int(k)] = float(v)
    main(at)

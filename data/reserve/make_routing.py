"""Proposal (course chat, 2026-11-13): the routing of the North and South courses at
The Reserve, from routing_spec.json. Nothing here is approved until the developer says so.

    python3 data/reserve/make_routing.py      (after s01: reads raw/osm.geojson)

OSM maps every green and tee box of both courses but only one hole line (North 1,
w825907441). routing_spec.json names, per hole, the back-most mapped tee box, the green
(or its part of a shared green) and any bend; why each hole is what it is: every hole's
tee boxes lie on one line to its green at the card's yardages, the next hole's tee stands
by the last green, and the boxes' long axes point at the green.

Writes proposed/routing.geojson (WGS84, the merge_edits format: osm, kind, tags):
  - a golf=hole line per hole (except North 1, whose OSM line is kept), from the tee box's
    centre through the spec's bends to the green's (part's) centre, tagged ref, par,
    handicap and layout;
  - the shared greens cut in two by the spec's lines (<green id>_<part>), each part the
    green of one hole (as at Langdon Farms 9/18 and Sheep Ranch);
  - the clubhouse (golf=clubhouse + building=yes) as a plain building: s01 reads the golf
    key first, so it would be neither drawn nor an obstruction.
and prints each hole's straight-through length against the card's Green yardage.
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import LineString, Point
from shapely.ops import split as ssplit

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from fairway_axis import centreline  # noqa: E402
YD = 0.9144


def bend_point(b, by):
    """A bend: [x, y] as given, or {"fairway": id, "near": [x, y]}: the point of that fairway's
    main axis (pipeline/fairway_axis.py) nearest the given point (COURSE_LESSONS 2: bends on the
    hole's own fairway centre line)."""
    if isinstance(b, (list, tuple)):
        return tuple(b)
    axis = centreline(by[b["fairway"]].geometry)
    d = np.hypot(axis[:, 0] - b["near"][0], axis[:, 1] - b["near"][1])
    x, y = axis[int(np.argmin(d))]
    return (round(float(x), 1), round(float(y), 1))


def main() -> None:
    cfg = json.load(open(HERE / "course_config.json"))
    spec = json.load(open(HERE / "routing_spec.json"))
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    by = {r.osm: r for r in g.itertuples()}

    rows = []  # (osm, kind, tags, geometry in the course EPSG)
    part_geom = {}
    for s in spec["splits"]:
        whole = by[s["green"]].geometry
        pieces = list(ssplit(whole, LineString(s["line"])).geoms)
        if len(pieces) != 2:
            raise SystemExit(f"[routing] {s['green']}: the split line gives {len(pieces)} pieces, not 2")
        for name, keep in s["parts"].items():
            hit = [p for p in pieces if p.contains(Point(keep))]
            if len(hit) != 1:
                raise SystemExit(f"[routing] {s['green']}: part {name} is not one piece")
            part_geom[(s["green"], name)] = hit[0]
            tags = {**by[s["green"]].tags, "split_from": s["green"], "split_part": name}
            rows.append((f"{s['green']}_{name}", "green", tags, hit[0]))

    report = []
    for lay_id, holes in spec["layouts"].items():
        lay = next(l for l in cfg["layouts"] if l["id"] == lay_id)
        card = {int(r["hole"]): r for r in csv.DictReader(open(HERE / lay["scorecard"]))}
        short = lay["short"]
        for ref, h in sorted(holes.items(), key=lambda kv: int(kv[0])):
            n = int(ref)
            green = part_geom[(h["green"], h["part"])] if "part" in h else by[h["green"]].geometry
            end = green.centroid if green.contains(green.centroid) else green.representative_point()
            tee = by[h["tee"]].geometry.centroid
            pts = [(tee.x, tee.y)] + [bend_point(b, by) for b in h.get("bends", [])] + [(end.x, end.y)]
            line = LineString(pts)
            yd = line.length / YD
            card_yd = float(card[n]["green"])
            report.append(f"{short:>5} {n:>2}  par {card[n]['par']}  card {card_yd:4.0f}  line {yd:4.0f}  {100 * (yd - card_yd) / card_yd:+5.1f}%"
                          + ("  (OSM line kept)" if "osm_line" in h else ""))
            if "osm_line" in h:
                continue
            tags = {"golf": "hole", "ref": str(n), "par": str(h["par"]), "handicap": str(h["handicap"]),
                    "layout": lay_id, "name": f"{short} {n}", "source": "course chat routing proposal 2026-11-13"}
            rows.append((f"reserve_{short.lower()}_{n:02d}", "hole", tags, line))

    clubhouse = [r for r in g.itertuples() if r.tags.get("golf") == "clubhouse"]
    for r in clubhouse:
        tags = {k: v for k, v in r.tags.items() if k != "golf"}
        tags.setdefault("building", "yes")
        tags["was"] = "golf=clubhouse"
        rows.append((f"{r.osm}_bldg", "building", tags, r.geometry))

    out = gpd.GeoDataFrame({"osm": [r[0] for r in rows], "kind": [r[1] for r in rows],
                            "tags": [json.dumps(r[2]) for r in rows]},
                           geometry=[r[3] for r in rows], crs=cfg["epsg"]).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    path = HERE / "proposed" / "routing.geojson"
    path.unlink(missing_ok=True)
    out.to_file(path, driver="GeoJSON")
    print("\n".join(report))
    print(f"[routing] {path.relative_to(HERE.parent.parent)}: {len(out)} features")


if __name__ == "__main__":
    sys.exit(main())

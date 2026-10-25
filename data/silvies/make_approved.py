"""Silvies: the developer's tracing-desk saves (data/silvies/desk/<key>.json, read back
2026-10-25: all 45 pages saved, every one with its back tee marked) -> proposed/approved.geojson.

    python3 data/silvies/make_approved.py      (after make_routing.py; run by make_edits.py)

For every hole of the three layouts (page keys C1-C18 Craddock, H1-H18 Hankins, E1-E9
Chief Egan):
  - the developer's tee mark becomes a tee box (golf=tee, tagged hole, tee_set and layout,
    so s06 starts the hole there). The developer asked that every tee stand on a tee box
    (2026-10-25: "it's always annoying when the tee is just in the rough"), so the mark is
    the box, drawn and played as tee surface even where OSM maps the pad as fairway or not
    at all;
  - Hankins and Chief Egan get their hole line: the proposed line (proposed/routing.json)
    started at the centre of that box, its bends kept where they lie ahead of the tee;
  - Craddock keeps its OSM lines, except 2 and 16, which start on their boxes (the OSM
    starts were wrong, make_routing.py).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString, Point, Polygon

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
X0, Y0 = cfg["world"]["x0"], cfg["world"]["y0"]
plan = json.load(open(HERE / "proposed" / "routing.json"))
LAY = {"C": "silvies_craddock", "H": "silvies_hankins", "E": "silvies_chief_egan"}
SET = {L["id"]: L["default_tee"] for L in cfg["layouts"]}
PAR = {}
import csv
for L in cfg["layouts"]:
    PAR[L["id"]] = {int(r["hole"]): int(r["par"]) for r in csv.DictReader(open(HERE / L["scorecard"]))}

feats = []
for key_l, lay in LAY.items():
    for n in sorted(int(k) for k in plan[lay] if k != "_map_fit"):
        key = f"{key_l}{n}"
        d = json.load(open(HERE / "desk" / f"{key}.json"))
        tees = [f for f in d["features"] if f["kind"] == "bluetee"]
        if len(tees) != 1:
            raise SystemExit(f"{key}: expected one tee mark, found {len(tees)}")
        box = Polygon(tees[0]["poly"])
        if not box.is_valid:
            box = box.buffer(0)
        short = lay.split("_", 1)[1]
        feats.append({"osm": f"desk_{short}_{n:02d}_tee", "kind": "tee",
                      "tags": {"golf": "tee", "hole": str(n), "tee_set": SET[lay], "layout": lay,
                               "source": "developer, tracing desk 2026-10-25"},
                      "geometry": box})
        if lay == "silvies_craddock" and n not in (2, 16):
            continue
        line = [tuple(p) for p in plan[lay][str(n)]["line"]]
        c = box.centroid
        L = LineString(line)
        s0 = L.project(c)
        ahead, acc = [], 0.0
        for i in range(1, len(line) - 1):
            acc += Point(line[i]).distance(Point(line[i - 1]))
            if acc > s0 + 1:
                ahead.append(line[i])
        pts = [(c.x, c.y)] + ahead + [line[-1]]
        feats.append({"osm": f"desk_{short}_{n:02d}_line", "kind": "hole",
                      "tags": {"golf": "hole", "ref": str(n), "par": str(PAR[lay][n]), "layout": lay,
                               "source": "course chat routing (make_routing.py), tee from the developer's desk mark 2026-10-25"},
                      "geometry": LineString(pts)})

out = gpd.GeoDataFrame(feats, crs=cfg["epsg"])
out["geometry"] = out.geometry.translate(X0, Y0)
out.to_crs(4326).to_file(HERE / "proposed" / "approved.geojson", driver="GeoJSON")
print(f"approved.geojson: {sum(f['kind'] == 'tee' for f in feats)} tee boxes, {sum(f['kind'] == 'hole' for f in feats)} hole lines")

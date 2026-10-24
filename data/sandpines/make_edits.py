"""Course-chat helper (not a `make course` step; its outputs are committed):
write proposed/retag_tees.geojson and edits.json for Sandpines.

    python3 data/sandpines/make_edits.py      (after s01, which writes raw/osm.geojson)

OSM tags four small tee pads as golf=fairway (COURSE_LESSONS.md 10: check every
polygon's tag against its size). Measured from each pad to the green along the
hole line (s06's method), they are the back tees of holes 8 and 9:

    w849043568    73 m2,  9 x 11 m, hole 8 line start: 224 yd
    w849043569   119 m2, 12 x 13 m, hole 8:            208 yd (Black 209)
    w849053534    57 m2,  8 x  9 m, hole 9 line start: 485 yd
    w849053535    74 m2,  7 x 12 m, hole 9:            471 yd (Black 468)

`edits.json` "tags" does not change a feature's kind, so each pad is copied as a
tee under a new id ("tee_<osm id>"; dropping by the original id would otherwise
remove the copy too) and the fairway is dropped. The pads are not given a tee
set: only Blue is built, and s06 assigns boxes by measurement.

It also tags hole 11's long teeing ground w849053547 as the Blue box (its centroid
measures 146 yd, but the box spans 116-179 yd and holds the card's 163).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent

PADS = {
    "w849043568": "hole 8 back pad at the line start (224 yd)",
    "w849043569": "hole 8 Black tee (208 yd, card 209)",
    "w849053534": "hole 9 back pad at the line start (485 yd)",
    "w849053535": "hole 9 Black tee (471 yd, card 468)",
}


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    rows = g[g["osm"].isin(PADS)].copy()
    if len(rows) != len(PADS):
        raise SystemExit(f"expected {len(PADS)} pads, found {sorted(rows['osm'])}")
    if set(rows["kind"]) != {"fairway"}:
        raise SystemExit(f"pads are not all fairways: {dict(zip(rows['osm'], rows['kind']))}")
    rows["tags"] = rows["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    rows["tags"] = rows["tags"].apply(lambda t: {**{k: v for k, v in t.items() if k not in ("golf", "landuse")},
                                                 "golf": "tee", "retag_of": "golf=fairway"})
    rows["kind"] = "tee"
    rows["osm"] = "tee_" + rows["osm"]
    out = HERE / "proposed" / "retag_tees.geojson"
    out.parent.mkdir(exist_ok=True)
    rows[["osm", "kind", "tags", "geometry"]].to_file(out, driver="GeoJSON")

    edits = {
        "add": [{
            "from": "proposed/retag_tees.geojson",
            "ids": sorted("tee_" + k for k in PADS),
            "tags": {},
            "reason": "OSM tags these four tee pads golf=fairway (73, 119, 57 and 74 m2 squares at the hole 8 "
                      "and 9 line starts); measured to the green they are the back tees (hole 8 208/224 yd, "
                      "Black 209; hole 9 471/485 yd, Black 468). Copied as tees by data/sandpines/make_edits.py",
        }],
        "tags": [{
            "osm": "w849053547",
            "set": {"hole": "11", "tee_set": "Blue"},
            "reason": "hole 11's long teeing ground (836 m2, 38 x 50 m) spans 116-179 yd along the line; its "
                      "centroid measures 146 yd, so s06 (which assigns boxes by centroid within 8 %) passed it over "
                      "for the line start (182 yd, +11.5 %). The Blue 163 lies inside it (OSIP 2024 photo: one mown "
                      "strip). Course chat's call, 2026-10-24",
        }],
        "drop": [{"osm": k, "reason": f"mistagged golf=fairway: {why}; replaced by tee_{k}"} for k, why in PADS.items()],
    }
    (HERE / "edits.json").write_text(json.dumps(edits, indent=2) + "\n")
    print(f"[edits] {out.name}: {len(rows)} tees; edits.json written")


if __name__ == "__main__":
    main()

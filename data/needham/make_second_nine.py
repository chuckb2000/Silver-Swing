"""Needham Golf Club is nine holes played twice from different tees (club card 2026).
The card's 18 is built as holes 1-18 on the nine greens: holes 10-18 are holes 1-9
played from the second-nine tees. This writes proposed/second_nine.geojson from
raw/osm.geojson (s01's output):

- a copy of each OSM hole line 1-9 as hole n+9 (same geometry, ref n+9);
- (proposed/clubhouse.geojson) the clubhouse, mapped golf=clubhouse only, as a building;
- a copy of each tee box a second-nine hole uses, tagged hole=n+9 and tee_set=<sets>
  (s06 gives one box to one hole per tee set, and a box can carry one hole tag, so a
  box used on hole n and hole n+9 needs a copy).

The boxes for each hole and tee set come from the club card's yardages measured
from the OSM boxes (validation_report.md, "Tee boxes"). Run:
    python3 data/needham/make_second_nine.py
then `make course NAME=needham` (edits.json adds the file's features).
"""
import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent
BW, WG = "Blue/White", "White/Green"
# hole -> OSM tee box for each set; front nine (holes 1-9) tagged on the OSM boxes in edits.json
SECOND = {  # hole 10-18: box -> sets
    10: {"w1271766427": [BW], "w1271766426": [WG]},
    11: {"w1271766416": [BW, WG]},
    12: {"w1271766413": [BW, WG]},
    13: {"w1271766409": [BW, WG]},
    14: {"w1271766405": [BW, WG]},
    15: {"w1271766408": [BW, WG]},
    16: {"w1271766423": [BW, WG]},
    17: {"w1271766422": [BW, WG]},
    18: {"w1271766412": [BW, WG]},
}


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    rows = []
    holes = g[g.kind == "hole"]
    for _, h in holes.iterrows():
        n = int(h.tags["ref"])
        tags = {**h.tags, "ref": str(n + 9), "golf": "hole", "second_nine_of": str(n)}
        tags.pop("name", None)
        rows.append({"osm": f"{h.osm}_n{n + 9}", "kind": "hole", "tags": tags, "geometry": h.geometry})
    for n, boxes in SECOND.items():
        for osm, sets in boxes.items():
            b = g[g.osm == osm]
            if len(b) != 1:
                raise SystemExit(f"no single tee box {osm}")
            b = b.iloc[0]
            tags = {**b.tags, "golf": "tee", "hole": str(n), "tee_set": ";".join(sets), "copy_of": osm}
            rows.append({"osm": f"{osm}_t{n}", "kind": "tee", "tags": tags, "geometry": b.geometry})
    out = gpd.GeoDataFrame(rows, crs=g.crs)
    out["tags"] = out["tags"].apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    p = HERE / "proposed" / "second_nine.geojson"
    if p.exists():
        p.unlink()
    out.to_file(p, driver="GeoJSON")
    print(f"wrote {p}: {len(out)} features")
    # the clubhouse is mapped golf=clubhouse only (s01 reads it as golf_other): a building copy
    ch = g[g.osm == "w214634834"].copy()
    ch["kind"] = "building"
    ch["osm"] = "w214634834_building"
    ch["tags"] = ch["tags"].apply(lambda t: json.dumps({**t, "building": "yes"}))
    p2 = HERE / "proposed" / "clubhouse.geojson"
    if p2.exists():
        p2.unlink()
    ch.to_file(p2, driver="GeoJSON")
    print(f"wrote {p2}")


if __name__ == "__main__":
    main()

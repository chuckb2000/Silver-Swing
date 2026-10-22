"""One-off helper (not a `make course` step): write data/redtail/edits.json
and the proposals it adds.

1. Two cart paths are mapped as closed ways (a 2.5 km loop around holes 2-7,
   way 1206745336, and a 27 m loop by the clubhouse, way 870641352). The
   Overpass export (osmtogeojson) made them polygons, so s01 read the big loop
   as an 8.5 ha cart-path *area* over six holes. They are copied back as lines
   (the polygon's outline) with a new id and the originals dropped.
2. Every golf=water_hazard inside the boundary is tagged penalty=red: s10 reads
   golf=water_hazard as yellow whatever penalty_default says
   (COURSE_LESSONS.md 12), and the standing default is all water red.

    cd pipeline && python3 s01_osm.py redtail
    python3 ../data/redtail/make_edits.py
    python3 merge_edits.py redtail
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString

HERE = Path(__file__).resolve().parent
LOOPS = ["w1206745336", "w870641352"]


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    add, drop, tags = [], [], []

    loops = g[g.osm.isin(LOOPS)].copy()
    assert sorted(loops.osm) == sorted(LOOPS), sorted(loops.osm)
    assert (loops.kind == "cartpath").all()
    loops["geometry"] = loops.geometry.apply(lambda p: LineString(p.exterior.coords))
    loops["osm"] = loops.osm + "_line"
    loops["tags"] = loops.tags.apply(lambda t: {**t, "was": "closed way read as an area"})
    (HERE / "proposed").mkdir(exist_ok=True)
    loops[["osm", "kind", "tags", "geometry"]].set_crs(4326, allow_override=True).to_file(
        HERE / "proposed" / "cartpath_loops.geojson", driver="GeoJSON")
    add.append({"from": "proposed/cartpath_loops.geojson", "ids": sorted(loops.osm),
                "reason": "golf=cartpath loops mapped as closed ways; the Overpass export made them polygons "
                          "(an 8.5 ha cart-path area over holes 2-7). Copied back as lines (free relief, drawn as a path)"})
    for o in LOOPS:
        drop.append({"osm": o, "reason": "replaced by its line copy (add above)"})

    boundary = g[g.kind == "boundary"].geometry.iloc[0]
    hz = g[g.kind == "water_hazard"]
    for _, r in hz.sort_values("osm").iterrows():
        assert boundary.contains(r.geometry.representative_point()), r.osm
        tags.append({"osm": r.osm, "set": {"penalty": "red"},
                     "reason": "standing default (COURSE_BUILD.md 4.1): every penalty area red"})

    out = {"add": add, "drop": drop, "tags": tags}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"[redtail edits] add {len(loops)}, drop {len(drop)}, tag {len(tags)} water hazards red")


if __name__ == "__main__":
    main()

"""One-off helper (not a `make course` step): write data/stanford/edits.json
and the proposals it adds.

    cd pipeline && python3 s01_osm.py stanford
    python3 ../data/stanford/make_edits.py
    python3 merge_edits.py stanford

What it does, each with its reason in edits.json:

1. The course boundary (relation 3570691) has three parts: the main course, a
   3.5 ha strip holding hole 1's green and hole 2's tee (27 m from the main
   part across Fremont Road) and the 4.4 ha driving range, 98 m east. The game
   needs one OB polygon; join_boundary_parts joins parts within its max gap and
   stops if any part is farther. The range is out of bounds anyway, so the
   boundary is copied without the range part (a proposal with a new id) and the
   relation dropped. The range stays a golf=driving_range polygon outside the
   boundary (out of bounds).
2. One cart path is mapped as a closed way (way 823292795, a 151 m loop near
   hole 17-18); the Overpass export made it a polygon, which s01 reads as a
   950 m2 cart-path area. Copied back as a line with a new id
   (COURSE_LESSONS.md 25).
3. Penalty areas OSM lacks, from the bare-earth DEM (proposed by
   make_water.py; developer 2026-10-24: "Yes ABC, No D"): San Francisquito
   Creek's ravine inside the boundary (A), the open ditch across hole 6 (B)
   and the short ditch at the right edge of hole 1's fairway (C). The shallow
   ditch left of 6 (D) stays rough. All red; tagged flatten=no, since a creek
   falls along its length (s04 would otherwise flatten it into a trench) and
   the trees on its banks stay (s05).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString, MultiPolygon

HERE = Path(__file__).resolve().parent
BOUNDARY = "r3570691"
LOOPS = ["w823292795"]
WATER = {"creek_w49231216": "A: San Francisquito Creek, the ravine to the top of its banks inside the boundary (crosses holes 3, 4, 8, 12, 14)",
         "ditch_w1216390234": "B: open ditch across hole 6, about 30 m short of the green",
         "ditch_w1216390238": "C: short ditch at the right edge of hole 1's fairway"}


def main():
    cfg = json.loads((HERE / "course_config.json").read_text())
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    add, drop, tags = [], [], []
    (HERE / "proposed").mkdir(exist_ok=True)

    # 1. boundary without the driving-range part
    b = g[g.osm == BOUNDARY].copy()
    assert len(b) == 1 and b.geometry.iloc[0].geom_type == "MultiPolygon"
    rng = g[g.kind == "driving_range"].to_crs(cfg["epsg"]).geometry.iloc[0]
    parts = list(b.to_crs(cfg["epsg"]).geometry.iloc[0].geoms)
    parts_wgs = list(b.geometry.iloc[0].geoms)
    assert len(parts) == 3, len(parts)
    keep = [pw for p, pw in zip(parts, parts_wgs) if p.intersection(rng).area < 0.5 * p.area]
    dropped = [p for p in parts if p.intersection(rng).area >= 0.5 * p.area]
    assert len(keep) == 2 and len(dropped) == 1, (len(keep), len(dropped))
    b["geometry"] = [MultiPolygon(keep)]
    b["osm"] = BOUNDARY + "_course"
    b["tags"] = b.tags.apply(lambda t: {**t, "edit": "relation 3570691 without its driving-range part"})
    b[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "boundary.geojson", driver="GeoJSON")
    add.append({"from": "proposed/boundary.geojson", "ids": [BOUNDARY + "_course"],
                "reason": "the course boundary without its third part, the driving range 98 m east "
                          f"({dropped[0].area / 1e4:.1f} ha, out of bounds anyway): join_boundary_parts joins the "
                          "other two parts (27 m apart across Fremont Road) and stops on a part farther than its gap"})
    drop.append({"osm": BOUNDARY, "reason": "replaced by its copy without the range part (add above)"})

    # 2. closed cart-path way read as an area
    loops = g[g.osm.isin(LOOPS)].copy()
    assert sorted(loops.osm) == sorted(LOOPS) and (loops.kind == "cartpath").all()
    loops["geometry"] = loops.geometry.apply(lambda p: LineString(p.exterior.coords))
    loops["osm"] = loops.osm + "_line"
    loops["tags"] = loops.tags.apply(lambda t: {**t, "was": "closed way read as an area"})
    loops[["osm", "kind", "tags", "geometry"]].set_crs(4326, allow_override=True).to_file(
        HERE / "proposed" / "cartpath_loops.geojson", driver="GeoJSON")
    add.append({"from": "proposed/cartpath_loops.geojson", "ids": sorted(loops.osm),
                "reason": "golf=cartpath loop mapped as a closed way; the Overpass export made it a polygon "
                          "(a 950 m2 cart-path area). Copied back as a line (free relief, drawn as a path)"})
    for o in LOOPS:
        drop.append({"osm": o, "reason": "replaced by its line copy (add above)"})

    # 3. creek and ditches (developer approved A, B, C on 2026-10-24)
    for oid, why in WATER.items():
        add.append({"from": "proposed/water_lidar.geojson", "ids": [oid],
                    "tags": {"proposed": "approved", "flatten": "no", "penalty": "red"},
                    "reason": why + "; red penalty area from the lidar DEM channel (make_water.py), approved by the developer 2026-10-24"})

    out = {"add": add, "drop": drop, "tags": tags}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"[stanford edits] add {sum(len(a['ids']) for a in add)}, drop {len(drop)}, tag {len(tags)}")


if __name__ == "__main__":
    main()

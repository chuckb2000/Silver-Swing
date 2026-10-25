"""One-off helper (not a `make course` step): write data/pumpkin_ridge/edits.json
and the proposals it adds.

1. OSM maps one leisure=golf_course polygon (way 901988733) for both courses,
   so each golf=hole line gets layout=<layout id> from its OSM name
   ("Witch Hollow 7", "Ghost Creek 12"); common.layout_holes() reads the tag.
2. Every golf=water_hazard is tagged penalty=red: s10 reads golf=water_hazard
   as yellow whatever penalty_default says (COURSE_LESSONS.md 12), and the
   standing default is all water red.
3. golf=practice (way 900259494, the driving range) is copied as a
   golf=driving_range area so the range is out of bounds (standing default);
   s01 reads golf=practice as nothing.
4. The three golf=clubhouse areas are copied as buildings: s01 classifies by
   the golf key first, so they would be neither drawn nor obstructions
   (COURSE_LESSONS.md 14).
5. The four golf=path lines are copied as cart paths (s01 reads only
   golf=cartpath; COURSE_LESSONS.md 10).

    cd pipeline && python3 s01_osm.py pumpkin_ridge
    python3 ../data/pumpkin_ridge/make_edits.py
    python3 merge_edits.py pumpkin_ridge
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

HERE = Path(__file__).resolve().parent
LAYOUTS = {"Witch Hollow": "pumpkin_ridge_witch_hollow", "Ghost Creek": "pumpkin_ridge_ghost_creek"}


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    add, drop, tags = [], [], []
    boundary = g[g.kind == "boundary"]
    assert len(boundary) == 1 and boundary.osm.iloc[0] == "w901988733", list(boundary.osm)
    B = boundary.geometry.iloc[0]

    # 1. layout per hole line
    seen = {v: set() for v in LAYOUTS.values()}
    for _, r in g[g.kind == "hole"].sort_values("osm").iterrows():
        name = r.tags.get("name", "")
        course = name.rsplit(" ", 1)[0]
        lay = LAYOUTS[course]
        ref = int(r.tags["ref"])
        assert name == f"{course} {ref}", (r.osm, name)
        seen[lay].add(ref)
        tags.append({"osm": r.osm, "set": {"layout": lay},
                     "reason": f"OSM name '{name}': one course polygon for both courses, so the hole line is assigned to its layout by name"})
    for lay, refs in seen.items():
        assert refs == set(range(1, 19)), (lay, sorted(refs))

    # 2. every water hazard red
    for _, r in g[g.kind == "water_hazard"].sort_values("osm").iterrows():
        assert B.contains(r.geometry.representative_point()), r.osm
        tags.append({"osm": r.osm, "set": {"penalty": "red"},
                     "reason": "standing default (COURSE_BUILD.md 4.1): every penalty area red"})

    # 3-5. features s01 reads as golf_other
    prop = []
    other = g[g.kind == "golf_other"]
    rng = other[other.tags.apply(lambda t: t.get("golf") == "practice")]
    assert list(rng.osm) == ["w900259494"], list(rng.osm)
    r = rng.copy()
    r["kind"] = "driving_range"
    r["tags"] = r.tags.apply(lambda t: {**t, "golf": "driving_range", "was": "golf=practice"})
    r["osm"] = r.osm + "_range"
    prop.append(r)
    club = other[other.tags.apply(lambda t: t.get("golf") == "clubhouse")]
    assert len(club) == 3, list(club.osm)
    c = club.copy()
    c["kind"] = "building"
    c["tags"] = c.tags.apply(lambda t: {**{k: v for k, v in t.items() if k != "golf"}, "building": t.get("building", "yes"), "was": "golf=clubhouse"})
    c["osm"] = c.osm + "_bldg"
    prop.append(c)
    paths = other[other.tags.apply(lambda t: t.get("golf") == "path")]
    assert len(paths) == 4, list(paths.osm)
    p = paths.copy()
    p["kind"] = "cartpath"
    p["tags"] = p.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
    p["osm"] = p.osm + "_path"
    prop.append(p)
    P = gpd.GeoDataFrame(pd.concat(prop, ignore_index=True), crs=4326)[["osm", "kind", "tags", "geometry"]]
    (HERE / "proposed").mkdir(exist_ok=True)
    P.to_file(HERE / "proposed" / "retagged.geojson", driver="GeoJSON")
    add.append({"from": "proposed/retagged.geojson", "ids": list(r.osm),
                "reason": "golf=practice (the driving range, 3.6 ha) as golf=driving_range: out of bounds (standing default)"})
    add.append({"from": "proposed/retagged.geojson", "ids": list(c.osm),
                "reason": "golf=clubhouse areas as buildings (drawn, and an obstruction); s01 reads the golf key first"})
    add.append({"from": "proposed/retagged.geojson", "ids": list(p.osm),
                "reason": "golf=path lines as cart paths (free relief); s01 reads only golf=cartpath"})
    for o in list(rng.osm) + list(club.osm) + list(paths.osm):
        drop.append({"osm": o, "reason": "replaced by its retagged copy (add above)"})

    out = {"add": add, "drop": drop, "tags": tags}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    n_h = sum(1 for t in tags if "layout" in t["set"])
    print(f"[pumpkin_ridge edits] {n_h} hole lines given a layout, {len(tags) - n_h} water hazards red, "
          f"add {len(P)} retagged copies, drop {len(drop)}")


if __name__ == "__main__":
    main()

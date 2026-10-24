"""One-off helper (not a `make course` step): list the lidar trees that stand in
a fairway as course_config.json `drop_trees` entries, keeping the oak in the
12th fairway.

    cd pipeline && python3 s05_trees.py stanford     # trees from the lidar
    python3 ../data/stanford/make_tree_drops.py      # adds entries to drop_trees
    python3 s05_trees.py stanford                    # again, without them

The standing default (COURSE_BUILD.md 4.1) removes every tree whose top is
more than 2 m inside a fairway (`trees_off_fairways_m: 2`), but that key
would also remove the great oak in the 12th fairway, the hole's known feature
(Stanford Magazine, "Green Acres"; developer 2026-10-24: keep it). So the same
rule is applied here, by list, with the trees within KEEP_R m of the oak's OSM
points (nodes 10608768322 and 10608768323, both inside the 12th fairway)
left out. Entries this script adds carry reason "fairway: ..."; re-running it
adds only trees not already listed (the dropped ones are gone from
trees_all.json), so the list is stable.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union
from shapely.prepared import prep
from shapely.geometry import Point

HERE = Path(__file__).resolve().parent
INSET_M = 2.0
KEEP_OSM = ["n10608768322", "n10608768323"]
KEEP_R = 8.0


def main():
    cfg_path = HERE / "course_config.json"
    cfg = json.loads(cfg_path.read_text())
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    fw = g[g.kind == "fairway"]
    inset = prep(unary_union(list(fw.geometry)).buffer(-INSET_M))
    keep_pts = [g[g.osm == o].geometry.iloc[0] for o in KEEP_OSM]
    trees = json.loads((HERE / "build" / "trees_all.json").read_text())
    have = cfg.get("drop_trees") or []
    new, kept = [], []
    for t in trees:
        p = Point(t["x"], t["y"])
        if not inset.contains(p):
            continue
        if min(p.distance(k) for k in keep_pts) <= KEEP_R:
            kept.append(t)
            continue
        hole = fw[fw.contains(p)].osm.iloc[0]
        new.append({"x": round(t["x"], 1), "y": round(t["y"], 1),
                    "reason": f"fairway: {t['h']:.0f} m tree more than {INSET_M:g} m inside fairway {hole} "
                              "(standing default; the 12th-fairway oak is kept)"})
    for t in kept:
        print(f"kept (12th-fairway oak): {t['x']:.1f},{t['y']:.1f} h {t['h']:.1f} m r {t['r']:.1f} m")
    if new:
        cfg["drop_trees"] = have + new
        cfg_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n")
    print(f"[stanford trees] {len(new)} fairway trees added to drop_trees ({len(have) + len(new)} listed), {len(kept)} kept")


if __name__ == "__main__":
    main()

"""Step 9b (every course): no tree stands in the way of a tee shot aimed at the
middle of the fairway.

The developer (2026-10-19, East Potomac: "if I aim at the dead centre of the
fairway, the trees around the tee box get in my way"; then "it should just be
the case"). Real courses keep the opening off every tee clear; lidar crowns, a
virtual tee at the corner of a shared box, or a tee box that isn't mapped can
leave a crown over the line. A hole listed in course_config.json
"keep_tee_trees" keeps its trees (a deliberate tree-lined dogleg: Oswego Lake 10).

s06 has already moved each blocked virtual tee to the nearest clear spot in its
own box (5.6 step 2). For every tee still blocked (no clear spot in the box, a
developer-placed tee, or a tee with no mapped box), this step drops the trees
that a perfect, lowest tee shot (pipeline/tee_shots.py) would hit within the
first 60 m, from build/trees_all.json (s05), and writes build/trees.json again,
in the order s05 uses (flowering-cherry sprite slots). The dropped trees are
listed in build/trees_report.json and the validation report.
"""
from __future__ import annotations

import json

import geopandas as gpd
import numpy as np
from shapely.geometry import Point

from common import build_dir, course_name_from_argv, keeps_tee_trees, layouts, load_config, play_boundary, rnd, write_json
from tee_shots import REACH, TreeIndex, target_point


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    bdir = build_dir(name)
    g = gpd.read_file(bdir / "course_local.geojson")
    trees = json.loads((bdir / "trees_all.json").read_text())
    zgrid = np.load(bdir / "height_base.npy")
    idx = TreeIndex(trees, zgrid, cfg.get("tee_shot_margin_m", 0.0))
    fairways = list(g[g.kind == "fairway"].geometry)
    lays = {l_["id"]: l_ for l_ in layouts(cfg)}
    names = {k: (l_.get("short") or k) for k, l_ in lays.items()}
    drop = {}
    for h in json.loads((bdir / "holes.json").read_text()):
        if keeps_tee_trees(cfg, lays[h.get("layout", cfg["id"])], h["number"]):
            continue
        pin = Point(*h["pin"])
        for ts, t in h["tees"].items():
            tee = Point(t["x"], t["y"])
            for k in idx.blocking(tee, target_point(tee, t["centerline"], pin, fairways)):
                tag = (f"{names[h['layout']]} " if "layout" in h else "") + f"{h['number']} {ts}"
                d = Point(trees[k]["x"], trees[k]["y"]).distance(tee)
                drop.setdefault(k, []).append((tag, d))
    if not drop:  # s05's trees.json stands as it is
        print("[s06b] every tee shot at the middle of the fairway clears the trees")
        return
    kept = [t for k, t in enumerate(trees) if k not in drop]
    dropped = [{"x": round(trees[k]["x"], 1), "y": round(trees[k]["y"], 1), "h": trees[k]["h"], "r": trees[k]["r"],
                "tee_shots": [a for a, _ in hits], "from_tee_m": rnd(min(d for _, d in hits), 1)}
               for k, hits in sorted(drop.items())]

    rep = json.loads((bdir / "trees_report.json").read_text())
    if cfg.get("blossom"):
        from s05_trees import assign_blossoms
        water_cells = np.load(bdir / "water_cells.npy")
        kept, note = assign_blossoms(kept, cfg["blossom"], play_boundary(g, cfg), water_cells, None)
        old = rep.get("blossom", {}).get("text")
        if old:
            rep["type_method"] = rep["type_method"].replace(old, note["text"])
        rep["blossom"] = note
        rep["cherry"] = int(sum(t_["type"] == "cherry" for t_ in kept))
    rep["detected"] = len(kept)
    rep["inside_course"] = int(sum(t_["in"] for t_ in kept))
    rep["conifer"] = int(sum(t_["type"] == "conifer" for t_ in kept))
    rep["deciduous"] = int(sum(t_["type"] == "deciduous" for t_ in kept))
    rep["dropped_for_tee_shots"] = dropped
    write_json(bdir / "trees.json", kept)
    write_json(bdir / "trees_report.json", rep, indent=1)
    print(f"[s06b] {len(dropped)} trees dropped from tee shots (within {REACH:g} m of the tee): "
          + "; ".join(f"{', '.join(d['tee_shots'])} ({d['h']} m, {d['from_tee_m']} m out)" for d in dropped))


if __name__ == "__main__":
    main()

"""One-off helper (not a `make course` step): write data/silvies/edits.json.

    python3 s01_osm.py silvies          # writes raw/osm.geojson
    python3 ../data/silvies/make_edits.py

So far:
- golf=path (the current OSM tag for a course path; 54 ways here) is not read as a cart
  path by s01 (COURSE_LESSONS.md 10, 17): copy each one inside the boundary as
  golf=cartpath with a new id, drop the original.
More edits (tees, the range, the boundary) are added here once the developer has
approved their proposals.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent
COURSE = "w904342362"


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    course = g[g.osm == COURSE].geometry.iloc[0]
    add, drop = [], []
    paths = g[(g.kind == "golf_other") & g.tags.apply(lambda t: t.get("golf") == "path")]
    paths = paths[paths.geometry.intersects(course)]
    if len(paths):
        prop = paths.copy()
        prop["osm"] = prop.osm + "_cartpath"   # a new id: "drop" removes by id, and the original goes
        prop["kind"] = "cartpath"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
        (HERE / "proposed").mkdir(exist_ok=True)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "paths_as_cartpaths.geojson", driver="GeoJSON")
        add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(prop.osm),
                    "reason": f"{len(prop)} golf=path ways inside the boundary (the course's cart paths), not read by s01: copied as golf=cartpath (free relief, drawn as a path)"})
        for o in sorted(paths.osm):
            drop.append({"osm": o, "reason": "replaced by its golf=cartpath copy (add above)"})
    out = {"note": "Edits to the OSM layout for Silvies Valley Ranch, made by make_edits.py; built into edited/course.geojson by pipeline/merge_edits.py.",
           "add": add, "drop": drop}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"edits.json: {sum(len(a['ids']) for a in add)} adds, {len(drop)} drops")


if __name__ == "__main__":
    main()

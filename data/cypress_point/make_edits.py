"""Write edits.json for Cypress Point (course-chat helper, not a `make course` step).

    cd pipeline && python3 s01_osm.py cypress_point      # writes raw/osm.geojson
    python3 ../data/cypress_point/make_edits.py

The export's box also holds Spyglass Hill (its boundary and 13 hole lines), and the
pipeline takes every leisure=golf_course polygon and every golf=hole line it finds
(COURSE_LESSONS.md 17, 20). So:

- every course polygon but Cypress Point's (w36435651) is dropped; Spyglass's
  greens, tees, fairways and bunkers stay as scenery (all outside the boundary);
- every hole line that isn't one of Cypress Point's 18 is dropped (checked to lie
  outside the boundary);
- greens wholly outside the world are dropped (s07/s09 can't shape a green off the map);
- golf=path inside the boundary, which s01 doesn't read (COURSE_LESSONS.md 10), is
  copied as golf=cartpath and the original dropped;
- every mapped penalty area is tagged penalty=red (standing default; none mapped now).

Then the course's own edits from course_edits.json (approved proposals only).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import box

HERE = Path(__file__).resolve().parent
BOUNDARY = "w36435651"
HOLES = {1: "w679090601", 2: "w679401798", 3: "w679401799", 4: "w679401801", 5: "w679401802",
         6: "w679401804", 7: "w679401805", 8: "w679401807", 9: "w679401808", 10: "w679401810",
         11: "w679401812", 12: "w679401813", 13: "w679401815", 14: "w679401816", 15: "w679401818",
         16: "w679401819", 17: "w679401821", 18: "w679401822"}
EDITS_FILE = HERE / "course_edits.json"


def tagsof(t):
    return t if isinstance(t, dict) else json.loads(t)


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(tagsof)
    gu = g.to_crs(cfg["epsg"])
    bnd = gu[g.osm == BOUNDARY].geometry.iloc[0]
    w = cfg["world"]
    world = box(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"])
    add, tags, drop = [], [], []
    for i, f in g[g.kind == "boundary"].sort_values("osm").iterrows():
        if f.osm != BOUNDARY:
            drop.append({"osm": f.osm, "reason": f"{f.tags.get('name', 'unnamed')} (leisure=golf_course): "
                         "another course; the out-of-bounds line is Cypress Point's own polygon"})
    own = {v: k for k, v in HOLES.items()}
    for i, h in g[g.kind == "hole"].sort_values("osm").iterrows():
        if h.osm in own:
            assert int(h.tags["ref"]) == own[h.osm], h.osm
            continue
        assert gu.geometry[i].intersection(bnd).length < 1, h.osm
        drop.append({"osm": h.osm, "reason": f"Spyglass Hill hole {h.tags.get('ref')} "
                     f"({h.tags.get('name', 'unnamed')}): another course's hole line, outside the boundary"})
    assert set(own) <= set(g.osm), "missing Cypress Point hole lines"
    for i, f in g[g.kind == "green"].sort_values("osm").iterrows():
        if not gu.geometry[i].intersects(world):
            drop.append({"osm": f.osm, "reason": "another course's green wholly outside the world box "
                         "(s07/s09 cannot shape a green off the map)"})
    paths = g[(g.kind == "golf_other") & g.tags.apply(lambda t: t.get("golf") == "path")]
    paths = paths[gu.geometry[paths.index].intersects(bnd)]
    if len(paths):
        prop = paths.copy()
        prop["osm"] = prop.osm + "_cartpath"
        prop["kind"] = "cartpath"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
        (HERE / "proposed").mkdir(exist_ok=True)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "paths_as_cartpaths.geojson",
                                                         driver="GeoJSON")
        add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(prop.osm),
                    "reason": f"{len(prop)} golf=path ways inside the boundary, not read by s01: copied as "
                              "golf=cartpath (free relief, drawn as paths)"})
        for o in sorted(paths.osm):
            drop.append({"osm": o, "reason": "replaced by its golf=cartpath copy (add above)"})
    for i, f in g[g.kind.isin(["water_hazard", "lateral_water_hazard"])].sort_values("osm").iterrows():
        if f.tags.get("penalty") != "red":
            tags.append({"osm": f.osm, "set": {"penalty": "red"},
                         "reason": f"{f.tags.get('name', 'unnamed')}: every penalty area red (standing default)"})
    mine = json.load(open(EDITS_FILE)) if EDITS_FILE.exists() else {}
    out = {"note": "Edits to the OSM layout for Cypress Point, written by make_edits.py (generic edits, then "
                   "course_edits.json); built into edited/course.geojson by pipeline/merge_edits.py.",
           "add": add + mine.get("add", []), "tags": tags + mine.get("tags", []),
           "drop": drop + mine.get("drop", []), "extend_start": mine.get("extend_start", [])}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"[edits] cypress_point: {len(out['add'])} adds, {len(out['tags'])} tag sets, "
          f"{len(out['drop'])} drops, {len(out['extend_start'])} line moves")


if __name__ == "__main__":
    main()

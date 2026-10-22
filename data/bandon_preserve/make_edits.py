"""Write edits.json for this course (course-chat helper, not a `make course` step).

    cd pipeline && python3 s01_osm.py <id>        # writes raw/osm.geojson
    python3 ../data/<id>/make_edits.py

Copied from data/old_macdonald/make_edits.py (Shorty's and Bandon Preserve are
built together, 2026-10-22). The OSM export covers the resort's other courses
too (Bandon Trails, Bandon Dunes, Bandon Preserve, Shorty's), and the pipeline
takes every leisure=golf_course polygon and every golf=hole line it finds
(COURSE_LESSONS.md 17, 20). So:

- every course polygon but this course's boundary is dropped; the other
  courses' greens, tees, fairways and bunkers stay as mapped surfaces (inside
  the boundary they are in play, their greens wrong greens);
- every hole line that isn't one of this course's holes is dropped;
- greens wholly outside the world are dropped (s07/s09 can't shape a green off
  the map);
- golf=path inside the boundary, which s01 doesn't read as a cart path
  (COURSE_LESSONS.md 10), is copied as golf=cartpath and the original dropped;
- every mapped penalty area is tagged penalty=red (standing default: all water
  red; s10 reads golf=water_hazard as yellow otherwise, COURSE_LESSONS.md 12).

Plus the course's own edits in course_edits.json (pars, tee tags, splits, ...).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import box

HERE = Path(__file__).resolve().parent
CID = HERE.name
BOUNDARY = {"shortys": "w1540940976", "bandon_preserve": "w674855473"}[CID]
HOLES = {
    "bandon_preserve": None,  # the lines named "Bandon Preserve Hole N"
    "shortys": {1: "w1547376228", 2: "w1547376237", 3: "w1547384744", 4: "w1547585701", 5: "w1547585702", 6: "w1547585703", 7: "w1547585704", 8: "w1547585705", 9: "w1547585706", 10: "w1547585707", 11: "w1547585708", 12: "w1547585709", 13: "w1547585710", 14: "w1547585711", 15: "w1547585713", 16: "w1547585714", 17: "w1547585715", 18: "w1547585716", 19: "w1547585717"},
}[CID]
NHOLES = {"shortys": 19, "bandon_preserve": 13}[CID]
COURSE_NAME = {"shortys": "Shorty's", "bandon_preserve": "Bandon Preserve"}[CID]
POLY_NAMES = {"w362513477": "Bandon Dunes Golf Resort (Bandon Dunes, Pacific Dunes and Old Macdonald)",
              "w362513478": "Practice Center", "w823626858": "Bandon Sheep Ranch", "w362513476": "Bandon Trails",
              "w674855473": "Bandon Preserve", "w1540940976": "Shortys"}

# this course's own edits, added after the generic ones (filled in during the build)
COURSE_EDITS: dict = {"add": [], "tags": [], "drop": [], "extend_start": []}
EDITS_FILE = HERE / "course_edits.json"


def own_hole(h) -> int | None:
    if HOLES is None:
        name = (h.tags.get("name") or "").replace("  ", " ")
        return int(h.tags["ref"]) if name.startswith("Bandon Preserve Hole") else None
    for ref, osm in HOLES.items():
        if h.osm == osm:
            return ref
    return None


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    assert (g.osm == BOUNDARY).any(), BOUNDARY
    bnd = g[g.osm == BOUNDARY].geometry.iloc[0]
    w = cfg["world"]
    world = box(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"])  # in the course EPSG
    gu = g.to_crs(cfg["epsg"])
    add, tags, drop = [], [], []
    for _, f in g[g.kind == "boundary"].sort_values("osm").iterrows():
        if f.osm == BOUNDARY:
            continue
        nm = POLY_NAMES.get(f.osm, f.tags.get("name") or "unnamed")
        why = ("a name point, not a boundary" if f.geometry.geom_type == "Point"
               else "another course of the resort; the out-of-bounds line is this course's own polygon")
        drop.append({"osm": f.osm, "reason": f"{nm} (leisure=golf_course): {why}"})
    refs = {}
    for _, h in g[g.kind == "hole"].sort_values("osm").iterrows():
        ref = own_hole(h)
        if ref is not None:
            assert ref not in refs, (ref, h.osm, refs[ref])
            assert bnd.buffer(0.0003).contains(h.geometry), h.osm
            refs[ref] = h.osm
            continue
        nm = h.tags.get("name") or "an unnamed line"
        drop.append({"osm": h.osm, "reason": f"{nm} (ref {h.tags.get('ref')}): another course's hole line; its surfaces stay as mapped"})
    assert sorted(refs) == list(range(1, NHOLES + 1)), sorted(refs)
    for i, f in g[g.kind == "green"].sort_values("osm").iterrows():
        if not gu.geometry[i].intersects(world):
            drop.append({"osm": f.osm, "reason": "another course's green wholly outside the world box (s07/s09 cannot shape a green off the map)"})
    paths = g[(g.kind == "golf_other") & g.tags.apply(lambda t: t.get("golf") == "path")]
    paths = paths[paths.geometry.intersects(bnd)]
    if len(paths):
        prop = paths.copy()
        prop["osm"] = prop.osm + "_cartpath"
        prop["kind"] = "cartpath"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
        (HERE / "proposed").mkdir(exist_ok=True)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "paths_as_cartpaths.geojson", driver="GeoJSON")
        add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(prop.osm),
                    "reason": f"{len(prop)} golf=path ways inside the boundary, not read by s01: copied as golf=cartpath (free relief, drawn as paths)"})
        for o in sorted(paths.osm):
            drop.append({"osm": o, "reason": "replaced by its golf=cartpath copy (add above)"})
    for i, f in g[g.kind.isin(["water_hazard", "lateral_water_hazard"])].sort_values("osm").iterrows():
        if f.tags.get("penalty") != "red":  # also off the map: s10 exports every penalty area
            nm = f.tags.get("name") or "unnamed"
            tags.append({"osm": f.osm, "set": {"penalty": "red"},
                         "reason": f"{nm} (golf={f.tags.get('golf')}): every penalty area red (standing default)"})
    own = json.load(open(EDITS_FILE)) if EDITS_FILE.exists() else COURSE_EDITS
    out = {"note": f"Edits to the OSM layout for {COURSE_NAME}, written by make_edits.py (generic resort edits, then "
                   "course_edits.json); built into edited/course.geojson by pipeline/merge_edits.py.",
           "add": add + own.get("add", []), "tags": tags + own.get("tags", []),
           "drop": drop + own.get("drop", []), "extend_start": own.get("extend_start", [])}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"[edits] {CID}: {len(out['add'])} adds, {len(out['tags'])} tag sets, {len(out['drop'])} drops, "
          f"{len(out['extend_start'])} line moves; holes {sorted(refs)[0]}-{sorted(refs)[-1]}")


if __name__ == "__main__":
    main()

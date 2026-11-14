"""Write edits.json for this course (course-chat helper, not a `make course` step).

    cd pipeline && python3 s01_osm.py <id>        # writes raw/osm.geojson
    python3 ../data/<id>/make_edits.py

Copied from data/old_macdonald/make_edits.py (the Bandon resort's), for the
St Andrews Links: the OSM export covers the Links' other courses too (New,
Jubilee, Eden, Strathtyrum, Balgove, and the Castle Course's edge), and the
pipeline takes every leisure=golf_course polygon and every golf=hole line it
finds. So:

- every course polygon but this course's boundary is dropped; the other
  courses' greens, tees, fairways and bunkers stay as mapped surfaces (inside
  the boundary they are in play, their greens wrong greens);
- every hole line that isn't one of this course's 18 is dropped;
- greens wholly outside the world are dropped (s07/s09 can't shape a green off
  the map);
- golf=path inside the boundary, which s01 doesn't read as a cart path
  (COURSE_LESSONS.md 10), is copied as golf=cartpath and the original dropped;
- every mapped penalty area is tagged penalty=red (standing default: all water
  red; s10 reads golf=water_hazard as yellow otherwise, COURSE_LESSONS.md 12).

Plus the course's own edits in COURSE_EDITS (tee tags, extend_start, ...).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import box

HERE = Path(__file__).resolve().parent
CID = HERE.name
BOUNDARY = "w1019045811"  # Old Course
HOLES = {1: "w236999244", 2: "w236999252", 3: "w236999260", 4: "w236999250", 5: "w236999245",
         6: "w236999263", 7: "w294611909", 8: "w294611910", 9: "w294611911", 10: "w294611912",
         11: "w294611914", 12: "w294611915", 13: "w294611917", 14: "w294611919", 15: "w294611923",
         16: "w294611927", 17: "w236999254", 18: "w236999246"}
COURSE_NAME = "the Old Course"
POLY_NAMES = {"w68283334": "New Course", "w68283454": "Jubilee Course", "w158718157": "Eden Course",
              "w158718555": "Strathtyrum Course", "w158718591": "Balgove Course"}

# this course's own edits, added after the generic ones (filled in during the build)
COURSE_EDITS: dict = {"add": [], "tags": [], "drop": [], "extend_start": []}
EDITS_FILE = HERE / "course_edits.json"


def own_hole(h) -> int | None:
    if HOLES is None:
        name = (h.tags.get("name") or "").replace("  ", " ")
        return int(h.tags["ref"]) if name.startswith("Pacific Dunes Hole") else None
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
               else "another course of the St Andrews Links; the out-of-bounds line is the Old Course's own polygon")
        drop.append({"osm": f.osm, "reason": f"{nm} (leisure=golf_course): {why}"})
    refs = {}
    for _, h in g[g.kind == "hole"].sort_values("osm").iterrows():
        ref = own_hole(h)
        if ref is not None:
            assert ref not in refs, (ref, h.osm, refs[ref])
            # the 17th's line crosses the Old Course Hotel's ground (out of bounds) from the tee
            assert h.geometry.intersection(bnd.buffer(0.0003)).length > 0.6 * h.geometry.length, h.osm
            refs[ref] = h.osm
            continue
        nm = h.tags.get("name") or "an unnamed line"
        drop.append({"osm": h.osm, "reason": f"{nm} (ref {h.tags.get('ref')}): another course's hole line; its surfaces stay as mapped"})
    assert sorted(refs) == list(range(1, 19)), sorted(refs)
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
    club = g[g.tags.apply(lambda t: t.get("golf") == "clubhouse") & (g.kind != "building")]
    club = club[club.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]
    if len(club):
        prop = club.copy()
        prop["osm"] = prop.osm + "_building"
        prop["kind"] = "building"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "building": "yes", "was": "golf=clubhouse"})
        (HERE / "proposed").mkdir(exist_ok=True)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "clubhouses_as_buildings.geojson", driver="GeoJSON")
        add.append({"from": "proposed/clubhouses_as_buildings.geojson", "ids": sorted(prop.osm),
                    "reason": f"{len(prop)} golf=clubhouse buildings (s01 reads the golf tag first, so not as buildings): copied as buildings"})
        for o in sorted(club.osm):
            drop.append({"osm": o, "reason": "replaced by its building copy (add above)"})
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

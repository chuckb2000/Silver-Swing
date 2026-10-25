"""One-off helper (not a `make course` step): write data/silvies/edits.json.

    python3 s01_osm.py silvies          # writes raw/osm.geojson
    python3 ../data/silvies/make_edits.py

- golf=path (the current OSM tag for a course path; 54 ways here) is not read as a cart
  path by s01 (COURSE_LESSONS.md 10, 17): copy each one inside the boundary as
  golf=cartpath with a new id, drop the original.
- The boundary grown 30 m round Craddock play (make_boundary.py; developer approved
  2026-10-25) replaces OSM w904342362.
- The tracing desk (make_approved.py, from the developer's saves): every hole's tee box,
  the Hankins and Chief Egan hole lines, Craddock 2 and 16 re-started; the other 16 OSM
  hole lines tagged layout=silvies_craddock.
- OSM w904342353 (golf=tee) is Chief Egan's 3rd green: replaced by its copy as a green
  (proposed/routing.geojson).
- A pin at the centre of every played green (propose_pins.py).
- The Chief Egan creek (make_egan_creek.py), approved 2026-10-25.
- The thicket by the Craddock 9th green (make_riparian.py), for the shrubs there.
- Chief Egan 6's green as the developer traced it (make_egan6_green.py).
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
    import subprocess, sys
    subprocess.run([sys.executable, "-I", str(HERE / "make_approved.py")], check=True)
    add.append({"from": "proposed/boundary_grown.geojson", "ids": ["w904342362_grown"],
                "reason": "the OSM boundary grown 30 m round every Craddock tee, fairway, green, bunker and hole line (make_boundary.py), so no grass that looks in play is out of bounds (developer approved 2026-10-25)"})
    drop.append({"osm": COURSE, "reason": "replaced by its grown copy (add above)"})
    ap = gpd.read_file(HERE / "proposed" / "approved.geojson")
    add.append({"from": "proposed/approved.geojson", "ids": sorted(ap.osm),
                "reason": "the developer's tracing desk, 2026-10-25: one tee box per hole for the set built (every tee on a tee box, developer), Hankins and Chief Egan hole lines from the course chat's routing started at those boxes, Craddock 2 and 16 re-started on theirs"})
    add.append({"from": "proposed/routing.geojson", "ids": ["w904342353_green"],
                "reason": "OSM w904342353 is tagged golf=tee but is Chief Egan's 3rd green on the club map and the photo"})
    drop.append({"osm": "w904342353", "reason": "replaced by its copy as a green (add above)"})
    add.append({"from": "proposed/egan_creek.geojson", "ids": ["egan_creek"],
                "reason": "the small creek through Chief Egan, from the DEM channel, 2 m wide, red, running into the pond (make_egan_creek.py; developer 2026-10-25: keep it small, connect it to the lake)"})
    add.append({"from": "proposed/riparian_c9.geojson", "ids": ["riparian_c9"],
                "reason": "the shrub thicket north of the Craddock 9th green (make_riparian.py): an area for the config's gorse extra_areas (bushes) and not_trees_areas keys; no surface of its own (developer 2026-10-25: 'should just be shrubs')"})
    add.append({"from": "proposed/egan6_green.geojson", "ids": ["w904342360_traced"],
                "reason": "Chief Egan 6's green as the developer traced it (172 m2; make_egan6_green.py)"})
    drop.append({"osm": "w904342360", "reason": "replaced by the developer's trace (add above)"})
    if (HERE / "proposed" / "pins.geojson").exists():
        pn = gpd.read_file(HERE / "proposed" / "pins.geojson")
        add.append({"from": "proposed/pins.geojson", "ids": sorted(pn.osm),
                    "reason": "one pin at the centre of every green that ends a hole (propose_pins.py; standing default: the game places the other pin positions)"})
    holes = g[g.kind == "hole"]
    tags = []
    for _, h in holes.sort_values("osm").iterrows():
        ref = int(h.tags.get("ref"))
        if ref in (2, 16):
            drop.append({"osm": h.osm, "reason": f"Craddock {ref}: the OSM line starts off its tee (make_routing.py); replaced by desk_craddock_{ref:02d}_line"})
        else:
            tags.append({"osm": h.osm, "set": {"layout": "silvies_craddock"}, "reason": f"Craddock {ref} (the OSM routing is Craddock's)"})
    out = {"note": "Edits to the OSM layout for Silvies Valley Ranch, made by make_edits.py; built into edited/course.geojson by pipeline/merge_edits.py.",
           "add": add, "tags": tags, "drop": drop}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"edits.json: {sum(len(a['ids']) for a in add)} adds, {len(tags)} retags, {len(drop)} drops")


if __name__ == "__main__":
    main()

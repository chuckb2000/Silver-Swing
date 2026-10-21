"""One-off helper (not a `make course` step): write data/tpc_boston/edits.json
and the proposals it adds.

    python3 pipeline/s01_osm.py tpc_boston      # writes raw/osm.geojson
    python3 data/tpc_boston/make_edits.py

What it does, each with its reason in edits.json:
- Norton Country Club (way 29897980) lies 74 m west of TPC Boston, inside the
  world box. The pipeline takes every leisure=golf_course polygon and every
  golf=hole line, so its boundary and hole lines are dropped. Its greens, tees,
  bunkers and ponds stay as scenery: they lie outside the TPC boundary, so they
  are out of bounds.
- Every golf=water_hazard inside the TPC boundary gets penalty=red (developer's
  standing default: every penalty area red; s10 otherwise reads water_hazard as
  yellow, COURSE_LESSONS.md 12).
- Hole 14's OSM par is the tour card's 5; the club's 2024 card plays it as a
  par 4 (developer, 2026-10-20).
- golf=path (not read as a cart path by s01, COURSE_LESSONS.md 10) is copied as
  golf=cartpath with a new id and the original dropped.
- The clubhouse is golf=clubhouse + building=yes, which s01 files under the golf
  key (neither drawn nor an obstruction, COURSE_LESSONS.md 14): copied as a
  building.
- A pin at the centre of every hole's green that has no OSM pin (proposal, as
  at Franklin and Highland Links).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point

HERE = Path(__file__).resolve().parent
TPC = "w311851822"
NORTON = "w29897980"
PAR_FIX = {"14": "4"}
# Tee boxes s06 doesn't find on its own (course chat, 2026-10-21; measured the
# way s06 measures, from points 2.5 m inside each box):
TEE_TAGS = {
    "w677741698": ("6", "Black", "box 29 m beside the line (s06 searches 25 m), 428 yd from its centre against the card's 429; s06 had taken the 455 yd box"),
    "w1239401660": ("3", "Gold", "a 42 x 21 m tee complex spanning 147-187 yd, also the Black box (166); its back end holds the Gold 184, and OSM has no separate Gold box (the only other boxes measure 206 and 142 yd)"),
    "w1110722253": ("16", "Black", "a 60 x 23 m tee complex spanning 90-144 yd; its back end holds the Black 144, and OSM has no separate Black box (the others measure 161, 183 and 250+ yd)"),
}


def main():
    cfg = json.loads((HERE / "course_config.json").read_text())
    epsg = cfg["epsg"]
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    gu = g.to_crs(epsg)
    tpc = gu[gu.osm == TPC].geometry.iloc[0]
    norton = gu[gu.osm == NORTON].geometry.iloc[0]
    drop, tags, add = [], [], []
    (HERE / "proposed").mkdir(exist_ok=True)

    # Norton Country Club
    drop.append({"osm": NORTON, "reason": "Norton Country Club course boundary (a neighbouring course 74 m west, inside the world box): out of bounds here"})
    holes = gu[gu.kind == "hole"]
    tpc_holes = {}
    for _, h in holes.sort_values("osm").iterrows():
        if tpc.buffer(5).contains(h.geometry):
            ref = h.tags.get("ref")
            assert ref not in tpc_holes, ref
            tpc_holes[ref] = h
            continue
        assert norton.buffer(30).intersects(h.geometry), h.osm
        drop.append({"osm": h.osm, "reason": f"hole {h.tags.get('ref')} of Norton Country Club, outside the TPC Boston boundary"})
    assert sorted(tpc_holes, key=int) == [str(i) for i in range(1, 19)], sorted(tpc_holes)
    # Norton's greens wholly outside the world box: s07 shapes every green and s09
    # cannot rasterise one off the map (COURSE_LESSONS.md 20), so they are dropped.
    from shapely.geometry import box
    w = cfg["world"]
    world = box(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"])
    for _, f in gu[gu.kind == "green"].sort_values("osm").iterrows():
        if not f.geometry.intersects(world):
            assert not tpc.intersects(f.geometry), f.osm
            drop.append({"osm": f.osm, "reason": "Norton Country Club green wholly outside the world box (s07/s09 cannot shape a green off the map)"})

    # Norton's ponds (golf=water_hazard outside the TPC boundary) would export as
    # yellow penalty areas, and the game checks water before out of bounds: copy
    # them as plain natural=water (drawn as off-course water, out of bounds) and
    # drop the originals.
    nw = gu[gu.kind.isin(["water_hazard", "lateral_water_hazard"]) & ~gu.geometry.intersects(tpc.buffer(5))]
    if len(nw):
        prop = nw.copy()
        prop["osm"] = prop.osm + "_water"
        prop["kind"] = "water"
        prop["tags"] = prop.tags.apply(lambda t: {k: v for k, v in t.items() if k != "golf"} | {"natural": t.get("natural", "water"), "was": "golf=" + t.get("golf", "")})
        prop = prop.to_crs(4326)
        prop["tags"] = prop["tags"].apply(json.dumps)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "norton_ponds.geojson", driver="GeoJSON")
        add.append({"from": "proposed/norton_ponds.geojson", "ids": sorted(prop.osm), "tags": {},
                    "reason": "Norton Country Club's ponds (golf=water_hazard outside the TPC boundary): copied as plain water so they draw as off-course water and play as out of bounds, not as yellow penalty areas (the game checks water before out of bounds)"})
        for o in sorted(nw.osm):
            drop.append({"osm": o, "reason": "Norton Country Club pond, replaced by its plain-water copy (add above)"})

    # penalty areas
    for _, w in gu[gu.kind.isin(["water_hazard", "lateral_water_hazard"])].sort_values("osm").iterrows():
        if tpc.buffer(5).intersects(w.geometry) and w.tags.get("penalty") != "red":
            tags.append({"osm": w.osm, "set": {"penalty": "red"},
                         "reason": "every penalty area is red (developer's standing default, COURSE_BUILD.md 4.1); s10 reads golf=water_hazard as yellow otherwise"})

    # pars
    for ref, par in PAR_FIX.items():
        h = tpc_holes[ref]
        assert h.tags.get("par") != par
        tags.append({"osm": h.osm, "set": {"par": par},
                     "reason": f"hole {ref}: OSM has the tour card's par {h.tags.get('par')}; the club's 2024 scorecard plays it as a par {par} (developer, 2026-10-20)"})

    # tee boxes for the sets s06 can't place by distance alone
    for osm, (ref, ts, why) in TEE_TAGS.items():
        assert (gu.osm == osm).any() and gu[gu.osm == osm].kind.iloc[0] == "tee", osm
        tags.append({"osm": osm, "set": {"hole": ref, "tee_set": ts},
                     "reason": f"hole {ref} {ts} tee (course chat, 2026-10-21): {why}"})

    # golf=path -> cart path
    paths = gu[(gu.kind == "golf_other") & gu.tags.apply(lambda t: t.get("golf") == "path")]
    paths = paths[paths.geometry.intersects(tpc.buffer(5))]
    if len(paths):
        prop = paths.copy()
        prop["osm"] = prop.osm + "_cartpath"
        prop["kind"] = "cartpath"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
        prop = prop.to_crs(4326)
        prop["tags"] = prop["tags"].apply(json.dumps)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "paths_as_cartpaths.geojson", driver="GeoJSON")
        add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(prop.osm), "tags": {},
                    "reason": "golf=path inside the boundary, not read by s01 (COURSE_LESSONS.md 10): copied as golf=cartpath (free relief, drawn as a path)"})
        for o in sorted(paths.osm):
            drop.append({"osm": o, "reason": "replaced by its golf=cartpath copy (add above)"})

    # clubhouse -> building
    club = gu[(gu.kind == "golf_other") & gu.tags.apply(lambda t: t.get("golf") == "clubhouse")]
    if len(club):
        prop = club.copy()
        prop["osm"] = prop.osm + "_building"
        prop["kind"] = "building"
        prop["tags"] = prop.tags.apply(lambda t: {k: v for k, v in t.items() if k != "golf"} | {"was": "golf=clubhouse"})
        prop = prop.to_crs(4326)
        prop["tags"] = prop["tags"].apply(json.dumps)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "clubhouse_building.geojson", driver="GeoJSON")
        add.append({"from": "proposed/clubhouse_building.geojson", "ids": sorted(prop.osm), "tags": {},
                    "reason": "the clubhouse is tagged golf=clubhouse + building=yes, which s01 files under the golf key (not drawn, not an obstruction; COURSE_LESSONS.md 14): copied as a building"})
        for o in sorted(club.osm):
            drop.append({"osm": o, "reason": "replaced by its building copy (add above)"})

    # pins
    greens = gu[gu.kind == "green"]
    pins = gu[gu.kind == "pin"]
    rows = []
    for ref in sorted(tpc_holes, key=int):
        h = tpc_holes[ref]
        end = Point(h.geometry.coords[-1])
        d = greens.geometry.distance(end)
        if d.min() > 5:
            raise SystemExit(f"hole {ref}: line ends {d.min():.1f} m from a green")
        gr = greens.loc[d.idxmin()]
        on = pins[pins.geometry.within(gr.geometry)]
        if len(on):
            print(f"hole {int(ref):2d}: OSM pin {on.osm.iloc[0]} on green {gr.osm}")
            continue
        c = gr.geometry.centroid
        if not gr.geometry.buffer(-1.0).contains(c):
            c = gr.geometry.representative_point()
        rows.append({"osm": f"x_pin_{ref}", "kind": "pin",
                     "tags": {"golf": "pin", "ref": ref, "source": f"centre of green {gr.osm} (proposal)"},
                     "geometry": c})
        print(f"hole {int(ref):2d}: proposed pin at the centre of green {gr.osm}")
    if rows:
        out = gpd.GeoDataFrame(rows, crs=epsg).to_crs(4326)
        out["tags"] = out["tags"].apply(json.dumps)
        out.to_file(HERE / "proposed" / "pins.geojson", driver="GeoJSON")
        add.append({"from": "proposed/pins.geojson", "ids": [r["osm"] for r in rows], "tags": {},
                    "reason": "no OSM pin on these holes' greens: a pin at the green's centre (make_edits.py), a proposal as at Franklin; the game adds up to three more pin positions per green"})

    out = {"note": "Edits to the OSM layout for TPC Boston, made by make_edits.py; built into edited/course.geojson by pipeline/merge_edits.py.",
           "add": add, "tags": tags, "drop": drop}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"edits.json: {sum(len(a['ids']) for a in add)} added, {len(tags)} retagged, {len(drop)} dropped")


if __name__ == "__main__":
    main()

"""Writes data/cyprian_keyes/edits.json and its proposals from raw/osm.geojson (course chat,
2026-10-31). Run from the repository root: python3 data/cyprian_keyes/make_edits.py

- The Haven Country Club (w29782873), the neighbouring course to the north-east, reaches the
  world's east edge: its boundary and its golf features are dropped (its land stays out of bounds).
- The 9-hole par-3 course inside the same boundary is not built (coordinator / developer brief):
  its hole lines are dropped, so its greens become wrong greens (relief required) and its tees and
  fairways stay mown ground in play. See validation_report.md (developer's calls pending).
- golf=path ways (foot paths and bridges across the creeks) are copied as golf=cartpath (free relief).
- The clubhouse (golf=clubhouse + building=yes) is copied as a building.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

C = Path(__file__).resolve().parent
HAVEN = "w29782873"

g = gpd.read_file(C / "raw" / "osm.geojson")
g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
gu = g.to_crs(32619)
haven = gu[gu.osm == HAVEN].geometry.iloc[0]

drop = [{"osm": HAVEN, "reason": "The Haven Country Club's boundary (the neighbouring course to the north-east, at the world's east edge): not part of Cyprian Keyes; its land stays out of bounds"}]
golfy = {"tee", "green", "fairway", "bunker", "hole", "water_hazard", "lateral_water_hazard", "cartpath", "golf_other"}
for _, r in gu.iterrows():
    if r.osm == HAVEN or r.kind not in golfy or r.geometry.is_empty:
        continue
    geom = r.geometry
    share = geom.intersection(haven).area / geom.area if geom.area > 0 else geom.intersection(haven).length / max(geom.length, 1e-9)
    if share > 0.5:
        drop.append({"osm": r.osm, "reason": f"The Haven Country Club's {r.kind} (inside its boundary): not part of Cyprian Keyes"})

for _, r in gu[gu.kind == "hole"].iterrows():
    if (r.tags.get("name") or "").startswith("Par3"):
        drop.append({"osm": r.osm, "reason": f"hole line of the 9-hole par-3 course ({r.tags.get('name')}): only the Championship 18 is built; without its line the green is a wrong green (relief required) and the tee is mown ground in play"})

add = []
paths = g[(g.kind == "golf_other") & g.tags.apply(lambda t: t.get("golf") == "path")].copy()
paths["osm"] = paths["osm"] + "_cartpath"
paths["kind"] = "cartpath"
paths["tags"] = paths["tags"].apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
paths[["osm", "kind", "tags", "geometry"]].to_file(C / "proposed" / "paths_as_cartpaths.geojson", driver="GeoJSON")
add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(paths.osm),
            "reason": "golf=path ways inside the boundary (course paths and the bridges over the brooks), not read by s01: copied as golf=cartpath (free relief, drawn as a path)"})
for o in sorted(paths.osm):
    drop.append({"osm": o[: -len("_cartpath")], "reason": "replaced by its copy as golf=cartpath (proposed/paths_as_cartpaths.geojson)"})

club = g[(g.kind == "golf_other") & g.tags.apply(lambda t: t.get("golf") == "clubhouse")].copy()
club["osm"] = club["osm"] + "_building"
club["kind"] = "building"
club[["osm", "kind", "tags", "geometry"]].to_file(C / "proposed" / "clubhouse.geojson", driver="GeoJSON")
add.append({"from": "proposed/clubhouse.geojson", "ids": sorted(club.osm),
            "reason": "the clubhouse is mapped golf=clubhouse + building=yes, which s01 reads as a golf feature: copied as a building (audit: 'add building=yes')"})
for o in sorted(club.osm):
    drop.append({"osm": o[: -len("_building")], "reason": "replaced by its copy as a building (proposed/clubhouse.geojson)"})

add.append({"from": "proposed/channels_lidar.geojson",
            "ids": ["channel_w971520745", "channel_w971520747", "channel_w971520749", "channel_w971520751"],
            "tags": {"golf": "lateral_water_hazard", "penalty": "red", "flatten": "no"},
            "reason": "course chat 2026-10-31, pending the developer's approval: Sewall Brook and its feeder streams, mapped in OSM only as waterway=stream lines near the hole lines (audit), as red penalty areas from the DEM channel along them (pipeline/propose_channels.py: 3-4 m wide, 0.1-0.3 m deep); every penalty area red (standing default); flatten=no keeps the falling bed"})

tags = [{"osm": "w1256012343", "set": {"hole": "11", "tee_set": "White"},
         "reason": "course chat 2026-10-31, pending the developer's approval: hole 11's White tee (card 131 yd) is not on the hole line; this box, 40 m north-east of the line, is 127 yd from the green on the 2023 MassGIS photo (the next box, w1256012344, ~101 yd, would be Green/Gold 109/99). Without it White 11 measured 187 yd (+43 %)"}]

out = {"note": "Edits to the OSM layout for Cyprian Keyes, written by data/cyprian_keyes/make_edits.py; built into edited/course.geojson by pipeline/merge_edits.py.",
       "add": add, "tags": tags, "drop": drop}
json.dump(out, open(C / "edits.json", "w"), indent=1, ensure_ascii=False)
print(f"edits.json: {len(add)} adds, {len(drop)} drops")

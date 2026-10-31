"""One-off helper (not a `make course` step): write data/burlington_cc/edits.json
and the proposals it adds (pattern of data/tpc_boston/make_edits.py).

    python3 pipeline/s01_osm.py burlington_cc      # writes raw/osm.geojson
    python3 data/burlington_cc/make_edits.py

What it does, each with its reason in edits.json:
- every golf=water_hazard inside the boundary gets penalty=red (standing default);
- golf=path (s01 files it under golf_other: not drawn, no relief) is copied as
  golf=cartpath with a new id and the original dropped;
- the clubhouse (golf=clubhouse + building=yes) is copied as a building;
- EXTRA_TAGS / EXTRA_ADD below: the course chat's later edits.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent
BOUNDARY = "r158485"
# (osm id, tags, reason): tee-set tags and other retags found while building
EXTRA_TAGS: list[tuple[str, dict, str]] = [
    ("w1011574555", {"hole": "7", "tee_set": "Black"},
     "hole 7 Black tee (course chat, 2026-10-30): the 108 m2 box 41 m behind the line's start, on the line run backwards, measures 563 yd against the card's 562; s06 looks only 40 m behind a line start for an untagged box, so it took the 519 yd box (-5.5 %)"),
]
# entries copied verbatim into "add" (proposal files made by other scripts)
EXTRA_ADD: list[dict] = [
    {"from": "proposed/brook.geojson", "ids": ["channel_w1011484692"], "tags": {"flatten": "no"}, "reason": "the 64 m brook (OSM stream line w1011484692) between the pond by the 11th green and the pond in front of the 3rd and 12th tees, only a line in OSM: a 2.5 m strip along the line with the cart paths and their two bridges kept clear (data/burlington_cc/make_brook.py). Developer 2026-10-31: a tiny little creek with bridges over it (the 8 m lidar channel from propose_channels.py covered both bridges). Red like every penalty area; flatten=no keeps the bed's fall"},
    {"from": "proposed/brook.geojson", "ids": ["bridge_north", "bridge_south"], "reason": "developer 2026-10-31: two cart-path bridges cross the brook; OSM's paths stop at each bank, so these join the facing path ends (make_brook.py) and are cart path (free relief), not water"},
]
EXTRA_DROP: list[dict] = []


def main():
    cfg = json.loads((HERE / "course_config.json").read_text())
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    gu = g.to_crs(cfg["epsg"])
    bnd = gu[gu.osm == BOUNDARY].geometry.iloc[0]
    drop, tags, add = [], [], []
    (HERE / "proposed").mkdir(exist_ok=True)

    for _, w in gu[gu.kind.isin(["water_hazard", "lateral_water_hazard"])].sort_values("osm").iterrows():
        if bnd.buffer(5).intersects(w.geometry) and w.tags.get("penalty") != "red":
            tags.append({"osm": w.osm, "set": {"penalty": "red"},
                         "reason": "every penalty area is red (developer's standing default, COURSE_BUILD.md 4.1); s10 reads golf=water_hazard as yellow otherwise"})

    paths = gu[(gu.kind == "golf_other") & gu.tags.apply(lambda t: t.get("golf") == "path")]
    paths = paths[paths.geometry.intersects(bnd.buffer(5))]
    if len(paths):
        prop = paths.copy()
        prop["osm"] = prop.osm + "_cartpath"
        prop["kind"] = "cartpath"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
        prop = prop.to_crs(4326)
        prop["tags"] = prop["tags"].apply(json.dumps)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "paths_as_cartpaths.geojson", driver="GeoJSON")
        add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(prop.osm), "tags": {},
                    "reason": "golf=path + highway=path inside the boundary (the course's cart paths, two of them surface=asphalt), not read by s01: copied as golf=cartpath (free relief, drawn as a path)"})
        for o in sorted(paths.osm):
            drop.append({"osm": o, "reason": "replaced by its golf=cartpath copy (add above)"})

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
                    "reason": "the clubhouse is tagged golf=clubhouse + building=yes, which s01 files under the golf key (not drawn, not an obstruction): copied as a building"})
        for o in sorted(club.osm):
            drop.append({"osm": o, "reason": "replaced by its building copy (add above)"})

    for osm, st, why in EXTRA_TAGS:
        assert (gu.osm == osm).any(), osm
        tags.append({"osm": osm, "set": st, "reason": why})
    add += EXTRA_ADD
    drop += EXTRA_DROP

    out = {"note": "written by data/burlington_cc/make_edits.py; merge_edits.py applies it at every build",
           "add": add, "tags": tags, "drop": drop}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"edits.json: {len(add)} add, {len(tags)} tags, {len(drop)} drop")


if __name__ == "__main__":
    main()

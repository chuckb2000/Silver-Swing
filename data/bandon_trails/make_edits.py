"""One-off helper (not a `make course` step): write data/bandon_trails/edits.json.

The OSM export covers the whole world box, which also holds three other
courses of the resort: Bandon Dunes (way 362513477, eight of its hole lines),
Bandon Preserve (way 674855473, 13 holes) and Shortys (way 1540940976, 19
unnamed hole lines). The pipeline takes every leisure=golf_course polygon and
every golf=hole line in the data, so their boundaries and hole lines are
dropped. Their greens, tees and bunkers stay: they lie outside the Bandon
Trails boundary, so they are out of bounds.

    python3 s01_osm.py bandon_trails   # writes raw/osm.geojson
    python3 ../data/bandon_trails/make_edits.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent
TRAILS = "w362513476"
OTHERS = {"w362513477": "Bandon Dunes", "w674855473": "Bandon Preserve", "w1540940976": "Shortys"}


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    trails = g[g.osm == TRAILS].geometry.iloc[0]
    drop = []
    for osm, name in OTHERS.items():
        assert (g.osm == osm).any(), osm
        drop.append({"osm": osm, "reason": f"{name} course boundary (another course of the resort, outside Bandon Trails): out of bounds here"})
    holes = g[g.kind == "hole"]
    for _, h in holes.sort_values("osm").iterrows():
        name = h.tags.get("name") or ""
        if name.startswith("Bandon Trails"):
            assert trails.buffer(0.0002).contains(h.geometry), h.osm
            continue
        assert not trails.contains(h.geometry.representative_point()), h.osm
        course = name.rsplit(" Hole", 1)[0] if name else "Shortys (unnamed hole lines)"
        drop.append({"osm": h.osm, "reason": f"hole {h.tags.get('ref')} of {course}, outside the Bandon Trails boundary"})
    # Greens wholly outside the world box: s07 shapes every green and s09's
    # terrain_z_px rasterises each one into a window clipped to the world, which
    # is empty for these (ValueError: negative dimensions). They are other
    # courses' greens beyond the edge of the map, so they are dropped.
    from pyproj import Transformer
    from shapely.geometry import box
    from shapely.ops import transform
    cfg = json.load(open(HERE / "course_config.json"))
    w = cfg["world"]
    world = transform(Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform,
                      box(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"]))
    for _, f in g[g.kind == "green"].sort_values("osm").iterrows():
        if not f.geometry.intersects(world):
            drop.append({"osm": f.osm, "reason": "green of another course wholly outside the world box (s07/s09 cannot shape a green off the map)"})
    # golf=path (the current OSM tag for a course path) is not read as a cart
    # path by s01 (COURSE_LESSONS.md 10): copy it as golf=cartpath, drop the original
    paths = g[(g.kind == "golf_other") & g.tags.apply(lambda t: t.get("golf") == "path")]
    paths = paths[paths.geometry.intersects(trails)]
    add = []
    if len(paths):
        prop = paths.copy()
        prop["osm"] = prop.osm + "_cartpath"  # a new id: "drop" removes by id, and the original goes
        prop["kind"] = "cartpath"
        prop["tags"] = prop.tags.apply(lambda t: {**t, "golf": "cartpath", "was": "golf=path"})
        (HERE / "proposed").mkdir(exist_ok=True)
        prop[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "paths_as_cartpaths.geojson", driver="GeoJSON")
        add.append({"from": "proposed/paths_as_cartpaths.geojson", "ids": sorted(prop.osm),
                    "reason": "golf=path inside the boundary (a course path near hole 3), not read by s01: copied as golf=cartpath (free relief, drawn as a path)"})
        for o in sorted(paths.osm):
            drop.append({"osm": o, "reason": "replaced by its golf=cartpath copy (add above)"})
    out = {"note": "Edits to the OSM layout for Bandon Trails, made by make_edits.py; built into edited/course.geojson by pipeline/merge_edits.py.",
           "add": add, "drop": drop}
    (HERE / "edits.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"edits.json: {len(drop)} drops")


if __name__ == "__main__":
    main()

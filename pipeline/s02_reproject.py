"""Step 5: reproject raw/osm.geojson (or edited/course.geojson when present)
to the course UTM zone and shift the origin to the SW corner of the world
extent. Writes build/course_local.geojson (local metres, +x east, +y north).
"""
from __future__ import annotations

import geopandas as gpd
from shapely.affinity import translate

from common import World, build_dir, course_dir, course_name_from_argv, load_config


def source_path(name: str):
    cdir = course_dir(name)
    edited = cdir / "edited" / "course.geojson"
    return edited if edited.exists() else cdir / "raw" / "osm.geojson"


def load_local(name: str) -> gpd.GeoDataFrame:
    """Course features in local metres (used by every later step)."""
    p = build_dir(name) / "course_local.geojson"
    g = gpd.read_file(p)
    return g


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    src = source_path(name)
    g = gpd.read_file(src).to_crs(world.epsg)
    g["geometry"] = g.geometry.apply(lambda geom: translate(geom, -world.x0, -world.y0))
    g = g.set_crs(None, allow_override=True)
    # repair invalid polygons (zero-width buffer keeps the shape)
    fixed = 0
    for i, geom in g.geometry.items():
        if geom.geom_type in ("Polygon", "MultiPolygon") and not geom.is_valid:
            g.at[i, "geometry"] = geom.buffer(0)
            fixed += 1
    # optional: tee boxes drawn larger than mapped (course_config "tee_grow_m", metres per side;
    # Highland Links: the OSM boxes are 25-50 m2 and looked comically small, developer 2026-10-19)
    grow = float(cfg.get("tee_grow_m", 0) or 0)
    if grow > 0:
        tees = g["kind"] == "tee"
        g.loc[tees, "geometry"] = g.loc[tees, "geometry"].apply(lambda geom: geom.buffer(grow, join_style=2, mitre_limit=2.0))
        print(f"[s02] tee boxes grown by {grow} m per side ({int(tees.sum())} boxes)")
    out = build_dir(name) / "course_local.geojson"
    g.to_file(out, driver="GeoJSON")
    b = g[g["kind"] == "boundary"].total_bounds
    print(f"[s02] {src.name} -> {out.name} in EPSG:{world.epsg}, origin ({world.x0}, {world.y0}); "
          f"boundary local bbox {b.round(1).tolist()}; repaired {fixed} polygons")


if __name__ == "__main__":
    main()

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
    out = build_dir(name) / "course_local.geojson"
    g.to_file(out, driver="GeoJSON")
    b = g[g["kind"] == "boundary"].total_bounds
    print(f"[s02] {src.name} -> {out.name} in EPSG:{world.epsg}, origin ({world.x0}, {world.y0}); "
          f"boundary local bbox {b.round(1).tolist()}; repaired {fixed} polygons")


if __name__ == "__main__":
    main()

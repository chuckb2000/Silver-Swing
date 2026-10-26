"""Step 5: reproject raw/osm.geojson (or edited/course.geojson when present)
to the course UTM zone and shift the origin to the SW corner of the world
extent. Writes build/course_local.geojson (local metres, +x east, +y north).
"""
from __future__ import annotations

import os

import geopandas as gpd
from shapely.affinity import translate

from common import World, build_dir, course_dir, course_name_from_argv, load_config


def source_path(name: str):
    cdir = course_dir(name)
    edited = cdir / "edited" / "course.geojson"
    # A listing, not edited.exists(): the step cache records the folders a step lists, so a build
    # sees edited/course.geojson appear (merge_edits writes it once edits.json exists).
    try:
        names = os.listdir(cdir / "edited")
    except FileNotFoundError:
        names = []
    return edited if "course.geojson" in names else cdir / "raw" / "osm.geojson"


def load_local(name: str) -> gpd.GeoDataFrame:
    """Course features in local metres (used by every later step)."""
    p = build_dir(name) / "course_local.geojson"
    g = gpd.read_file(p)
    return g


def join_boundary(g: gpd.GeoDataFrame, jb: dict):
    """Optional (cfg["join_boundary"]): join a course boundary mapped in several
    parts into the one polygon the game uses as its out-of-bounds line.

    Langston is mapped as the mainland and Kingman Island with Kingman Lake in
    between. The water polygons listed in `water_osm` (filled, so islands in
    them count as water), cut to the convex hull of the boundary parts and
    minus the parts themselves, become penalty areas (`penalty` red|yellow)
    and are added to the boundary. The join must give a single polygon.
    """
    import pandas as pd
    from shapely.geometry import MultiPolygon, Polygon
    from shapely.ops import unary_union

    bi = list(g.index[g["kind"] == "boundary"])
    if len(bi) != 1:
        raise SystemExit(f"[s02] join_boundary: expected one boundary feature, found {len(bi)}")
    bi = bi[0]
    B = g.at[bi, "geometry"]
    parts = list(B.geoms) if B.geom_type == "MultiPolygon" else [B]
    filled = []
    for oid in jb["water_osm"]:
        sel = g[g["osm"] == oid]
        if sel.empty:
            raise SystemExit(f"[s02] join_boundary: no water feature {oid}")
        for geom in sel.geometry:
            for p in (geom.geoms if geom.geom_type == "MultiPolygon" else [geom]):
                filled.append(Polygon(p.exterior))
    water = unary_union(filled).intersection(B.convex_hull).difference(B)
    pieces = [p for p in (water.geoms if water.geom_type == "MultiPolygon" else [water])
              if p.geom_type == "Polygon" and p.area > 1.0 and p.distance(B) < 0.5]
    joined = unary_union([B] + pieces)
    if joined.geom_type != "Polygon":
        raise SystemExit(f"[s02] join_boundary: the joined boundary is a {joined.geom_type}, not one polygon")
    # holes that only the join created (gaps between a part and the water) are filled
    old_holes = [Polygon(r) for p in parts for r in p.interiors]
    keep = [r for r in joined.interiors if any(Polygon(r).equals_exact(h, 0.01) for h in old_holes)]
    joined = Polygon(joined.exterior, keep)
    hazard = joined.difference(B)
    hz = [p for p in (hazard.geoms if hazard.geom_type == "MultiPolygon" else [hazard]) if p.area > 1.0]
    # A piece that is already a mapped penalty area (Wannamoisett: the pond by hole 14 is a
    # golf=water_hazard cut out of the course relation as an inner ring) only joins the
    # boundary; no second penalty polygon is added on top of it. Langston's lake is plain
    # natural=water, so nothing is skipped there.
    mapped = unary_union(list(g[g["kind"].isin(["water_hazard", "lateral_water_hazard"])].geometry)) \
        if g["kind"].isin(["water_hazard", "lateral_water_hazard"]).any() else None
    covered = [p for p in hz if mapped is not None and p.difference(mapped).area < 0.01 * p.area]
    hz = [p for p in hz if not any(p is c for c in covered)]
    kind = "lateral_water_hazard" if jb.get("penalty", "red") == "red" else "water_hazard"
    g.at[bi, "geometry"] = joined
    g.at[bi, "tags"] = {**g.at[bi, "tags"], "joined_with": ",".join(jb["water_osm"])}
    rows = [{"osm": f"join_{i + 1}", "kind": kind,
             "tags": {"golf": kind, "penalty": jb.get("penalty", "red"), "source": "join_boundary: " + ",".join(jb["water_osm"])},
             "geometry": p} for i, p in enumerate(hz)]
    if rows:
        g = pd.concat([g, gpd.GeoDataFrame(rows, geometry="geometry")], ignore_index=True)
    g = gpd.GeoDataFrame(g, geometry="geometry")
    extra = f", {len(covered)} already mapped as penalty areas" if covered else ""
    return g, (f"join_boundary: {len(parts)} boundary parts joined by {len(hz)} {jb.get('penalty', 'red')} penalty area(s) "
               f"({sum(p.area for p in hz) / 1e4:.1f} ha){extra} from {', '.join(jb['water_osm'])}; boundary {joined.area / 1e4:.1f} ha")


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
    note = ""
    if cfg.get("join_boundary"):
        g, note = join_boundary(g, cfg["join_boundary"])
    out = build_dir(name) / "course_local.geojson"
    g.to_file(out, driver="GeoJSON")
    if note:
        print(f"[s02] {note}")
    b = g[g["kind"] == "boundary"].total_bounds
    print(f"[s02] {src.name} -> {out.name} in EPSG:{world.epsg}, origin ({world.x0}, {world.y0}); "
          f"boundary local bbox {b.round(1).tolist()}; repaired {fixed} polygons")


if __name__ == "__main__":
    main()

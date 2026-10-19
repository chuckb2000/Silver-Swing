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
    kind = "lateral_water_hazard" if jb.get("penalty", "red") == "red" else "water_hazard"
    g.at[bi, "geometry"] = joined
    g.at[bi, "tags"] = {**g.at[bi, "tags"], "joined_with": ",".join(jb["water_osm"])}
    rows = [{"osm": f"join_{i + 1}", "kind": kind,
             "tags": {"golf": kind, "penalty": jb.get("penalty", "red"), "source": "join_boundary: " + ",".join(jb["water_osm"])},
             "geometry": p} for i, p in enumerate(hz)]
    g = pd.concat([g, gpd.GeoDataFrame(rows, geometry="geometry")], ignore_index=True)
    g = gpd.GeoDataFrame(g, geometry="geometry")
    return g, (f"join_boundary: {len(parts)} boundary parts joined by {len(hz)} {jb.get('penalty', 'red')} penalty area(s) "
               f"({sum(p.area for p in hz) / 1e4:.1f} ha) from {', '.join(jb['water_osm'])}; boundary {joined.area / 1e4:.1f} ha")


def join_boundary_ob(g: gpd.GeoDataFrame, jo: dict):
    """Optional (cfg["join_boundary_ob"]): join a course mapped as several separate
    boundary features, with land between them that is out of bounds, into the one
    polygon the game uses as its out-of-bounds line.

    Langdon Farms is mapped as two leisure=golf_course ways on either side of
    OR 551 (34 m apart); no hole plays across the highway, a cart path runs
    under it (developer, 2026-10-19). The gaps between the parts no wider than
    `max_gap_m` (found by closing the union with a mitred buffer, keeping only
    the added pieces that touch at least two parts) are added to the boundary
    and written as `ob_area` features, which s08 paints as off-course ground
    (the highway stays a road), so a ball there is out of bounds.
    """
    import pandas as pd
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    bi = list(g.index[g["kind"] == "boundary"])
    if len(bi) < 2:
        raise SystemExit(f"[s02] join_boundary_ob: expected several boundary features, found {len(bi)}")
    parts = []
    for i in bi:
        geom = g.at[i, "geometry"]
        parts += list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    U = unary_union(parts)
    d = jo.get("max_gap_m", 40.0) / 2 + 1.0
    closed = U.buffer(d, join_style=2, mitre_limit=5.0).buffer(-d, join_style=2, mitre_limit=5.0)
    add = closed.difference(U)
    pieces = [p for p in getattr(add, "geoms", [add]) if p.geom_type == "Polygon" and p.area > 1.0
              and sum(p.distance(q) < 0.5 for q in parts) >= 2]
    joined = unary_union(parts + pieces)
    if joined.geom_type != "Polygon":
        raise SystemExit(f"[s02] join_boundary_ob: the joined boundary is a {joined.geom_type}, not one polygon")
    joined = Polygon(joined.exterior, [r for r in joined.interiors if Polygon(r).area > 1.0])
    keep = bi[0]
    g.at[keep, "geometry"] = joined
    g.at[keep, "tags"] = {**g.at[keep, "tags"], "joined_with": ",".join(str(g.at[i, "osm"]) for i in bi[1:])}
    g = g.drop(index=bi[1:])
    rows = [{"osm": f"join_ob_{i + 1}", "kind": "ob_area",
             "tags": {"ob": "yes", "source": "join_boundary_ob: " + jo.get("reason", "")}, "geometry": p}
            for i, p in enumerate(pieces)]
    g = pd.concat([g, gpd.GeoDataFrame(rows, geometry="geometry")], ignore_index=True)
    g = gpd.GeoDataFrame(g, geometry="geometry")
    return g, (f"join_boundary_ob: {len(bi)} boundary features joined across {len(pieces)} out-of-bounds strip(s) "
               f"({sum(p.area for p in pieces) / 1e4:.2f} ha); boundary {joined.area / 1e4:.1f} ha")


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
    if cfg.get("join_boundary_ob"):
        g, note = join_boundary_ob(g, cfg["join_boundary_ob"])
    out = build_dir(name) / "course_local.geojson"
    g.to_file(out, driver="GeoJSON")
    if note:
        print(f"[s02] {note}")
    b = g[g["kind"] == "boundary"].total_bounds
    print(f"[s02] {src.name} -> {out.name} in EPSG:{world.epsg}, origin ({world.x0}, {world.y0}); "
          f"boundary local bbox {b.round(1).tolist()}; repaired {fixed} polygons")


if __name__ == "__main__":
    main()

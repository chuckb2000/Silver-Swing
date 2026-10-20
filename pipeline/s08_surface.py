"""Step 10a (5.7.1): rasterise the surface ID map at 0.5 m/px.

One map drives both physics and rendering. Paint order (later wins) follows
the spec priority: ob < woods < rough < fringe < fairway < cartpath < tee <
bunker < green < water. Everything outside the course boundary is OB; its
sub-type (lawn, road, water, woods, building) only changes how it looks.

Outputs build/surface.npy (uint8, row 0 = north edge) and surface_legend.json.
"""
from __future__ import annotations

import json
import warnings

import geopandas as gpd
import numpy as np
from affine import Affine
from rasterio.features import rasterize
from scipy import ndimage
from shapely.ops import unary_union

from common import build_dir, course_name_from_argv, GORSE_SURF, load_config, play_boundary, PX_PER_M, round_corners, SURF, surf_ids, uses_gorse_ground, World, write_json

warnings.filterwarnings("ignore")

ROAD_HALF_WIDTH = {"motorway": 7, "trunk": 6, "primary": 5.5, "secondary": 5, "tertiary": 4.5,
                   "residential": 3.5, "unclassified": 3.5, "service": 2.2, "living_street": 3,
                   "footway": 0.9, "path": 0.9, "cycleway": 1.0, "steps": 0.9, "track": 1.5}


def course_layers(g, roads, cfg):
    """Course features in paint order (later wins), shared with s09b (putting views).

    The spec priority is followed except that the fringe is painted above the
    fairway so every green keeps a full 1.5 m collar (see DECISIONS.md).
    """
    greens = list(g[g.kind == "green"].geometry)
    fringe = [geom.buffer(1.5).difference(geom) for geom in greens]
    fairways = smooth_fairways(g, cfg)
    paths = [r.geometry.buffer(1.2, cap_style=1) for _, r in g[g.kind == "cartpath"].iterrows()]
    layers = [
        (fairways, SURF["fairway"]),
        (fringe, SURF["fringe"]),
        # paved: cart paths (2.4 m), service roads / parking inside the boundary
        (paths, SURF["cartpath"]),
        ([geom for geom, hw in roads if hw in ("service", "residential", "tertiary", "primary")], SURF["cartpath"]),
        (list(g[g.kind == "parking"].geometry), SURF["cartpath"]),
        (list(g[g.kind == "tee"].geometry), SURF["tee"]),
        (list(g[g.kind == "bunker"].geometry), SURF["bunker"]),
        (greens, SURF["green"]),
        (list(g[g.kind.isin(["lateral_water_hazard", "water_hazard"])].geometry), SURF["water"]),
    ]
    if cfg.get("red_water_osm"):
        layers.append((red_water_geoms(g, cfg), SURF["water"]))
    if cfg.get("driving_range_is_ob", True):
        layers.append((list(g[g.kind == "driving_range"].geometry), SURF["range"]))
    layers.append((list(g[g.kind == "building"].geometry), SURF["building"]))
    return layers


def smooth_fairways(g, cfg=None):
    """The fairways with smooth, rounded outlines (common.round_corners; developer,
    2026-10-19), still touching every green they touched: within 2 m of a green
    the original outline is kept, so an approach never pulls back from the collar.

    Optional (course_config.json "merge_touching_fairways": true): fairway pieces
    that touch (an s02b approach and the fairway it extends, or two OSM fairways
    drawn edge to edge) are merged before rounding. Rounded one at a time, each
    piece pulls in at the shared edge and leaves a line of rough and small notches
    along the join (East Potomac, developer 2026-10-20). Without the key nothing
    changes."""
    greens = [geom for geom in g[g.kind == "green"].geometry if geom is not None]
    near_greens = unary_union([geom.buffer(2.0) for geom in greens]) if greens else None
    out = []
    geoms = [geom for geom in g[g.kind == "fairway"].geometry if geom is not None and not geom.is_empty]
    if (cfg or {}).get("merge_touching_fairways") and geoms:
        # close hairline gaps (< 0.2 m) between pieces drawn edge to edge, then one polygon per merged piece
        merged = unary_union([geom.buffer(0.1, join_style=2) for geom in geoms]).buffer(-0.1, join_style=2)
        geoms = [p for p in getattr(merged, "geoms", [merged]) if p.geom_type == "Polygon" and p.area > 0.5]
    for geom in geoms:
        if geom is None or geom.is_empty:
            continue
        r = round_corners(geom)
        if near_greens is not None and geom.intersects(near_greens):
            r = r.union(geom.intersection(near_greens))
        out.append(r)
    return out


def red_water_geoms(g, cfg):
    """Water features listed in cfg red_water_osm (OSM ids): red penalty areas
    wherever they lie, also outside the course boundary (Tualatin: the river
    along holes 7, 9 and 10). Without the key nothing changes."""
    ids = cfg.get("red_water_osm") or []
    sel = g[g.osm.isin(ids)]
    missing = set(ids) - set(sel.osm)
    if missing:
        raise SystemExit(f"red_water_osm: no features {sorted(missing)} in the course data")
    return list(sel.geometry)


def road_geoms(g):
    roads = []
    for _, r in g[g.kind == "highway"].iterrows():
        hw = r.tags.get("highway", "")
        w = ROAD_HALF_WIDTH.get(hw)
        if w is None:
            continue
        roads.append((r.geometry.buffer(w, cap_style=2 if w < 2 else 1), hw))
    return roads


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    bdir = build_dir(name)
    g = gpd.read_file(bdir / "course_local.geojson")
    W, H = world.px_w, world.px_h
    # local metres -> pixel grid with row 0 at the north edge
    tr = Affine(1 / PX_PER_M, 0, 0, 0, -1 / PX_PER_M, world.height)

    def paint(arr, geoms, value):
        geoms = [geom for geom in geoms if geom is not None and not geom.is_empty]
        if not geoms:
            return
        m = rasterize([(geom, 1) for geom in geoms], out_shape=(H, W), transform=tr, fill=0, dtype="uint8", all_touched=False)
        arr[m.astype(bool)] = value

    def mask(geoms):
        geoms = [geom for geom in geoms if geom is not None and not geom.is_empty]
        if not geoms:
            return np.zeros((H, W), bool)
        return rasterize([(geom, 1) for geom in geoms], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool)

    boundary = play_boundary(g, cfg)
    inside = mask([boundary])
    surf = np.full((H, W), SURF["ob"], np.uint8)

    # --- off-course sub-types -------------------------------------------
    chm = np.load(bdir / "chm_local.npy")  # 1 m, rows south->north
    canopy = np.kron(np.flipud(chm) > 6.0, np.ones((PX_PER_M, PX_PER_M), bool))[:H, :W]
    canopy = ndimage.binary_closing(canopy, iterations=3)
    canopy = ndimage.binary_opening(canopy, iterations=4)
    lab, n = ndimage.label(canopy)
    sizes = ndimage.sum(canopy, lab, range(1, n + 1))
    big = np.isin(lab, 1 + np.where(sizes > 400 * PX_PER_M * PX_PER_M)[0])  # > 400 m2 patches
    woods_geoms = list(g[g.kind.isin(["wood", "water"]) & g.tags.apply(lambda t: t.get("natural") in ("wood", "wetland"))].geometry)
    ob_woods = big | mask(woods_geoms)
    surf[ob_woods & ~inside] = SURF["ob_woods"]
    lake = np.load(bdir / "lake_mask.npy")  # 1 m vertex grid rows south->north
    lake_px = np.kron(np.flipud(lake[:-1, :-1]), np.ones((PX_PER_M, PX_PER_M), bool))[:H, :W]
    surf[lake_px & ~inside] = SURF["ob_water"]
    # beaches, dunes and sand cliffs outside the boundary (OSM natural=beach/sand)
    sand = mask(list(g[g.kind == "sand"].geometry)) & ~inside & (surf != SURF["ob_water"])
    cliff_pct, beach_max = cfg.get("cliff_sand_slope_pct"), cfg.get("beach_max_m")
    if (cliff_pct or beach_max is not None) and sand.any():
        # The mapped beach polygon stops short of the water line and of the cliff. Extend the
        # sand over lidar ground outside the boundary that is connected to it and either low
        # (below beach_max_m: the rest of the beach) or steep (over cliff_sand_slope_pct %:
        # the bare cliff face).
        zb = np.load(bdir / "height_base.npy")
        up = lambda a: np.kron(np.flipud(a)[:-1, :-1], np.ones((PX_PER_M, PX_PER_M), bool))[:H, :W]  # noqa: E731
        gy, gx = np.gradient(zb)
        cand = np.zeros((H, W), bool)
        if cliff_pct:
            cand |= ndimage.binary_closing(up(np.hypot(gx, gy) * 100 > cliff_pct), iterations=2)
        if beach_max is not None:
            cand |= up(zb < beach_max)
        cand &= ~inside & (surf != SURF["ob_water"])
        lab, n = ndimage.label(cand | sand)
        keep = np.unique(lab[sand])
        sand |= np.isin(lab, keep[keep > 0]) & cand
    surf[sand] = SURF["ob_sand"]
    roads = road_geoms(g)
    major = [geom for geom, hw in roads if ROAD_HALF_WIDTH[hw] >= 2]
    minor = [geom for geom, hw in roads if ROAD_HALF_WIDTH[hw] < 2]
    paint(surf, [geom for geom in major], SURF["ob_road"])
    paint(surf, list(g[g.kind == "parking"].geometry), SURF["ob_road"])
    paint(surf, list(g[g.kind == "pool"].geometry), SURF["ob_water"])
    paint(surf, list(g[(g.kind == "water") & g.tags.apply(lambda t: t.get("natural") == "water")].geometry), SURF["ob_water"])
    paint(surf, list(g[g.kind == "building"].geometry), SURF["ob_building"])
    # a driving range outside the boundary is still drawn as a range (it is OB either way)
    if cfg.get("paint_range_outside"):
        surf[mask(list(g[g.kind == "driving_range"].geometry)) & ~inside] = SURF["range"]
    # minor paths outside the course are drawn as roads too (light grey)
    m_minor = mask(minor) & ~inside
    surf[m_minor & (surf != SURF["ob_building"])] = SURF["ob_road"]

    # --- the course ------------------------------------------------------
    course = np.full((H, W), SURF["rough"], np.uint8)
    # woods inside the course: contiguous canopy patches (> 150 m2) from lidar
    can_in = np.kron(np.flipud(chm) > 4.0, np.ones((PX_PER_M, PX_PER_M), bool))[:H, :W]
    can_in = ndimage.binary_closing(can_in, iterations=2)
    can_in = ndimage.binary_opening(can_in, iterations=3)
    lab, n = ndimage.label(can_in)
    sizes = ndimage.sum(can_in, lab, range(1, n + 1))
    woods_in = np.isin(lab, 1 + np.where(sizes > 150 * PX_PER_M * PX_PER_M)[0])
    course[woods_in] = SURF["woods"]
    # optional (course_config.json gorse.ground = "gorse"; the thickets from pipeline/gorse.py):
    # the ground under the gorse is the gorse surface inside the course (a penal lie in the
    # game) and ob_woods outside; mapped fairways, greens, tees and bunkers still win
    if uses_gorse_ground(cfg):
        gm = np.load(bdir / "gorse_mask.npy")  # 1 m, rows south->north
        gm = np.kron(np.flipud(gm), np.ones((PX_PER_M, PX_PER_M), bool))[:H, :W]
        course[gm] = GORSE_SURF
        surf[gm & ~inside & (surf == SURF["ob"])] = SURF["ob_woods"]
    for geoms, value in course_layers(g, roads, cfg):
        paint(course, geoms, value)
    surf[inside] = course[inside]
    if cfg.get("red_water_osm"):
        # the same water outside the boundary is a penalty area too (it is not OB);
        # bridges and buildings over it stay as they are
        red_out = mask(red_water_geoms(g, cfg)) & ~inside & ~np.isin(surf, [SURF["ob_road"], SURF["ob_building"]])
        surf[red_out] = SURF["water"]
    # roads inside the boundary that are out of bounds (config "ob_highways": highway values,
    # e.g. Indian Island's Route 105 between the two halves of the course); other roads inside
    # the boundary stay cart paths with free relief
    if cfg.get("ob_highways"):
        obr = mask([geom for geom, hw in roads if hw in cfg["ob_highways"]]) & inside
        surf[obr & (surf != SURF["water"])] = SURF["ob_road"]

    np.save(bdir / "surface.npy", surf)
    ids = surf_ids(cfg)
    counts = {k: int((surf == v).sum()) for k, v in ids.items()}
    legend = {
        "pixel_m": 1 / PX_PER_M, "width": W, "height": H, "row0": "north",
        "ids": ids,
        "ob_ids": [v for k, v in SURF.items() if k.startswith("ob") or k == "range"],
        "area_m2": {k: round(c / (PX_PER_M * PX_PER_M)) for k, c in counts.items()},
    }
    write_json(bdir / "surface_legend.json", legend, indent=1)
    print("[s08] surface map", W, "x", H, {k: v for k, v in legend["area_m2"].items() if v})


if __name__ == "__main__":
    main()

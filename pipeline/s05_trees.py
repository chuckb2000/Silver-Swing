"""Step 5.4: automatic tree detection from the canopy height model.

CHM (highest hit - bare earth, metres, build/chm_1m.tif from s00) -> individual tree tops with a
local-maximum filter whose window grows with canopy height (3 m window for
short trees, 8 m for tall conifers), keeping maxima above 4 m. Crown radius
comes from a watershed segmentation around each top. Type: conifer if the
crown is narrow for its height or the crown profile is pointed; otherwise
deciduous (no leaf-off imagery available).

Drops tops that fall on buildings (OSM footprints) and on greens, tees,
bunkers or water (reported). Writes build/trees.json and a preview PNG.

Without a canopy raster (s00 found no chm/dsm/laz source) it falls back to
OSM natural=tree points and a seeded fill of OSM woods (osm_fallback),
flagged as lower fidelity in the report.
"""
from __future__ import annotations

import json
import warnings

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw
from rasterio.features import rasterize
from affine import Affine
from scipy import ndimage
from shapely.geometry import Point, Polygon
from skimage.segmentation import watershed

from common import build_dir, course_name_from_argv, load_config, play_boundary, World, write_json

warnings.filterwarnings("ignore")

MIN_TOP = 4.0


def disk(r):
    k = int(np.ceil(r))
    y, x = np.mgrid[-k:k + 1, -k:k + 1]
    return (x * x + y * y) <= r * r + 1e-6


def canopy_label(cfg) -> str:
    """How the canopy was measured, for the report heading."""
    for key in ("chm", "dsm", "laz"):
        if cfg.get(key):
            return cfg[key].get("label", {"chm": "canopy height model", "dsm": "lidar surface model",
                                          "laz": "lidar point cloud"}[key])
    return "OSM fallback"


def leaf_off_shares(name, cfg, world, trees, min_returns=20):
    """Tree type from leaf-off lidar (s00 veg_returns / veg_last rasters).

    Per crown (disk of the crown radius): the share of vegetation returns that were the
    last return of their pulse. Leaf-off, bare deciduous branches let nearly every pulse
    through to the ground (share ~0), while pitch pine needles stop many of them. The split
    is Otsu's threshold over crowns with >= min_returns returns; smaller crowns keep the
    crown-shape type. Returns the method text, or None when the data isn't there."""
    bdir = build_dir(name)
    if not (cfg.get("laz", {}).get("leaf_off") and (bdir / "veg_returns_1m.tif").exists()):
        return None
    from skimage.filters import threshold_otsu
    W, H = int(world.width), int(world.height)

    def crop(path):
        with rasterio.open(path) as r:
            a, t = r.read(1).astype(np.float64), r.transform
        c0 = int(round((world.x0 - t.c) / t.a))
        r0 = int(round((t.f - (world.y0 + world.height)) / -t.e))
        return np.flipud(a[r0:r0 + H, c0:c0 + W])

    n_all, n_last = crop(bdir / "veg_returns_1m.tif"), crop(bdir / "veg_last_1m.tif")
    share = np.full(len(trees), np.nan)
    count = np.zeros(len(trees))
    for k, t_ in enumerate(trees):
        x, y, r = t_["x"], t_["y"], t_["r"]
        i0, i1 = int(max(0, x - r)), int(min(W, x + r + 1))
        j0, j1 = int(max(0, y - r)), int(min(H, y + r + 1))
        yy, xx = np.mgrid[j0:j1, i0:i1]
        inside = (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r
        n = n_all[j0:j1, i0:i1][inside].sum()
        count[k] = n
        if n > 0:
            share[k] = n_last[j0:j1, i0:i1][inside].sum() / n
    ok = count >= min_returns
    th = float(threshold_otsu(share[ok]))
    for t_, s_, o in zip(trees, share, ok):
        if o:
            t_["type"] = "conifer" if s_ >= th else "deciduous"
    n_ok = int(ok.sum())
    n_con = int(sum(1 for t_, o in zip(trees, ok) if o and t_["type"] == "conifer"))
    return (f"Conifer (pitch pine) vs deciduous (oak) from the leaf-off lidar: share of a crown's vegetation returns "
            f"that were the last return of their pulse, split at Otsu's threshold {th:.3f} "
            f"({n_con} of {n_ok} crowns with >= {min_returns} returns are conifers); the other "
            f"{len(trees) - n_ok} small crowns keep the crown-shape rule. See build/trees_preview.png.")


def poisson_disk(poly, spacing, rng, tries=30):
    """Bridson-style Poisson-disk points inside a polygon (local metres), seeded."""
    from shapely.prepared import prep
    pp = prep(poly)
    minx, miny, maxx, maxy = poly.bounds
    cell = spacing / np.sqrt(2)
    gw, gh = int((maxx - minx) / cell) + 1, int((maxy - miny) / cell) + 1
    grid = -np.ones((gh, gw), np.int64)
    pts, active = [], []
    for _ in range(200):  # first point
        x, y = rng.uniform(minx, maxx), rng.uniform(miny, maxy)
        if pp.contains(Point(x, y)):
            pts.append((x, y)); active.append(0)
            grid[int((y - miny) / cell), int((x - minx) / cell)] = 0
            break
    while active:
        k = active[int(rng.integers(len(active)))]
        px, py = pts[k]
        placed = False
        for _ in range(tries):
            ang, rad = rng.uniform(0, 2 * np.pi), rng.uniform(spacing, 2 * spacing)
            x, y = px + rad * np.cos(ang), py + rad * np.sin(ang)
            if not (minx <= x < maxx and miny <= y < maxy):
                continue
            gi, gj = int((y - miny) / cell), int((x - minx) / cell)
            ok = True
            for a_ in range(max(0, gi - 2), min(gh, gi + 3)):
                for b_ in range(max(0, gj - 2), min(gw, gj + 3)):
                    q = grid[a_, b_]
                    if q >= 0 and (pts[q][0] - x) ** 2 + (pts[q][1] - y) ** 2 < spacing ** 2:
                        ok = False
                        break
                if not ok:
                    break
            if ok and pp.contains(Point(x, y)):
                grid[gi, gj] = len(pts)
                pts.append((x, y)); active.append(len(pts) - 1)
                placed = True
                break
        if not placed:
            active.remove(k)
    return pts


def osm_fallback(name, cfg, world):
    """Spec 5.4 item 3: no canopy raster. OSM natural=tree points, plus seeded
    Poisson-disk fill of natural=wood / landuse=forest polygons. Heights and
    crown sizes are not measured, so this is flagged as lower fidelity."""
    import zlib
    fb = {"spacing_m": 6.0, "height_m": [6.0, 14.0], "conifer_share": 0.5, **cfg.get("tree_fallback", {})}
    rng = np.random.default_rng(zlib.crc32(cfg["id"].encode()))
    W, H = int(world.width), int(world.height)
    g = gpd.read_file(build_dir(name) / "course_local.geojson")
    extent = Polygon([(0, 0), (W, 0), (W, H), (0, H)])
    excl = g[g.kind.isin(["green", "tee", "bunker", "fairway", "lateral_water_hazard", "water_hazard", "pool", "building"])]
    boundary = play_boundary(g, cfg)
    lake = np.load(build_dir(name) / "lake_mask.npy")
    spots = [(p.x, p.y, "osm_tree") for p in g[g.kind == "tree"].geometry if extent.contains(p)]
    for geom in g[g.kind == "wood"].geometry:
        geom = geom.intersection(extent)
        for part in getattr(geom, "geoms", [geom]):
            if part.geom_type == "Polygon" and part.area > 20:
                spots += [(x, y, "wood_fill") for x, y in poisson_disk(part, fb["spacing_m"], rng)]
    trees, dropped = [], {"building": 0, "lake": 0, "tiny": 0, "playing_surface": 0}
    for x, y, why in spots:
        p = Point(x, y)
        if lake[min(int(y), lake.shape[0] - 1), min(int(x), lake.shape[1] - 1)]:
            dropped["lake"] += 1
            continue
        hit = excl[excl.contains(p)]
        if len(hit):
            dropped["building" if hit.kind.iloc[0] == "building" else "playing_surface"] += 1
            continue
        h = float(rng.uniform(*fb["height_m"]))
        conifer = bool(rng.random() < fb["conifer_share"])
        r = h * (0.22 if conifer else 0.35)
        trees.append({"x": round(x, 2), "y": round(y, 2), "h": round(h, 1), "r": round(r, 2),
                      "type": "conifer" if conifer else "deciduous", "in": bool(boundary.contains(p)), "from": why})
    stats = {
        "detected": len(trees), "inside_course": int(sum(t_["in"] for t_ in trees)),
        "conifer": int(sum(t_["type"] == "conifer" for t_ in trees)),
        "deciduous": int(sum(t_["type"] == "deciduous" for t_ in trees)),
        "height_p50_m": float(np.median([t_["h"] for t_ in trees])) if trees else 0.0,
        "height_max_m": float(max((t_["h"] for t_ in trees), default=0.0)),
        "dropped": dropped, "dropped_on_playing_surfaces": [],
        "osm_tree_points": int((g.kind == "tree").sum()), "osm_tree_points_matched_within_4m": 0,
        "source": "OSM fallback (no lidar)",
        "type_method": (f"LOWER FIDELITY: no canopy raster. Trees are OSM natural=tree points plus a seeded Poisson-disk fill "
                        f"of OSM woods every {fb['spacing_m']:g} m; heights {fb['height_m'][0]:g}-{fb['height_m'][1]:g} m and "
                        f"type ({fb['conifer_share']:.0%} conifer) are drawn at random, not measured."),
        "fallback": fb,
    }
    bdir = build_dir(name)
    write_json(bdir / "trees.json", trees)
    write_json(bdir / "trees_all.json", trees)  # s06 / s06b: tee shots
    write_json(bdir / "trees_report.json", stats, indent=1)
    np.save(bdir / "chm_local.npy", np.zeros((H, W), np.float32))
    img = Image.new("RGB", (W * 2, H * 2), (40, 40, 40))
    d = ImageDraw.Draw(img)
    for poly in g[g.kind.isin(["green", "fairway", "tee", "bunker", "wood"])].geometry:
        for part in getattr(poly, "geoms", [poly]):
            if part.geom_type == "Polygon":
                d.line([(px * 2, (H - py) * 2) for px, py in part.exterior.coords], fill=(80, 160, 255), width=1)
    for t_ in trees:
        cx_, cy_, rr = t_["x"] * 2, (H - t_["y"]) * 2, t_["r"] * 2
        d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=(20, 120, 40) if t_["type"] == "conifer" else (230, 160, 30))
    img.save(bdir / "trees_preview.png")
    print(f"[s05] OSM fallback (no canopy raster): {json.dumps({k: v for k, v in stats.items() if k not in ('type_method', 'fallback')})}")


def assign_blossoms(trees, rule, boundary, water_cells, bmask):
    """Mark flowering cherries (theme flair, not measured species) and order the
    list so the game's sprite variant (tree index mod 3) shows them.

    Rule (course_config.json `blossom`): a deciduous tree no taller than
    `max_h` m that stands outside the golf boundary, within `shore_m` m of open
    water (the nDSM's water cells) and within `max_from_boundary_m` m of the
    boundary (so the far bank does not count) is a cherry. At East Potomac that is the
    ring of Yoshino and Kwanzan cherries along Ohio Drive and the seawall.

    The game draws tree i with sprite variant i % 3; the theme's sheet draws
    deciduous variant 2 as a cherry in bloom. So cherries are put at indices
    with i % 3 == 2, the remaining slots of that kind take conifers (their
    variant 2 is an ordinary conifer), and ordinary deciduous trees fill
    indices 0 and 1. Cherries that do not fit show as ordinary trees, and
    deciduous trees that land in a variant-2 slot become cherries (both counted).
    """
    from scipy import ndimage as ndi
    dist = ndi.distance_transform_edt(~water_cells)  # metres to the nearest water cell
    H, W = dist.shape
    max_h, shore = float(rule.get("max_h", 12.0)), float(rule.get("shore_m", 45.0))
    near_b = float(rule.get("max_from_boundary_m", 1e9))
    for t_ in trees:
        if t_["type"] != "deciduous" or t_["h"] > max_h or t_["in"]:
            continue
        j, i = min(H - 1, int(t_["y"])), min(W - 1, int(t_["x"]))
        p_ = Point(t_["x"], t_["y"])
        if dist[j, i] <= shore and not boundary.buffer(2.0).contains(p_) and boundary.distance(p_) <= near_b:
            t_["type"] = "cherry"
    want = sum(t_["type"] == "cherry" for t_ in trees)
    cher = [t_ for t_ in trees if t_["type"] == "cherry"]
    con = [t_ for t_ in trees if t_["type"] == "conifer"]
    dec = [t_ for t_ in trees if t_["type"] == "deciduous"]
    n = len(trees)
    slot2 = [k for k in range(n) if k % 3 == 2]
    slot01 = [k for k in range(n) if k % 3 != 2]
    out = [None] * n
    q2 = cher[:len(slot2)]
    rest_c = cher[len(slot2):]
    q2 += con[:len(slot2) - len(q2)]
    rest_con = con[len(q2) - min(len(cher), len(slot2)):]
    # slots left over go to the most cherry-like remaining trees: outside the
    # course first, then nearest the water, then the shortest
    def like(t_):
        j, i = min(H - 1, int(t_["y"])), min(W - 1, int(t_["x"]))
        return (t_["in"], float(dist[j, i]), t_["h"])
    dec = sorted(dec, key=like)
    forced = dec[:max(0, len(slot2) - len(q2))]
    q2 += forced
    q01 = dec[len(forced):] + rest_con + rest_c
    for k, t_ in zip(slot2, q2):
        out[k] = t_
    for k, t_ in zip(slot01, q01):
        out[k] = t_
    for t_ in forced:
        t_["type"] = "cherry"
    for t_ in rest_c:
        t_["type"] = "deciduous"
    assert all(o is not None for o in out) and len({id(o) for o in out}) == n
    note = {
        "rule": {"max_h": max_h, "shore_m": shore, "max_from_boundary_m": near_b, "outside_boundary": True},
        "matched_rule": int(want), "shown_plain_no_slot": len(rest_c), "filled_slot": len(forced),
        "text": (f"Cherries (theme flair, species not measured): deciduous trees <= {max_h:g} m outside the golf boundary, "
                 f"within {shore:g} m of open water and {near_b:g} m of the boundary ({want} trees); {len(forced)} more deciduous trees "
                 f"(the most cherry-like by the same measures) are drawn as cherries to fill the sprite slots, {len(rest_c)} cherries are drawn plain."),
    }
    return out, note


def remove_wires(chm, rule):
    """Optional (course_config.json remove_wires): take power lines out of the canopy.

    A canopy model keeps every lidar hit above the ground, so conductors show as
    1-3 m wide lines 10-30 m up, which the top finder turns into rows of thin
    "trees". A cell is wire when it stands more than rise_m above the grey opening
    of the canopy (a 5 x 5 m window, which erases anything narrower than 5 m) and
    belongs to a connected thin network whose skeleton is at least min_len_m long
    and whose mean width (cells / skeleton cells) is at most max_width_m. Such
    cells take the opened height (the crown below the wire, or the ground).
    Returns (chm, stats).
    """
    from skimage.measure import label
    from skimage.morphology import skeletonize

    opened = ndimage.grey_opening(chm, footprint=np.ones((5, 5), bool))
    thin = (chm - opened) > float(rule.get("rise_m", 3.0))
    lab = label(thin, connectivity=2)
    n = int(lab.max())
    if n == 0:
        return chm, {"components": 0, "cells": 0}
    idx = range(1, n + 1)
    skel = np.asarray(ndimage.sum(skeletonize(thin), lab, idx))
    cells = np.asarray(ndimage.sum(thin, lab, idx))
    ok = np.zeros(n + 1, bool)
    ok[1:] = (skel >= float(rule.get("min_len_m", 40))) & (cells / np.maximum(skel, 1) <= float(rule.get("max_width_m", 3.0)))
    wire = ok[lab]
    out = chm.copy()
    out[wire] = opened[wire]
    return out, {"components": int(ok.sum()), "cells": int(wire.sum()),
                 "skeleton_m": int(skel[ok[1:]].sum())}


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    chm_path = build_dir(name) / "chm_1m.tif"
    if not chm_path.exists():
        return osm_fallback(name, cfg, world)
    with rasterio.open(chm_path) as r:  # s00: canopy height in metres on the world grid
        a = r.read(1).astype(np.float64)
        t = r.transform
    # crop to world: pixel edges are whole metres in UTM
    c0 = int(round((world.x0 - t.c) / t.a))
    r0 = int(round((t.f - (world.y0 + world.height)) / -t.e))
    W, H = int(world.width), int(world.height)
    chm = a[r0:r0 + H, c0:c0 + W]
    chm = np.flipud(chm)  # rows south->north: row j = local y in [j, j+1]
    water_cells = chm <= -4.0  # DC's normalized surface model marks open water -5
    chm[chm < 0] = 0
    wires = None
    if cfg.get("remove_wires"):
        chm, wires = remove_wires(chm, cfg["remove_wires"])
    sm = ndimage.gaussian_filter(chm, 0.6)

    # height-dependent local maximum
    radii = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
    maxes = [ndimage.maximum_filter(sm, footprint=disk(r)) for r in radii]
    want = np.clip(1.5 + (sm - MIN_TOP) * (2.5 / 36.0), 1.5, 4.0)
    idx = np.clip(np.round((want - 1.5) / 0.5).astype(int), 0, len(radii) - 1)
    mx = np.choose(idx, maxes)
    tops = (sm >= mx - 1e-9) & (sm > MIN_TOP)
    lab_tops, n = ndimage.label(tops)
    cents = ndimage.center_of_mass(tops, lab_tops, range(1, n + 1))

    markers = np.zeros(sm.shape, np.int32)
    for k, (cy, cx) in enumerate(cents, start=1):
        markers[int(round(cy)), int(round(cx))] = k
    canopy = sm > 2.5
    seg = watershed(-sm, markers, mask=canopy)
    areas = ndimage.sum(np.ones_like(sm), seg, range(1, n + 1))
    mean_h = ndimage.mean(sm, seg, range(1, n + 1))

    g = gpd.read_file(build_dir(name) / "course_local.geojson")
    tr = Affine(1, 0, 0, 0, 1, 0)  # local metres, rows south->north
    bld = g[g.kind == "building"].geometry
    bmask = rasterize([(geom.buffer(1.0), 1) for geom in bld], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool) if len(bld) else np.zeros((H, W), bool)
    lake = np.load(build_dir(name) / "lake_mask.npy")[:H, :W]
    excl = g[g.kind.isin(["green", "tee", "bunker", "lateral_water_hazard", "water_hazard", "pool"])]
    # The penalty areas made by join_boundary (s02) are a lake polygon filled over its marsh
    # islands and drawn loosely along the banks; trees the lidar finds there stand on that
    # ground (open water has no canopy), so they stay (Langston: ~440 trees on Kingman Lake's islands).
    # Likewise a stream channel (tag flatten=no, from propose_channels.py) is a few metres
    # wide and runs under the trees along its banks (Langston's creek through the woods).
    if len(excl):
        keep = excl.osm.astype(str).str.startswith("join_") | excl.tags.apply(lambda t: t.get("flatten") == "no")
        excl = excl[~keep]
    boundary = play_boundary(g, cfg)

    trees, dropped = [], {"building": 0, "lake": 0, "tiny": 0}
    dropped_surface = []
    # optional (course_config.json trees_off_fairways_m): no tree stands in a fairway,
    # i.e. more than that many metres inside one (edge trees may overhang it)
    fw_inset = None
    if cfg.get("trees_off_fairways_m") is not None:
        from shapely.ops import unary_union
        from shapely.prepared import prep
        fw_inset = prep(unary_union(list(g[g.kind == "fairway"].geometry)).buffer(-float(cfg["trees_off_fairways_m"])))
    for k, (cy, cx) in enumerate(cents, start=1):
        jy, ix = int(round(cy)), int(round(cx))
        h = float(chm[max(0, jy - 1):jy + 2, max(0, ix - 1):ix + 2].max())
        x, y = cx + 0.5, cy + 0.5
        area = float(areas[k - 1])
        if bmask[jy, ix]:
            dropped["building"] += 1
            continue
        if lake[jy, ix]:
            dropped["lake"] += 1
            continue
        if area < 3:
            dropped["tiny"] += 1
            continue
        p = Point(x, y)
        hit = excl[excl.contains(p)]
        if len(hit):
            dropped_surface.append({"x": round(x, 1), "y": round(y, 1), "h": round(h, 1), "on": hit.kind.iloc[0], "osm": hit.osm.iloc[0]})
            continue
        if fw_inset is not None and fw_inset.contains(p):
            fw = g[(g.kind == "fairway") & g.contains(p)]
            dropped_surface.append({"x": round(x, 1), "y": round(y, 1), "h": round(h, 1), "on": "fairway",
                                    "osm": fw.osm.iloc[0] if len(fw) else "fairway"})
            continue
        r = float(np.sqrt(area / np.pi))
        r = float(np.clip(r, 1.0, max(1.5, 0.5 * h)))
        profile = float(mean_h[k - 1]) / max(h, 1e-6)  # ~0.55 cone, ~0.8 dome
        narrow = r / h
        conifer = (narrow < 0.17) or (h > 28 and narrow < 0.3) or (profile < 0.6 and narrow < 0.28)
        trees.append({
            "x": round(x, 2), "y": round(y, 2), "h": round(h, 1), "r": round(r, 2),
            "type": "conifer" if conifer else "deciduous",
            "in": bool(boundary.contains(p)),
        })

    # optional (course_config.json drop_trees): single trees the developer asked to
    # remove for playability, each {"x", "y", "reason"} in local metres; the detected
    # tree within 2 m of the point is removed (an error if there is none)
    removed = []
    for d in cfg.get("drop_trees") or []:
        dist = [np.hypot(t_["x"] - d["x"], t_["y"] - d["y"]) for t_ in trees]
        k = int(np.argmin(dist))
        if dist[k] > 2.0:
            raise SystemExit(f"[s05] drop_trees: no detected tree within 2 m of ({d['x']}, {d['y']}) (nearest {dist[k]:.1f} m)")
        t_ = trees.pop(k)
        removed.append({"x": t_["x"], "y": t_["y"], "h": t_["h"], "r": t_["r"], "type": t_["type"], "reason": d["reason"]})

    type_method = "Conifer vs deciduous is inferred from crown shape only (no leaf-off imagery); see build/trees_preview.png."
    leaf = leaf_off_shares(name, cfg, world, trees)
    if leaf is not None:
        type_method = leaf
    species_note = None
    # s06 places the tees against these trees and s06b drops the ones still in the
    # way of a tee shot, then orders the list again (cherry slots)
    write_json(build_dir(name) / "trees_all.json", [dict(t_) for t_ in trees])
    if cfg.get("blossom"):
        np.save(build_dir(name) / "water_cells.npy", water_cells)
    if cfg.get("blossom"):
        trees, species_note = assign_blossoms(trees, cfg["blossom"], boundary, water_cells, bmask)

    # OSM natural=tree cross-check
    osm_trees = g[g.kind == "tree"]
    tx = np.array([[t_["x"], t_["y"]] for t_ in trees])
    matched = 0
    for p in osm_trees.geometry:
        d = np.hypot(tx[:, 0] - p.x, tx[:, 1] - p.y).min()
        matched += d < 4
    stats = {
        "detected": len(trees),
        "inside_course": int(sum(t_["in"] for t_ in trees)),
        "conifer": int(sum(t_["type"] == "conifer" for t_ in trees)),
        "deciduous": int(sum(t_["type"] == "deciduous" for t_ in trees)),
        "height_p50_m": float(np.median([t_["h"] for t_ in trees])),
        "height_max_m": float(max(t_["h"] for t_ in trees)),
        "dropped": dropped,
        "dropped_on_playing_surfaces": dropped_surface,
        "osm_tree_points": int(len(osm_trees)),
        "osm_tree_points_matched_within_4m": int(matched),
        "source": canopy_label(cfg),
        "type_method": type_method + (f" {species_note['text']}" if species_note else ""),
    }
    if species_note:
        stats["cherry"] = int(sum(t_["type"] == "cherry" for t_ in trees))
        stats["blossom"] = species_note
    if removed:
        stats["removed_by_developer"] = removed
    if wires is not None:
        stats["wires_removed"] = wires
    bdir = build_dir(name)
    write_json(bdir / "trees.json", trees)
    write_json(bdir / "trees_report.json", stats, indent=1)
    if removed:
        # clear the canopy under each removed crown (radius + 1 m) so s08 doesn't
        # leave a patch of woods where the tree stood
        jj, ii = np.mgrid[0:chm.shape[0], 0:chm.shape[1]]
        for t_ in removed:
            chm[np.hypot(ii + 0.5 - t_["x"], jj + 0.5 - t_["y"]) <= t_["r"] + 1.0] = 0
    np.save(bdir / "chm_local.npy", chm.astype(np.float32))

    # preview overlay
    s = 1
    img = Image.fromarray((np.flipud(np.clip(chm, 0, 50)) / 50 * 200 + 40).astype(np.uint8)).convert("RGB")
    img = img.resize((W * 2, H * 2), Image.NEAREST)
    d = ImageDraw.Draw(img)
    for poly in g[g.kind.isin(["green", "fairway", "tee", "bunker"])].geometry:
        for part in getattr(poly, "geoms", [poly]):
            pts = [(px * 2, (H - py) * 2) for px, py in part.exterior.coords]
            d.line(pts, fill=(80, 160, 255), width=1)
    for t_ in trees:
        cx_, cy_ = t_["x"] * 2, (H - t_["y"]) * 2
        rr = t_["r"] * 2
        col = {"conifer": (20, 120, 40), "cherry": (255, 120, 200)}.get(t_["type"], (230, 160, 30))
        d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=col)
        d.point((cx_, cy_), fill=(255, 0, 0))
    img.save(bdir / "trees_preview.png")
    print(f"[s05] {json.dumps({k: v for k, v in stats.items() if k != 'dropped_on_playing_surfaces'})}")
    print(f"[s05] dropped on playing surfaces: {len(dropped_surface)}")


if __name__ == "__main__":
    main()

"""Step 5.4: automatic tree detection from the DOGAMI canopy height model.

CHM (highest hit - bare earth) -> metres -> individual tree tops with a
local-maximum filter whose window grows with canopy height (3 m window for
short trees, 8 m for tall conifers), keeping maxima above 4 m. Crown radius
comes from a watershed segmentation around each top. Type: conifer if the
crown is narrow for its height or the crown profile is pointed; otherwise
deciduous (no leaf-off imagery available).

Drops tops that fall on buildings (OSM footprints) and on greens, tees,
bunkers or water (reported). Writes build/trees.json and a preview PNG.
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
from shapely.geometry import Point
from skimage.segmentation import watershed

from common import FT, World, build_dir, course_dir, course_name_from_argv, load_config, write_json

warnings.filterwarnings("ignore")

MIN_TOP = 4.0


def disk(r):
    k = int(np.ceil(r))
    y, x = np.mgrid[-k:k + 1, -k:k + 1]
    return (x * x + y * y) <= r * r + 1e-6


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    cdir = course_dir(name)
    with rasterio.open(cdir / cfg["chm"]["path"]) as r:
        a = r.read(1).astype(np.float64) * (FT if cfg["chm"]["units"] == "ft" else 1.0)
        t = r.transform
    # crop to world: pixel edges are whole metres in UTM
    c0 = int(round((world.x0 - t.c) / t.a))
    r0 = int(round((t.f - (world.y0 + world.height)) / -t.e))
    W, H = int(world.width), int(world.height)
    chm = a[r0:r0 + H, c0:c0 + W]
    chm = np.flipud(chm)  # rows south->north: row j = local y in [j, j+1]
    chm[chm < 0] = 0
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
    boundary = g[g.kind == "boundary"].geometry.iloc[0]

    trees, dropped = [], {"building": 0, "lake": 0, "tiny": 0}
    dropped_surface = []
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
    }
    bdir = build_dir(name)
    write_json(bdir / "trees.json", trees)
    write_json(bdir / "trees_report.json", stats, indent=1)
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
        col = (20, 120, 40) if t_["type"] == "conifer" else (230, 160, 30)
        d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=col)
        d.point((cx_, cy_), fill=(255, 0, 0))
    img.save(bdir / "trees_preview.png")
    print(f"[s05] {json.dumps({k: v for k, v in stats.items() if k != 'dropped_on_playing_surfaces'})}")
    print(f"[s05] dropped on playing surfaces: {len(dropped_surface)}")


if __name__ == "__main__":
    main()

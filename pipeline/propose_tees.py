"""Course-chat tool (not a `make course` step): propose tee boxes from the
bare-earth DEM for holes whose tees are missing in OSM.

Tee boxes are levelled pads raised above the surrounding ground, which a 1 m
lidar DEM shows clearly: cells more than RAISE m above the 61 m running median
of the DEM, nearly flat on top, forming a compact, rectangular patch of
MIN_AREA-MAX_AREA m2. Patches on mapped greens or tees are ignored (greens are
raised pads too). Each remaining pad near a hole line (as s06 looks for tees)
is measured to that hole's green and compared with every tee set on the card.

    python3 propose_tees.py <course> [--wide=10,13]     (after s00-s02)

--wide=<refs>: for these holes also search every cell within WIDE_R m of the
line start (not only the corridor along the tee shot), for a back tee that is
off the line, e.g. across water (Langston 10, developer 2026-10-19).

Writes data/<course>/proposed/tees_lidar.geojson (WGS84, golf=tee,
source=..., proposed=yes, plus the hole and card match of each pad) and
proposed/tees_lidar.png (the relative-height map with pads, OSM tees and hole
lines). The developer approves pads before they go into edited/course.geojson
(COURSE_BUILD.md 1.1).
"""
from __future__ import annotations

import json
import math
import warnings

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw
from rasterio.features import shapes
from scipy import ndimage
from shapely.affinity import translate
from shapely.geometry import Point, shape

from common import YD, World, build_dir, course_dir, course_name_from_argv, layout_holes, layouts, load_config, read_card
from s06_holes import path_from

warnings.filterwarnings("ignore")

RAISE = 0.15       # m above the running median
FLAT = 0.06        # max slope on the pad top (6 %)
MIN_AREA, MAX_AREA = 25.0, 2500.0
MIN_RECT = 0.5     # pad area / its minimum rotated rectangle
CORRIDOR = 12.0    # m either side of the tee-shot axis
MAX_STD = 0.14     # m: a levelled top
MIN_STEP = 0.15    # m: the pad stands this much above a ring 1.5-4 m around it
WIDE_R = 250.0     # m: search radius around the line start for --wide holes


def main():
    import sys
    name = course_name_from_argv()
    wide = set()
    for a in sys.argv[2:]:
        if a.startswith("--wide="):
            wide = {int(v) for v in a.split("=", 1)[1].split(",") if v}
    cfg = load_config(name)
    world = World(cfg)
    bdir, cdir = build_dir(name), course_dir(name)
    with rasterio.open(bdir / "dtm_1m.tif") as r:
        dtm = r.read(1)
        t = r.transform
    rel = dtm - ndimage.median_filter(dtm, size=61)
    sm = ndimage.gaussian_filter(dtm, 0.8)
    gy, gx = np.gradient(sm)
    slope = np.hypot(gx, gy)
    flat = (rel > RAISE) & (slope < FLAT)
    g = gpd.read_file(bdir / "course_local.geojson")
    greens_raw = g[g.kind == "green"]
    greens = greens_raw.geometry.buffer(1.5)
    osm_tees = g[g.kind == "tee"].geometry
    from rasterio.features import rasterize
    from shapely.geometry import LineString
    inv = ~t
    pads = []

    def ring_step(poly_utm, cells):
        ring = poly_utm.buffer(4.0).difference(poly_utm.buffer(1.5))
        rm = rasterize([(ring, 1)], out_shape=dtm.shape, transform=t, fill=0, dtype="uint8").astype(bool)
        return float(np.median(dtm[cells]) - np.median(dtm[rm])) if rm.any() else 0.0

    # Search a corridor along each hole's tee shot: the first leg of the hole line,
    # extended 140 m back behind its start, +-CORRIDOR m either side.
    seen = []
    for lay in layouts(cfg):
        for _, h in layout_holes(g, lay).iterrows():
            L = h.geometry
            (ax, ay), (bx, by) = L.coords[0], L.coords[1]
            ln = math.hypot(bx - ax, by - ay)
            ux, uy = (bx - ax) / ln, (by - ay) / ln
            leg = min(ln, 0.45 * L.length)
            axis = LineString([(ax - ux * 140, ay - uy * 140), (ax + ux * leg, ay + uy * leg)])
            corr = translate(axis.buffer(CORRIDOR, cap_style=2), world.x0, world.y0)
            if int(h.ref) in wide:
                corr = corr.union(translate(Point(ax, ay).buffer(WIDE_R), world.x0, world.y0))
            cm = rasterize([(corr, 1)], out_shape=dtm.shape, transform=t, fill=0, dtype="uint8").astype(bool)
            mm = ndimage.binary_opening(flat & cm, iterations=1)
            lab, n = ndimage.label(mm)
            for v in range(1, n + 1):
                cells = lab == v
                area = float(cells.sum())
                if not (MIN_AREA <= area <= MAX_AREA):
                    continue
                geoms = [shape(gm) for gm, val in shapes(cells.astype(np.uint8), mask=cells, transform=t) if val == 1]
                poly_utm = max(geoms, key=lambda q: q.area)
                rect_utm = poly_utm.minimum_rotated_rectangle
                if poly_utm.area / rect_utm.area < MIN_RECT:
                    continue
                if float(np.std(dtm[cells])) > MAX_STD:
                    continue
                step = ring_step(poly_utm, cells)
                if step < MIN_STEP:
                    continue
                # the pad's own outline, smoothed (tees are not always rectangles)
                pad = poly_utm.buffer(-0.6).buffer(0.6).simplify(0.4)
                if pad.is_empty:
                    continue
                if pad.geom_type == "MultiPolygon":
                    pad = max(pad.geoms, key=lambda q: q.area)
                rect = translate(pad, -world.x0, -world.y0)
                if greens.intersects(rect).any() or osm_tees.intersects(rect.buffer(-0.5)).any():
                    continue
                if any(rect.intersection(q).area > 0.5 * min(rect.area, q.area) for q in seen):
                    continue
                seen.append(rect)
                pads.append({"poly": rect, "area": round(area, 1), "rect": round(poly_utm.area / rect_utm.area, 2),
                             "raise_m": round(step, 2)})
    # match pads to holes like s06 does (near the line, in its first 45 %, or near its start)
    for lay in layouts(cfg):
        card = read_card(name, lay)
        sets = [ts["name"] for ts in lay["tee_sets"]]
        for _, h in layout_holes(g, lay).iterrows():
            nref = int(h.ref)
            L = h.geometry
            start, end = Point(L.coords[0]), Point(L.coords[-1])
            gc = greens_raw.loc[greens_raw.distance(end).idxmin()].geometry.centroid
            for p in pads:
                c = p["poly"].centroid
                s_ = L.project(c)
                near = (L.distance(c) < 25 and s_ < 0.45 * L.length) or c.distance(start) < 150 \
                    or (nref in wide and c.distance(start) < WIDE_R)
                if not near:
                    continue
                meas, _ = path_from(c, L, gc)
                yd = meas / YD
                best = min(sets, key=lambda ts: abs(yd - float(card[nref][ts.lower()])))
                cy = float(card[nref][best.lower()])
                p.setdefault("matches", []).append({"layout": lay["id"], "hole": nref, "yd": round(yd, 1),
                                                     "best_set": best, "card_yd": cy, "diff_pct": round((yd - cy) / cy * 100, 1)})
    feats = []
    for k, p in enumerate(pads):
        if not p.get("matches"):
            continue
        good = [mm for mm in p["matches"] if abs(mm["diff_pct"]) <= 8]
        feats.append({"id": f"lidar_tee_{k}", "poly": p["poly"], "area": p["area"], "rect": p["rect"], "raise_m": p["raise_m"],
                      "matches": p["matches"], "within_8pct": bool(good)})
    out = gpd.GeoDataFrame([{
        "osm": f["id"], "kind": "tee",
        "tags": {"golf": "tee", "landuse": "grass", "proposed": "yes",
                 "source": "lidar bare-earth DEM (raised flat pad), propose_tees.py",
                 "lidar_area_m2": str(f["area"]), "lidar_raise_m": str(f["raise_m"]),
                 "lidar_matches": json.dumps(f["matches"])},
        "within_8pct": f["within_8pct"],
        "geometry": translate(f["poly"], world.x0, world.y0)} for f in feats], crs=world.epsg).to_crs(4326)
    pdir = cdir / "proposed"
    pdir.mkdir(exist_ok=True)
    out.to_file(pdir / "tees_lidar.geojson", driver="GeoJSON")
    # picture: relative height, OSM tees (cyan), proposed pads (magenta), hole lines (red)
    W, H = int(world.width), int(world.height)
    c0 = int(round(world.x0 - t.c)); r0 = int(round(t.f - (world.y0 + world.height)))
    rr = rel[r0:r0 + H, c0:c0 + W]
    img = Image.fromarray((np.clip((rr + 0.6) / 1.2, 0, 1) * 255).astype(np.uint8)).convert("RGB").resize((W * 2, H * 2), Image.NEAREST)
    d = ImageDraw.Draw(img)
    P = lambda x, y: (x * 2, (H - y) * 2)
    for _, hrow in g[g.kind == "hole"].iterrows():
        pts = [P(x, y) for x, y in hrow.geometry.coords]
        d.line(pts, fill=(255, 40, 40), width=1)
        d.text(pts[0], str(hrow.tags.get("ref", "?")), fill=(255, 255, 0))
    for geom in osm_tees:
        if geom.geom_type != "Polygon":  # a tee mapped as a point (Pasatiempo 12)
            continue
        d.line([P(x, y) for x, y in geom.exterior.coords], fill=(0, 220, 255), width=2)
    for f in feats:
        d.line([P(x, y) for x, y in f["poly"].exterior.coords], fill=(255, 0, 255) if f["within_8pct"] else (150, 80, 150), width=2)
    img.save(pdir / "tees_lidar.png")
    for f in feats:
        ok = [f"{mm['layout'].split('_')[-1]} {mm['hole']} {mm['best_set']} {mm['yd']:.0f}/{mm['card_yd']:.0f} ({mm['diff_pct']:+.1f}%)" for mm in f["matches"]]
        print(f"  {f['id']:13s} area {f['area']:6.0f} step {f['raise_m']:.2f}  " + "; ".join(ok))
    print(f"[propose_tees] {len(pads)} raised flat pads, {len(feats)} near a hole line, {sum(f['within_8pct'] for f in feats)} within 8% of a card yardage -> proposed/tees_lidar.geojson")


if __name__ == "__main__":
    main()

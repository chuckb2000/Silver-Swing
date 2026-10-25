"""Proposal (course chat, 2026-10-25): the real tee box under each of the developer's desk marks.

The developer's marks (data/silvies/desk/<key>.json) give each tee's place, not its size
or shape (developer 2026-10-25: "those were just for the location ... they didn't reflect
the actual size or shape of the tee box"). The box under a mark is, in order:

1. a pad OSM or the lidar maps under the mark (golf=tee, a golf=fairway piece under
   1,500 m2, which OSM uses for tee pads here, or a lidar pad that is box-shaped:
   at least 0.7 of its hull); the mapped pads sit on the pads in the photo, and
   adding the photo's mown patch to them only added lobes of mown rough (first try);
2. otherwise the mown pad on the OSIP 2024 photo that the mark sits on: pixels whose excess green
   (2G-R-B, smoothed over 0.75 m) is at least +30 and whose texture (std of green over
   3.5 m) is under 12, the same split as make_native.py (fairway turf +34 at its 10th
   percentile, native ground +7 median), connected to the mark, within 22 m of it, and
   not on a mapped fairway (over 1,500 m2), green (+2 m), bunker or cart path (+1 m);
   kept when it is 30-400 m2, compact (0.75 of its hull) and not mostly cut off by the
   22 m limit (then it is mown rough or a fairway, not a box);
3. where neither gives a box, a 14 x 7 m rectangle (10 x 6 m on Chief Egan) centred on
   the mark and turned to the line of play (flagged "drawn").

Holes listed in desk/accepted_boxes.json (the developer kept the round-1 pre-filled pad
unchanged and accepted it as the box, 2026-10-25) take that shape as it is.
Each other box is smoothed (1 m in and out), must contain the mark's centre (the mark is
added if not), and is checked against the card in s06. Writes proposed/tee_boxes.geojson
(WGS84; kind tee, tags hole / tee_set / layout / how) and proposed/tee_boxes.jpg
(a contact sheet: photo, the mark in blue, the box in magenta).

    python3 data/silvies/make_tee_boxes.py      (after s02; reads build/course_local.geojson)
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import rasterize, shapes
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.affinity import rotate, translate
from shapely.geometry import Point, Polygon, box, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
X0, Y0 = cfg["world"]["x0"], cfg["world"]["y0"]
LAY = {"C": "silvies_craddock", "H": "silvies_hankins", "E": "silvies_chief_egan"}
SET = {L["id"]: L["default_tee"] for L in cfg["layouts"]}
R_M, EXG_MIN, TEX_MAX, MIN_A, MAX_A = 22.0, 30.0, 12.0, 30.0, 900.0

g = gpd.read_file(HERE / "build" / "course_local.geojson")
osm = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(cfg["epsg"])
osm["geometry"] = osm.geometry.translate(-X0, -Y0)
pads = list(osm[((osm.kind == "fairway") & (osm.geometry.area < 1500)) | (osm.kind == "tee")].geometry)
lid = gpd.read_file(HERE / "proposed" / "tees_lidar.geojson").to_crs(cfg["epsg"])
pads += list(lid.geometry.translate(-X0, -Y0))
not_tee = unary_union(list(g[(g.kind == "fairway") & (g.geometry.area >= 1500)].geometry)
                      + [x.buffer(2) for x in g[g.kind == "green"].geometry]
                      + list(g[g.kind == "bunker"].geometry)
                      + [x.buffer(1) for x in g[g.kind == "cartpath"].geometry])
plan = json.load(open(HERE / "proposed" / "routing.json"))
ACCEPTED = set(json.load(open(HERE / "desk" / "accepted_boxes.json"))["accepted"])
src = rasterio.open(HERE / cfg["ortho"]["path"])
RES = src.transform.a


def photo_patch(c: Point):
    w = from_bounds(X0 + c.x - R_M - 4, Y0 + c.y - R_M - 4, X0 + c.x + R_M + 4, Y0 + c.y + R_M + 4, src.transform)
    im = src.read(window=w).astype(np.float64)
    tr = src.window_transform(w)
    tr = Affine(tr.a, 0, tr.c - X0, 0, tr.e, tr.f - Y0)
    r, gg, b = im
    exg = ndimage.gaussian_filter(2 * gg - r - b, 0.75 / RES)
    tex = np.sqrt(np.maximum(ndimage.uniform_filter(gg ** 2, 7) - ndimage.uniform_filter(gg, 7) ** 2, 0))
    tex = ndimage.gaussian_filter(tex, 0.75 / RES)
    H, W = exg.shape
    disk = rasterize([(c.buffer(R_M), 1)], out_shape=(H, W), transform=tr).astype(bool)
    bad = rasterize([(not_tee, 1)], out_shape=(H, W), transform=tr).astype(bool) if not not_tee.is_empty else np.zeros((H, W), bool)
    m = (exg >= EXG_MIN) & (tex < TEX_MAX) & disk & ~bad
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    if not n:
        return None, "no mown pixels"
    inv = ~tr
    col, row = inv * (c.x, c.y)
    seed = lab[int(row), int(col)] if 0 <= int(row) < H and 0 <= int(col) < W else 0
    if not seed:   # the nearest component within 3 m
        d = ndimage.distance_transform_edt(lab == 0, return_indices=True)[1]
        rr, cc = d[0][int(row), int(col)], d[1][int(row), int(col)]
        if np.hypot(rr - row, cc - col) * RES > 3:
            return None, "mark not on mown turf"
        seed = lab[rr, cc]
    comp = lab == seed
    ring = disk & ~ndimage.binary_erosion(disk, iterations=2)
    edge_share = (comp & ring).sum() / max(1, ring.sum())
    poly = unary_union([shape(s) for s, v in shapes(comp.astype(np.uint8), mask=comp, transform=tr) if v == 1])
    if poly.is_empty:
        return None, "empty"
    if edge_share > 0.12:
        return None, f"mown area runs to the {R_M:.0f} m limit ({edge_share:.0%} of it): rough or fairway, not a box"
    if not MIN_A <= poly.area <= MAX_A:
        return None, f"{poly.area:.0f} m2 outside {MIN_A:.0f}-{MAX_A:.0f}"
    return poly, "photo"


feats, sheet = [], []
for kl, lay in LAY.items():
    for n in sorted(int(k) for k in plan[lay] if k != "_map_fit"):
        key = f"{kl}{n}"
        d = json.load(open(HERE / "desk" / f"{key}.json"))
        mark = Polygon([f for f in d["features"] if f["kind"] == "bluetee"][0]["poly"]).buffer(0)
        c = mark.centroid
        parts, how = [], []
        if key in ACCEPTED:   # the developer kept the pre-filled pad unchanged: that shape is the box
            feats.append({"osm": f"box_{lay.split('_', 1)[1]}_{n:02d}", "kind": "tee",
                          "tags": {"golf": "tee", "hole": str(n), "tee_set": SET[lay], "layout": lay, "how": "accepted",
                                   "source": "developer, tracing desk 2026-10-25 (kept the course chat's pad unchanged)"},
                          "geometry": mark, "key": key, "mark": mark})
            print(f"{key:4s} mark {mark.area:5.0f} m2 -> box {mark.area:5.0f} m2  accepted")
            continue
        pp, why = photo_patch(c)
        under = [p for p in pads if p.intersects(mark.buffer(1.5))]
        under = [p for p in under if p.area / p.convex_hull.area >= 0.7]   # a ragged lidar patch is not a box
        pad = unary_union(under) if under else None
        if pad is not None:
            parts.append(pad)
            how.append("pad")
        elif pp is not None and pp.area <= 400 and pp.area / pp.convex_hull.area >= 0.75:
            parts.append(pp)
            how.append("photo")
        if not parts:
            line = plan[lay][str(n)]["line"]
            ang = np.degrees(np.arctan2(line[-1][1] - c.y, line[-1][0] - c.x))
            L_, W_ = (10, 6) if lay == "silvies_chief_egan" else (14, 7)
            parts = [rotate(box(c.x - L_ / 2, c.y - W_ / 2, c.x + L_ / 2, c.y + W_ / 2), ang, origin=c)]
            how.append("drawn")
        b = unary_union(parts + [mark]).buffer(1.0).buffer(-1.0)
        if b.geom_type == "MultiPolygon":
            b = max(b.geoms, key=lambda q: q.area if q.contains(c) else q.area / 10)
        b = Polygon(b.exterior).simplify(0.4)
        if not b.contains(c):
            b = unary_union([b, mark.buffer(1.0)])
        feats.append({"osm": f"box_{lay.split('_', 1)[1]}_{n:02d}", "kind": "tee",
                      "tags": {"golf": "tee", "hole": str(n), "tee_set": SET[lay], "layout": lay, "how": "+".join(how),
                               "source": "course chat: the tee box under the developer's desk mark (make_tee_boxes.py)"},
                      "geometry": b, "key": key, "mark": mark})
        print(f"{key:4s} mark {mark.area:5.0f} m2 -> box {b.area:5.0f} m2  {'+'.join(how)}" + ("" if pp is not None else f"   [photo: {why}]"))

out = gpd.GeoDataFrame([{k: v for k, v in f.items() if k not in ("key", "mark")} for f in feats], crs=cfg["epsg"])
out["geometry"] = out.geometry.translate(X0, Y0)
out.to_crs(4326).to_file(HERE / "proposed" / "tee_boxes.geojson", driver="GeoJSON")

# contact sheet: 9 x 5 tiles, 60 m square around each mark
T, S = 240, 60.0
cols = 9
can = Image.new("RGB", (cols * T, ((len(feats) + cols - 1) // cols) * T), "black")
for i, f in enumerate(feats):
    c = f["mark"].centroid
    w = from_bounds(X0 + c.x - S / 2, Y0 + c.y - S / 2, X0 + c.x + S / 2, Y0 + c.y + S / 2, src.transform)
    a = src.read(window=w, out_shape=(3, T, T))
    im = Image.fromarray(np.moveaxis(a, 0, 2))
    dr = ImageDraw.Draw(im)
    P = lambda x, y: ((x - c.x + S / 2) / S * T, (c.y + S / 2 - y) / S * T)  # noqa: E731
    dr.line([P(*q) for q in f["geometry"].exterior.coords], fill=(255, 0, 255), width=2)
    dr.line([P(*q) for q in f["mark"].exterior.coords], fill=(60, 140, 255), width=2)
    dr.rectangle([0, 0, 120, 14], fill=(0, 0, 0))
    dr.text((3, 2), f"{f['key']} {f['geometry'].area:.0f} m2 {f['tags']['how'][:12]}", fill=(255, 255, 255))
    can.paste(im, ((i % cols) * T, (i // cols) * T))
can.save(HERE / "proposed" / "tee_boxes.jpg", quality=85)
print(f"{len(feats)} boxes -> proposed/tee_boxes.geojson, proposed/tee_boxes.jpg")

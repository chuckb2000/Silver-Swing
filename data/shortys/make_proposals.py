"""Proposals for Shorty's (course-chat helper, not a `make course` step; writes
proposed/*.geojson and prints a summary).

    python3 data/shortys/make_proposals.py        (after s01-s02 and the Preserve's make_proposals.py)

OSM maps Shorty's 19 holes, its tees, greens and bunkers, but no pins, no
fairway, and no green for hole 2 (its line ends 67 m from any green). Two
greens are shared (holes 6/18 and 9/13; the resort's 2023 routing map shows
both). For the developer to approve (COURSE_BUILD.md 1.1):

- greens_split.geojson: each double green cut by the perpendicular bisector of
  the two holes' line ends (each line ends where its hole plays to), as Old
  Macdonald's split_double_greens.py does with OSM pins;
- green2.geojson: hole 2's green traced from the 2024 photo
  (pipeline/propose_trace.py's trace_green + green_shape, seeded at the line's
  end; t and br_delta calibrated on Shorty's 17 mapped greens: median IoU 0.71);
- pins.geojson: a centre pin on each hole's green (its centroid, moved inside
  if needed);
- fairways.geojson: the mown turf, from a pixel classifier (photo colour and
  texture, as propose_trace.py's fairway model) trained on the Preserve's mown
  turf next door (positives: the OSM Bandon Preserve polygon minus its rough,
  greens, bunkers and tees; negatives: the dunes round it and its rough
  patches), applied inside Shorty's boundary; buildings and parking cut out (greens, tees and bunkers paint over it).
"""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import rasterize, shapes
from scipy import ndimage
from shapely.affinity import translate
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import split, unary_union

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
import propose_trace as pt  # noqa: E402
from common import World  # noqa: E402

warnings.filterwarnings("ignore")
EPSG = 32610
BOUNDARY = "w1540940976"
PRESERVE = "w674855473"
HOLES = {1: "w1547376228", 2: "w1547376237", 3: "w1547384744", 4: "w1547585701", 5: "w1547585702", 6: "w1547585703",
         7: "w1547585704", 8: "w1547585705", 9: "w1547585706", 10: "w1547585707", 11: "w1547585708", 12: "w1547585709",
         13: "w1547585710", 14: "w1547585711", 15: "w1547585713", 16: "w1547585714", 17: "w1547585715",
         18: "w1547585716", 19: "w1547585717"}
DOUBLE = [("w1547559707", 6, 18), ("w1547581185", 9, 13)]
GREEN_T, GREEN_BR = 5.0, 6       # calibrated on the 17 mapped greens
FW_PROB, FW_MIN_M2 = 0.3, 80.0


def save(feats, name):
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{EPSG}")
    out["tags"] = out.tags.apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / name, driver="GeoJSON")


def inside_point(p):
    c = p.centroid
    return c if p.contains(c) else p.representative_point()


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    w = World(cfg)
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    bnd = g[g.osm == BOUNDARY].geometry.iloc[0]
    lines = {n: g[g.osm == o].geometry.iloc[0] for n, o in HOLES.items()}
    greens = g[(g.kind == "green") & g.geom_type.isin(["Polygon", "MultiPolygon"])]

    # --- double greens: split by the bisector of the two line ends
    split_feats, hole_green = [], {}
    for gid, ha, hb in DOUBLE:
        poly = greens[greens.osm == gid].geometry.iloc[0]
        A, B = Point(lines[ha].coords[-1]), Point(lines[hb].coords[-1])
        mx, my, dx, dy = (A.x + B.x) / 2, (A.y + B.y) / 2, B.x - A.x, B.y - A.y
        k = 500.0 / np.hypot(dx, dy)
        parts = list(split(poly, LineString([(mx - dy * k, my + dx * k), (mx + dy * k, my - dx * k)])).geoms)
        for hole, end, other in ((ha, A, hb), (hb, B, ha)):
            part = min(parts, key=lambda p: p.distance(end))
            hole_green[hole] = part
            split_feats.append({"osm": f"p_green_{hole}", "kind": "green", "geometry": part,
                                "tags": {"golf": "green", "hole": str(hole), "split_from": gid,
                                         "double_green": f"with hole {other}: the part on hole {hole}'s side of the perpendicular bisector of the two holes' line ends"}})
            print(f"[proposals] green {gid}: hole {hole} part {part.area:.0f} m2 of {poly.area:.0f} m2")
    save(split_feats, "greens_split.geojson")

    # --- hole 2's green, traced from the photo (local metres in the tracer)
    o = pt.Ortho(HERE / "raw" / "osip2024_05m.tif", w)
    end = Point(lines[2].coords[-1])
    best = None
    for dx, dy in ((0, 0), (4, 0), (-4, 0), (0, 4), (0, -4)):
        q = pt.trace_green(o, (end.x - w.x0 + dx, end.y - w.y0 + dy), GREEN_T, br_delta=GREEN_BR)
        if q is None:
            continue
        q = pt.green_shape(q)
        compact = 4 * np.pi * q.area / q.length ** 2
        if best is None or compact > best[0]:
            best = (compact, q)
    g2 = translate(best[1], w.x0, w.y0)
    hole_green[2] = g2
    save([{"osm": "p_green_2", "kind": "green", "geometry": g2,
           "tags": {"golf": "green", "hole": "2", "source": "traced (course chat, 2026-10-22) from the OSIP 2024 orthophoto, seeded at the end of hole 2's OSM line"}}],
         "green2.geojson")
    print(f"[proposals] hole 2 green: {g2.area:.0f} m2, {g2.centroid.distance(end):.1f} m from the line end")

    # --- centre pins
    pins = []
    for n, L in lines.items():
        gp = hole_green.get(n)
        if gp is None:
            e = Point(L.coords[-1])
            gp = greens.geometry.iloc[int(np.argmin(greens.distance(e)))]
        p = inside_point(gp)
        pins.append({"osm": f"p_pin_{n}", "kind": "pin", "geometry": p,
                     "tags": {"golf": "pin", "ref": str(n), "source": "the centre of the hole's green (OSM maps no pins at Shorty's)"}})
    save(pins, "pins.geojson")

    # --- mown turf, trained on the Preserve's
    with rasterio.open(HERE / "raw" / "osip2024_05m.tif") as r:
        rgb = np.transpose(r.read().astype(np.float32), (1, 2, 0))
        tr, H, W = r.transform, r.height, r.width
    R, G, B = (rgb[..., i] for i in range(3))
    br, exg, sat = (R + G + B) / 3, 2 * G - R - B, rgb.max(-1) - rgb.min(-1)
    F = []
    for s in (1.5, 4, 9):
        m = ndimage.gaussian_filter(br, s)
        F.append(np.sqrt(np.maximum(ndimage.gaussian_filter(br * br, s) - m * m, 0)))
    for s in (2, 6):
        F += [ndimage.gaussian_filter(a, s) for a in (exg, br, sat, G - R, B - R)]
    F = np.stack(F, -1).reshape(-1, len(F))
    msk = lambda geoms: rasterize([(x, 1) for x in geoms if not x.is_empty], out_shape=(H, W), transform=tr).astype(bool)  # noqa: E731
    pg = gpd.read_file(ROOT / "data" / "bandon_preserve" / "proposed" / "fairways.geojson").to_crs(EPSG)
    pres = g[g.osm == PRESERVE].geometry.iloc[0]
    pgrown = gpd.read_file(ROOT / "data" / "bandon_preserve" / "proposed" / "boundary.geojson").to_crs(EPSG).geometry.iloc[0]
    rough = [x for x in g[g.kind == "rough"].geometry if x.within(pres.buffer(5))]
    pos = msk([x.buffer(-2) for x in pg.geometry])
    neg = msk([pgrown.difference(pres.buffer(4))] + [x.buffer(-1) for x in rough])
    rng = np.random.default_rng(0)
    ip = rng.choice(np.flatnonzero(pos.ravel()), 40000, replace=False)
    ineg = rng.choice(np.flatnonzero(neg.ravel()), 40000, replace=False)
    from sklearn.ensemble import HistGradientBoostingClassifier
    Xt, yt = np.concatenate([F[ip], F[ineg]]), np.r_[np.ones(len(ip)), np.zeros(len(ineg))]
    hold = rng.random(len(yt)) < 0.2
    clf = HistGradientBoostingClassifier(max_iter=200, random_state=0).fit(Xt[~hold], yt[~hold])
    print(f"[proposals] turf classifier holdout accuracy {clf.score(Xt[hold], yt[hold]):.3f}")
    P = ndimage.gaussian_filter(clf.predict_proba(F)[:, 1].reshape(H, W).astype(np.float32), 3)
    m = (P > FW_PROB) & msk([bnd])
    m = ndimage.binary_closing(ndimage.binary_opening(m, iterations=3), iterations=3)
    # only what is not turf is cut out: greens, tees and bunkers paint over the fairway (s08
    # priority), and cutting them left rings of rough round every tee once s08 rounded the
    # fairway's corners (developer 2026-10-22: no slivers of rough)
    cut = unary_union([*g[g.kind.isin(["building", "parking"])].geometry])
    fw = []
    for geom, _ in shapes(m.astype("uint8"), mask=m, transform=tr):
        p = Polygon(shape(geom).exterior)
        if p.area < FW_MIN_M2:
            continue
        p = pt.rounded(p, 2.0).intersection(bnd).difference(cut)
        for q in getattr(p, "geoms", [p]):
            if q.geom_type == "Polygon" and q.area >= FW_MIN_M2:
                fw.append(q.simplify(0.4))
    fw.sort(key=lambda p: -p.area)
    save([{"osm": f"p_fairway_{i + 1}", "kind": "fairway", "geometry": p,
           "tags": {"golf": "fairway", "source": "mown turf from the OSIP 2024 photo: a pixel classifier trained on Bandon Preserve's mapped turf (course chat, 2026-10-22)"}}
          for i, p in enumerate(fw)], "fairways.geojson")
    print(f"[proposals] fairways: {len(fw)} parts, {sum(p.area for p in fw):.0f} m2 inside a {bnd.area:.0f} m2 boundary")


if __name__ == "__main__":
    main()

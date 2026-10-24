"""Astoria: propose golf=hole lines and pins (OSM maps every green, tee box and
fairway but no hole lines or pins).

Routing (course chat, 2026-10-24; to be confirmed by the developer): the greens
lettered on proposed/osm_labelled.jpg, in play order H E M J S L C D P W I U K T N
F G Q. It rests on the Silver card and on the course's descriptions, all at once:
every hole's tee boxes stand beside the previous green, and each tee-to-green
distance fits the card (table in docs/courses/astoria.md); holes 2, 4, 8 and 17
are the only east-west holes (GolfClubAtlas: the four that "run the other way");
9 runs beside US 101 with the creek in front of its back tee; 10 is the par 3 by
the clubhouse and putting green (Top 100 Golf Courses); 15 has the smallest green.
Greens A, B (north, by the range), O and R (by the clubhouse) and V (south) are
practice greens.

For each hole this script uses the mapped OSM features only (as Tualatin's):

  start  the centroid of the hole's tee box (from TEES) whose straight distance to
         the green is closest to the Silver card
  bend   at most one, only on a dogleg: when the fairway's main axis (the longest
         path through the medial axis of the hole's mapped fairway in FAIRWAYS)
         runs more than BEND_MIN_M off the straight tee-green line, the bend is the
         axis point in the landing zone, LANDING_M (250 yd) from the tee or 70 % of
         a shorter hole; a straight hole gets no bend
  end    the centroid of the green
  pin    the centroid of the green (a proposal)

Writes proposed/holes.geojson (WGS84; kinds hole and pin, ids x_hole_<n> /
x_pin_<n>) and, with --png, proposed/holes.jpg over the OSIP 2024 photo.
edits.json adds the features, so make course rebuilds them from raw/osm.geojson
plus this file.

Run: python3 data/astoria/make_holes.py [--png]   (from the repo root; needs raw/osm.geojson from s01)
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import LineString, Point
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
EPSG = 32610
BEND_MIN_M = 12.0   # a fairway centre this far off the straight line makes a dogleg bend
LANDING_M = 228.6   # 250 yd: the scratch golfer's tee-shot landing zone (USGA length measurement)
TEE_SET = "silver"  # scorecard.csv column the line start is fitted to (the default tee)

# hole -> green (OSM id; letter on proposed/osm_labelled.jpg)
GREENS = {
    1: "w1151031529",   # H
    2: "w1151031526",   # E
    3: "w1151047192",   # M
    4: "w1151048613",   # J
    5: "w1151048612",   # S
    6: "w1151047193",   # L
    7: "w1151031525",   # C
    8: "w1151031530",   # D
    9: "w1151048607",   # P
    10: "w1151048609",  # W
    11: "w1151370634",  # I
    12: "w1151048610",  # U
    13: "w1151031531",  # K
    14: "w1151048611",  # T
    15: "w1151048604",  # N
    16: "w1151031527",  # F
    17: "w1151031528",  # G
    18: "w1151048605",  # Q
}
# hole -> its tee boxes (OSM ids; numbers on proposed/osm_labelled.jpg)
TEES = {
    1: ["w1151397553", "w1151397552", "w1151397551"],                        # 34, 35, 36
    2: ["w1151402549", "w1151402548", "w1151402547"],                        # 9, 10, 11
    3: ["w1151402546", "w1151397563", "w1151397561", "w1151397562", "w1151397560"],  # 1, 2, 5, 7, 8
    4: ["w1151402523", "w1151402522", "w1151402524", "w1151402525"],         # 27, 29, 30, 31
    5: ["w1151402541", "w1151402542", "w1151402540", "w1151402539"],         # 19, 22, 24, 28
    6: ["w1151402534", "w1151402533"],                                       # 43, 44
    7: ["w1151402545", "w1151402544", "w1151402539"],                        # 23, 25, 28 (26 is a point, dropped)
    8: ["w1151402546", "w1151397563", "w1151397564", "w1151397565"],         # 1, 2, 3, 4
    9: ["w1151403990", "w1151402552"],                                       # 6, 12
    10: ["w1151396052", "w1151396053"],                                      # 38, 42
    11: ["w1151403989", "w1151403987"],                                      # 52, 53
    12: ["w1151403992"],                                                     # 18
    13: ["w1151403984", "w1151403985"],                                      # 50, 51
    14: ["w1151402555", "w1151402556"],                                      # 20, 21
    15: ["w1151402532", "w1151402530", "w1151402531", "w1151402538", "w1151402537"],  # 45-49
    16: ["w1151402529", "w1151402528"],                                      # 32, 33
    17: ["w1151397557", "w1151397558", "w1151397559"],                       # 13, 14, 15
    18: ["w1151397555", "w1151397556"],                                      # 16, 17
}
# fairway polygons each hole plays over (OSM ids); par 3s have their green's apron only
FAIRWAYS = {
    1: ["r18419808"], 2: ["r18419811"], 3: ["r18419801"], 4: ["r18419802"], 5: ["r18419798"],
    6: ["r18419800"], 7: ["r18419804"], 8: ["r18419810"], 9: ["r18419815"], 10: ["r18419814"],
    11: ["w1151370635"], 12: ["r18419813"], 13: ["w1151393056"], 14: ["r18419816"],
    15: ["r18419803"], 16: ["r18419799"], 17: ["r18419812"], 18: ["r18419805"],
}


def centreline(geom, res=0.5):
    """Main axis of each fairway polygon: the longest path through the raster
    skeleton (medial axis) of the polygon, end to end, so side spurs into
    corners and lobes are left out. Returns the axis points of all parts."""
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    return np.vstack([_main_axis(p, res) for p in polys if p.area > 200])


def _main_axis(poly, res):
    from rasterio.features import rasterize
    from rasterio.transform import from_origin
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import dijkstra
    from skimage.morphology import skeletonize
    minx, miny, maxx, maxy = poly.bounds
    w, h = int((maxx - minx) / res) + 3, int((maxy - miny) / res) + 3
    tr = from_origin(minx - res, maxy + res, res, res)
    m = rasterize([(poly, 1)], out_shape=(h, w), transform=tr).astype(bool)
    sk = skeletonize(m)
    rr, cc = np.nonzero(sk)
    idx = -np.ones(sk.shape, dtype=np.int64)
    idx[rr, cc] = np.arange(len(rr))
    a, b, wts = [], [], []
    for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
        r2, c2 = rr + dr, cc + dc
        ok = (r2 >= 0) & (r2 < sk.shape[0]) & (c2 >= 0) & (c2 < sk.shape[1])
        j = np.full(len(rr), -1)
        j[ok] = idx[r2[ok], c2[ok]]
        sel = j >= 0
        a += list(np.nonzero(sel)[0]); b += list(j[sel]); wts += [np.hypot(dr, dc)] * int(sel.sum())
    G = coo_matrix((wts, (a, b)), shape=(len(rr), len(rr))).tocsr()
    G = G + G.T
    d0 = dijkstra(G, indices=0)
    d0[np.isinf(d0)] = -1
    u = int(np.argmax(d0))                      # one end of the longest path
    du, pred = dijkstra(G, indices=u, return_predecessors=True)
    du[np.isinf(du)] = -1
    v = int(np.argmax(du))                      # the other end
    path = [v]
    while path[-1] != u and pred[path[-1]] >= 0:
        path.append(int(pred[path[-1]]))
    p = np.array(path)
    xs = tr.c + (cc[p] + 0.5) * res
    ys = tr.f - (rr[p] + 0.5) * res
    return np.column_stack([xs, ys])


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    by = g.set_index("osm")
    card = {int(r["hole"]): r for r in csv.DictReader(open(HERE / "scorecard.csv"))}
    rows, report = [], []
    for n, gid in GREENS.items():
        green = by.loc[gid].geometry
        gc = green.centroid
        want_yd = float(card[n][TEE_SET])
        tid = min(TEES[n], key=lambda t: abs(by.loc[t].geometry.centroid.distance(gc) / 0.9144 - want_yd))
        tee = by.loc[tid].geometry.centroid
        straight = LineString([tee, gc])
        fw = unary_union([by.loc[f].geometry for f in FAIRWAYS[n]])
        pts = [tee.coords[0]]
        bend_note = "straight"
        if not fw.is_empty and int(card[n]["par"]) > 3:
            cl = centreline(fw)
            s = np.array([straight.project(Point(p)) for p in cl])
            keep = (s > 0.15 * straight.length) & (s < 0.92 * straight.length)
            if keep.any():
                ax = cl[keep]
                d = np.array([straight.distance(Point(p)) for p in ax])
                if d.max() > BEND_MIN_M:
                    want = min(LANDING_M, 0.7 * straight.length)
                    r_ = np.hypot(ax[:, 0] - tee.x, ax[:, 1] - tee.y)
                    k = int(np.argmin(np.abs(r_ - want)))
                    bp = ax[k]
                    pts.append((float(bp[0]), float(bp[1])))
                    bend_note = f"dogleg (axis up to {d.max():.1f} m off the straight line); bend {r_[k]:.0f} m from the tee, {d[k]:.1f} m off"
        pts.append(gc.coords[0])
        line = LineString(pts)
        yd = line.length / 0.9144
        report.append(f"hole {n:2d} par {card[n]['par']}: tee {tid}, {straight.length / 0.9144:5.0f} yd straight, {yd:5.0f} yd on the line "
                      f"(Silver card {want_yd:.0f}, {(yd - want_yd) / want_yd * 100:+.1f}%), {bend_note}")
        tags = {"golf": "hole", "ref": str(n), "par": card[n]["par"],
                "source": "proposed by data/astoria/make_holes.py from the mapped tee, fairway and green",
                "tee_osm": tid, "green_osm": gid}
        rows.append({"osm": f"x_hole_{n}", "kind": "hole", "tags": tags, "geometry": line})
        rows.append({"osm": f"x_pin_{n}", "kind": "pin",
                     "tags": {"golf": "pin", "ref": str(n), "source": "green centroid (proposal)"},
                     "geometry": gc})
    out = gpd.GeoDataFrame(rows, crs=EPSG).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "holes.geojson", driver="GeoJSON")
    print("\n".join(report))
    if "--png" in sys.argv:
        plot(g, gpd.GeoDataFrame(rows, crs=EPSG))


def plot(g, h):
    """The hole lines over the OSIP 2024 photo (0.5 m JPEG placed by its request box)."""
    import rasterio
    from PIL import Image, ImageDraw
    with rasterio.open(HERE / "raw" / "osip2024_05m.tif") as src:
        X0, Y1, PX = src.bounds.left, src.bounds.top, src.res[0]
        im = Image.fromarray(np.moveaxis(src.read(), 0, 2))
    dr = ImageDraw.Draw(im)
    def px(x, y):
        return ((x - X0) / PX, (Y1 - y) / PX)
    b = g[g.kind == "boundary"].geometry.iloc[0]
    dr.line([px(*c) for c in b.exterior.coords], fill=(255, 0, 255), width=3)
    for kind, col in (("green", (255, 255, 0)), ("tee", (255, 90, 90)), ("fairway", (0, 230, 230))):
        for geom in g[g.kind == kind].geometry:
            for p in getattr(geom, "geoms", [geom]):
                if p.geom_type == "Polygon":
                    dr.line([px(*c) for c in p.exterior.coords], fill=col, width=2)
    for _, r in h[h.kind == "hole"].iterrows():
        cs = [px(*c) for c in r.geometry.coords]
        dr.line(cs, fill=(255, 255, 255), width=3)
        for c in cs[1:-1]:
            dr.ellipse([c[0] - 5, c[1] - 5, c[0] + 5, c[1] + 5], outline=(255, 255, 255), width=2)
        x, y = cs[0]
        dr.rectangle([x - 14, y - 12, x + 14, y + 12], fill=(200, 0, 90))
        dr.text((x - 9, y - 7), r.tags["ref"], fill=(255, 255, 255))
    x0, y0 = px(b.bounds[0] - 60, b.bounds[3] + 40)
    x1, y1 = px(b.bounds[2] + 60, b.bounds[1] - 40)
    im.crop((int(x0), int(y0), int(x1), int(y1))).save(HERE / "proposed" / "holes.jpg", quality=85)


if __name__ == "__main__":
    main()

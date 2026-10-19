"""Tualatin: propose golf=hole lines and pins (OSM has neither).

Routing: the developer confirmed (2026-10-19) that the greens lettered A-R on
proposed/osm_labelled.png are holes 1-18 in order. For each hole this script
uses the mapped OSM features only:

  start  the centroid of the tee box listed in ROUTING (beside the previous
         green, its straight distance to the green fitting the Blue card; it is
         the box s06 assigns as the Blue tee)
  bend   at most one, only on a dogleg: when the fairway's main axis (the
         longest path through the medial axis of the mapped fairway polygons in
         FAIRWAYS) runs more than BEND_MIN_M off the straight tee-green line,
         the bend is the axis point in the landing zone, LANDING_M (250 yd)
         from the tee or 70 % of a shorter hole; a straight hole gets no bend
  end    the centroid of the green
  pin    the centroid of the green (a proposal, like Highland Links)

Writes proposed/holes.geojson (WGS84; kinds hole and pin, ids x_hole_<n> /
x_pin_<n>) and proposed/holes.png. edits.json adds the features, so
make course rebuilds them from raw/osm.geojson plus this file.

Run: python3 data/tualatin/make_holes.py   (from the repo root; needs raw/osm.geojson from s01)
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

# hole -> (green osm id, tee box osm id at the line start); greens A-R in order
ROUTING = {
    1: ("w820800009", "w820800005"),   # A, tee box 2 (box 1 beside it)
    2: ("w820800015", "w820800010"),   # B, tee box 3 (23 beside it)
    3: ("w820825475", "w821713854"),   # C, tee box 20 (4 beside it)
    4: ("w820825482", "w820825477"),   # D, tee box 5
    5: ("w820825485", "w820825483"),   # E, tee box 6 (21 beside it)
    6: ("w820825494", "w820825487"),   # F, tee box 7 (22 behind it)
    7: ("w820825501", "w820825496"),   # G, tee box 8
    8: ("w820825505", "w821713863"),   # H, tee box 24, the back tee (developer); 9 in front
    9: ("w820825509", "w820825506"),   # I, tee box 10
    10: ("w821134330", "w821713864"),  # J, tee box 25, the back tee (developer); 11 beside it
    11: ("w821134338", "w821713865"),  # K, tee box 26 (12 in front)
    12: ("w821134343", "w821713866"),  # L, tee box 27 (13 in front)
    13: ("w821134348", "w821134344"),  # M, tee box 14
    14: ("w821134354", "w821134349"),  # N, tee box 15
    15: ("w821134357", "w821134355"),  # O, tee box 16 (17 beside it)
    16: ("w821134366", "w821713867"),  # P, tee box 28
    17: ("w821134370", "w821134367"),  # Q, tee box 18
    18: ("w821134378", "w821134371"),  # R, tee box 19 (29 beside it)
}
# fairway polygons each hole plays over (OSM ids); par 3s have their approach only
FAIRWAYS = {
    1: ["r14014851"], 2: ["w821732165"], 3: ["r13949183"], 4: ["w820825478"],
    5: ["r14014857"], 6: ["r14014856"], 7: ["r14014850"], 8: ["w820825503", "r14014860"],
    9: ["w820825507", "w820825508"], 10: ["r14014848"], 11: ["r14014852", "r14014853"],
    12: ["r14014854"], 13: ["r14014855"], 14: ["r14014859"], 15: ["r14014849"],
    16: ["w821732167"], 17: ["r14014858"], 18: ["r13949184"],
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
    for n, (gid, tid) in ROUTING.items():
        green = by.loc[gid].geometry
        tee = by.loc[tid].geometry.centroid
        gc = green.centroid
        straight = LineString([tee, gc])
        fw = unary_union([by.loc[f].geometry for f in FAIRWAYS[n]])
        pts = [tee.coords[0]]
        bend_note = "straight"
        if not fw.is_empty and int(card[n]["par"]) > 3:
            cl = centreline(fw)
            # only the part of the centreline between tee and green along the hole
            s = np.array([straight.project(Point(p)) for p in cl])
            keep = (s > 0.15 * straight.length) & (s < 0.92 * straight.length)
            if keep.any():
                ax = cl[keep]
                d = np.array([straight.distance(Point(p)) for p in ax])
                if d.max() > BEND_MIN_M:
                    # a dogleg: bend at the fairway centre in the landing zone, the axis
                    # point LANDING_M from the tee (or 70 % of a shorter hole), as the
                    # USGA measures a dogleg through the scratch golfer's landing area
                    want = min(LANDING_M, 0.7 * straight.length)
                    r_ = np.hypot(ax[:, 0] - tee.x, ax[:, 1] - tee.y)
                    k = int(np.argmin(np.abs(r_ - want)))
                    bp = ax[k]
                    pts.append((float(bp[0]), float(bp[1])))
                    bend_note = f"dogleg (axis up to {d.max():.1f} m off the straight line); bend {r_[k]:.0f} m from the tee, {d[k]:.1f} m off"
        pts.append(gc.coords[0])
        line = LineString(pts)
        yd = line.length / 0.9144
        blue = float(card[n]["blue"])
        report.append(f"hole {n:2d} par {card[n]['par']}: {straight.length / 0.9144:5.0f} yd straight, {yd:5.0f} yd on the line "
                      f"(Blue card {blue:.0f}, {(yd - blue) / blue * 100:+.1f}%), {bend_note}")
        tags = {"golf": "hole", "ref": str(n), "par": card[n]["par"],
                "source": "proposed by data/tualatin/make_holes.py from the mapped tee, fairway and green",
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
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    b = g[g.kind == "boundary"].geometry.iloc[0]
    fig, ax = plt.subplots(figsize=(14, 15))
    x0, y0, x1, y1 = b.bounds
    ax.set_xlim(x0 - 40, x1 + 40)
    ax.set_ylim(y0 - 40, y1 + 40)
    for kind, fc, ec, z in (("fairway", "#9ad87e", "#5a5", 2), ("water", "#8cc0ee", "#36c", 3),
                            ("lateral_water_hazard", "#8cc0ee", "#36c", 3), ("green", "#2fbf2f", "#063", 4),
                            ("tee", "#e9d44a", "#7a6000", 4), ("bunker", "#fff6cf", "#b90", 5),
                            ("building", "#d8d8d8", "#999", 1)):
        s = g[g.kind == kind]
        if len(s):
            s.plot(ax=ax, facecolor=fc, edgecolor=ec, zorder=z, linewidth=0.6)
    gpd.GeoSeries([b]).boundary.plot(ax=ax, color="red", linewidth=1.4, zorder=6)
    for _, r in h[h.kind == "hole"].iterrows():
        xs, ys = r.geometry.xy
        ax.plot(xs, ys, color="#c00060", lw=1.6, zorder=7)
        ax.plot(xs[1:-1], ys[1:-1], "o", color="#c00060", ms=5, zorder=7)
        ax.text(xs[0], ys[0] - 14, r.tags["ref"], fontsize=13, weight="bold", color="#c00060", zorder=9,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="#c00060", lw=0.8))
    ax.set_title("Tualatin CC - proposed hole lines (number at the tee; dot = dogleg bend)")
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    plt.savefig(HERE / "proposed" / "holes.png", dpi=80, bbox_inches="tight")


if __name__ == "__main__":
    main()

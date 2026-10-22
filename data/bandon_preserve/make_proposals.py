"""Proposals for Bandon Preserve (course-chat helper, not a `make course` step;
writes proposed/*.geojson and proposed/proposals.png, and prints a summary).

    python3 data/bandon_preserve/make_proposals.py

OSM maps the Preserve's boundary (w674855473) tightly round its mown turf:
holes 4-13 tee off from outside it, every dune between the holes is outside
it, and no fairway is mapped. OSM's golf=rough polygons inside it are the
native patches. So, for the developer to approve (COURSE_BUILD.md 1.1):

- fairways.geojson: the mown turf, i.e. the OSM boundary polygon minus OSM's
  rough (the native patches) and buildings (geometry from OSM, nothing
  traced);
- tees.geojson: a back-tee box (10 x 6 m, along the line of play) for each
  hole with no mapped box that reaches the Back card, centred where the card
  distance to the green centre falls on the hole line (pipeline s06's measure:
  tee -> bends ahead -> green centre). The lidar (2008) predates the course
  (2012), so it shows no pads; the developer checks each box in the desk;
- boundary.geojson: the out-of-bounds line grown from the OSM polygon to
  take in the holes' tees and the dunes between them: the union of the OSM
  polygon, every Preserve hole line and green (15 m round them) and the
  proposed tees (12 m), closed over 30 m gaps, minus the neighbouring courses'
  polygons (Bandon Trails, Shorty's, the Bandon Dunes resort polygon).
"""
from __future__ import annotations

import csv
import json
import math
import sys
import warnings
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from s06_holes import box_centre, path_from  # noqa: E402

warnings.filterwarnings("ignore")
YD = 0.9144
EPSG = 32610
BOUNDARY = "w674855473"
NEIGHBOURS = {"w362513476": "Bandon Trails", "w1540940976": "Shorty's", "w362513477": "Bandon Dunes Golf Resort"}
BOX_L, BOX_W = 10.0, 6.0
TEE_SET = "Back"


def load():
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    return g


def holes_of(g):
    h = g[(g.kind == "hole") & g.tags.apply(lambda t: (t.get("name") or "").startswith("Bandon Preserve Hole"))].copy()
    h["ref"] = h.tags.apply(lambda t: int(t["ref"]))
    return h.sort_values("ref")


def green_of(greens, line):
    e = Point(line.coords[-1])
    return greens.geometry.iloc[int(np.argmin(greens.distance(e)))]


def box_reach(box, line, gc):
    """Yardage range a tee inside this box can give (s06 measure from every vertex and the centre)."""
    pts = [Point(q) for q in box.exterior.coords] + [box_centre(box)[0]]
    ys = [path_from(p, line, gc)[0] / YD for p in pts]
    return min(ys), max(ys)


def tee_at(line, gc, card_m):
    """Point on the hole line (or its extension behind the start) whose s06 distance to the green is card_m."""
    coords = list(line.coords)
    # walk the line from the green back towards the tee: distance via the bends ahead of each point
    pts = coords[:-1] + [(gc.x, gc.y)]
    rem = card_m
    for (xa, ya), (xb, yb) in zip(reversed(pts[1:]), reversed(pts[:-1])):
        seg = math.hypot(xb - xa, yb - ya)
        if rem <= seg:
            t = rem / seg
            return Point(xa + (xb - xa) * t, ya + (yb - ya) * t), ((xa - xb) / seg, (ya - yb) / seg)
        rem -= seg
    (xa, ya), (xb, yb) = pts[1], pts[0]   # beyond the line start: extend its first segment
    seg = math.hypot(xb - xa, yb - ya)
    ux, uy = (xb - xa) / seg, (yb - ya) / seg
    return Point(xb + ux * rem, yb + uy * rem), (-ux, -uy)


def rect(c, axis, length, width):
    ux, uy = axis
    vx, vy = -uy, ux
    hl, hw = length / 2, width / 2
    return Polygon([(c.x + sx * hl * ux + sy * hw * vx, c.y + sx * hl * uy + sy * hw * vy)
                    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])


def save(feats, name):
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{EPSG}")
    out["tags"] = out.tags.apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / name, driver="GeoJSON")


def main():
    g = load()
    card = {int(r["hole"]): r for r in csv.DictReader(open(HERE / "scorecard.csv"))}
    bnd = g[g.osm == BOUNDARY].geometry.iloc[0]
    greens = g[g.kind == "green"]
    tees = g[(g.kind == "tee") & (g.geom_type == "Polygon")]
    holes = holes_of(g)

    # --- fairways: the mown turf inside the OSM polygon
    # greens, bunkers and tees paint over the fairway (s08 priority); cutting them left rings of
    # rough round them once s08 rounded the fairway's corners (developer 2026-10-22: no slivers)
    cut = unary_union([*g[g.kind.isin(["rough", "building"])].geometry])
    turf = bnd.difference(cut)
    parts = [p for p in getattr(turf, "geoms", [turf]) if p.geom_type == "Polygon" and p.area >= 30]
    fw = [{"osm": f"p_fairway_{i + 1}", "kind": "fairway", "geometry": p,
           "tags": {"golf": "fairway", "source": "the mown turf: OSM's Bandon Preserve boundary (w674855473) minus OSM rough and buildings (greens, bunkers and tees paint over it)"}}
          for i, p in enumerate(sorted(parts, key=lambda p: (-p.area)))]
    save(fw, "fairways.geojson")
    print(f"[proposals] fairways: {len(fw)} parts, {sum(f['geometry'].area for f in fw):.0f} m2 "
          f"(the OSM polygon {bnd.area:.0f} m2)")

    # --- back tees where no mapped box reaches the card
    tfeats, report = [], []
    for _, h in holes.iterrows():
        n, L = int(h.ref), h.geometry
        gc = green_of(greens, L).centroid
        want = float(card[n]["back"])
        start = Point(L.coords[0])
        best = None
        for _, t in tees.iterrows():
            if t.geometry.distance(start) > 70:
                continue
            lo, hi = box_reach(t.geometry, L, gc)
            gap = 0 if lo <= want <= hi else min(abs(lo - want), abs(hi - want))
            if gap / want <= 0.03 and (best is None or gap < best[0]):
                best = (gap, t.osm, lo, hi)
        line_yd = path_from(start, L, gc)[0] / YD
        if best:
            report.append(f"hole {n:2}: card {want:.0f}, mapped box {best[1]} reaches {best[2]:.0f}-{best[3]:.0f} yd: kept")
            continue
        c, axis = tee_at(L, gc, want * YD)
        box = rect(c, axis, BOX_L, BOX_W)
        got = path_from(box_centre(box)[0], L, gc)[0] / YD
        moved = (want - line_yd) * YD
        tfeats.append({"osm": f"p_tee_back_{n}", "kind": "tee", "geometry": box,
                       "tags": {"golf": "tee", "hole": str(n), "tee_set": TEE_SET,
                                "assigned_by": "the course chat (2026-10-22), for the developer to check in the desk",
                                "source": f"{BOX_L:.0f} x {BOX_W:.0f} m box on the hole line where the Back card distance ({want:.0f} yd) to the green centre falls: "
                                          f"{abs(moved):.0f} m {'behind' if moved > 0 else 'ahead of'} the OSM line start (no box mapped; lidar older than the course)"}})
        report.append(f"hole {n:2}: card {want:.0f}, line start {line_yd:.0f} yd -> proposed box at {got:.0f} yd, "
                      f"{abs(moved):.0f} m {'behind' if moved > 0 else 'ahead of'} the line start; on the OSM turf: {bnd.contains(c)}")
    save(tfeats, "tees.geojson")
    print("[proposals] tees:\n  " + "\n  ".join(report))

    # --- the grown boundary
    lines = unary_union(list(holes.geometry)).buffer(15)
    gr = unary_union([green_of(greens, L) for L in holes.geometry]).buffer(15)
    tb = unary_union([f["geometry"] for f in tfeats] + [Point(L.coords[0]) for L in holes.geometry]).buffer(12)
    grown = unary_union([bnd, lines, gr, tb]).buffer(30, join_style=1).buffer(-30, join_style=1)
    for o in NEIGHBOURS:
        grown = grown.difference(g[g.osm == o].geometry.iloc[0])
    if grown.geom_type == "MultiPolygon":
        grown = max(grown.geoms, key=lambda p: p.area)
    grown = Polygon(grown.exterior).simplify(0.5)
    bfeat = [{"osm": "p_boundary", "kind": "boundary", "geometry": grown,
              "tags": {"leisure": "golf_course", "name": "Bandon Preserve", "operator": "Bandon Dunes Golf Resort",
                       "source": "OSM w674855473 (the mown turf) grown to take in the tees and the dunes between the holes "
                                 "(15 m round the hole lines and greens, 12 m round the tees, gaps under 60 m closed), "
                                 "minus the Bandon Trails, Shorty's and resort polygons"}}]
    save(bfeat, "boundary.geojson")
    inside = sum(L.intersection(grown).length / L.length for L in holes.geometry) / len(holes)
    print(f"[proposals] boundary: {grown.area:.0f} m2 (OSM {bnd.area:.0f} m2); hole lines inside on average {inside:.0%}")


if __name__ == "__main__":
    main()

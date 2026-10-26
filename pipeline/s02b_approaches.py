"""Step 5b (optional, course_config.json "connect_fairways"): close gaps between
a fairway and its green where the OSM drawing is wrong.

Use it only where OSM disagrees with the real course: the fairway is mown up
to the collar on the ground (photos, imagery or the developer say so) but the
OSM polygon stops a few metres short of the green or meets it with ragged
corners. Many real holes have rough, a bunker, a ditch or a forced carry
between fairway and green; those must stay as they are. So:

  "connect_fairways": true             every hole with a fairway on its line
                                       (only when that is true of the whole
                                       course, as at East Potomac)
  "connect_fairways": ["3", "blue 7"]  only these holes ("<hole>" for a
                                       one-layout course, "<layout short
                                       name> <hole>" with layouts)
  absent / false                       nothing (the default)

For each chosen hole that has a fairway on its hole line, this step adds an
approach: the convex hull of the fairway's last FAIRWAY_REACH metres before
the green (within a corridor of 1.3 green radii, at least 12 m, either side
of the hole line) and the front half of the green (the half facing the
fairway), minus the green itself, other greens, tees and anything outside the
course boundary. Bunkers, the fringe and cart paths are still painted on top
(s08 priority), so they keep their shapes.

The approaches are written into build/course_local.geojson as fairways
(osm id "approach_<layout>_<hole>", tag derived=approach) so every later step
(surface, stripes, putting views, tree checks) sees the same ground, and are
listed in build/approaches.json. Gaps over MAX_GAP m (or the course's
"connect_fairways_max_gap_m", if smaller) are left alone and reported (a real forced carry, or a hole line that misses its fairway).
"""
from __future__ import annotations

import json
import math
import warnings

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

from common import build_dir, course_name_from_argv, layout_holes, layouts, load_config, play_boundary, rnd

warnings.filterwarnings("ignore")

FAIRWAY_REACH = 20.0   # m of fairway (beyond the gap) that shapes the approach
MAX_GAP = 60.0         # m: larger gaps are reported, not bridged
FRONT = 0.25           # the green's front part: up to 0.25 x its radius past the centre


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    path = build_dir(name) / "course_local.geojson"
    g = gpd.read_file(path)
    g = g[~g.osm.astype(str).str.startswith("approach_")].copy()
    if not cfg.get("connect_fairways"):
        print("[s02b] connect_fairways is off - nothing to do")
        return
    greens, fairways = g[g.kind == "green"], g[g.kind == "fairway"]
    keep_out = unary_union(list(g[g.kind == "tee"].geometry))
    boundary = play_boundary(g, cfg)
    rows, report = [], []
    want = cfg["connect_fairways"]
    # optional (course_config.json connect_fairways_max_gap_m; Sea Ranch, developer 2026-10-25:
    # "only fix if the gap is like 5 yards or less"): a smaller limit than MAX_GAP
    max_gap = float(cfg.get("connect_fairways_max_gap_m", MAX_GAP))
    chosen = None if want is True else {str(x).strip().lower() for x in want}
    seen = set()
    for lay in layouts(cfg):
        tag = lay.get("short") or lay["id"]
        for _, h in layout_holes(g, lay).iterrows():
            key = f"{int(h.ref)}" if not lay["shared"] else f"{tag.lower()} {int(h.ref)}"
            if chosen is not None and key not in chosen:
                continue
            seen.add(key)
            L = h.geometry
            gi = greens.distance(Point(L.coords[-1])).idxmin()
            green = greens.loc[gi].geometry
            fw = fairways[fairways.intersects(L.buffer(5.0))]
            if fw.empty:
                report.append({"layout": lay["id"], "hole": int(h.ref), "status": "no fairway on the hole line"})
                continue
            fi = fw.distance(green).idxmin()
            f = fw.loc[fi].geometry
            gap = float(f.distance(green))
            if gap > max_gap:
                report.append({"layout": lay["id"], "hole": int(h.ref), "gap_m": round(gap, 1), "status": f"gap {gap:.1f} m > {max_gap:g} m, left alone"})
                continue
            c = green.centroid
            R = math.sqrt(green.area / math.pi)
            # the fairway's end, kept to a corridor along the hole line (no side lobes)
            corridor = L.buffer(max(12.0, 1.3 * R))
            f_near = f.intersection(green.buffer(gap + FAIRWAY_REACH)).intersection(corridor)
            back = L.interpolate(max(0.0, L.project(Point(L.coords[-1])) - 30.0))
            ux, uy = back.x - c.x, back.y - c.y
            n = math.hypot(ux, uy) or 1.0
            ux, uy = ux / n, uy / n
            off = -FRONT * R
            big = 500.0
            # half-plane on the fairway side of a line across the green, FRONT x R past its centre
            px, py = c.x + ux * off, c.y + uy * off
            half = Polygon([(px - uy * big, py + ux * big), (px + uy * big, py - ux * big),
                            (px + uy * big + ux * big, py - ux * big + uy * big),
                            (px - uy * big + ux * big, py + ux * big + uy * big)])
            front = green.intersection(half)
            hull = unary_union([f_near, front]).convex_hull
            other_greens = unary_union([q.buffer(1.5) for j, q in greens.geometry.items() if j != gi])
            appr = hull.difference(green).difference(other_greens).difference(keep_out).intersection(boundary)
            appr = appr.difference(f)  # only the new ground
            parts = [p for p in getattr(appr, "geoms", [appr]) if p.geom_type == "Polygon" and p.area > 0.5]
            if not parts:
                report.append({"layout": lay["id"], "hole": int(h.ref), "gap_m": rnd(gap, 1), "status": "already meets the green", "added_m2": 0})
                continue
            geom = unary_union(parts)
            rows.append({"osm": f"approach_{tag.lower()}_{int(h.ref)}", "kind": "fairway",
                         "tags": {"golf": "fairway", "derived": "approach", "fairway_osm": fw.loc[fi].osm, "green_osm": greens.loc[gi].osm},
                         "geometry": geom})
            report.append({"layout": lay["id"], "hole": int(h.ref), "gap_m": rnd(gap, 1), "status": "connected", "added_m2": rnd(geom.area, 1)})
    if chosen is not None and chosen - seen:
        print(f"[s02b] WARNING: connect_fairways lists holes that are not in this course: {sorted(chosen - seen)} "
              f"(use \"<hole>\", or \"<layout short name> <hole>\" with layouts)")
    if rows:
        g = pd.concat([g, gpd.GeoDataFrame(rows)], ignore_index=True)
    g = gpd.GeoDataFrame(g, geometry="geometry")
    g.to_file(path, driver="GeoJSON")
    (build_dir(name) / "approaches.json").write_text(json.dumps(report, indent=1) + "\n")
    added = sum(r.get("added_m2", 0) for r in report)
    print(f"[s02b] {len(rows)} approaches added ({added:.0f} m2); "
          + "; ".join(f"{r['layout'].split('_')[-1]} {r['hole']}: {r['status']}" for r in report if r["status"] not in ("connected", "already meets the green")))


if __name__ == "__main__":
    main()

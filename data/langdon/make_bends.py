"""Langdon Farms: dogleg bend points for the hole lines, from the developer's
desk shapes (data/langdon/desk/hole<NN>.json, local metres).

For each par 4 and 5: the straight line runs from the Tee 7 box centre to the
green centre. When the main axis of the hole's fairway (pipeline/fairway_axis.py)
runs more than BEND_MIN_M off that line, the hole gets one bend: the axis
point LANDING_M (250 yd) from the tee, or 70 % of a shorter hole, as Tualatin
(COURSE_LESSONS.md 9). Par 3s and straight holes get none. Hole 9 has no
fairway of its own in the desk (the developer drew 8's and 9's shared fairway
on hole 8), so it gets no bend: that fairway's axis follows hole 8.

Writes the bends into trace_spec.json holes.<n>.bends (desk_to_proposed.py
draws the lines through them) and prints a report.

Run from the repo root: python3 data/langdon/make_bends.py
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from fairway_axis import centreline  # noqa: E402

BEND_MIN_M = 12.0
LANDING_M = 228.6
SHARED_FAIRWAY = {"9": "8"}  # developer: the fairway drawn on hole 8 is also hole 9's


def shapes(k, kind):
    d = json.load(open(HERE / "desk" / f"hole{int(k):02d}.json"))
    return [Polygon(f["poly"]).buffer(0) for f in d["features"] if f["kind"] == kind]


def own_green(spec, k):
    """The hole's own green; on a double green (trace_spec double_greens) the larger
    drawing minus the other hole's green, as desk_to_proposed.py cuts it."""
    g = shapes(k, "green")[0]
    for dg in spec.get("double_greens", []):
        if k in dg["holes"]:
            for o in dg["holes"]:
                if o != k:
                    other = shapes(o, "green")[0]
                    if g.area > other.area:
                        g = g.difference(other)
                        g = max(getattr(g, "geoms", [g]), key=lambda q: q.area)
    return g


def main():
    spec = json.load(open(HERE / "trace_spec.json"))
    card = {r["hole"]: r for r in csv.DictReader(open(HERE / "scorecard.csv"))}
    for k in sorted(spec["holes"], key=int):
        tee = shapes(k, "bluetee")[0].centroid
        gp = own_green(spec, k)
        gc = gp.centroid if gp.contains(gp.centroid) else gp.representative_point()
        straight = LineString([tee, gc])
        bends, note = [], "straight"
        fw = unary_union(shapes(k, "fairway"))
        if k in SHARED_FAIRWAY:
            note = f"straight (no fairway of its own: it shares hole {SHARED_FAIRWAY[k]}'s, whose axis is that hole's)"
        elif int(card[k]["par"]) > 3 and not fw.is_empty:
            cl = centreline(fw)
            s = np.array([straight.project(Point(p)) for p in cl])
            keep = (s > 0.15 * straight.length) & (s < 0.92 * straight.length)
            # only the axis near this hole's line (a shared fairway also runs along the other hole)
            if keep.any():
                ax = cl[keep]
                d = np.array([straight.distance(Point(p)) for p in ax])
                near = d < 60
                ax, d = ax[near], d[near]
                if len(ax) and d.max() > BEND_MIN_M:
                    want = min(LANDING_M, 0.7 * straight.length)
                    r_ = np.hypot(ax[:, 0] - tee.x, ax[:, 1] - tee.y)
                    i = int(np.argmin(np.abs(r_ - want)))
                    bends = [[round(float(ax[i][0]), 1), round(float(ax[i][1]), 1)]]
                    note = f"dogleg (axis up to {d.max():.1f} m off); bend {r_[i]:.0f} m from the tee, {d[i]:.1f} m off"
        spec["holes"][k]["bends"] = bends
        L = LineString([tee.coords[0], *bends, gc.coords[0]])
        c7 = float(card[k]["tee 7"])
        print(f"hole {int(k):2d} par {card[k]['par']}: {L.length / 0.9144:5.0f} yd (Tee 7 card {c7:.0f}, "
              f"{(L.length / 0.9144 - c7) / c7 * 100:+.1f} %), {note}")
    json.dump(spec, open(HERE / "trace_spec.json", "w"), indent=1)


if __name__ == "__main__":
    main()

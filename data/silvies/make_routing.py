"""Proposal (course chat, 2026-10-25): the routings of the three Silvies layouts, for the
tracing desk. Nothing here is approved until the developer saves the holes in the desk.

    python3 data/silvies/make_routing.py      (after s01 + make_edits + merge_edits + s02)

Writes proposed/routing.geojson (WGS84) and proposed/routing.json (the tee each hole is
proposed to start from, per layout, with its measured yardage against the card).

Craddock: the 18 OSM hole lines (they start at the Challenge tees), tagged
  layout=silvies_craddock. Holes 2 and 16 start somewhere the card and the club's map
  disagree with (COURSE_LESSONS.md 23): their lines are re-started on the mown pads the
  club map and the photo show (2: the oval pad NE of the Hankins green beside it;
  16: the pad west of the 15th green).
Hankins: no OSM lines. Its routing from the club's Hankins map and the GolfClubAtlas
  notes (which Craddock fairway and green each hole shares), each hole ending on the OSM
  green below (GREENS_H). The tee is the small mown pad (OSM maps most tee pads as small
  golf=fairway pieces) within 220 m of the previous green whose distance best matches the
  played set's card (White; the developer chose the club maps' back tees, 2026-10-25); where none does, a point on the line from the previous green at the Grey
  distance (flagged "placed"). Doglegs follow the bend of the Craddock hole it shares,
  reversed (SHARED).
Chief Egan: no OSM lines or tees. The club's map is fitted to the nine OSM greens
  (similarity transform, residuals reported); each tee is put at the card distance from
  its green in the map's direction, or on a mown pad within 15 m of that spot.
Also: OSM w904342353 (tagged golf=tee, 243 m2) is Chief Egan's 3rd green on the club
  map and the photo; it is copied as a green.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import LineString, Point

HERE = Path(__file__).resolve().parent
YD = 0.9144
cfg = json.load(open(HERE / "course_config.json"))
X0, Y0 = cfg["world"]["x0"], cfg["world"]["y0"]

g = gpd.read_file(HERE / "build" / "course_local.geojson")
g["tg"] = [t if isinstance(t, dict) else json.loads(t) for t in g["tags"]]
greens = {r.osm: r.geometry for _, r in g[g.kind == "green"].iterrows()}
EGAN3 = "w904342353"
greens[EGAN3] = g[g.osm == EGAN3].geometry.iloc[0]


def gid(s):  # a green by the last three digits of its OSM id
    m = [k for k in greens if k.endswith(s)]
    assert len(m) == 1, (s, m)
    return m[0]


def gc(k):
    p = greens[k]
    c = p.centroid
    return c if c.within(p) else p.representative_point()


pads = g[((g.kind == "fairway") & (g.geometry.area < 700)) | (g.kind == "tee")]
PADS = {r.osm: r.geometry for _, r in pads.iterrows()}
craddock = {int(r.tg["ref"]): r for _, r in g[g.kind == "hole"].iterrows()}


def card(fn):
    return {int(r["hole"]): r for r in csv.DictReader(open(HERE / fn))}


def measure(line_pts, tee):
    """s06's path_from: tee -> the line's bend points ahead of it -> green centre."""
    L = LineString(line_pts)
    s0 = L.project(Point(tee))
    pts = [tee]
    acc = 0.0
    for i in range(1, len(line_pts) - 1):
        acc += Point(line_pts[i]).distance(Point(line_pts[i - 1]))
        if acc > s0 + 1:
            pts.append(line_pts[i])
    pts.append(line_pts[-1])
    return sum(Point(a).distance(Point(b)) for a, b in zip(pts, pts[1:])) / YD


feats, plan = [], {}


def add_line(layout, ref, par, pts, why):
    feats.append({"osm": f"prop_{layout.split('_', 1)[1]}_{ref:02d}", "kind": "hole",
                  "tags": {"golf": "hole", "ref": str(ref), "par": str(par), "layout": layout,
                           "source": "course chat proposal (make_routing.py)", "approved": "pending", "note": why},
                  "geometry": LineString(pts)})


# ---------------------------------------------------------------- Craddock
cc = card("scorecard_craddock.csv")
NEW_START = {2: ("w1301409389", "OSM line started in the 1st fairway, across a Hankins green (416 yd vs the card's 355); "
                 "re-started on the oval pad the club map and photo show NE of that green"),
             16: ("w1301541100", "OSM line started east of the 15th green (312 yd vs 410); the club map puts the 16th tee west "
                  "of it, on this pad")}
plan["silvies_craddock"] = {}
for n in range(1, 19):
    r = craddock[n]
    pts = [tuple(p) for p in r.geometry.coords]
    why = "OSM line, unchanged"
    if n in NEW_START:
        pad, why = NEW_START[n]
        c = PADS[pad].centroid
        pts = [(c.x, c.y)] + pts[1:]
        add_line("silvies_craddock", n, int(cc[n]["par"]), pts, why)
    green = min(greens, key=lambda k: greens[k].distance(Point(pts[-1])))
    pts[-1] = (gc(green).x, gc(green).y)
    grey = int(cc[n]["challenge"])
    best = None
    for o, p in PADS.items():
        c = p.centroid
        if LineString(pts).distance(c) > 60 or c.distance(Point(pts[-1])) < 40:
            continue
        yd = measure(pts, (c.x, c.y))
        e = (yd - grey) / grey
        if abs(e) < 0.08 and (best is None or abs(e) < abs(best[2])):
            best = (o, round(yd), e)
    plan["silvies_craddock"][n] = {"osm_line": r.osm, "green": green, "line": pts, "grey": grey, "back": int(cc[n]["grey"]),
                                   "tee_pad": best[0] if best else None, "tee_yd": best[1] if best else None,
                                   "note": why}

# ---------------------------------------------------------------- Hankins
hc = card("scorecard_hankins.csv")
GREENS_H = {1: "296", 2: "299", 3: "236", 4: "235", 5: "237", 6: "231", 7: "223", 8: "230", 9: "232",
            10: "220", 11: "213", 12: "216", 13: "219", 14: "218", 15: "211", 16: "215", 17: "214", 18: "234"}
SHARED = {3: 16, 4: 15, 5: 14, 6: 13, 9: 9, 10: 8, 16: 3, 17: 2}   # Hankins hole -> Craddock hole whose fairway it plays backwards
PREV_H = {1: "308"}                                                 # hole 1 starts by the Craddock 18th green (the clubhouse)
BEND_H = {8: [(410.3, 1167.7)]}   # Hankins 8 plays down the north lobe of fairway w1301548853: the lobe's centre (its part north of y 1100)
plan["silvies_hankins"] = {}
for n in range(1, 19):
    gk = gid(GREENS_H[n])
    G = gc(gk)
    prev = gc(gid(PREV_H.get(n, GREENS_H.get(n - 1, "308"))))
    grey = int(hc[n]["white"])
    bend = []
    if n in SHARED:
        cp = list(craddock[SHARED[n]].geometry.coords)
        bend = [tuple(p) for p in cp[1:-1]][::-1]
    bend = BEND_H.get(n, bend)
    best = None
    for o, p in PADS.items():
        c = p.centroid
        if c.distance(prev) > 220 or c.distance(G) < 40:
            continue
        pts = [(c.x, c.y)] + bend + [(G.x, G.y)]
        yd = measure(pts, (c.x, c.y))
        e = (yd - grey) / grey
        if abs(e) < 0.08 and (best is None or abs(e) < abs(best[2])):
            best = (o, round(yd), e, pts)
    if best:
        pts, why = best[3], f"tee on pad {best[0]} ({best[1]} yd vs card {grey})"
    else:
        # no pad fits: a point on the way from the previous green, at the Grey distance from the green
        d = grey * YD
        first = Point(bend[0]) if bend else prev
        v = np.array([first.x - G.x, first.y - G.y])
        v /= np.linalg.norm(v)
        t = (G.x + v[0] * d, G.y + v[1] * d) if not bend else None
        if bend:  # walk back from the green along the bends
            path = [(G.x, G.y)] + bend[::-1]
            rem = d
            for a, b in zip(path, path[1:]):
                seg = Point(a).distance(Point(b))
                if rem <= seg:
                    f = rem / seg
                    t = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
                    break
                rem -= seg
            else:
                a, b = path[-2], path[-1]
                u = np.array([b[0] - a[0], b[1] - a[1]]); u /= np.linalg.norm(u)
                t = (b[0] + u[0] * rem, b[1] + u[1] * rem)
        pts = [t] + [p for p in bend if Point(p).distance(Point(t)) > 30 and Point(p).distance(G) < Point(t).distance(G)] + [(G.x, G.y)]
        why = f"no mown pad fits the card {grey} yd: tee placed at that distance (to mark in the desk)"
    add_line("silvies_hankins", n, int(hc[n]["par"]), pts, why)
    plan["silvies_hankins"][n] = {"green": gk, "line": pts, "grey": grey, "back": int(hc[n]["grey"]),
                                  "tee_pad": best[0] if best else None, "tee_yd": best[1] if best else None,
                                  "placed": None if best else pts[0], "note": why}

# ---------------------------------------------------------------- Chief Egan
ec = card("scorecard_chief_egan.csv")
# club map (reference/chief.egan.webp, 1500 x 795 px): green and tee of each hole, read off the drawing
MAP_G = {1: (660, 445), 2: (595, 145), 3: (900, 235), 4: (1270, 365), 5: (985, 355), 6: (680, 325), 7: (875, 410), 8: (990, 630), 9: (800, 630)}
MAP_T = {1: (770, 565), 2: (580, 360), 3: (660, 185), 4: (1010, 265), 5: (1240, 410), 6: (910, 325), 7: (640, 380), 8: (830, 475), 9: (1020, 690)}
GREENS_E = {1: "359", 2: "361", 3: EGAN3, 4: "356", 5: "354", 6: "360", 7: "355", 8: "357", 9: "358"}
src = np.array([MAP_G[n] for n in range(1, 10)], float) * [1, -1]          # map y down -> up
dst = np.array([[gc(gid(GREENS_E[n]) if n != 3 else EGAN3).x, gc(gid(GREENS_E[n]) if n != 3 else EGAN3).y] for n in range(1, 10)])
# similarity fit (Umeyama): dst = s R src + t
ms, md = src.mean(0), dst.mean(0)
A, B = src - ms, dst - md
U, S, Vt = np.linalg.svd(B.T @ A)
D = np.diag([1, np.sign(np.linalg.det(U @ Vt))])
R = U @ D @ Vt
s = (S * np.diag(D)).sum() / (A ** 2).sum()
tr = md - s * R @ ms
fit = lambda p: s * R @ (np.array(p, float) * [1, -1]) + tr  # noqa: E731
res = np.hypot(*(np.array([fit(MAP_G[n]) for n in range(1, 10)]) - dst).T)
plan["silvies_chief_egan"] = {"_map_fit": {"m_per_px": round(float(s), 3), "rot_deg": round(float(np.degrees(np.arctan2(R[1, 0], R[0, 0]))), 1),
                                           "residual_m": [round(float(x), 1) for x in res]}}
for n in range(1, 10):
    gk = gid(GREENS_E[n]) if n != 3 else EGAN3
    G = np.array([gc(gk).x, gc(gk).y])
    tmap = fit(MAP_T[n])
    v = tmap - G
    v /= np.linalg.norm(v)
    t = G + v * int(ec[n]["white"]) * YD
    pad = min(PADS, key=lambda o: PADS[o].centroid.distance(Point(*t)))
    near = PADS[pad].centroid.distance(Point(*t)) <= 15 and pad != EGAN3
    if near:
        t = np.array([PADS[pad].centroid.x, PADS[pad].centroid.y])
    pts = [tuple(t), tuple(G)]
    why = f"from the club map's tee direction at the card's {ec[n]['white']} yd" + (f", on pad {pad}" if near else " (to mark in the desk)")
    add_line("silvies_chief_egan", n, int(ec[n]["par"]), pts, why)
    plan["silvies_chief_egan"][n] = {"green": gk, "line": pts, "grey": int(ec[n]["white"]), "back": int(ec[n]["white"]),
                                     "tee_pad": pad if near else None, "tee_yd": round(measure(pts, pts[0])),
                                     "placed": None if near else pts[0], "note": why}

e3 = g[g.osm == EGAN3].iloc[0]
feats.append({"osm": EGAN3 + "_green", "kind": "green",
              "tags": {**{k: v for k, v in e3.tg.items() if k != "golf"}, "golf": "green", "was": "golf=tee",
                       "note": "Chief Egan's 3rd green on the club map and the photo"},
              "geometry": e3.geometry})

out = gpd.GeoDataFrame(feats, crs=cfg["epsg"])
out["geometry"] = out.geometry.translate(X0, Y0)
out.to_crs(4326).to_file(HERE / "proposed" / "routing.geojson", driver="GeoJSON")
json.dump(plan, open(HERE / "proposed" / "routing.json", "w"), indent=1, default=lambda o: [round(float(x), 1) for x in o])
print(f"routing.geojson: {len(feats)} features; Chief Egan map fit {plan['silvies_chief_egan']['_map_fit']}")
for lay, holes in plan.items():
    for n, h in holes.items():
        if n == "_map_fit":
            continue
        print(lay.split("_", 1)[1][:8], n, "green", h["green"][-3:], "Grey/card", h["grey"], "pad", h["tee_pad"], h["tee_yd"], "" if h.get("tee_pad") else "PLACE")

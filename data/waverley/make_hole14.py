"""Hole 14's green complex, made by the course chat at the developer's request
(chat, 2026-10-19 21:10: the tracing desk would not open hole 14; "none of the
bunkers should be touching the green, there should be fairway between the green
and the bunkers. Maybe move all the bunkers a smidge away from the green?").

    python3 data/waverley/make_hole14.py            proposal only: proposed/hole14_proposal.json
    python3 data/waverley/make_hole14.py --apply    once approved: desk/hole14.json
                                                    (then pipeline/desk_to_proposed.py waverley)

Superseded for the green: the developer reshaped hole 14's green in the tracing
desk on 2026-10-19 (data/waverley/desk/hole14.json is now their save, built from
this script's bunkers). --apply refuses to overwrite a developer save.

Writes hole 14 in the tracing desk's format, from the
course chat's traces (proposed/traced.geojson) and the developer's hole 15 save:
  - the four bunkers ringing the green (traced 21, 25, 26 and hole 15's saved
    tr_bunker_18) moved MOVE_M outward from the green centre, same shapes;
  - the green: the largest smooth ellipse inside the ring of moved bunkers that
    keeps GAP_M from every one of them, so collar and fairway lie between green
    and sand (developer: the green is smooth and round);
  - a fifth ring bunker, in tree shadow east of the green (the texture trace missed
    it; it shows as a grey oval with the same grass lip as the other four), placed
    by eye on the photo as an ellipse, then moved like the others;
  - the traced tee box and the traced bunkers 34, 35, 53 (along the hole), unchanged.
edits.json leaves out hole 15's copy of tr_bunker_18 (desk_15_bunker_1), which
this file replaces.
"""
import json

import numpy as np
from pathlib import Path

import geopandas as gpd
from shapely.affinity import rotate, scale, translate
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
X0, Y0, EPSG = 526504, 5032328, 32610
CENTRE = Point(391.5, 1243.0)   # middle of the bunker ring on the OSIP photo (local metres)
MOVE_M = 1.5                    # "a smidge": each bunker moved this far away from the centre
GAP_M = 2.5                     # grass kept between the green and every bunker
RING = ["tr_bunker_21", "tr_bunker_25", "tr_bunker_26", "tr_bunker_18", "eye_bunker_14_shadow"]
SHADOW_BUNKER = (406.9, 1241.3, 2.0, 6.0, -18.0)   # centre x, y, half-width, half-length (m), rotation (deg)
KEEP = ["tr_tee_14_12", "tr_bunker_34", "tr_bunker_35", "tr_bunker_53"]


def ring_of(p):
    return [[round(x, 2), round(y, 2)] for x, y in list(p.exterior.coords)[:-1]]


def main():
    t = gpd.read_file(HERE / "proposed" / "traced.geojson").to_crs(EPSG)
    t["geometry"] = t.geometry.translate(-X0, -Y0)
    geom = dict(zip(t.osm, t.geometry))
    cx, cy, rx, ry, ang = SHADOW_BUNKER
    geom["eye_bunker_14_shadow"] = rotate(scale(Point(cx, cy).buffer(1.0, 32), rx, ry), ang, origin=(cx, cy))
    feats, moved = [], []
    for fid in RING:
        p = geom[fid]
        c = p.centroid
        dx, dy = c.x - CENTRE.x, c.y - CENTRE.y
        n = (dx * dx + dy * dy) ** 0.5
        q = translate(p, dx / n * MOVE_M, dy / n * MOVE_M)
        moved.append(q)
        feats.append({"id": fid + "_moved", "kind": "bunker", "poly": ring_of(q)})
    # the green: the largest smooth ellipse inside the ring that keeps GAP_M from every
    # moved bunker (developer: "the green in reality is smooth and round, not jagged")
    best = None
    for cx in np.arange(CENTRE.x - 3, CENTRE.x + 3.01, 0.5):
        for cy in np.arange(CENTRE.y - 3, CENTRE.y + 3.01, 0.5):
            for ang in range(0, 180, 10):
                for rx in np.arange(6.0, 14.01, 0.5):
                    for ry in np.arange(rx, min(rx * 1.6, 18.0) + 0.01, 0.5):
                        e = rotate(scale(Point(cx, cy).buffer(1.0, 64), rx, ry), ang, origin=(cx, cy))
                        if min(e.distance(q) for q in moved) < GAP_M:
                            break   # a longer ellipse only gets closer
                        if best is None or e.area > best.area:
                            best = e
    g = best.simplify(0.05)
    assert min(g.distance(q) for q in moved) >= GAP_M, min(g.distance(q) for q in moved)
    feats.insert(0, {"id": "tr_green_14_cleared", "kind": "green", "poly": ring_of(g)})
    for fid in KEEP:
        kind = "tee" if fid.startswith("tr_tee") else "bunker"
        feats.append({"id": fid, "kind": kind, "poly": ring_of(geom[fid])})
    out = {"hole": "14", "savedAt": "2026-10-19T21:10:00Z",
           "note": "made by the course chat at the developer's request (data/waverley/make_hole14.py): "
                   "ring bunkers moved 1.5 m out (plus a fifth in the tree shadow, placed by eye), green kept 2.5 m clear of them",
           "by": "course chat (developer's request)",
           "units": f"local metres, origin {X0} E {Y0} N, EPSG:{EPSG}",
           "features": feats}
    import sys
    dst = HERE / "desk" / "hole14.json" if "--apply" in sys.argv else HERE / "proposed" / "hole14_proposal.json"
    if dst.parent.name == "desk" and dst.exists() and json.load(open(dst)).get("by") != out["by"]:
        raise SystemExit("[hole14] desk/hole14.json is the developer's own save; not overwriting it")
    dst.write_text(json.dumps(out, indent=1))
    print(f"[hole14] green {g.area:.0f} m2 (was {geom['tr_green_14'].area:.0f}), "
          f"closest bunker {min(g.distance(q) for q in moved):.2f} m; {len(feats)} features")


if __name__ == "__main__":
    main()

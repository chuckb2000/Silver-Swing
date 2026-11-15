"""Cart paths over water (developer, 2026-11-14: "when water cuts off golf cart paths and creates
it so the cart path just goes into the water"): s08 paints water after cart paths, so a path
over a creek or a pond (a bridge in real life; OSM usually tags it bridge=yes) is drawn as water
and the path seems to run into it. The fix is Burlington's (data/burlington_cc/make_brook.py,
developer 2026-10-31: the bridges are cart path, free relief, not water), in the course's data:

  - every penalty area the build paints (golf=water_hazard / lateral_water_hazard, and
    course_config red_water_osm) has the cart paths and the paved roads over it cut out (each
    path buffered 1.75 m, a road its half width + 0.5 m), so the path is drawn across;
  - two path ends that face each other across water a few metres apart (OSM stops the paths at
    each bank) are joined by a straight bridge (kind cartpath, bridge=yes), as at Burlington.

Writes data/<id>/proposed/bridges.geojson and its entries in data/<id>/edits.json ("add" the cut
water under a new id, "drop" the old one, "add" the joining bridges) and renames the water's id
in course_config.json wherever it is listed. Not a build step (it changes data, then `make
course` builds from it), so a course's pin is untouched. A second run replaces its own entries.

    python3 pipeline/bridge_paths.py <id> ...          # write
    python3 pipeline/bridge_paths.py --dry <id> ...    # report only
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from pyproj import Transformer
from shapely import transform as shp_transform
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
PATH_CUT = 1.75          # m: half the strip cut out of the water for a cart path (Burlington's)
ROAD_HALF = {"service": 2.5, "residential": 3.0, "tertiary": 3.5, "primary": 4.0}  # s08's paved roads
MIN_CUT = 3.0            # m2: smaller overlaps (a path brushing the shore) are left alone
JOIN_MAX = 25.0          # m: the longest bridge made between two facing path ends
JOIN_ANGLE = 35.0        # degrees: how far each path's last leg may point away from the bridge
TAG = "bridge_paths.py"  # marks this tool's own entries in edits.json
SUFFIX = "_bridged"


def projector(epsg: int):
    fwd = Transformer.from_crs(4326, epsg, always_xy=True)
    inv = Transformer.from_crs(epsg, 4326, always_xy=True)
    import numpy as np
    to_m = lambda g: shp_transform(g, lambda c: np.column_stack(fwd.transform(c[:, 0], c[:, 1])))
    to_deg = lambda g: shp_transform(g, lambda c: np.column_stack(inv.transform(c[:, 0], c[:, 1])))
    return to_m, to_deg


def tags_of(f) -> dict:
    t = f["properties"].get("tags") or {}
    return json.loads(t) if isinstance(t, str) else t


def leg_dir(line: LineString, at_end: bool) -> tuple[float, float]:
    """Unit direction of the path's last leg, pointing out of the path at that end."""
    cs = list(line.coords)
    a, b = (cs[-2], cs[-1]) if at_end else (cs[1], cs[0])
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1.0
    return dx / n, dy / n


def plan(cid: str) -> dict:
    cdir = ROOT / "data" / cid
    cfg = json.load(open(cdir / "course_config.json"))
    to_m, to_deg = projector(int(cfg["epsg"]))
    edits = json.load(open(cdir / "edits.json")) if (cdir / "edits.json").exists() else {}
    # the layout as the build reads it, without this tool's earlier entries
    gj = json.load(open(cdir / "edited/course.geojson"))
    own = {a for e in edits.get("add", []) if e.get("tool") == TAG for a in e["ids"]}
    feats = [f for f in gj["features"] if f["properties"].get("osm") not in own]
    dropped_by_me = {d["osm"] for d in edits.get("drop", []) if d.get("tool") == TAG}
    if dropped_by_me:  # put back the originals this tool dropped (from raw or an earlier add)
        raw = json.load(open(cdir / "raw/osm.geojson"))["features"]
        back = [f for f in raw if f["properties"].get("osm") in dropped_by_me]
        for e in edits.get("add", []):
            if e.get("tool") == TAG:
                continue
            src = json.load(open(cdir / e["from"]))["features"]
            back += [f for f in src if f["properties"].get("osm") in dropped_by_me]
        feats += back
    red = set(cfg.get("red_water_osm") or [])
    water, paths, roads = [], [], []
    for f in feats:
        k = f["properties"].get("kind")
        osm = f["properties"].get("osm")
        try:
            g = to_m(shape(f["geometry"]))
        except Exception:
            continue
        if (k in ("water_hazard", "lateral_water_hazard") or osm in red) and g.geom_type in ("Polygon", "MultiPolygon"):
            water.append((f, g))
        elif k == "cartpath" and g.geom_type == "LineString":
            paths.append((osm, g))
        elif k == "highway" and g.geom_type == "LineString" and tags_of(f).get("highway") in ROAD_HALF:
            roads.append((osm, g, ROAD_HALF[tags_of(f)["highway"]] + 0.5))
    if not water:
        return {"course": cid, "cuts": [], "joins": []}
    W = unary_union([w.buffer(0) for _, w in water])

    # path ends facing each other across water
    joins = []
    ends = []
    for osm, L in paths:
        for at_end in (False, True):
            p = Point(L.coords[-1] if at_end else L.coords[0])
            if p.distance(W.boundary) <= 4.0 or p.within(W):
                ends.append((osm, L, at_end, p))
    used = set()
    P15 = unary_union([L.buffer(1.5) for _, L in paths])
    for i, (oa, La, ea, pa) in enumerate(ends):
        best = None
        for j, (ob, Lb, eb, pb) in enumerate(ends):
            if j <= i or oa == ob or (i in used) or (j in used):
                continue
            d = pa.distance(pb)
            if d < 1.0 or d > JOIN_MAX:
                continue
            seg = LineString([pa, pb])
            if seg.intersection(W).length < 0.5:      # the gap is not over water
                continue
            ux, uy = (pb.x - pa.x) / d, (pb.y - pa.y) / d
            da, db = leg_dir(La, ea), leg_dir(Lb, eb)
            ang_a = math.degrees(math.acos(max(-1, min(1, da[0] * ux + da[1] * uy))))
            ang_b = math.degrees(math.acos(max(-1, min(1, -(db[0] * ux + db[1] * uy)))))
            if ang_a > JOIN_ANGLE or ang_b > JOIN_ANGLE:
                continue
            if any(seg.crosses(L) for _, L in paths if L not in (La, Lb)):
                continue
            # already joined: an existing path (an OSM bridge) runs along the gap
            if seg.difference(P15).length < min(2.0, 0.3 * d):
                continue
            if best is None or d < best[0]:
                best = (d, j, seg, ob, ang_a, ang_b)
        if best:
            d, j, seg, ob, aa, ab = best
            used |= {i, j}
            joins.append({"id": f"bridge_{oa}_{ob}", "geom": seg, "from": oa, "to": ob, "m": round(d, 1),
                          "over_water_m": round(seg.intersection(W).length, 1)})

    cutters = [L.buffer(PATH_CUT) for _, L in paths] + [j["geom"].buffer(PATH_CUT, cap_style="flat") for j in joins] \
        + [L.buffer(w) for _, L, w in roads]
    C = unary_union(cutters)
    cuts = []
    for f, g in water:
        if not g.intersects(C):
            continue
        ng = g.buffer(0).difference(C)
        lost = g.area - ng.area
        if lost < MIN_CUT:      # a few pixels where a path brushes the shore: not worth a rebuild
            continue
        ng = unary_union([p for p in (ng.geoms if ng.geom_type == "MultiPolygon" else [ng]) if p.area > 2.0])
        cuts.append({"osm": f["properties"]["osm"], "feature": f, "geom": ng, "lost_m2": round(lost, 1),
                     "parts": len(ng.geoms) if ng.geom_type == "MultiPolygon" else 1})
    return {"course": cid, "cuts": cuts, "joins": joins, "to_deg": to_deg, "cfg": cfg, "edits": edits}


def write(p: dict) -> None:
    cid = p["course"]
    cdir = ROOT / "data" / cid
    to_deg = p["to_deg"]
    out = []
    red = set(p["cfg"].get("red_water_osm") or [])
    for c in p["cuts"]:
        f = c["feature"]
        t = dict(tags_of(f))
        t["source"] = (t.get("source", "OSM") + f"; cart paths over it cut out ({TAG}, developer 2026-11-14)")
        g = c["geom"]
        # one feature per piece: s10 writes only the largest piece of a multi-part penalty area into
        # course.json (the relief areas), so each piece left by a cut is its own penalty area; a
        # red_water_osm feature stays whole (s10 splits those itself, and the config lists its id)
        parts = [g] if c["osm"] in red or g.geom_type == "Polygon" else sorted(g.geoms, key=lambda q: -q.area)
        c["ids"] = []
        for k, part in enumerate(parts):
            pid = c["osm"] + SUFFIX + ("" if k == 0 else f"_{k + 1}")
            c["ids"].append(pid)
            out.append({"type": "Feature", "properties": {"osm": pid, "kind": f["properties"]["kind"], "tags": t},
                        "geometry": mapping(to_deg(part))})
    for j in p["joins"]:
        out.append({"type": "Feature", "properties": {"osm": j["id"], "kind": "cartpath", "tags": {
            "golf": "cartpath", "highway": "path", "bridge": "yes",
            "source": f"joins the OSM path ends of {j['from']} and {j['to']} across the water ({TAG}, developer 2026-11-14)"}},
            "geometry": mapping(to_deg(j["geom"]))})
    ed = p["edits"]
    ed["add"] = [e for e in ed.get("add", []) if e.get("tool") != TAG]
    ed["drop"] = [e for e in ed.get("drop", []) if e.get("tool") != TAG]
    if out:
        (cdir / "proposed").mkdir(exist_ok=True)
        json.dump({"type": "FeatureCollection", "features": out}, open(cdir / "proposed/bridges.geojson", "w"), indent=1)
        ed["add"].append({"from": "proposed/bridges.geojson", "ids": [f["properties"]["osm"] for f in out], "tool": TAG,
                          "reason": "developer 2026-11-14: cart paths no longer run into the water; the water with the "
                                    "paths over it cut out (bridges are cart path, as at Burlington), and bridges joining "
                                    "path ends that face each other across it"})
        for c in p["cuts"]:
            ed["drop"].append({"osm": c["osm"], "tool": TAG, "reason": f"replaced by {', '.join(c['ids'])} (the cart paths over it cut out)"})
    for k in ("add", "drop"):
        if not ed[k]:
            del ed[k]
    path = cdir / "edits.json"
    raw = open(path).read() if path.exists() else "{}\n"
    import re
    m = re.search(r'\n( +)"', raw)
    path.write_text(json.dumps(ed, indent=len(m.group(1)) if m else 1, ensure_ascii=False) + "\n")
    # checks.json (course_play.test.ts) lists the course's penalty areas by id: the pieces replace the
    # original; its "count" is set from the rebuilt course.json by the caller
    ck = cdir / "checks.json"
    if ck.exists():
        txt = ck.read_text()
        for c in p["cuts"]:
            txt = txt.replace(f'"{c["osm"]}"', ", ".join(f'"{i}"' for i in c["ids"]))
        ck.write_text(txt)
    # the water's id where the config lists it (red_water_osm, join_boundary ...)
    cfg_path = cdir / "course_config.json"
    txt = cfg_path.read_text()
    for c in p["cuts"]:
        txt = txt.replace(f'"{c["osm"]}"', f'"{c["osm"] + SUFFIX}"')
    cfg_path.write_text(txt)


def main(argv: list[str]) -> None:
    dry = "--dry" in argv
    for cid in [a for a in argv if not a.startswith("--")]:
        p = plan(cid)
        print(f"[bridges] {cid}: {len(p['cuts'])} penalty areas cut, {len(p['joins'])} bridges joined")
        for c in p["cuts"]:
            print(f"    cut {c['osm']}: {c['lost_m2']} m2 of path out, {c['parts']} part(s) left")
        for j in p["joins"]:
            print(f"    join {j['from']} -> {j['to']}: {j['m']} m ({j['over_water_m']} m over water)")
        if not dry and (p["cuts"] or p["joins"]):
            write(p)


if __name__ == "__main__":
    main(sys.argv[1:])

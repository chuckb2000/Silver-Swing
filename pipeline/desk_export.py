"""Course-chat tool (not a `make course` step): write the data for the tracing
desk (pipeline/desk/index.html), the page where the developer corrects traced
shapes and marks tee boxes over the orthophoto.

    python3 desk_export.py <course> OUT_DIR [--edit 9-18]

Run after s02 (and propose_trace.py / desk_to_proposed.py if the course has
traces). For every hole it writes OUT_DIR/img/holeNN.jpg (the orthophoto from
trace_spec.json "ortho", cropped around the hole line, its tee area 110 m back
and the green) and OUT_DIR/holes.json with, per hole: par, Blue and White card
yardages, the crop box in local metres, the hole line, the green centre, the
editable shapes (the developer's last saved shapes from data/<id>/desk/, else
the course chat's approved/traced shapes for holes in --edit), reference
outlines (every other green/fairway/bunker/tee, and lidar tee pads from
proposed/tees_lidar.geojson) and the boundary. Holes outside --edit get only a
Blue tee to mark. Publish OUT_DIR with the page (index.html + holes.json +
img/) as a claude.ai artifact with capabilities {db: {}, user: {}}; the page
saves each hole to the `holes/<n>` document, which the course chat reads back
into data/<id>/desk/hole<NN>.json.

For a course built from OSM (Oregon Golf Club), two options:
  --edit-osm 9      the OSM greens, fairways and bunkers of these holes (within
                    25 m of the hole line) become editable shapes, keeping their
                    OSM ids; data/<id>/desk_offered.json lists them, and
                    desk_to_proposed.py replaces them with what the developer saves.
  --area range      adds a "range" page (chip R) with the course's driving range
                    polygon editable (kind "range"), saved as `holes/range`.
"ortho" in trace_spec.json may be any RGB GeoTIFF on the course EPSG (an
orthophoto, or a lidar relief picture until one is available).
"""
from __future__ import annotations

import argparse
import csv
import glob
import json
import warnings
from pathlib import Path

import geopandas as gpd
import numpy as np
from PIL import Image
from shapely.geometry import Point, box as sbox
from shapely.ops import unary_union

from common import World, build_dir, course_dir, load_config
from propose_trace import Ortho

warnings.filterwarnings("ignore")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("course")
    ap.add_argument("out")
    ap.add_argument("--edit", default="", help="holes whose shapes are editable, e.g. 9-18 or 9,11,12")
    ap.add_argument("--edit-osm", default="", help="holes whose OSM greens/fairways/bunkers are editable (OSM courses)")
    ap.add_argument("--area", default="", help="extra pages: 'range' = the driving range")
    ap.add_argument("--traced", action="store_true",
                    help="start from proposed/traced.geojson: its hole lines and greens where the layout has none, and its "
                         "greens, tees and bunkers (each bunker to its nearest hole line) as the editable shapes of --edit holes "
                         "not yet saved in the desk (Waverley, where OSM maps no holes)")
    a = ap.parse_args()
    name, out = a.course, Path(a.out)
    cfg = load_config(name)
    world = World(cfg)
    cdir, bdir = course_dir(name), build_dir(name)
    spec = json.load(open(cdir / "trace_spec.json"))
    edit = set()
    for part in filter(None, a.edit.split(",")):
        lo, _, hi = part.partition("-")
        edit |= {str(n) for n in range(int(lo), int(hi or lo) + 1)}
    edit_osm = set()
    for part in filter(None, a.edit_osm.split(",")):
        lo, _, hi = part.partition("-")
        edit_osm |= {str(n) for n in range(int(lo), int(hi or lo) + 1)}
    o = Ortho(cdir / spec["ortho"], world)
    img = np.clip(o.rgb, 0, 255).astype(np.uint8)
    g = gpd.read_file(bdir / "course_local.geojson")
    g["tg"] = [t if isinstance(t, dict) else json.loads(t) for t in g["tags"]]
    card = {r["hole"]: r for r in csv.DictReader(open(cdir / "scorecard.csv"))}
    saved = {}
    for f in glob.glob(str(cdir / "desk" / "hole*.json")):
        d = json.load(open(f))
        saved[str(d["hole"])] = d["features"]
    pads = []
    if (cdir / "proposed" / "tees_lidar.geojson").exists():
        p = gpd.read_file(cdir / "proposed" / "tees_lidar.geojson").to_crs(cfg["epsg"])
        pads = list(p.geometry.translate(-world.x0, -world.y0))
    ring = lambda geom: [[round(x, 1), round(y, 1)] for x, y in list(geom.exterior.coords)[:-1]]  # noqa: E731
    lines = {str(r.tg.get("ref")): r.geometry for _, r in g[g.kind == "hole"].iterrows()}
    greens = g[g.kind == "green"]
    traced = {}
    if a.traced:
        import pandas as pd
        t = gpd.read_file(cdir / "proposed" / "traced.geojson").to_crs(cfg["epsg"])
        t["geometry"] = t.geometry.translate(-world.x0, -world.y0)
        t = t.set_crs(g.crs, allow_override=True)  # local metres, labelled like course_local.geojson
        t["tg"] = [x if isinstance(x, dict) else json.loads(x) for x in t["tags"]]
        for _, r in t[t.kind == "hole"].iterrows():
            lines.setdefault(str(r.tg.get("ref")), r.geometry)
        greens = pd.concat([greens, t[t.kind == "green"]])
        for _, r in t.iterrows():
            if r.kind == "green":
                k = str(r.tg.get("hole"))
            elif r.kind == "tee":
                k = str(r.osm).split("_")[2]           # tr_tee_<hole>_<i>
            elif r.kind == "bunker":
                k = min(lines, key=lambda h: lines[h].distance(r.geometry))
            else:
                continue
            traced.setdefault(k, []).append({"id": r.osm, "kind": r.kind, "poly": ring(r.geometry)})
    bnd = g[g.kind == "boundary"].geometry.iloc[0]
    (out / "img").mkdir(parents=True, exist_ok=True)
    holes = []
    offered = {}
    units = (f"local metres, origin {world.x0:.0f} E {world.y0:.0f} N, EPSG:{cfg['epsg']}"
             if (edit_osm or a.area or a.traced) else None)  # the page's default is Indian Island's
    for k in sorted(lines, key=int):
        L = lines[k]
        c = list(L.coords)
        gc = greens.loc[greens.distance(Point(c[-1])).idxmin()].geometry
        (ax, ay), (bx, by) = c[0], c[1]
        ln = np.hypot(bx - ax, by - ay)
        back = Point(ax - (bx - ax) / ln * 110, ay - (by - ay) / ln * 110)
        b = unary_union([L.buffer(30), back.buffer(30), gc.buffer(30)]).bounds
        bx0 = [max(int(b[0]), 0), max(int(b[1]), 0), min(int(b[2]) + 1, int(world.width)), min(int(b[3]) + 1, int(world.height))]
        c0, r0 = int(bx0[0] / o.res), int((o.top - bx0[3]) / o.res)
        c1, r1 = int(bx0[2] / o.res), int((o.top - bx0[1]) / o.res)
        s = min(1.0, 1900 / max(c1 - c0, r1 - r0))
        crop = Image.fromarray(img[r0:r1, c0:c1])
        crop = crop.resize((int(crop.width * s), int(crop.height * s)), Image.LANCZOS)
        fn = f"img/hole{int(k):02d}.jpg"
        crop.save(out / fn, "JPEG", quality=84)
        own = lambda r: str(r.osm).startswith("desk_") and r.tg.get("hole") == k  # noqa: E731
        if k in edit_osm:
            # OSM shapes of this hole: greens, fairways and bunkers within 25 m of its line
            near = L.buffer(25)
            own = lambda r, near=near: (r.kind in ("green", "fairway", "bunker") and r.geometry.geom_type == "Polygon"  # noqa: E731
                                        and r.geometry.intersects(near) and not str(r.osm).startswith("desk_"))
            offered[k] = [r.osm for _, r in g.iterrows() if own(r)]
        if k in saved:
            feats = saved[k]
        elif k in edit or k in edit_osm:
            feats = [{"id": r.osm, "kind": r.kind, "poly": ring(r.geometry)} for _, r in g.iterrows()
                     if own(r) and r.kind in ("green", "fairway", "bunker", "tee")]
            if not feats and a.traced:
                feats = traced.get(k, [])
        else:
            feats = []
        clip = sbox(*bx0)
        refs = [{"kind": r.kind, "poly": ring(r.geometry)} for _, r in g.iterrows()
                if r.kind in ("green", "fairway", "bunker", "tee") and r.geometry.intersects(clip) and not own(r)]
        refs += [{"kind": "pad", "poly": ring(p)} for p in pads if p.intersects(clip)]
        bl = bnd.boundary.intersection(clip.buffer(5))
        blines = [[[round(x, 1), round(y, 1)] for x, y in ln_.coords] for ln_ in getattr(bl, "geoms", [bl]) if ln_.geom_type == "LineString"]
        holes.append({"hole": k, "par": int(card[k]["par"]), "blue": int(card[k].get("blue") or 0), "white": int(card[k].get("white") or 0),
                      "box": bx0, "w": crop.width, "h": crop.height, "img": fn,
                      "line": [[round(x, 1), round(y, 1)] for x, y in c], "greenCenter": [round(gc.centroid.x, 1), round(gc.centroid.y, 1)],
                      "features": feats, "refs": refs, "boundary": blines, "editShapes": k in edit or k in edit_osm,
                      **({"units": units} if units else {}), **({"noBlue": True} if k in edit_osm else {})})
    if "range" in a.area.split(","):
        rng = g[g.kind == "driving_range"]
        b = unary_union(list(rng.geometry)).buffer(60).bounds
        bx0 = [max(int(b[0]), 0), max(int(b[1]), 0), min(int(b[2]) + 1, int(world.width)), min(int(b[3]) + 1, int(world.height))]
        c0, r0 = int(bx0[0] / o.res), int((o.top - bx0[3]) / o.res)
        c1, r1 = int(bx0[2] / o.res), int((o.top - bx0[1]) / o.res)
        s = min(1.0, 1900 / max(c1 - c0, r1 - r0))
        crop = Image.fromarray(img[r0:r1, c0:c1])
        crop = crop.resize((int(crop.width * s), int(crop.height * s)), Image.LANCZOS)
        crop.save(out / "img" / "range.jpg", "JPEG", quality=84)
        offered["range"] = list(rng.osm)
        clip = sbox(*bx0)
        if "range" in saved:
            feats = saved["range"]
        else:
            feats = []
            for _, r in rng.iterrows():
                for i, part in enumerate(getattr(r.geometry, "geoms", [r.geometry])):
                    feats.append({"id": r.osm if i == 0 else f"{r.osm}:{i}", "kind": "range", "poly": ring(part),
                                  **({"holes": [[[round(x, 1), round(y, 1)] for x, y in list(hr.coords)[:-1]] for hr in part.interiors]} if part.interiors else {})})
        refs = [{"kind": r.kind, "poly": ring(r.geometry)} for _, r in g.iterrows()
                if r.kind in ("green", "fairway", "bunker", "tee") and r.geometry.geom_type == "Polygon" and r.geometry.intersects(clip)]
        bl = bnd.boundary.intersection(clip.buffer(5))
        blines = [[[round(x, 1), round(y, 1)] for x, y in ln_.coords] for ln_ in getattr(bl, "geoms", [bl]) if ln_.geom_type == "LineString"]
        holes.append({"hole": "range", "label": "Range", "area": True, "par": 0, "blue": 0, "white": 0, "box": bx0,
                      "w": crop.width, "h": crop.height, "img": "img/range.jpg", "line": [], "greenCenter": [0, 0],
                      "features": feats, "refs": refs, "boundary": blines, "editShapes": True, "noBlue": True,
                      **({"units": units} if units else {})})
    if offered:
        json.dump(offered, open(cdir / "desk_offered.json", "w"), indent=1)
    json.dump(holes, open(out / "holes.json", "w"), separators=(",", ":"))
    print(f"[desk] {len(holes)} holes -> {out}/holes.json + img/ (editable shapes on holes {sorted(edit, key=int)})")


if __name__ == "__main__":
    main()

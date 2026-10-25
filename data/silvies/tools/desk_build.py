"""Course-chat tool: the tracing-desk data for Silvies' three layouts in one page.

    python3 data/silvies/tools/desk_build.py OUT_DIR      (after make_routing.py, propose_tees.py)

pipeline/desk_export.py keys its pages by hole number, one routing per course; Silvies has
three layouts sharing greens, so this writes holes.json for pipeline/desk/index.html with
page keys C1-C18 (Craddock), H1-H18 (Hankins) and E1-E9 (Chief Egan). Each page has the
proposed line of play (proposed/routing.json), the card yardage of the set built (Craddock Challenge,
Hankins White, Chief Egan White: the club maps' back tees) and the Grey yardage, every OSM green,
fairway, bunker and tee and every lidar pad as dashed references, the grown boundary,
and, where a mown OSM pad or a lidar pad matches the Grey card within 8 % along the
line, that pad pre-filled as the Grey tee for the developer to keep or move.
Saves come back as `holes/<key>` documents (read back into data/silvies/desk/).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import from_bounds
from shapely.geometry import LineString, Point, box as sbox
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parents[1]
YD = 0.9144
cfg = json.load(open(HERE / "course_config.json"))
X0, Y0 = cfg["world"]["x0"], cfg["world"]["y0"]
out = Path(sys.argv[1])
(out / "img").mkdir(parents=True, exist_ok=True)

g = gpd.read_file(HERE / "build" / "course_local.geojson")
g["tg"] = [t if isinstance(t, dict) else json.loads(t) for t in g["tags"]]
lid = gpd.read_file(HERE / "proposed" / "tees_lidar.geojson").to_crs(cfg["epsg"])
lid["geometry"] = lid.geometry.translate(-X0, -Y0)
grown = gpd.read_file(HERE / "proposed" / "boundary_grown.geojson").to_crs(cfg["epsg"]).geometry.iloc[0]
from shapely.affinity import translate
grown = translate(grown, -X0, -Y0)
plan = json.load(open(HERE / "proposed" / "routing.json"))
cards = {"silvies_craddock": "scorecard_craddock.csv", "silvies_hankins": "scorecard_hankins.csv", "silvies_chief_egan": "scorecard_chief_egan.csv"}
KEY = {"silvies_craddock": "C", "silvies_hankins": "H", "silvies_chief_egan": "E"}
NAME = {"silvies_craddock": "Craddock", "silvies_hankins": "Hankins", "silvies_chief_egan": "Chief Egan"}
pads = [(r.osm, r.geometry) for _, r in g.iterrows() if (r.kind == "fairway" and r.geometry.area < 700) or r.kind == "tee"]
pads += [(r.osm, r.geometry) for _, r in lid.iterrows()]
ring = lambda geom: [[round(x, 1), round(y, 1)] for x, y in list(geom.exterior.coords)[:-1]]  # noqa: E731

src = rasterio.open(HERE / cfg["ortho"]["path"])
BOXES = {}
if (HERE / "proposed" / "tee_boxes.geojson").exists():
    tbx = gpd.read_file(HERE / "proposed" / "tee_boxes.geojson").to_crs(cfg["epsg"])
    for _, r in tbx.iterrows():
        tg = r.tags if isinstance(r.tags, dict) else json.loads(r.tags)
        BOXES[{"silvies_craddock": "C", "silvies_hankins": "H", "silvies_chief_egan": "E"}[tg["layout"]] + tg["hole"]] = translate(r.geometry, -X0, -Y0)


def measure(pts, tee):
    L = LineString(pts)
    s0 = L.project(Point(tee))
    path, acc = [tee], 0.0
    for i in range(1, len(pts) - 1):
        acc += Point(pts[i]).distance(Point(pts[i - 1]))
        if acc > s0 + 1:
            path.append(pts[i])
    path.append(pts[-1])
    return sum(Point(a).distance(Point(b)) for a, b in zip(path, path[1:])) / YD


ROUND2 = None
if (HERE / "desk" / "accepted_boxes.json").exists():
    ROUND2 = set(json.load(open(HERE / "desk" / "accepted_boxes.json"))["round2"])   # only these pages still need a box
holes = []
for lay, hs in plan.items():
    card = {r["hole"]: r for r in csv.DictReader(open(HERE / cards[lay]))}
    for n, h in hs.items():
        if n == "_map_fit":
            continue
        if ROUND2 is not None and f"{KEY[lay]}{n}" not in ROUND2:
            continue
        pts = [tuple(p) for p in h["line"]]
        grey, back = h["grey"], h["back"]
        # pre-fill: the pad nearest the Grey card along the line, within 8 %
        best = None
        for o, p in pads:
            c = p.centroid
            if LineString(pts).distance(c) > 60 or c.distance(Point(pts[-1])) < 30:
                continue
            e = (measure(pts, (c.x, c.y)) - grey) / grey
            if abs(e) < 0.08 and (best is None or abs(e) < abs(best[1])):
                best = (o, e, p)
        feats = []
        saved_f = HERE / "desk" / f"{KEY[lay]}{n}.json"
        if saved_f.exists() and (HERE / "proposed" / "tee_boxes.geojson").exists():
            # round 2 (2026-10-25): the developer's saved mark plus the proposed tee box under it, editable
            feats = [f for f in json.load(open(saved_f))["features"] if f["kind"] == "bluetee"]
            tb = BOXES.get(f"{KEY[lay]}{n}")
            if tb is not None:
                feats.append({"id": f"box_{KEY[lay]}{n}", "kind": "tee", "poly": ring(tb)})
        elif best:
            feats.append({"id": f"grey_{KEY[lay]}{n}", "kind": "bluetee", "poly": ring(best[2].buffer(0.3).simplify(0.3))})
        G = Point(pts[-1])
        start = Point(pts[0])
        ax, ay = pts[0]
        bx, by = pts[1]
        ln = np.hypot(bx - ax, by - ay)
        behind = Point(ax - (bx - ax) / ln * 60, ay - (by - ay) / ln * 60)
        b = unary_union([LineString(pts).buffer(35), behind.buffer(35), G.buffer(35)]).bounds
        bx0 = [max(int(b[0]), 0), max(int(b[1]), 0), min(int(b[2]) + 1, cfg["world"]["width"]), min(int(b[3]) + 1, cfg["world"]["height"])]
        w = from_bounds(X0 + bx0[0], Y0 + bx0[1], X0 + bx0[2], Y0 + bx0[3], src.transform)
        s = min(1.0, 1900 / max((bx0[2] - bx0[0]) * 2, (bx0[3] - bx0[1]) * 2))
        W_, H_ = int((bx0[2] - bx0[0]) * 2 * s), int((bx0[3] - bx0[1]) * 2 * s)
        a = src.read(window=w, out_shape=(3, H_, W_), resampling=rasterio.enums.Resampling.lanczos)
        key = f"{KEY[lay]}{n}"
        fn = f"img/{key}.jpg"
        Image.fromarray(np.moveaxis(a, 0, 2)).save(out / fn, "JPEG", quality=84)
        clip = sbox(*bx0)
        refs = [{"kind": r.kind, "poly": ring(r.geometry)} for _, r in g.iterrows()
                if r.kind in ("green", "fairway", "bunker", "tee") and r.geometry.geom_type == "Polygon" and r.geometry.intersects(clip)]
        refs += [{"kind": "pad", "poly": ring(p)} for o, p in pads if str(o).startswith("lidar") and p.intersects(clip)]
        bl = grown.boundary.intersection(clip.buffer(5))
        blines = [[[round(x, 1), round(y, 1)] for x, y in l.coords] for l in getattr(bl, "geoms", [bl]) if l.geom_type == "LineString"]
        holes.append({"teeName": "Back", "refName": "Grey", "course": "Silvies Valley Ranch",
                      "photo": "OSIP 2024 photo",
                      "units": f"local metres, origin {X0:.0f} E {Y0:.0f} N, EPSG:{cfg['epsg']}",
                      "hole": key, "par": int(card[n]["par"]), "blue": grey, "white": back,
                      "box": bx0, "w": W_, "h": H_, "img": fn,
                      "line": [[round(x, 1), round(y, 1)] for x, y in pts],
                      "greenCenter": [round(G.x, 1), round(G.y, 1)],
                      "features": feats, "refs": refs, "boundary": blines, "editShapes": bool(BOXES)})
        print(key, NAME[lay], "par", card[n]["par"], "Grey", grey, "prefill", best[0] if best else "-", f"{best[1]*100:+.1f}%" if best else "")
json.dump(holes, open(out / "holes.json", "w"), separators=(",", ":"))
print(f"{len(holes)} pages -> {out}/holes.json")

"""The Muni tree tracer: data for tree_desk/index.html, the page where the developer
marks the lidar trees to delete (developer, 2026-10-22: "a tree tracer ... so i can tell
you exactly which trees to delete"). Course-chat tool, not a `make course` step.

    python3 data/lake_oswego_muni/tree_desk/make_tree_desk.py OUT_DIR    # after make course

Writes OUT_DIR/data.json (every tree in the exported game/public/courses/<id>/trees.json
within the view, the holes' tee and green points, the boundary) and two pictures of the
same view: img/photo.jpg (the OSIP 2024 orthophoto) and img/game.jpg (the game's ground art,
build/art/terrain.png; the game draws trees on top of it, the page draws them as circles).
Copy index.html next to them and publish OUT_DIR as an artifact with {db: {}, user: {}}.
The page saves the developer's marks to the database document `marks/current`; the
course chat turns them into course_config.json `drop_trees` entries (exact tree points,
so s05 finds each one within its 2 m search).
"""
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image

HERE = Path(__file__).resolve().parent
CDIR = HERE.parent
ROOT = CDIR.parent.parent
VIEW = (150, 270, 620, 670)   # local metres: the course, the range and a margin


def main():
    out = Path(sys.argv[1])
    (out / "img").mkdir(parents=True, exist_ok=True)
    cfg = json.load(open(CDIR / "course_config.json"))
    W, H = cfg["world"]["width"], cfg["world"]["height"]
    xa, ya, xb, yb = VIEW

    with rasterio.open(CDIR / cfg["ortho"]["path"]) as r:
        rgb = r.read().transpose(1, 2, 0)
        res = r.res[0]
    crop = rgb[int((H - yb) / res):int((H - ya) / res), int(xa / res):int(xb / res)]
    Image.fromarray(crop).save(out / "img" / "photo.jpg", quality=86)
    art = Image.open(CDIR / "build" / "art" / "terrain.png").convert("RGB")      # 2 px/m, row 0 = north
    art.crop((xa * 2, (H - yb) * 2, xb * 2, (H - ya) * 2)).resize(
        (int((xb - xa) / res), int((yb - ya) / res)), Image.NEAREST).save(out / "img" / "game.jpg", quality=90)

    cdir = ROOT / "game" / "public" / "courses" / cfg["id"]
    t = json.load(open(cdir / "trees.json"))
    kinds = {0: "deciduous", 1: "conifer", 2: "flowering", 3: "shrub"}
    trees = []
    for x, y, h, r, c in zip(t["x"], t["y"], t["h"], t["r"], t["c"]):
        if xa - r <= x <= xb + r and ya - r <= y <= yb + r:
            trees.append({"id": f"{x:.2f},{y:.2f}", "x": round(x, 2), "y": round(y, 2), "h": round(h, 1),
                          "r": round(r, 2), "t": kinds.get(c, "tree")})
    course = json.load(open(cdir / "course.json"))
    holes = [{"n": h["number"], "par": h["par"], "tee": [h["tees"][cfg["default_tee"]]["x"], h["tees"][cfg["default_tee"]]["y"]],
              "green": h["greenCenter"]} for h in course["holes"]]
    g = gpd.read_file(CDIR / "build" / "course_local.geojson")
    bnd = g[g.kind == "boundary"].geometry.iloc[0]
    data = {"course": cfg["name"], "view": VIEW, "res": res, "trees": trees, "holes": holes,
            "boundary": [[round(x, 1), round(y, 1)] for x, y in bnd.exterior.coords],
            "inside": [bool(bnd.buffer(2).contains(__import__("shapely").geometry.Point(tr["x"], tr["y"]))) for tr in trees]}
    json.dump(data, open(out / "data.json", "w"), separators=(",", ":"))
    print(f"[tree_desk] {len(trees)} trees ({sum(data['inside'])} inside the boundary) -> {out}")


if __name__ == "__main__":
    main()

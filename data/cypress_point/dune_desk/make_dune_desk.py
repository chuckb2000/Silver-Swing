"""Data for the dune desk (dune_desk/index.html): the page where the developer corrects the
traced dune sand over the NAIP photo (developer, 2026-10-24: option a). Course-chat tool,
not a `make course` step.

    python3 data/cypress_point/make_dunes.py
    python3 data/cypress_point/dune_desk/make_dune_desk.py OUT_DIR

Writes OUT_DIR/img/photo.jpg (the NAIP mosaic over the boundary + 40 m, 0.5 m) and
OUT_DIR/data.json (local metres: the view, every traced dune shape, the hole lines, greens,
fairways and bunkers as references, the boundary). Copy index.html next to them and publish
OUT_DIR as an artifact with {db: {}, user: {}}. The page saves to the database document
`dunes/current`: {dropped: [ids], edited: {id: [[x, y], ...]}, added: [[[x, y], ...]]};
read_dune_desk.py turns that into proposed/dunes_approved.geojson.
"""
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import pyproj
import rasterio
from PIL import Image
from shapely.geometry import box, shape
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
CDIR = HERE.parent
cfg = json.load(open(CDIR / "course_config.json"))
w = cfg["world"]
out = Path(sys.argv[1])
(out / "img").mkdir(parents=True, exist_ok=True)

g = gpd.read_file(CDIR / "build" / "course_local.geojson")
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
bnd = g[g.osm == "w36435651"].geometry.iloc[0]
xa, ya, xb, yb = [round(v) for v in bnd.buffer(40).bounds]
with rasterio.open(CDIR / cfg["ortho"]["path"]) as src:
    win = rasterio.windows.from_bounds(xa + w["x0"], ya + w["y0"], xb + w["x0"], yb + w["y0"], src.transform)
    a = np.moveaxis(src.read(window=win), 0, 2)
Image.fromarray(a).save(out / "img" / "photo.jpg", quality=82, optimize=True)

r = lambda v: round(v, 1)
to_local = pyproj.Transformer.from_crs(4326, cfg["epsg"], always_xy=True).transform
dunes = []
for f in json.load(open(CDIR / "proposed" / "dunes.geojson"))["features"]:
    geom = transform(lambda x, y, z=None: (x - w["x0"], y - w["y0"]), transform(to_local, shape(f["geometry"])))
    if not geom.intersects(box(xa, ya, xb, yb)):
        continue
    dunes.append({"id": f["id"], "in": f["properties"]["kind"] == "bunker", "area": round(geom.area),
                  "ring": [[r(x), r(y)] for x, y in geom.exterior.coords][:-1],
                  "holes": [[[r(x), r(y)] for x, y in h.coords][:-1] for h in geom.interiors]})


def rings(kind):
    res = []
    for geom in g[g.kind == kind].geometry:
        for p in getattr(geom, "geoms", [geom]):
            if p.geom_type == "Polygon" and p.intersects(bnd.buffer(60)):
                res.append([[r(x), r(y)] for x, y in p.simplify(0.3).exterior.coords][:-1])
    return res


holes = []
for _, h in g[g.kind == "hole"].iterrows():
    if h.geometry.intersection(bnd.buffer(30)).length / h.geometry.length > 0.5:
        holes.append({"n": int(h.tags["ref"]), "par": int(h.tags.get("par", 0)),
                      "line": [[r(x), r(y)] for x, y in h.geometry.coords]})
data = {"course": cfg["name"], "view": [xa, ya, xb, yb], "res": 0.5, "dunes": dunes,
        "holes": sorted(holes, key=lambda h: h["n"]),
        "greens": rings("green"), "fairways": rings("fairway"), "bunkers": rings("bunker"), "tees": rings("tee"),
        "boundary": [[r(x), r(y)] for x, y in bnd.exterior.coords][:-1]}
json.dump(data, open(out / "data.json", "w"), separators=(",", ":"))
print(f"{len(dunes)} dune shapes, photo {a.shape[1]} x {a.shape[0]} px, data {(out / 'data.json').stat().st_size // 1024} KB")

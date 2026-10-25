"""Proposal (course chat, 2026-10-25): the small creek through Chief Egan.

The club's Chief Egan map draws a creek crossing at the 2nd tee (with a bridge) and running
between the top strip (holes 3-5) and holes 6-7 into the pond; on the OSIP 2024 photo it
is a dark wet strip there. OSM does not map it. The developer: "the creek is probably
really small and dry, if you include it then it should be quite small" (2026-10-25).

Its line comes from the bare-earth DEM, as at Langdon Farms (data/langdon/make_creek_line.py):
in a box round the strip (local x BOX), cells more than DEPTH below the 25 m running median
are channel; the longest piece running east-west is the creek, its line the piece's main
axis (pipeline/fairway_axis.py), simplified. The penalty area is that line widened to
WIDTH_M in all (quite small, as asked), red, `flatten=no` so s04 keeps its bed, carried on
from the channel's end to the pond's edge so it runs into the pond (developer), and
clipped off greens and tees.

Writes proposed/egan_creek.geojson (WGS84) and proposed/egan_creek.jpg (photo crop: the proposed penalty area in red, the OSM pond in blue).

    python3 data/silvies/make_egan_creek.py      (after s00-s02)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import shapes
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.geometry import LineString, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from fairway_axis import centreline  # noqa: E402

BOX = (1560, 560, 1790, 680)    # local metres round Chief Egan's middle
DEPTH = 0.2
MIN_SPAN_M = 60                 # the piece must run at least this far east-west
WIDTH_M = 2.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    x0w, y0w = cfg["world"]["x0"], cfg["world"]["y0"]
    xa, ya, xb, yb = BOX
    with rasterio.open(HERE / "build" / "dtm_1m.tif") as r:
        z = r.read(1, window=from_bounds(x0w + xa - 30, y0w + ya - 30, x0w + xb + 30, y0w + yb + 30, r.transform)).astype(float)
    rel = (z - ndimage.median_filter(z, size=25))[30:-30, 30:-30]
    ch = ndimage.binary_opening(ndimage.binary_closing(rel < -DEPTH, iterations=2), iterations=1)
    lab, n = ndimage.label(ch)
    tr = Affine(1, 0, xa, 0, -1, yb)
    pieces = []
    for k in range(1, n + 1):
        m = lab == k
        p = unary_union([shape(gm) for gm, v in shapes(m.astype(np.uint8), mask=m, transform=tr)])
        if p.bounds[2] - p.bounds[0] >= MIN_SPAN_M:
            pieces.append((int(m.sum()), p, float(np.median(-rel[m]))))
    if not pieces:
        raise SystemExit("no channel piece found")
    a, p, dep = max(pieces, key=lambda t: t[0])
    ax = centreline(p, res=0.5)
    line = LineString(ax).simplify(1.0)
    # the creek runs into the pond (developer 2026-10-25: "make sure the red connects to the
    # lake"): carry the line on from its end nearer the pond to the pond's edge, plus 1 m in
    g0 = gpd.read_file(HERE / "build" / "course_local.geojson")
    pond = min((r.geometry for _, r in g0[g0.kind == "lateral_water_hazard"].iterrows()), key=lambda q: q.distance(line))
    from shapely.geometry import Point
    from shapely.ops import nearest_points
    c = list(line.coords)
    if Point(c[0]).distance(pond) < Point(c[-1]).distance(pond):
        c = c[::-1]
    q = nearest_points(Point(c[-1]), pond.boundary)[1]
    v = np.array([q.x - c[-1][0], q.y - c[-1][1]])
    v = v / (np.linalg.norm(v) or 1)
    line = LineString(c + [(q.x + v[0], q.y + v[1])])
    print(f"  carried {Point(c[-1]).distance(q):.0f} m on to the pond")
    print(f"  channel {a} m2, bounds {[round(v) for v in p.bounds]}, median depth {dep:.2f} m; line {line.length:.0f} m")
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    keep_off = unary_union(list(g[g.kind.isin(["green", "tee"])].geometry.buffer(1.0)))
    area = line.buffer(WIDTH_M / 2, cap_style=2).difference(keep_off)
    if area.geom_type == "MultiPolygon":
        area = unary_union([q for q in area.geoms if q.area > 10])
    print(f"  penalty area {area.area:.0f} m2 ({WIDTH_M} m wide)")
    out = gpd.GeoDataFrame([{"osm": "egan_creek", "kind": "lateral_water_hazard",
                             "tags": json.dumps({"golf": "lateral_water_hazard", "penalty": "red", "flatten": "no",
                                                 "name": "creek (Chief Egan)", "source": "lidar DEM channel (make_egan_creek.py)"})}],
                           geometry=[area], crs=None)
    out = out.set_geometry(out.geometry.translate(x0w, y0w)).set_crs(cfg["epsg"]).to_crs(4326)
    out.to_file(HERE / "proposed" / "egan_creek.geojson", driver="GeoJSON")
    area = area.difference(pond)  # the pond is its own penalty area already: the creek runs up to it
    if area.geom_type == "MultiPolygon":   # keep the strip that reaches the pond, drop slivers left by the pond's ragged edge
        area = unary_union([q for q in area.geoms if q.area > 25])
    # picture
    with rasterio.open(HERE / cfg["ortho"]["path"]) as s:
        w = from_bounds(x0w + xa, y0w + ya, x0w + xb, y0w + yb, s.transform)
        im = Image.fromarray(np.moveaxis(s.read(window=w, out_shape=(3, (yb - ya) * 4, (xb - xa) * 4)), 0, 2))
    d = ImageDraw.Draw(im)
    P = lambda x, y: ((x - xa) * 4, (yb - y) * 4)  # noqa: E731
    d.line([P(*c) for c in pond.exterior.coords], fill=(60, 150, 255), width=2)
    for q in getattr(area, "geoms", [area]):
        d.line([P(*c) for c in q.exterior.coords], fill=(255, 40, 40), width=3)
    im.save(HERE / "proposed" / "egan_creek.jpg", quality=88)


if __name__ == "__main__":
    main()

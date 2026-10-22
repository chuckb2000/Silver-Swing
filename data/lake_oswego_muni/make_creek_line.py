"""The Muni: the stream between hole 2's tee and green (developer, 2026-10-22, desk note on
hole 2: "there is a water hazard here ... It runs between the hole and the green",
from the lidar if possible). OSM maps the stream only north of the course
(way 1288988533, ending at the property line); on the course it is not mapped.

The line is taken from the lidar bare-earth DEM (2019; a natural channel the rebuild
kept, crossing the unmown wetland strip on the 2024 photo), not drawn by eye: in a box
around hole 2 (local x 230-410, y 490-665), cells more than DEPTH below the 25 m running
median are channel; the long diagonal pieces (MIN_DIAG_M) are the stream, each piece's
main axis (pipeline/fairway_axis.py) taken north end first and joined across the gaps
(tree roots and culverts break the channel), simplified.

Writes proposed/creek_lines.geojson (WGS84, one waterway=stream line `tr_creek_2`);
then `python3 pipeline/propose_channels.py lake_oswego_muni --lines=proposed/creek_lines.geojson
tr_creek_2` makes the penalty-area polygon from the channel along it.

Run from the repo root after s00-s02: python3 data/lake_oswego_muni/make_creek_line.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from rasterio.features import shapes
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.geometry import LineString, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from fairway_axis import centreline  # noqa: E402

BOX = (230, 490, 410, 665)    # local metres around hole 2
DEPTH = 0.25                  # m below the running median (as propose_channels.py)
PIECES = 4                    # at most this many pieces
MIN_DIAG_M = 38               # a piece's bounding box must be at least this long corner to corner: the
                              # stream's pieces are long and diagonal (119 m and 41 m); the two left out
                              # are round hollows 28-33 m across (beside hole 5's green and west of hole 3)


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
        p = unary_union([shape(g) for g, v in shapes(m.astype(np.uint8), mask=m, transform=tr)])
        if np.hypot(p.bounds[2] - p.bounds[0], p.bounds[3] - p.bounds[1]) >= MIN_DIAG_M:
            pieces.append((int(m.sum()), p, float(np.median(-rel[m]))))
    pieces = sorted(pieces, key=lambda t: -t[0])[:PIECES]
    # each piece's main axis, north end first, joined across the gaps between them (the
    # creek runs under the cart path in a culvert there)
    axes = []
    for _, p, _ in pieces:
        ax = centreline(p, res=0.5)
        if ax[0][1] < ax[-1][1]:
            ax = ax[::-1]
        axes.append(ax)
    axes.sort(key=lambda ax: -ax[0][1])
    line = LineString(np.vstack(axes)).simplify(1.0)
    for a, p, dep in pieces:
        print(f"  channel piece {a} m2, bounds {[round(v) for v in p.bounds]}, median depth {dep:.2f} m")
    print(f"  creek line {line.length:.0f} m from {tuple(round(c) for c in line.coords[0])} to {tuple(round(c) for c in line.coords[-1])}")
    g = gpd.GeoDataFrame([{"osm": "tr_creek_2", "kind": "waterway",
                           "tags": json.dumps({"waterway": "stream", "name": "stream on hole 2",
                                               "source": "lidar DEM channel (data/lake_oswego_muni/make_creek_line.py)"})}],
                         geometry=[LineString([(x + x0w, y + y0w) for x, y in line.coords])], crs=cfg["epsg"]).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    g.to_file(HERE / "proposed" / "creek_lines.geojson", driver="GeoJSON")


if __name__ == "__main__":
    main()

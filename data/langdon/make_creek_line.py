"""Langdon Farms: the creek along hole 7 (developer, 2026-10-20: "a creek on hole 7
that splits the two fairways"), which OSM does not map at all.

The creek's line is taken from the lidar bare-earth DEM, not drawn by eye: in a box
around hole 7 (local x 740-880, y 830-1300), cells more than DEPTH below the 25 m
running median are channel; the largest piece (from past the green up the east side
of the fairway, about 0.6 m deep) is the creek, and its line is that piece's main axis
(longest path through the medial axis, pipeline/fairway_axis.py), simplified.

Writes proposed/creek_lines.geojson (WGS84, one waterway=stream line `tr_creek_7`);
then `python3 pipeline/propose_channels.py langdon --lines=proposed/creek_lines.geojson
tr_creek_7` makes the penalty-area polygon from the channel along it.

Run from the repo root after s00-s02: python3 data/langdon/make_creek_line.py
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

BOX = (740, 830, 880, 1300)   # local metres around hole 7
DEPTH = 0.25                  # m below the running median (as propose_channels.py)
PIECES = 1                    # the largest channel piece is the creek (the next one, y 1097-1158,
                              # runs right along the cart path and into a bunker: a path-side swale, left out)
MIN_SPAN_M = 40               # a piece must run at least this far north-south


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
        if p.bounds[3] - p.bounds[1] >= MIN_SPAN_M:
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
    g = gpd.GeoDataFrame([{"osm": "tr_creek_7", "kind": "waterway",
                           "tags": json.dumps({"waterway": "stream", "name": "creek on hole 7",
                                               "source": "lidar DEM channel (data/langdon/make_creek_line.py)"})}],
                         geometry=[LineString([(x + x0w, y + y0w) for x, y in line.coords])], crs=cfg["epsg"]).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    g.to_file(HERE / "proposed" / "creek_lines.geojson", driver="GeoJSON")


if __name__ == "__main__":
    main()

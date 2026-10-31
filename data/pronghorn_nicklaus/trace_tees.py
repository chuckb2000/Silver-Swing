"""Tee boxes OSM doesn't map, traced from the OSIP 2024 photo (course chat, 2026-10-31):
for each seed (local metres), the connected patch of irrigated turf round it (smoothed
excess green 2G-R-B above EXG_MIN, within MAX_R of the seed) becomes the box outline.
Writes proposed/traced_tees.geojson (WGS84) with golf=tee, hole, tee_set, source=osip2024.

    python3 data/pronghorn_nicklaus/trace_tees.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio import features
from scipy import ndimage
from shapely.geometry import Point, shape

HERE = Path(__file__).resolve().parent
EXG_MIN = 50.0
MAX_R = 18.0
# hole, tee sets, seed (local metres): the seed is the OSM hole line's start
SEEDS = [
    {"id": "trace_tee_18", "hole": 18, "tee_set": "Blue;Black", "seed": [1103.0, 238.0],
     "why": "OSM's 18 line starts on a small unmapped tee pad south of the pond (the 18 tees OSM maps are forward ones)"},
]

cfg = json.load(open(HERE / "course_config.json"))
X0, Y0 = cfg["world"]["x0"], cfg["world"]["y0"]
r = rasterio.open(HERE / cfg["ortho"]["path"])
img = r.read([1, 2, 3]).astype(float)
exg = ndimage.uniform_filter(2 * img[1] - img[0] - img[2], 3)
rows = []
for s in SEEDS:
    sx, sy = s["seed"][0] + X0, s["seed"][1] + Y0
    col, row = ~r.transform * (sx, sy)
    col, row = int(col), int(row)
    turf = exg > EXG_MIN
    lab, _ = ndimage.label(turf)
    if not turf[row, col]:
        raise SystemExit(f"{s['id']}: the seed is not on turf (ExG {exg[row, col]:.0f})")
    patch = lab == lab[row, col]
    patch = ndimage.binary_opening(ndimage.binary_closing(patch, iterations=2), iterations=1)
    yy, xx = np.mgrid[0:patch.shape[0], 0:patch.shape[1]]
    res = r.transform.a
    patch &= np.hypot(xx - col, yy - row) * res <= MAX_R
    polys = [shape(gm) for gm, v in features.shapes(patch.astype(np.uint8), mask=patch, transform=r.transform) if v == 1]
    poly = max(polys, key=lambda p: p.area).buffer(0.25).buffer(-0.25).simplify(0.4)
    if not poly.contains(Point(sx, sy)):
        print(f"{s['id']}: warning, the seed is outside the traced outline")
    print(f"{s['id']}: {poly.area:.0f} m2, {poly.bounds[2]-poly.bounds[0]:.1f} x {poly.bounds[3]-poly.bounds[1]:.1f} m")
    rows.append({"osm": s["id"], "kind": "tee", "geometry": poly,
                 "tags": {"golf": "tee", "hole": str(s["hole"]), "tee_set": s["tee_set"],
                          "source": "osip2024 trace (trace_tees.py)", "note": s["why"]}})
gpd.GeoDataFrame(rows, crs=cfg["epsg"]).to_crs(4326).to_file(HERE / "proposed" / "traced_tees.geojson", driver="GeoJSON")

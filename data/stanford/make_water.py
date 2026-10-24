"""One-off helper (not a `make course` step): propose the penalty areas OSM
lacks, from the bare-earth DEM (build/dtm_1m.tif, after s00-s02), for the
developer to approve before they go into edits.json.

    python3 data/stanford/make_water.py

1. San Francisquito Creek (OSM way 49231216, a line only). It runs in a
   ravine 3-6 m deep with steep banks, and the course stakes it at the top of
   the banks (photo 9474.jpg in the release). The proposal is the ravine:
   cells within SEARCH m of the line that lie more than DEPTH m below the
   running median of the DEM (MEDIAN m window), the part joined to the line,
   cleaned, smoothed and clipped to the course boundary (outside it the creek
   is out of bounds anyway).
2. Open ditches that cross or run beside play, from the channel along their
   OSM lines (propose_channels.py's method, its own settings): ways 1216390234
   (80 m across hole 6), 1216390238 (22 m, 37 m from hole 1) and 1216390256
   (42 m, 33 m from hole 7). The culverted ditches are left out.

Writes proposed/water_lidar.geojson (WGS84, golf=lateral_water_hazard,
penalty=red, proposed=yes) and proposed/water_lidar.png.
"""
from __future__ import annotations

import json
import warnings
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import rasterize, shapes
from scipy import ndimage
from shapely.affinity import translate
from shapely.geometry import shape
from shapely.ops import unary_union

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent

CREEK = "w49231216"
CREEK_SEARCH, CREEK_DEPTH, CREEK_MEDIAN = 22.0, 0.9, 61
DITCHES = ["w1216390234", "w1216390238", "w1216390256"]
DITCH_SEARCH, DITCH_DEPTH, DITCH_MEDIAN = 5.0, 0.25, 25


def channel(rel, t, line, search, depth, min_half, clip):
    near = rasterize([(line.buffer(search), 1)], out_shape=rel.shape, transform=t, fill=0, dtype="uint8").astype(bool)
    core = rasterize([(line.buffer(min_half), 1)], out_shape=rel.shape, transform=t, fill=0, dtype="uint8").astype(bool)
    ch = near & (rel < -depth)
    ch = ndimage.binary_closing(ch, iterations=2)
    ch = ndimage.binary_opening(ch, iterations=1)
    lab, _ = ndimage.label(ch | core)
    keep = np.unique(lab[core])
    ch = ndimage.binary_fill_holes(np.isin(lab, keep[keep > 0]))
    polys = [shape(gm) for gm, v in shapes(ch.astype(np.uint8), mask=ch, transform=t) if v == 1]
    poly = unary_union(polys).buffer(1.5).buffer(-1.5).simplify(0.5)
    poly = poly.intersection(clip)
    if poly.geom_type == "MultiPolygon":
        poly = unary_union([q for q in poly.geoms if q.area > 30])
    return poly, float(np.median(-rel[ch])) if ch.any() else 0.0


def main():
    cfg = json.loads((HERE / "course_config.json").read_text())
    x0, y0 = cfg["world"]["x0"], cfg["world"]["y0"]
    with rasterio.open(HERE / "build" / "dtm_1m.tif") as r:
        dtm = r.read(1).astype(float)
        t = r.transform
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    g["geometry"] = g.geometry.translate(x0, y0)
    b = g[g.kind == "boundary"].geometry.iloc[0]
    rows = []
    line = g[g.osm == CREEK].geometry.iloc[0]
    rel = dtm - ndimage.median_filter(dtm, size=CREEK_MEDIAN)
    poly, dep = channel(rel, t, line, CREEK_SEARCH, CREEK_DEPTH, 2.0, b)
    rows.append({"osm": f"creek_{CREEK}", "kind": "lateral_water_hazard",
                 "tags": {"golf": "lateral_water_hazard", "penalty": "red", "proposed": "yes", "name": "San Francisquito Creek",
                          "source": f"lidar bare-earth DEM ravine along OSM {CREEK} (data/stanford/make_water.py), clipped to the boundary",
                          "lidar_median_depth_m": f"{dep:.2f}"},
                 "geometry": poly})
    print(f"creek: {poly.area:.0f} m2 in {len(getattr(poly, 'geoms', [poly]))} piece(s), median depth {dep:.1f} m, line inside {line.intersection(b).length:.0f} m")
    rel = dtm - ndimage.median_filter(dtm, size=DITCH_MEDIAN)
    for d in DITCHES:
        ln = g[g.osm == d].geometry.iloc[0]
        poly, dep = channel(rel, t, ln, DITCH_SEARCH, DITCH_DEPTH, 1.0, b)
        rows.append({"osm": f"ditch_{d}", "kind": "lateral_water_hazard",
                     "tags": {"golf": "lateral_water_hazard", "penalty": "red", "proposed": "yes",
                              "source": f"lidar bare-earth DEM channel along OSM ditch {d} (data/stanford/make_water.py)",
                              "lidar_median_depth_m": f"{dep:.2f}"},
                     "geometry": poly})
        print(f"{d}: {poly.area:.0f} m2, median depth {dep:.1f} m")
    out = gpd.GeoDataFrame(rows, crs=cfg["epsg"]).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "water_lidar.geojson", driver="GeoJSON")
    print("-> proposed/water_lidar.geojson")


if __name__ == "__main__":
    main()

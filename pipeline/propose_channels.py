"""Course-chat tool (not a `make course` step): propose penalty-area polygons for
streams that OSM maps only as lines (waterway=stream), from the channel the
bare-earth DEM shows along them.

    python3 propose_channels.py <course> <osm id> [<osm id> ...]     (after s00-s02)
    python3 propose_channels.py <course> --lines=proposed/<file>.geojson <id> [...]

--lines: take the lines from that file (WGS84, an `osm` id per line) instead of
the course's OSM data, for a creek OSM doesn't map (Langdon Farms hole 7, whose
line comes from the DEM channel, data/langdon/make_creek_line.py).

Along each line, cells within SEARCH m of it that lie more than DEPTH m below
the running median of the DEM (MEDIAN m window) are the channel; the channel is
cleaned (closing / opening), joined to a MIN_HALF m buffer of the line so it is
continuous, smoothed, and written as one golf=lateral_water_hazard polygon per
line to data/<course>/proposed/channels_lidar.geojson (WGS84) with a picture
(proposed/channels_lidar.png: relative height, the line in cyan, the proposal
in magenta). The developer approves it before it goes into edits.json.
Used for the creek across Langston's 3rd hole (2026-10-19).
"""
from __future__ import annotations

import sys
import warnings

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw
from rasterio.features import rasterize, shapes
from scipy import ndimage
from shapely.affinity import translate
from shapely.geometry import shape
from shapely.ops import unary_union

from common import World, build_dir, course_dir, course_name_from_argv, load_config

warnings.filterwarnings("ignore")

SEARCH = 5.0     # m either side of the line
DEPTH = 0.25     # m below the running median
MEDIAN = 25      # m window of the running median
MIN_HALF = 1.0   # m: the proposal always covers the line +- this


def main():
    name = course_name_from_argv()
    ids = [a for a in sys.argv[2:] if not a.startswith("--lines=")]
    lines_file = next((a.split("=", 1)[1] for a in sys.argv[2:] if a.startswith("--lines=")), None)
    if not ids:
        raise SystemExit("usage: propose_channels.py <course> <osm id> [...]")
    cfg = load_config(name)
    world = World(cfg)
    bdir, cdir = build_dir(name), course_dir(name)
    with rasterio.open(bdir / "dtm_1m.tif") as r:
        dtm = r.read(1)
        t = r.transform
    rel = dtm - ndimage.median_filter(dtm, size=MEDIAN)
    g = gpd.read_file(bdir / "course_local.geojson")
    if lines_file:
        lf = gpd.read_file(cdir / lines_file).to_crs(world.epsg)
        lf["geometry"] = lf.geometry.translate(-world.x0, -world.y0)
        g = lf
    rows = []
    for oid in ids:
        sel = g[g.osm == oid]
        if sel.empty:
            raise SystemExit(f"no feature {oid}")
        line = translate(sel.geometry.iloc[0], world.x0, world.y0)
        near = rasterize([(line.buffer(SEARCH), 1)], out_shape=dtm.shape, transform=t, fill=0, dtype="uint8").astype(bool)
        core = rasterize([(line.buffer(MIN_HALF), 1)], out_shape=dtm.shape, transform=t, fill=0, dtype="uint8").astype(bool)
        ch = near & (rel < -DEPTH)
        ch = ndimage.binary_closing(ch, iterations=1)
        ch = ndimage.binary_opening(ch, iterations=1)
        lab, n = ndimage.label(ch | core)
        keep = np.unique(lab[core])
        ch = np.isin(lab, keep[keep > 0])
        polys = [shape(gm) for gm, v in shapes(ch.astype(np.uint8), mask=ch, transform=t) if v == 1]
        poly = unary_union(polys).buffer(0.5).buffer(-0.5).simplify(0.4)
        if poly.geom_type == "MultiPolygon":
            poly = max(poly.geoms, key=lambda q: q.area)
        depth = float(np.median(-rel[ch])) if ch.any() else 0.0
        width = poly.area / max(line.length, 1.0)
        rows.append({"osm": f"channel_{oid}", "kind": "lateral_water_hazard",
                     "tags": {"golf": "lateral_water_hazard", "penalty": "red", "proposed": "yes",
                              "source": f"lidar bare-earth DEM channel along {'the line' if lines_file else 'OSM'} {oid} (propose_channels.py)",
                              "lidar_mean_width_m": f"{width:.1f}", "lidar_median_depth_m": f"{depth:.2f}"},
                     "geometry": poly})
        print(f"  channel_{oid}: line {line.length:.0f} m, channel {poly.area:.0f} m2, mean width {width:.1f} m, median depth {depth:.2f} m")
    out = gpd.GeoDataFrame(rows, crs=world.epsg).to_crs(4326)
    pdir = cdir / "proposed"
    pdir.mkdir(exist_ok=True)
    out.to_file(pdir / "channels_lidar.geojson", driver="GeoJSON")
    # picture around the proposals
    allg = unary_union([r["geometry"] for r in rows]).buffer(40)
    minx, miny, maxx, maxy = allg.bounds
    inv = ~t
    c0, r0 = [int(v) for v in inv * (minx, maxy)]
    c1, r1 = [int(v) for v in inv * (maxx, miny)]
    crop = rel[r0:r1, c0:c1]
    k = 3
    img = Image.fromarray((np.clip((crop + 1.0) / 2.0, 0, 1) * 255).astype(np.uint8)).convert("RGB").resize(((c1 - c0) * k, (r1 - r0) * k), Image.NEAREST)
    d = ImageDraw.Draw(img)
    P = lambda x, y: ((x - minx) * k, (maxy - y) * k)  # noqa: E731
    for oid in ids:
        line = translate(g[g.osm == oid].geometry.iloc[0], world.x0, world.y0)
        d.line([P(x, y) for x, y in line.coords], fill=(0, 220, 255), width=1)
    for r in rows:
        d.line([P(x, y) for x, y in r["geometry"].exterior.coords], fill=(255, 0, 255), width=2)
    img.save(pdir / "channels_lidar.png")
    print(f"[propose_channels] {len(rows)} channel(s) -> proposed/channels_lidar.geojson")


if __name__ == "__main__":
    main()

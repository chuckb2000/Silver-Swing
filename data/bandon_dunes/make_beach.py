"""Propose the beach below the bluff from the DEM (course-chat tool, not a `make course`
step; the output is committed as proposed/beach.geojson and added through edits.json).

    python3 data/bandon_dunes/make_beach.py      (after s04)

OSM maps the beach (natural=beach w945236145) only south-west of the world, so s08
has no sand to grow the beach from (cliff_sand_slope_pct / beach_max_m extend mapped
sand, they don't start it). The beach is the low ground between the sea and the foot
of the bluff: lidar ground below BEACH_MAX_M outside the course boundary, west of
the bluff, not in the s04 lake mask (the hydro-flattened sea), as one polygon. It is
off the course (out of bounds either way) and only changes how the scenery looks.
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from rasterio.features import rasterize, shapes
from affine import Affine
from scipy import ndimage
from shapely.geometry import shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
BEACH_MAX_M = 8.0


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    b = HERE / "build"
    z = np.load(b / "height_base.npy")[:-1, :-1]          # rows south->north
    lake = np.load(b / "lake_mask.npy")[:-1, :-1]
    g = gpd.read_file(b / "course_local.geojson")
    bnd = g[g.kind == "boundary"].geometry.iloc[0]
    H, W = z.shape
    tr = Affine(1, 0, 0, 0, 1, 0)
    inside = rasterize([(bnd.buffer(5), 1)], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool)
    low = (z < BEACH_MAX_M) & ~lake & ~inside
    # only the strip connected to the sea's edge (not low ground east of the course)
    sea_edge = ndimage.binary_dilation(lake, iterations=3)
    lab, n = ndimage.label(low)
    keep = np.unique(lab[sea_edge & low])
    beach = np.isin(lab, keep[keep > 0])
    beach = ndimage.binary_opening(ndimage.binary_closing(beach, iterations=2), iterations=2)
    polys = [shape(s) for s, v in shapes(beach.astype(np.uint8), transform=tr) if v == 1]
    poly = unary_union(polys).buffer(0.5).buffer(-0.5).simplify(1.0)
    poly = max(getattr(poly, "geoms", [poly]), key=lambda p: p.area)
    loc = gpd.GeoSeries([poly]).translate(cfg["world"]["x0"], cfg["world"]["y0"]).set_crs(cfg["epsg"]).to_crs(4326)
    out = gpd.GeoDataFrame({"osm": ["x_beach_lidar"], "kind": ["sand"],
                            "tags": [json.dumps({"natural": "beach", "proposed": "yes",
                                                 "source": f"lidar DEM below {BEACH_MAX_M} m between the sea and the bluff, make_beach.py"})]},
                           geometry=loc, crs=4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "beach.geojson", driver="GeoJSON")
    print(f"[beach] {poly.area / 1e4:.1f} ha -> proposed/beach.geojson")


if __name__ == "__main__":
    main()

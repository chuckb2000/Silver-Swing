"""Crosswater's oxbow creeks from the DOGAMI bare-earth DTM (course chat, 2026-11-14).

OSM maps the marsh along the Little Deschutes' old oxbows (natural=wetland) but not the
creek channels inside it. In each wetland polygon the channel is the low ground: cells more
than DEPTH m below the polygon's own running median (MEDIAN m window), cleaned, thinned to
a centre line (skeleton), kept where at least MIN_LEN m long, and drawn HALF_W m either
side as a thin red penalty area. Writes proposed/creeks.geojson (WGS84) and
proposed/creeks.png (the photo, the wetlands in yellow, the creeks in magenta).

    python3 data/crosswater/make_creeks.py          (after `make fetch NAME=crosswater`)
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image
from rasterio.features import rasterize
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.geometry import LineString
from shapely.ops import linemerge, unary_union
from skimage.morphology import skeletonize

D = Path(__file__).resolve().parent
DEPTH = float(__import__("os").environ.get("DEPTH", 0.15))    # m below the running median
MEDIAN = int(__import__("os").environ.get("MEDIAN", 41))     # m window
MIN_LEN = 25.0  # m of centre line
HALF_W = 1.5    # m: the creek is drawn 3 m wide


def tags(t):
    return t if isinstance(t, dict) else json.loads(t or "{}")


def main():
    g = gpd.read_file(D / "raw/osm.geojson").to_crs(32610)
    wet = g[(g.kind == "water") & g.tags.apply(lambda t: tags(t).get("natural") == "wetland")]
    src = rasterio.open(D / "raw/dogami_dtm_ft.tif")
    z = src.read(1).astype(float) * 0.3048
    T = src.transform
    res = src.res[0]
    inside = rasterize([(p, 1) for p in wet.geometry], out_shape=z.shape, transform=T).astype(bool)
    med = ndimage.median_filter(z, size=int(MEDIAN / res))
    low = (z < med - DEPTH) & inside
    low = ndimage.binary_closing(low, iterations=2)
    low = ndimage.binary_opening(low, iterations=1)
    skel = skeletonize(low)
    # skeleton pixels -> line segments between 8-neighbours
    ys, xs = np.nonzero(skel)
    pts = set(zip(ys.tolist(), xs.tolist()))
    segs = []
    for (r, c) in pts:
        for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
            if (r + dr, c + dc) in pts:
                a = T * (c + 0.5, r + 0.5)
                b = T * (c + dc + 0.5, r + dr + 0.5)
                segs.append(LineString([a, b]))
    merged = linemerge(unary_union(segs)) if segs else None
    lines = list(getattr(merged, "geoms", [merged])) if merged is not None else []
    # keep connected networks of at least MIN_LEN
    nets = list(getattr(unary_union(lines).buffer(0.8), "geoms", [unary_union(lines).buffer(0.8)]))
    keep = []
    for n in nets:
        ln = sum(l.length for l in lines if l.intersects(n))
        if ln >= MIN_LEN:
            keep.append(unary_union([l for l in lines if l.intersects(n)]))
    wet_u = unary_union(wet.geometry)
    polys = [k.simplify(0.75).buffer(HALF_W, cap_style=1, join_style=1).intersection(wet_u) for k in keep]
    polys = [p for p in polys if p.area > 10]
    src_note = "DOGAMI bare-earth DTM channel inside an OSM wetland (data/crosswater/make_creeks.py)"
    out = gpd.GeoDataFrame(
        {"osm": [f"creek_{i + 1}" for i in range(len(polys))],
         "kind": ["lateral_water_hazard"] * len(polys),
         "tags": [json.dumps({"golf": "lateral_water_hazard", "penalty": "red", "source": src_note})] * len(polys)},
        geometry=polys, crs=32610)
    (D / "proposed").mkdir(exist_ok=True)
    out.to_crs(4326).to_file(D / "proposed/creeks.geojson", driver="GeoJSON")
    print(f"[creeks] {len(out)} creeks, {sum(k.length for k in keep):.0f} m of centre line, "
          f"{out.area.sum():.0f} m2 (the wetlands are {wet.area.sum():.0f} m2)")
    # picture
    with rasterio.open(D / "raw/osip2024_05m.tif") as o:
        b = wet.total_bounds
        win = from_bounds(b[0] - 20, b[1] - 20, b[2] + 20, b[3] + 20, o.transform)
        a = o.read([1, 2, 3], window=win, boundless=True, fill_value=0)
        OT = o.window_transform(win)
    img = np.moveaxis(a, 0, -1).copy()
    shp = img.shape[:2]
    wm = rasterize([(p, 1) for p in wet.geometry], out_shape=shp, transform=OT).astype(bool)
    img[wm ^ ndimage.binary_erosion(wm, iterations=2)] = [255, 220, 0]
    if len(out):
        cm = rasterize([(p, 1) for p in out.geometry], out_shape=shp, transform=OT).astype(bool)
        img[cm] = [255, 0, 255]
    Image.fromarray(img).save(D / "proposed/creeks.png")
    json.dump(list(OT)[:6], open(D / "proposed/creeks_png_transform.json", "w"))


if __name__ == "__main__":
    main()

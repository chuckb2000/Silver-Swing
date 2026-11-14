"""Chicago Golf Club: the walking paths, from the NAIP 2023 photo.

Course-chat helper (not a `make course` step; its output is a proposal, used only
after the developer approves it; approved 2026-11-13, "paths and fescue looks great"):

    python3 data/chicago_golf/make_paths.py     (after s02: reads build/course_local.geojson)

OSM maps the service roads but none of the gravel and dirt paths that run from
green to tee through the fescue (developer's aerial, 2026-11-13). In the photo
(raw/naip2023_05m.tif, 0.5 m) they are pale and grey-brown: brightness (mean of
R, G, B, smoothed over 0.5 m) above BRIGHT and green minus red below GR_MAX, where
grass is 10-20. Bunkers are brighter still and compact, so pixels within 2 m of a
mapped bunker, and in buildings, parking and the OSM roads (+3 m), are left out.
What is left is thinned to its centre line; a piece is a path when that line is
at least MIN_LEN_M long and the piece is on average 1-4.5 m wide. Spurs under
PRUNE_M are cut off (a mottled bare patch is all spurs), and what is left must
still be MIN_LEN_M long; a path's ends lose PRUNE_M. Lines are
simplified to 1 m.

They would be golf=cartpath lines (s08 draws them 2.4 m wide, as cart path:
free relief as on every course). Writes proposed/paths.geojson (WGS84) and
proposed/paths.jpg (photo with the lines in red).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import rasterize
from scipy import ndimage
from shapely.geometry import LineString
from shapely.ops import linemerge, unary_union
from skimage.filters import sato
from skimage.morphology import skeletonize

HERE = Path(__file__).resolve().parent
PHOTO = HERE / "raw" / "naip2023_05m.tif"
GR_MAX = 8.0
PRUNE_M = 6.0
RIDGE_SIGMAS_PX, RIDGE_MIN = (1.5, 2.5), 10.0
MIN_LEN_M = 25.0


def prune(sk, n):
    """Remove spurs: n passes of taking away end pixels (one 8-neighbour), so the
    short side branches of a mottled bare patch go and a path loses n px at each end."""
    k = np.ones((3, 3), int)
    sk = sk.copy()
    for _ in range(n):
        nb = ndimage.convolve(sk.astype(int), k, mode="constant") - sk
        sk &= ~(sk & (nb <= 1))
    return sk


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    wx, wy, epsg = cfg["world"]["x0"], cfg["world"]["y0"], cfg["epsg"]
    with rasterio.open(PHOTO) as src:
        im = src.read().astype(np.float32)
        ptr = src.transform
    RES = ptr.a
    H, W = im.shape[1:]
    tr = Affine(RES, 0, ptr.c - wx, 0, -RES, ptr.f - wy)
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    g["tags"] = g.tags.apply(lambda t: t if isinstance(t, dict) else json.loads(t or "{}"))

    def mask(geoms, buf=0.0):
        gs = [x.buffer(buf) for x in geoms if x is not None and not x.is_empty]
        if not gs:
            return np.zeros((H, W), bool)
        return rasterize([(x, 1) for x in gs], out_shape=(H, W), transform=tr).astype(bool)

    r, gg, b = im[0], im[1], im[2]
    gr = ndimage.gaussian_filter(gg - r, 1)
    inside = mask(g[g.kind == "boundary"].geometry)
    skip = mask(g[g.kind == "bunker"].geometry, 2.0) | mask(g[g.kind.isin(["building", "parking", "green", "tee", "pool"])].geometry, 1.0)
    skip |= mask(g[g.kind == "highway"].geometry, 3.0)
    ridge = sato((r + gg + b) / 3, sigmas=RIDGE_SIGMAS_PX, black_ridges=False)
    cand = inside & ~skip & (gr < GR_MAX) & (ridge > RIDGE_MIN)
    cand = ndimage.binary_closing(cand, iterations=1) & inside & ~skip
    lab, nl = ndimage.label(cand)
    sk = skeletonize(cand)
    sklen = ndimage.sum(sk, lab, range(1, nl + 1)) * RES
    keep = [i + 1 for i in range(nl) if sklen[i] >= MIN_LEN_M]
    sk &= np.isin(lab, keep)
    sk = prune(sk, int(PRUNE_M / RES))
    lab2, n2 = ndimage.label(sk, structure=np.ones((3, 3)))
    ln = ndimage.sum(sk, lab2, range(1, n2 + 1)) * RES
    sk &= np.isin(lab2, 1 + np.where(ln >= MIN_LEN_M)[0])
    # skeleton pixels -> segments between 8-neighbours, merged into lines
    rr, cc = np.nonzero(sk)
    on = set(zip(rr.tolist(), cc.tolist()))
    segs = []
    for (y, x) in on:
        for dy, dx in ((0, 1), (1, -1), (1, 0), (1, 1)):
            if (y + dy, x + dx) in on:
                a = tr * (x + 0.5, y + 0.5)
                c = tr * (x + dx + 0.5, y + dy + 0.5)
                segs.append(LineString([a, c]))
    merged = linemerge(unary_union(segs))
    lines = [l.simplify(1.0) for l in getattr(merged, "geoms", [merged])]
    lines = [l for l in lines if l.length >= 4.0]
    total = sum(l.length for l in lines)
    print(f"[paths] {len(keep)} path pieces, {len(lines)} lines, {total:.0f} m")
    out = gpd.GeoDataFrame({"osm": [f"path_{i}" for i in range(len(lines))], "kind": "cartpath",
                            "tags": [json.dumps({"golf": "cartpath", "surface": "gravel", "source": "NAIP 2023 photo (make_paths.py)"})] * len(lines)},
                           geometry=lines, crs=None)
    out = out.set_geometry(out.geometry.translate(wx, wy)).set_crs(epsg).to_crs(4326)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "paths.geojson", driver="GeoJSON")
    img = Image.fromarray(np.moveaxis(im[:3].astype(np.uint8), 0, -1))
    d = ImageDraw.Draw(img)
    inv = ~tr
    for l in lines:
        d.line([inv * q for q in l.coords], fill=(255, 30, 30), width=3)
    tb = g[g.kind == "boundary"].total_bounds
    p0, p1 = inv * (tb[0] - 20, tb[3] + 20), inv * (tb[2] + 20, tb[1] - 20)
    img.crop((int(p0[0]), int(p0[1]), int(p1[0]), int(p1[1]))).save(HERE / "proposed" / "paths.jpg", quality=85)


if __name__ == "__main__":
    main()

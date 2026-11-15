"""Open water inside a marsh penalty area, traced from the course's aerial photo (design chat,
2026-11-14).

A marsh drawn as marsh (course_config "marsh_water_osm", s09) is reeds over wet ground; the pools
and channels of open water in it should still look like water. This finds them on the photo:
smooth ground much darker than the ground round the marsh (open water has almost no grain at 2.5 m;
reeds, grass, scrub and canopy do) inside each marsh feature, cleaned up and kept from `--min` m2.
Tree shadows can pass too: check the preview and keep only the right features (--only). They become features tagged
natural=water + marsh_pool=yes, which s09/s09b leave as open water inside the marsh (render only:
the whole marsh is one penalty area either way) and s08 paints as water outside the boundary.

    python3 pipeline/marsh_pools.py <id> [--min 25] [--write] [--photo raw/x.tif] [--only <osm id> ...]

It prints what it found and writes build/marsh_pools_preview.png (photo with the marsh outlined in
red and the pools in cyan) for checking. With --write it writes
proposed/marsh_pools.geojson and the edits.json "add" entry (replacing an earlier one from this
tool); then rebuild the course. A tool run by hand, never inside a build step (pins.NOT_BUILD_PY).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw
from pyproj import Transformer
from rasterio.features import rasterize, shapes
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from scipy import ndimage
from shapely.geometry import mapping, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parent.parent
RES = 0.5          # m per photo pixel, resampled
SMOOTH = 5.0       # grey-level standard deviation over 2.5 m below which ground is "smooth"
TOOL = "marsh_pools.py"


def find_photo(cdir: Path, cfg: dict, override: str | None) -> Path:
    if override:
        return cdir / override
    o = cfg.get("ortho")
    cands = [cdir / o["path"]] if isinstance(o, dict) and o.get("path") else []
    cands += sorted((cdir / "raw").glob("*.tif"))
    for p in cands:
        if not p.exists() or any(k in p.name.lower() for k in ("dem", "dtm", "chm", "dsm")):
            continue
        with rasterio.open(p) as s:
            if s.crs and s.count >= 3 and s.dtypes[0] == "uint8":
                return p
    raise SystemExit(f"[marsh_pools] no georeferenced photo in {cdir}/raw (pass --photo)")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--min", type=float, default=25.0, help="smallest pool kept, m2")
    ap.add_argument("--dark", type=float, default=0.6, help="a pool is darker than this share of the median grey round the marsh")
    ap.add_argument("--smooth", type=float, default=SMOOTH, help="most grain (grey standard deviation over 2.5 m) open water may show")
    ap.add_argument("--photo")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args(argv)
    cdir = ROOT / "data" / a.name
    cfg = json.load(open(cdir / "course_config.json"))
    ids = a.only or list(cfg.get("marsh_water_osm") or [])
    if not ids:
        raise SystemExit("[marsh_pools] no marsh_water_osm in course_config.json")
    epsg = int(cfg["world"]["epsg"]) if "epsg" in cfg.get("world", {}) else int(cfg["epsg"])
    photo = find_photo(cdir, cfg, a.photo)
    gj = json.load(open(cdir / "edited" / "course.geojson"))
    feats = {f["properties"].get("osm"): f for f in gj["features"]}
    to_utm = Transformer.from_crs(4326, epsg, always_xy=True).transform
    to_ll = Transformer.from_crs(epsg, 4326, always_xy=True).transform
    out, preview = [], []
    for oid in ids:
        f = feats.get(oid)
        if not f:
            raise SystemExit(f"[marsh_pools] {oid} is not in edited/course.geojson")
        poly = transform(to_utm, shape(f["geometry"])).buffer(0)
        x0, y0, x1, y1 = poly.bounds
        x0, y0, x1, y1 = x0 - 10, y0 - 10, x1 + 10, y1 + 10
        W, H = int((x1 - x0) / RES), int((y1 - y0) / RES)
        tr = from_origin(x0, y1, RES, RES)
        rgb = np.zeros((3, H, W), np.uint8)
        with rasterio.open(photo) as s:
            for b in range(3):
                reproject(rasterio.band(s, b + 1), rgb[b], dst_transform=tr, dst_crs=f"EPSG:{epsg}", resampling=Resampling.bilinear)
        V = rgb.astype(np.float64).sum(0) / 3
        m1, m2 = ndimage.uniform_filter(V, 5), ndimage.uniform_filter(V * V, 5)
        sd = np.sqrt(np.maximum(m2 - m1 * m1, 0))
        inside = rasterize([(poly.buffer(-1.0), 1)], out_shape=(H, W), transform=tr).astype(bool) if not poly.buffer(-1.0).is_empty else np.zeros((H, W), bool)
        if not inside.any():
            continue
        ring = rasterize([(poly.buffer(12).difference(poly.buffer(2)), 1)], out_shape=(H, W), transform=tr).astype(bool)
        med = float(np.median(V[ring])) if ring.any() else float(np.median(V[inside]))  # the ground round it
        pool = inside & (sd < a.smooth) & (V < a.dark * med) & (V > 3)
        pool = ndimage.binary_opening(pool, iterations=2)
        pool = ndimage.binary_fill_holes(ndimage.binary_closing(pool, iterations=3)) & inside
        lab, n = ndimage.label(pool)
        sizes = ndimage.sum(pool, lab, range(1, n + 1)) * RES * RES
        keep = np.isin(lab, 1 + np.where(sizes >= a.min)[0])
        geoms = [shape(gm).buffer(0) for gm, v in shapes(keep.astype(np.uint8), mask=keep, transform=tr) if v == 1]
        geoms = [g.simplify(0.4).intersection(poly) for g in geoms]
        geoms = [g for g in geoms if not g.is_empty and g.area >= a.min]
        geoms.sort(key=lambda g: -g.area)
        share = sum(g.area for g in geoms) / poly.area
        print(f"[marsh_pools] {oid}: {poly.area:,.0f} m2, {len(geoms)} pools, {sum(g.area for g in geoms):,.0f} m2 open water ({share:.0%})")
        for k, g in enumerate(geoms):
            out.append({"type": "Feature", "geometry": mapping(transform(to_ll, g)),
                        "properties": {"osm": f"{oid}_pool_{k}", "kind": "water",
                                       "tags": {"natural": "water", "marsh_pool": "yes",
                                                "source": f"open water inside {oid}, traced from {photo.name} ({TOOL})"}}})
        img = Image.fromarray(np.moveaxis(rgb, 0, -1))
        d = ImageDraw.Draw(img)
        px = lambda x, y: ((x - x0) / RES, (y1 - y) / RES)  # noqa: E731
        for part in getattr(poly, "geoms", [poly]):
            d.line([px(*c) for c in part.exterior.coords], fill=(255, 60, 60), width=2)
        for g in geoms:
            for part in getattr(g, "geoms", [g]):
                d.line([px(*c) for c in part.exterior.coords], fill=(60, 230, 255), width=2)
        preview.append(img)
    if preview:
        Wp = sum(i.width for i in preview) + 10 * (len(preview) - 1)
        Hp = max(i.height for i in preview)
        sheet = Image.new("RGB", (Wp, Hp), (20, 20, 20))
        x = 0
        for i in preview:
            sheet.paste(i, (x, 0))
            x += i.width + 10
        (cdir / "build").mkdir(exist_ok=True)
        sheet.save(cdir / "build" / "marsh_pools_preview.png")
    if not a.write:
        return
    if not out:
        print("[marsh_pools] no pools: nothing written")
        return
    (cdir / "proposed").mkdir(exist_ok=True)
    json.dump({"type": "FeatureCollection", "features": out}, open(cdir / "proposed" / "marsh_pools.geojson", "w"), indent=1)
    ep = cdir / "edits.json"
    ed = json.load(open(ep)) if ep.exists() else {}
    adds = [e for e in ed.get("add", []) if e.get("tool") != TOOL]
    adds.append({"from": "proposed/marsh_pools.geojson", "ids": [f["properties"]["osm"] for f in out], "tool": TOOL,
                 "reason": "developer 2026-11-14: a marsh is drawn as marsh, and the open water in it (traced from the photo) as water"})
    ed["add"] = adds
    json.dump(ed, open(ep, "w"), indent=1, ensure_ascii=False)
    open(ep, "a").write("\n")
    print(f"[marsh_pools] wrote {len(out)} pools to proposed/marsh_pools.geojson and edits.json")


if __name__ == "__main__":
    sys.exit(main())

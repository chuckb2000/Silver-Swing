"""Course intake: put the developer's downloads into raw/ and check them on arrival
(docs/COURSE_BUILD.md 5; design chat, 2026-10-25). One tool instead of a script per
course: release.json "run" lines call it, so `make fetch` rebuilds raw/ from the release.

    python3 pipeline/intake.py osm <id> EXPORT.geojson [MORE.geojson ...] [--margin 300]
        Overpass Turbo exports -> raw/overpass.geojson: merged by @id, metadata (@user,
        @timestamp ...) dropped (they would become OSM tags), only features near the world
        kept, and lines that run far beyond it (a state's coastline) cut to the box.
    python3 pipeline/intake.py ortho <id> IMAGE x0 y0 x1 y1 [IMAGE x0 y0 x1 y1 ...] [--epsg N] [--out raw/ortho.tif]
        Orthophoto exports (JPEG/PNG, no georeferencing) placed by their request boxes (course
        EPSG unless --epsg), mosaicked and cut to the world + 100 m -> a GeoTIFF.
    python3 pipeline/intake.py laz <id> SRC.laz|SRC.zip [...] [--margin 100] [--classes 1,3,4,5] [--drop-extra] [--out raw/laz/<id>_clip.laz] [--keep-evlrs]
        Lidar tiles (or a NOAA zip of them) -> one LAZ of the points in the world + margin,
        in the files' own CRS, re-quantised onto the first tile's scale and offset, with the
        source's creation date (so the clip's hash is the same any day: Chambers Bay).
    python3 pipeline/intake.py dtm <id> SRC.laz|SRC.zip [...] [--margin 100] [--classes 2] [--zunits ft] [--out raw/dtm_ground_1m.tif]
        Bare earth from the lidar's ground points, for a release with lidar but no DEM: a 1 m
        GeoTIFF in the course EPSG (whole-metre edges), heights in metres (the vertical unit
        comes from the files' CRS). Mean of the ground returns per cell; gaps (buildings,
        water, sparse cover) filled linearly from their rim, cells beyond the points' hull from
        the nearest cell; the counts are printed. Config: "dtm": {"path": "raw/dtm_ground_1m.tif", "units": "m"}.
    python3 pipeline/intake.py raster <id> SRC.tif --out raw/NAME.tif [--margin 100] [--fill-sea]
        A big raster cut to the world + margin, keeping its CRS and grid (pipeline/clip_raster.py).
        --fill-sea: nodata regions touching the clip's edge (open sea in a DEM that isn't
        hydro-flattened offshore) get the median height of their rim. Also reads /vsizip/ paths.
    python3 pipeline/intake.py check <id>
        The checks on arrival: config, every raw input (present, covers the world, CRS, units,
        what kind of raster it is, nodata and flattened sea), lidar (CRS, units, classes,
        flight dates, tiles that differ), the OSM export (boundaries, metadata, hole lines,
        far-off features), duplicate files, and the scorecard (holes, pars, stroke indexes,
        yardages, totals). Errors first, then warnings, then facts. Exit 1 on an error.

Before the world is set in course_config.json, `--box x0 y0 x1 y1` (course EPSG, from the
scouting folder's box.json) stands in for it.
"""
from __future__ import annotations

import csv
import glob
import hashlib
import io
import json
import sys
import tempfile
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def cdir(name: str) -> Path:
    return ROOT / "data" / name


def load_cfg(name: str) -> dict:
    p = cdir(name) / "course_config.json"
    if not p.exists():
        sys.exit(f"[intake] no {p.relative_to(ROOT)}: write the course config first (COURSE_BUILD.md 3.3)")
    return json.load(open(p))


def opt(args: list[str], key: str, n: int = 1, default=None):
    """Pop `--key v1 .. vn` from args."""
    if key not in args:
        return default
    i = args.index(key)
    vals = args[i + 1:i + 1 + n]
    del args[i:i + 1 + n]
    return vals if n > 1 else vals[0]


def world_box(cfg: dict, args: list[str], margin: float = 0.0) -> tuple[float, float, float, float]:
    b = opt(args, "--box", 4)
    if b:
        x0, y0, x1, y1 = map(float, b)
    elif "world" in cfg:
        w = cfg["world"]
        x0, y0, x1, y1 = w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"]
    else:
        sys.exit("[intake] no world in course_config.json: pass --box x0 y0 x1 y1 (course EPSG)")
    return x0 - margin, y0 - margin, x1 + margin, y1 + margin


# --- osm -----------------------------------------------------------------------------------

META = {"@user", "@uid", "@timestamp", "@version", "@changeset", "timestamp", "user", "uid", "version", "changeset"}


def cmd_osm(name: str, args: list[str]):
    from pyproj import Transformer
    from shapely.geometry import box, mapping, shape
    cfg = load_cfg(name)
    margin = float(opt(args, "--margin", default=300))
    x0, y0, x1, y1 = world_box(cfg, args, margin)
    tr = Transformer.from_crs(cfg["epsg"], 4326, always_xy=True)
    area = box(*tr.transform_bounds(x0, y0, x1, y1, densify_pts=21))
    far = area.buffer(0.05)  # ~5 km: beyond this a feature is cut to the box (coastlines, rivers)
    seen, out, cut = set(), [], 0
    for p in args:
        for f in json.load(open(p))["features"]:
            props = f.get("properties") or {}
            fid = props.get("@id") or f.get("id")
            if fid in seen or not f.get("geometry"):
                continue
            seen.add(fid)
            g = shape(f["geometry"])
            if not g.intersects(area):
                continue
            if not far.contains(g) and g.geom_type in ("LineString", "MultiLineString"):
                g = g.intersection(area)
                cut += 1
                if g.is_empty:
                    continue
            out.append({"type": "Feature", "id": fid, "geometry": mapping(g),
                        "properties": {k: v for k, v in props.items() if k not in META}})
    out.sort(key=lambda f: str(f["id"]))
    dst = cdir(name) / "raw" / "overpass.geojson"
    dst.parent.mkdir(exist_ok=True)
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}, ensure_ascii=False) + "\n")
    print(f"[intake] {dst.relative_to(ROOT)}: {len(out)} features from {len(args)} export(s); {cut} long lines cut to the box")


# --- ortho ---------------------------------------------------------------------------------

def cmd_ortho(name: str, args: list[str]):
    import rasterio
    from PIL import Image
    from rasterio.transform import from_origin
    cfg = load_cfg(name)
    epsg = int(opt(args, "--epsg", default=cfg["epsg"]))
    out = cdir(name) / opt(args, "--out", default="raw/ortho.tif")
    margin = float(opt(args, "--margin", default=100))
    if len(args) % 5:
        sys.exit("[intake] ortho: IMAGE x0 y0 x1 y1 for each image")
    tiles = []
    for k in range(0, len(args), 5):
        im = Image.open(args[k]).convert("RGB")
        x0, y0, x1, y1 = map(float, args[k + 1:k + 5])
        rx, ry = (x1 - x0) / im.size[0], (y1 - y0) / im.size[1]
        if abs(rx - ry) > 1e-6 * max(rx, ry):
            print(f"[intake] warning: {args[k]} pixels are {rx:.4f} x {ry:.4f} m (not square): check the box and size")
        tiles.append((np.asarray(im), x0, y0, x1, y1, rx))
    res = tiles[0][5]
    if any(abs(t[5] - res) > 1e-6 * res for t in tiles):
        sys.exit("[intake] ortho: the images have different pixel sizes")
    bx0, by0, bx1, by1 = world_box(cfg, [], margin) if epsg == cfg["epsg"] else (min(t[1] for t in tiles), min(t[2] for t in tiles), max(t[3] for t in tiles), max(t[4] for t in tiles))
    ux0, uy0 = max(bx0, min(t[1] for t in tiles)), max(by0, min(t[2] for t in tiles))
    ux1, uy1 = min(bx1, max(t[3] for t in tiles)), min(by1, max(t[4] for t in tiles))
    gx0 = min(t[1] for t in tiles)
    gy1 = max(t[4] for t in tiles)
    c0, r0 = int(np.floor((ux0 - gx0) / res)), int(np.floor((gy1 - uy1) / res))
    c1, r1 = int(np.ceil((ux1 - gx0) / res)), int(np.ceil((gy1 - uy0) / res))
    mos = np.zeros((r1 - r0, c1 - c0, 3), np.uint8)
    for a, x0, y0, x1, y1, _ in tiles:
        tc, tr_ = int(round((x0 - gx0) / res)) - c0, int(round((gy1 - y1) / res)) - r0
        h, w = a.shape[:2]
        sr, sc = max(0, -tr_), max(0, -tc)
        dr, dc = max(0, tr_), max(0, tc)
        hh, ww = min(h - sr, mos.shape[0] - dr), min(w - sc, mos.shape[1] - dc)
        if hh > 0 and ww > 0:
            mos[dr:dr + hh, dc:dc + ww] = a[sr:sr + hh, sc:sc + ww]
    out.parent.mkdir(parents=True, exist_ok=True)
    prof = dict(driver="GTiff", width=mos.shape[1], height=mos.shape[0], count=3, dtype="uint8", crs=f"EPSG:{epsg}",
                transform=from_origin(gx0 + c0 * res, gy1 - r0 * res, res, res), compress="DEFLATE", tiled=True,
                blockxsize=512, blockysize=512)
    with rasterio.open(out, "w", **prof) as d:
        d.write(mos.transpose(2, 0, 1))
    print(f"[intake] {out.relative_to(ROOT)}: {mos.shape[1]} x {mos.shape[0]} px at {res:g} m from {len(tiles)} image(s)")


# --- laz -----------------------------------------------------------------------------------

def _laz_sources(paths: list[str], td: str) -> list[Path]:
    out = []
    for p in paths:
        if p.endswith(".zip"):
            with zipfile.ZipFile(p) as z:
                for m in sorted(z.namelist()):
                    if m.lower().endswith((".laz", ".las")):
                        z.extract(m, td)
                        out.append(Path(td) / m)
        else:
            out.extend(Path(x) for x in sorted(glob.glob(p)))
    return out


def _box_in_crs(cfg, box_, crs):
    from pyproj import Transformer
    t = Transformer.from_crs(cfg["epsg"], crs, always_xy=True)
    return t.transform_bounds(*box_, densify_pts=41)


def _horizontal(crs):
    if crs is None:
        return None
    if getattr(crs, "is_compound", False):
        return crs.sub_crs_list[0]
    return crs


def cmd_laz(name: str, args: list[str]):
    import laspy
    cfg = load_cfg(name)
    margin = float(opt(args, "--margin", default=100))
    out = cdir(name) / opt(args, "--out", default=f"raw/laz/{name}_clip.laz")
    classes = opt(args, "--classes")
    classes = np.array([int(c) for c in classes.split(",")]) if classes else None
    box_ = world_box(cfg, args, margin)
    # --drop-extra: write the standard point format only (Yale's CT 2023 tiles carry 21 undocumented
    # extra bytes that laspy writes back as an ExtraBytes VLR it can't read again)
    drop_extra = "--drop-extra" in args
    args = [a for a in args if a != "--drop-extra"]
    with tempfile.TemporaryDirectory() as td:
        srcs = _laz_sources(args, td)
        if not srcs:
            sys.exit("[intake] laz: no .laz/.las files")
        with laspy.open(srcs[0]) as r0:
            h0 = r0.header
            pf = laspy.PointFormat(h0.point_format.id) if drop_extra else h0.point_format
            hdr = laspy.LasHeader(point_format=pf, version=h0.version)
            hdr.scales, hdr.offsets = h0.scales, h0.offsets
            for v in h0.vlrs:
                # a COPC tile (NOAA Digital Coast's *.copc.laz) carries COPC info/hierarchy records
                # that laspy can't write; the clip is a plain LAZ, so they are left out (Sankaty
                # Head, 2026-10-31; any input that worked before has none, so nothing else changes)
                if getattr(v, "user_id", "") == "copc":
                    continue
                hdr.vlrs.append(v)
            if "--keep-evlrs" in args:  # LAS 1.4 tiles that keep their CRS (WKT) in an EVLR (CA_CaliforniaGaps_B23):
                for v in h0.evlrs or []:  # carried as ordinary VLRs, which every reader checks
                    hdr.vlrs.append(v)
            hdr.creation_date = h0.creation_date   # the source's date, not today's (the clip's hash stays put)
            hdr.global_encoding = h0.global_encoding
            crs = h0.parse_crs()
        if crs is None:
            sys.exit(f"[intake] laz: {srcs[0].name} has no CRS in its header; ask the developer which it is")
        bx0, by0, bx1, by1 = _box_in_crs(cfg, box_, _horizontal(crs))
        out.parent.mkdir(parents=True, exist_ok=True)
        total = 0
        with laspy.open(out, mode="w", header=hdr, do_compress=True) as w:
            for s in srcs:
                n = 0
                with laspy.open(s) as r:
                    same = r.header.scales.tolist() == hdr.scales.tolist() and r.header.offsets.tolist() == hdr.offsets.tolist()
                    same = same and not drop_extra
                    for c in r.chunk_iterator(5_000_000):
                        x, y = np.asarray(c.x), np.asarray(c.y)
                        keep = (x >= bx0) & (x <= bx1) & (y >= by0) & (y <= by1)
                        if classes is not None:
                            keep &= np.isin(np.asarray(c.classification), classes)
                        if not keep.any():
                            continue
                        pts = c[keep]
                        if not same:  # another tile's offsets: re-quantise on the first's
                            o = laspy.ScaleAwarePointRecord.zeros(len(pts), header=hdr)
                            for d in (o.point_format.dimension_names if drop_extra else pts.point_format.dimension_names):
                                if d not in ("X", "Y", "Z"):
                                    o[d] = pts[d]
                            o.x, o.y, o.z = np.asarray(pts.x), np.asarray(pts.y), np.asarray(pts.z)
                            pts = o
                        w.write_points(pts)
                        n += int(keep.sum())
                print(f"[intake] {s.name}: {n:,} points in the world + {margin:g} m")
                total += n
    print(f"[intake] {out.relative_to(ROOT)}: {total:,} points; CRS {crs.name if crs else '?'}")


# --- dtm (bare earth from the lidar's ground points) ----------------------------------------

def cmd_dtm(name: str, args: list[str]):
    """Ground returns -> a 1 m bare-earth GeoTIFF in the course EPSG (for a course whose release
    has lidar but no DEM). Mean height of the ground points per cell; cells without one (under
    buildings, water, dense cover) are filled by linear interpolation across the gap from its rim,
    and cells outside the points' hull from the nearest filled cell. Heights in metres."""
    import laspy
    import rasterio
    from pyproj import Transformer
    from rasterio.crs import CRS
    from rasterio.transform import from_origin
    from scipy import ndimage
    from scipy.interpolate import LinearNDInterpolator
    cfg = load_cfg(name)
    margin = float(opt(args, "--margin", default=100))
    out = cdir(name) / opt(args, "--out", default="raw/dtm_ground_1m.tif")
    classes = np.array([int(c) for c in opt(args, "--classes", default="2").split(",")])
    zunits = opt(args, "--zunits")
    x0, y0, x1, y1 = world_box(cfg, args, margin)
    x0, y0, x1, y1 = np.floor(x0), np.floor(y0), np.ceil(x1), np.ceil(y1)
    W, H = int(x1 - x0), int(y1 - y0)
    s = np.zeros(W * H)
    n = np.zeros(W * H)
    used = 0
    with tempfile.TemporaryDirectory() as td:
        srcs = _laz_sources(args, td)
        if not srcs:
            sys.exit("[intake] dtm: no .laz/.las files")
        names = []
        for p in srcs:
            with laspy.open(p) as r:
                if r.header.point_count == 0:
                    continue
                crs = r.header.parse_crs()
                if crs is None:
                    sys.exit(f"[intake] dtm: {p.name} has no CRS in its header; ask the developer which it is")
                k = 1.0
                vu = zunits
                if vu is None and getattr(crs, "is_compound", False):
                    vu = crs.sub_crs_list[1].axis_info[0].unit_name
                if vu and ("foot" in vu.lower() or vu.lower() == "ft"):
                    k = 0.3048006096 if "us" in vu.lower() else 0.3048
                elif vu is None:
                    print(f"[intake] warning: {p.name}: vertical units not stated; taken as metres (--zunits ft to change)")
                tf = Transformer.from_crs(_horizontal(crs), cfg["epsg"], always_xy=True)
                bx0, by0, bx1, by1 = _box_in_crs(cfg, (x0, y0, x1, y1), _horizontal(crs))
                m = 0
                for c in r.chunk_iterator(5_000_000):
                    keep = np.isin(np.asarray(c.classification), classes)
                    x, y = np.asarray(c.x)[keep], np.asarray(c.y)[keep]
                    inb = (x >= bx0) & (x <= bx1) & (y >= by0) & (y <= by1)
                    if not inb.any():
                        continue
                    ex, ey = tf.transform(x[inb], y[inb])
                    z = np.asarray(c.z)[keep][inb] * k
                    col = np.floor(ex - x0).astype(np.int64)
                    row = np.floor(y1 - ey).astype(np.int64)
                    ok = (col >= 0) & (col < W) & (row >= 0) & (row < H)
                    cell = row[ok] * W + col[ok]
                    s += np.bincount(cell, weights=z[ok], minlength=W * H)
                    n += np.bincount(cell, minlength=W * H)
                    m += int(ok.sum())
                names.append(p.name)
                print(f"[intake] {p.name}: {m:,} ground points (classes {classes.tolist()}) in the world + {margin:g} m")
                used += m
    if used == 0:
        sys.exit("[intake] dtm: no ground points in the world box")
    a = np.full(W * H, np.nan)
    has = n > 0
    a[has] = s[has] / n[has]
    a = a.reshape(H, W)
    filled = ~np.isnan(a)
    empty = ~filled
    n_empty = int(empty.sum())
    n_tin = n_out = 0
    far = 0.0
    if n_empty:
        dist = ndimage.distance_transform_edt(empty)
        far = float(dist.max())
        rim = filled & ndimage.binary_dilation(empty, structure=np.ones((3, 3), bool))
        rr, cc = np.nonzero(rim)
        er, ec = np.nonzero(empty)
        if len(rr) >= 3:
            f = LinearNDInterpolator(np.column_stack([cc, rr]).astype(np.float64), a[rr, cc])
            v = f(ec.astype(np.float64), er.astype(np.float64))
            got = ~np.isnan(v)
            a[er[got], ec[got]] = v[got]
            n_tin = int(got.sum())
        rest = np.isnan(a)
        n_out = int(rest.sum())
        if n_out:
            idx = ndimage.distance_transform_edt(rest, return_distances=False, return_indices=True)
            a[rest] = a[idx[0][rest], idx[1][rest]]
    out.parent.mkdir(parents=True, exist_ok=True)
    prof = dict(driver="GTiff", width=W, height=H, count=1, dtype="float32", crs=CRS.from_epsg(cfg["epsg"]),
                transform=from_origin(x0, y1, 1.0, 1.0), nodata=None, compress="DEFLATE", predictor=3,
                tiled=True, blockxsize=256, blockysize=256)
    with rasterio.open(out, "w", **prof) as d:
        d.write(a.astype(np.float32), 1)
        d.update_tags(DESCRIPTION=f"bare earth (m) from lidar ground points, classes {classes.tolist()}, "
                                  f"pipeline/intake.py dtm", SOURCES=";".join(names))
    shown = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    print(f"[intake] {shown}: {W} x {H} m at 1 m, {used:,} points, {100 * filled.mean():.1f} % of cells "
          f"with a ground point; {n_tin:,} filled across gaps, {n_out:,} from the nearest cell (outside the points' "
          f"hull); farthest cell from a ground point {far:.0f} m; heights {np.min(a):.1f}..{np.max(a):.1f} m")


# --- raster --------------------------------------------------------------------------------

def cmd_raster(name: str, args: list[str]):
    import subprocess
    cfg = load_cfg(name)
    out = opt(args, "--out")
    margin = opt(args, "--margin", default="100")
    fill_sea = "--fill-sea" in args
    if fill_sea:
        args.remove("--fill-sea")
    if not out or len(args) != 1:
        sys.exit("[intake] raster <id> SRC --out raw/NAME.tif [--margin 100] [--fill-sea]")
    x0, y0, x1, y1 = world_box(cfg, args)
    subprocess.run([sys.executable, str(ROOT / "pipeline" / "clip_raster.py"), args[0], str(cdir(name) / out),
                    "--epsg", str(cfg["epsg"]), "--bbox", str(x0), str(y0), str(x1), str(y1), "--margin", margin], check=True)
    if fill_sea:
        _fill_sea(cdir(name) / out)


def _fill_sea(path: Path):
    """A DEM without data over open sea (not hydro-flattened offshore): nodata regions that
    touch the raster's edge are the sea; each gets the median height of the valid cells along
    its rim (the water line in the survey), which s04 then flattens with the rest of the water.
    Nodata elsewhere is left for s00 to report (as data/sheep_ranch/fill_sea.py)."""
    import rasterio
    from scipy import ndimage
    with rasterio.open(path) as r:
        prof = r.profile.copy()
        tags = r.tags()
        a = r.read(1)
        nd = r.nodata
    hole = (a == nd) if nd is not None and not np.isnan(nd) else np.isnan(a)
    lab, _ = ndimage.label(hole)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge = edge[edge > 0]
    n = 0
    for k in edge:
        sea = lab == k
        rim = ndimage.binary_dilation(sea) & ~hole
        if rim.any():
            a[sea] = np.median(a[rim])
            n += int(sea.sum())
    with rasterio.open(path, "w", **prof) as d:
        d.write(a, 1)
        d.update_tags(**tags, SEA_FILL=f"{len(edge)} edge nodata region(s) set to their rim's median")
    shown = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
    print(f"[intake] {shown}: {n:,} sea cells in {len(edge)} region(s) touching the edge filled from their rim; "
          f"{int(hole.sum()) - n:,} other nodata cells left")


# --- check ---------------------------------------------------------------------------------

class Report:
    def __init__(self):
        self.err, self.warn, self.info = [], [], []

    def e(self, s): self.err.append(s)
    def w(self, s): self.warn.append(s)
    def i(self, s): self.info.append(s)

    def show(self) -> int:
        for title, items in (("errors", self.err), ("warnings", self.warn), ("facts", self.info)):
            print(f"\n## {title} ({len(items)})")
            for s in items:
                print(f"- {s}")
        return 1 if self.err else 0


def _sha(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def check_raster(R: Report, cfg, role: str, path: Path, units: str | None, box_):
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.warp import transform_bounds
    rel = path.relative_to(ROOT)
    if not path.exists():
        R.e(f"{role}: {rel} is missing (make fetch NAME={cfg['id']}, or the download in DATA_REQUEST.md)")
        return
    with rasterio.open(path) as r:
        if r.crs is None:
            R.e(f"{role}: {rel} has no CRS (a picture, not a GeoTIFF?)")
            return
        if role != "ortho" and (r.count != 1 or r.dtypes[0] in ("uint8", "int8")):
            R.e(f"{role}: {rel} is {r.count} band(s) of {r.dtypes[0]}: a picture, not elevation")
            return
        b = transform_bounds(f"EPSG:{cfg['epsg']}", r.crs, *box_, densify_pts=21)
        ix0, iy0, ix1, iy1 = max(b[0], r.bounds.left), max(b[1], r.bounds.bottom), min(b[2], r.bounds.right), min(b[3], r.bounds.top)
        cover = max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0) / ((b[2] - b[0]) * (b[3] - b[1]))
        if cover < 0.98:
            R.e(f"{role}: {rel} covers {100 * cover:.0f} % of the world box (bounds {r.bounds.left:.0f},{r.bounds.bottom:.0f}-"
                f"{r.bounds.right:.0f},{r.bounds.top:.0f} in {r.crs.to_string()}): a download for the wrong box or a missing tile")
        if role == "ortho":
            R.i(f"ortho: {rel}, {r.width} x {r.height} px at {r.res[0]:g} {r.crs.linear_units}, {r.count} bands")
            return
        win = r.window(*b).intersection(rasterio.windows.Window(0, 0, r.width, r.height))
        scale = max(1, int(max(win.width, win.height) // 1200))
        a = r.read(1, window=win, out_shape=(max(1, int(win.height // scale)), max(1, int(win.width // scale))),
                   resampling=Resampling.nearest, masked=True).astype(np.float64)
    valid = a.compressed()
    nod = 1 - valid.size / max(1, a.size)
    if valid.size == 0:
        R.e(f"{role}: {rel} has no data in the world box")
        return
    p1, p50, p99 = np.percentile(valid, [1, 50, 99])
    R.i(f"{role}: {rel}, {r.crs.to_string()}, {r.res[0]:g} {r.crs.linear_units} pixels, {r.dtypes[0]}; in the world: "
        f"p1 {p1:.1f}, p50 {p50:.1f}, p99 {p99:.1f}, nodata {100 * nod:.1f} % (config units: {units})")
    if nod > 0.05:
        R.w(f"{role}: {100 * nod:.0f} % of the world has no data (sea without data? data/sheep_ranch/fill_sea.py fills it)")
    if role == "chm":
        k = 0.3048 if units == "ft" else 1.0
        if p1 * k > 2:
            R.w(f"chm: the lowest 1 % is {p1:.1f} {units}: a canopy model has bare ground near 0; is this a DTM or DSM?")
        if units == "m" and p99 > 70:
            R.w(f"chm: p99 {p99:.0f} with units m: the canopy model looks like feet")
        if units == "ft" and p99 < 25:
            R.w(f"chm: p99 {p99:.0f} with units ft: the canopy model looks like metres")
    if role == "dtm":
        lo = valid.min()
        flat = float(np.mean(valid <= lo + 0.01))
        if flat > 0.05 and cfg.get("lake_level_max_m") is None:
            R.w(f"dtm: {100 * flat:.0f} % of the world is at its lowest value {lo:.2f}: flattened water (set lake_level_max_m just above it)")
        if p99 - p1 < 1.0:
            R.w("dtm: under 1 unit of relief across the world: a flat placeholder, or a CHM in the dtm slot?")


def check_laz(R: Report, cfg, paths: list[Path], units: str | None, box_):
    import laspy
    if not paths:
        R.e(f"laz: no files match {cfg['laz'].get('paths')} (make fetch NAME={cfg['id']})")
        return
    first = None
    for p in paths:
        rel = p.relative_to(ROOT)
        with laspy.open(p) as r:
            h = r.header
            crs = h.parse_crs()
            if crs is None:
                R.e(f"laz: {rel} has no CRS in its header")
                continue
            hz = _horizontal(crs)
            vunit = None
            if getattr(crs, "is_compound", False) and len(crs.sub_crs_list) > 1:
                ax = crs.sub_crs_list[1].axis_info
                vunit = ax[0].unit_name if ax else None
            hunit = hz.axis_info[0].unit_name if hz.axis_info else "?"
            if hz.to_epsg() != cfg["epsg"]:
                R.w(f"laz: {rel} is in {hz.name} (EPSG {hz.to_epsg()}), not EPSG {cfg['epsg']} (NOAA ignores the requested "
                    "projection; s00 reprojects the horizontal from the file's CRS)")
            R.i(f"laz: {rel}: {h.point_count:,} points, {hz.name}, horizontal {hunit}, vertical {vunit or 'not stated'}, "
                f"created {h.creation_date}; config laz.units = {units}")
            if vunit and units:
                looks_ft = "foot" in vunit.lower()
                if looks_ft != (units == "ft"):
                    R.e(f"laz: heights are in {vunit} but course_config laz.units is {units}")
            bx0, by0, bx1, by1 = _box_in_crs(cfg, box_, hz)
            ov = max(0, min(bx1, h.maxs[0]) - max(bx0, h.mins[0])) * max(0, min(by1, h.maxs[1]) - max(by0, h.mins[1]))
            if ov <= 0:
                R.e(f"laz: {rel} doesn't reach the world box")
            sig = (tuple(h.scales), tuple(h.offsets))
            if first is None:
                first = sig
            elif sig != first:
                R.w(f"laz: {rel} has its own scale/offset: a clip that merges tiles must re-quantise (intake.py laz does)")
            # classes and flight dates from up to 20 M points
            cls, times, n = np.zeros(256, np.int64), [], 0
            for c in r.chunk_iterator(4_000_000):
                cls += np.bincount(np.asarray(c.classification, dtype=np.int64), minlength=256)[:256]
                if "gps_time" in c.point_format.dimension_names:
                    t = np.asarray(c.gps_time)
                    times.append((float(t.min()), float(t.max())))
                n += len(c)
                if n >= 20_000_000:
                    break
        present = {k: int(v) for k, v in enumerate(cls) if v}
        R.i(f"laz: {rel} classes (first {n:,} points): {present}")
        if not any(k in present for k in (3, 4, 5)):
            R.w(f"laz: {rel} has no vegetation classes (3-5): roofs, wires and vehicles will read as trees "
                "(roof_last_share, remove_wires, not_trees_areas; ask NOAA for classes 3-5 when they exist)")
        if times and h.global_encoding.gps_time_type == laspy.header.GpsTimeType.STANDARD:
            gps0 = datetime(1980, 1, 6, tzinfo=timezone.utc)
            t0 = gps0 + timedelta(seconds=min(t[0] for t in times) + 1e9)
            t1 = gps0 + timedelta(seconds=max(t[1] for t in times) + 1e9)
            R.i(f"laz: {rel} flown {t0:%Y-%m-%d} to {t1:%Y-%m-%d} (GPS times): trees cut or planted since then are open items")


def check_osm(R: Report, cfg, path: Path, box_):
    from pyproj import Transformer
    from shapely.geometry import box, shape
    rel = path.relative_to(ROOT)
    if not path.exists():
        R.e(f"osm: {rel} is missing")
        return
    if path.suffix.lower() not in (".geojson", ".json"):
        R.i(f"osm: {rel} isn't GeoJSON (a GeoPackage?): not checked here; s01 reads it")
        return
    mb = path.stat().st_size / 1e6
    fc = json.load(open(path))
    feats = fc.get("features", [])
    tr = Transformer.from_crs(cfg["epsg"], 4326, always_xy=True)
    area = box(*tr.transform_bounds(*box_, densify_pts=21))
    meta = sorted({k for f in feats for k in (f.get("properties") or {}) if k in META})
    if meta:
        R.i(f"osm: {rel} carries OSM metadata ({', '.join(meta)}); s01 drops it")
    courses = [f for f in feats if (f.get("properties") or {}).get("leisure") == "golf_course"]
    holes = [f for f in feats if (f.get("properties") or {}).get("golf") == "hole"]
    farout = sum(1 for f in feats if f.get("geometry") and not area.buffer(0.05).contains(shape(f["geometry"])))
    R.i(f"osm: {rel}, {mb:.1f} MB, {len(feats)} features ({farout} reaching ~5 km beyond the world), {len(courses)} "
        f"leisure=golf_course, {len(holes)} golf=hole ({sum(1 for f in holes if (f.get('properties') or {}).get('ref'))} with ref)")
    if not courses:
        R.e("osm: no leisure=golf_course boundary: map it or ask the developer for the box (CLAUDE.md 5.3)")
    def short(i):
        i = str(i)
        for a, b in (("way/", "w"), ("relation/", "r"), ("node/", "n")):
            if i.startswith(a):
                return b + i[len(a):]
        return i
    try:
        dropped = {d.get("osm") for d in json.load(open(cdir(cfg["id"]) / "edits.json")).get("drop", [])}
    except (OSError, ValueError):
        dropped = set()
    courses = [f for f in courses if short((f.get("properties") or {}).get("@id") or f.get("id")) not in dropped]
    if len(courses) > 1 and not cfg.get("layouts") and not cfg.get("join_boundary_parts"):
        R.w("osm: " + str(len(courses)) + " leisure=golf_course features (every one becomes a boundary; drop the others in edits.json "
            "or use layouts / join_boundary_parts): " + ", ".join(f"{(f.get('properties') or {}).get('@id') or f.get('id')} "
                                                             f"'{(f.get('properties') or {}).get('name', '')}'" for f in courses))
    if mb > 10:
        R.w(f"osm: {mb:.0f} MB, {farout} features reaching far beyond the world (a coastline the length of the state?): "
            "rewrite it with intake.py osm")


def check_card(R: Report, cfg, path: Path, tee_sets: list[dict], default_tee: str | None):
    rel = path.relative_to(ROOT)
    if not path.exists():
        R.e(f"scorecard: {rel} is missing")
        return
    rows = list(csv.DictReader(open(path)))
    cols = [c for c in rows[0].keys() if c not in ("hole", "par", "handicap")] if rows else []
    holes = [int(r["hole"]) for r in rows]
    n = len(rows)
    if holes != list(range(1, n + 1)):
        R.e(f"scorecard: holes are {holes}, not 1..{n}")
    pars = [int(r["par"]) for r in rows]
    if any(p < 3 or p > 6 for p in pars):
        R.e(f"scorecard: pars outside 3-6: {pars}")
    hc = sorted(int(r["handicap"]) for r in rows if r.get("handicap", "").strip())
    if hc and hc != list(range(1, n + 1)) and not (n == 9 and (hc == list(range(1, 18, 2)) or hc == list(range(2, 19, 2)))):
        R.e(f"scorecard: stroke indexes {hc} are not 1..{n} (a shifted row from a third-party card?)")
    band = {3: (60, 270), 4: (240, 520), 5: (420, 720), 6: (550, 800)}
    played = {t["name"].lower() for t in tee_sets if t.get("playable")} | ({default_tee.lower()} if default_tee else set())
    for c in cols:
        ys = [r[c].strip() for r in rows]
        if not all(ys):
            R.i(f"scorecard: column {c} has blanks (a partial tee set)")
            continue
        try:
            ys = [float(y) for y in ys]
        except ValueError:
            R.e(f"scorecard: column {c} isn't all numbers")
            continue
        for h, p, y in zip(holes, pars, ys):
            lo, hi = band.get(p, (0, 9999))
            if c.lower() in played and not lo <= y <= hi:   # forward tees are often short for the par
                R.w(f"scorecard: hole {h} par {p} is {y:.0f} yd in {c} (unusual for a par {p}: a typo?)")
        ts = next((t for t in tee_sets if t.get("name", "").lower() == c.lower()), None)
        tot = sum(ys)
        if ts and ts.get("total_yd") and abs(ts["total_yd"] - tot) > 0.5:
            R.e(f"scorecard: {c} holes add up to {tot:.0f} yd but the card's total (tee_sets total_yd) is {ts['total_yd']}")
    R.i(f"scorecard: {rel}, {n} holes, par {sum(pars)}, tee columns {', '.join(cols)}")


def cmd_check(name: str, args: list[str]) -> int:
    cfg = load_cfg(name)
    R = Report()
    if "epsg" not in cfg:
        R.e("config: no epsg (the UTM zone from the longitude: 326NN)")
        return R.show()
    box_ = world_box(cfg, args)
    if "world" in cfg:
        W, H = cfg["world"]["width"], cfg["world"]["height"]
        if max(W, H) > 2048:
            ok = cfg["world"].get("over_limit_approved")   # who approved it, and when (Strawberry Farms)
            if ok:
                R.i(f"config: the world is {W} x {H} m, over the 2,048 m limit; approved: {ok}")
            else:
                R.e(f"config: the world is {W} x {H} m, over the 2,048 m limit (COURSE_BUILD 10: stop and ask; "
                    'once approved, world.over_limit_approved: "<who, date>")')
        if W % 256 or H % 256:
            R.w(f"config: world {W} x {H} m is not whole 512 px chunks (multiples of 256 m)")
    tee_sets = cfg.get("tee_sets", [])
    if cfg.get("default_tee") and tee_sets and cfg["default_tee"] not in [t.get("name") for t in tee_sets]:
        R.e(f"config: default_tee {cfg['default_tee']} isn't one of tee_sets")
    for role in ("dtm", "chm", "dsm"):
        if isinstance(cfg.get(role), dict) and cfg[role].get("path"):
            check_raster(R, cfg, role, cdir(name) / cfg[role]["path"], cfg[role].get("units"), box_)
    if isinstance(cfg.get("ortho"), dict) and cfg["ortho"].get("path"):
        check_raster(R, cfg, "ortho", cdir(name) / cfg["ortho"]["path"], None, box_)
    if isinstance(cfg.get("laz"), dict):
        paths = sorted({Path(p) for pat in cfg["laz"].get("paths", []) for p in glob.glob(str(cdir(name) / pat))})
        check_laz(R, cfg, paths, cfg["laz"].get("units"), box_)
    for src in cfg.get("osm_sources", []):
        check_osm(R, cfg, cdir(name) / src, box_)
    lays = cfg.get("layouts") or [{"scorecard": "scorecard.csv", "tee_sets": tee_sets}]
    for lay in lays:
        check_card(R, cfg, cdir(name) / lay.get("scorecard", f"scorecard_{lay.get('id')}.csv"), lay.get("tee_sets", tee_sets),
                   lay.get("default_tee", cfg.get("default_tee")))
    # the same file uploaded twice (a missing download hidden by a duplicate)
    raw = [p for p in (cdir(name) / "raw").rglob("*") if p.is_file()] if (cdir(name) / "raw").exists() else []
    seen: dict[str, Path] = {}
    for p in raw:
        if p.stat().st_size < 1000:
            continue
        h = _sha(p)
        if h in seen:
            R.e(f"raw: {p.relative_to(ROOT)} is the same file as {seen[h].relative_to(ROOT)} (a duplicate upload hiding a missing one?)")
        seen[h] = p
    return R.show()


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        sys.exit(__doc__)
    cmd, name, args = argv[0], argv[1], argv[2:]
    fn = {"osm": cmd_osm, "ortho": cmd_ortho, "laz": cmd_laz, "dtm": cmd_dtm, "raster": cmd_raster,
          "check": cmd_check}.get(cmd)
    if not fn:
        sys.exit(__doc__)
    return fn(name, args) or 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

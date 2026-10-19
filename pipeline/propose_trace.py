"""Course-chat tool (not a `make course` step): propose course features that
OSM lacks, traced from a georeferenced orthophoto and the bare-earth DEM.

    python3 propose_trace.py <course>     (after s00-s02)

Reads data/<course>/trace_spec.json (the seeds, hole lines and parameters the
course chat picked by eye; see the file's note) and writes
data/<course>/proposed/traced.geojson (WGS84, features with an `osm` id
`tr_...`, an OSM-style `kind` and tags, `proposed=trace` and the method) plus
proposed/traced_overview.png and one proposed/traced_hole<N>.png per hole.
Nothing here goes into edited/ until the developer approves it
(COURSE_BUILD.md 1.1); approved features are added through edits.json.

Methods (all deterministic):
  greens    the seed's patch of smooth mown turf on the orthophoto: local
            brightness std (sigma 2 px) below `t`, not sand, connected to the
            seed, holes filled, opened; then given a green's shape (smooth,
            mostly convex: opened/closed by 3 m, pulled towards its convex hull,
            corner-cut, same area).
  pins      the green's centroid (moved inside if needed).
  tees      raised levelled pads in the DEM (as propose_tees.py: > 0.15 m above
            the 61 m running median, slope < 6 %), the pad nearest each seed,
            drawn as its minimum rotated rectangle scaled to the pad's area.
  holes     line from the hole's tee pad centroid through the spec's bend points
            to the green centroid.
  fairways  a gradient-boosted pixel classifier trained on this course's OSM
            fairways (positives) and the rest of its mapped holes (negatives),
            using orthophoto colour and texture; pixels above `prob` inside a
            corridor around each hole line (each pixel goes to its nearest
            line), cleaned, rounded by 4 m and corner-cut; mapped fairways,
            greens and tees are cut out.
  bunkers   bright, unsaturated sand inside the course boundary within
            `near_m` of a traced hole line or green, above `min_z_m` (not
            beach), compact, not on a mapped
            bunker, road, parking area or building.
  water     DEM cells that are hydro-flattened (5 x 5 window range below
            `flat_m`) and low (< max_z_m), in large patches, plus low cells
            next to them (the joins between flattened reaches); the inlet pond
            from the DEM within `pond_radius_m` of `pond_seed`. Off-course water is tagged
            natural=water; water within `hazard_strip_m` of the course and the
            pond become penalty areas, and the course boundary is grown to
            include them (closing gaps up to 2 x boundary_close_m).
"""
from __future__ import annotations

import json
import math
import warnings

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw
from rasterio.features import rasterize, shapes
from rasterio.transform import Affine
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely import distance as sdistance, points as spoints
from shapely.affinity import scale as sscale
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union

from common import World, build_dir, course_dir, course_name_from_argv, load_config

warnings.filterwarnings("ignore")

SRC = "traced (course chat) from the NYS orthoimagery 2022-2025 and the NYS 2024 Long Island DEM"


def polys_of(mask, tr, min_area=0.0):
    out = []
    for geom, _ in shapes(mask.astype("uint8"), mask=mask, transform=tr):
        p = Polygon(shape(geom).exterior)
        if p.area >= min_area:
            out.append(p)
    return out


def rounded(p, r):
    q = p.buffer(r, join_style=1).buffer(-r, join_style=1)
    if q.geom_type == "MultiPolygon":
        q = max(q.geoms, key=lambda a: a.area)
    return q


class Ortho:
    def __init__(self, path, world):
        with rasterio.open(path) as r:
            self.res = r.res[0]
            win = from_bounds(world.x0, world.y0, world.x0 + world.width, world.y0 + world.height, r.transform)
            a = r.read(window=win, boundless=True).astype(np.float32)
        self.rgb = np.transpose(a, (1, 2, 0))
        self.H, self.W = self.rgb.shape[:2]
        self.top = world.height
        self.tr = Affine(self.res, 0, 0, 0, -self.res, world.height)  # local metres
        R, G, B = (self.rgb[..., i] for i in range(3))
        self.br = (R + G + B) / 3
        self.exg = 2 * G - R - B
        m = ndimage.uniform_filter(self.br, 5)
        m2 = ndimage.uniform_filter(self.br * self.br, 5)
        self.tex = np.sqrt(np.maximum(m2 - m * m, 0))

    def rc(self, x, y):
        return int((self.top - y) / self.res), int(x / self.res)

    def mask(self, geoms):
        geoms = [g for g in geoms if g is not None and not g.is_empty]
        if not geoms:
            return np.zeros((self.H, self.W), bool)
        return rasterize([(g, 1) for g in geoms], out_shape=(self.H, self.W), transform=self.tr).astype(bool)


def trace_green(o, seed, t, r=24.0, sig=2.0):
    x, y = seed
    r0, c0 = o.rc(x, y)
    k = int(r / o.res)
    sl = np.s_[max(r0 - k, 0):r0 + k, max(c0 - k, 0):c0 + k]
    tex = ndimage.gaussian_filter(o.tex[sl], sig)
    yy, xx = np.mgrid[sl]
    m = (tex < t) & (o.br[sl] < 185) & ((yy - r0) ** 2 + (xx - c0) ** 2 <= k * k)
    m = ndimage.binary_opening(m, iterations=3)
    lab, _ = ndimage.label(m)
    v = lab[r0 - sl[0].start, c0 - sl[1].start]
    if v == 0:
        return None
    m = ndimage.binary_opening(ndimage.binary_fill_holes(lab == v), iterations=4)
    full = np.zeros((o.H, o.W), bool)
    full[sl] = m
    ps = polys_of(full, o.tr)
    if not ps:
        return None
    return rounded(max(ps, key=lambda p: p.area), 2.0).simplify(0.3)


def dem_pads(z):
    """Raised levelled pads (tee boxes, also greens) on the 1 m local grid, row 0 = north."""
    H = z.shape[0]
    rel = z - ndimage.median_filter(z, size=61)
    sm = ndimage.gaussian_filter(z, 0.8)
    gy, gx = np.gradient(sm)
    flat = (rel > 0.15) & (np.hypot(gx, gy) < 0.06)
    flat = ndimage.binary_opening(flat, iterations=1)
    lab, _ = ndimage.label(flat)
    tr = Affine(1, 0, 0, 0, -1, H)
    pads = []
    for geom, v in shapes(lab.astype("int32"), mask=lab > 0, transform=tr):
        p = Polygon(shape(geom).exterior)
        if 25 <= p.area <= 2500:
            pads.append(p)
    return pads


def chaikin(p, n=3):
    """Corner-cutting smoothing of a polygon's outline (each pass replaces every
    edge by points at 1/4 and 3/4 of it)."""
    pts = list(p.exterior.coords)[:-1]
    for _ in range(n):
        q = []
        for i in range(len(pts)):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
            q += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        pts = q
    return Polygon(pts)


def green_shape(p):
    """A real green is a smooth, mostly convex blob: open/close the traced patch
    by 3 m, pull it halfway towards its convex hull, smooth the outline, and
    keep the traced area."""
    from shapely.affinity import scale as sc
    q = rounded(p.buffer(-3, join_style=1).buffer(3, join_style=1), 3.0)
    hull = q.convex_hull
    # halfway to the hull: points on the outline moved half the distance to the hull's boundary
    q = q.union(hull.buffer(-0.5 * (hull.area - q.area) / max(hull.length, 1)))
    q = chaikin(q.simplify(0.8), 4)
    f = math.sqrt(p.area / q.area)
    return sc(q, f, f, origin=q.centroid).simplify(0.35)


def tee_box(pad):
    rect = pad.minimum_rotated_rectangle
    f = math.sqrt(pad.area / rect.area)
    return sscale(rect, f, f, origin=rect.centroid)


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    cdir, bdir = course_dir(name), build_dir(name)
    spec = json.load(open(cdir / "trace_spec.json"))
    g = gpd.read_file(bdir / "course_local.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    o = Ortho(cdir / spec["ortho"], world)
    with rasterio.open(bdir / "dtm_1m.tif") as r:
        win = from_bounds(world.x0, world.y0, world.x0 + world.width, world.y0 + world.height, r.transform)
        z = r.read(1, window=win).astype(np.float64)  # 1 m, row 0 = north
    Hz = z.shape[0]
    trz = Affine(1, 0, 0, 0, -1, Hz)
    feats = []

    src = spec.get("source", SRC)  # optional: what the traces were made from (default: Indian Island's)

    def add(fid, kind, geom, tags, method):
        feats.append({"osm": fid, "kind": kind, "geometry": geom,
                      "tags": {**tags, "source": src, "proposed": "trace", "method": method}})

    # greens and pins --------------------------------------------------------------
    greens = {}
    for k, s in spec["greens"].items():
        if "ellipse" in s:  # optional: a green the texture trace can't see (tree shadow), placed by eye
            from shapely.affinity import rotate as srotate
            cx, cy, rx, ry, ang = s["ellipse"]
            p = srotate(sscale(Point(cx, cy).buffer(1.0, 32), rx, ry), ang, origin=(cx, cy))
            greens[k] = p
            add(f"tr_green_{k}", "green", p, {"golf": "green", "hole": k},
                f"ellipse placed by eye on the orthophoto ({s.get('why', 'not traceable')})")
            add(f"tr_pin_{k}", "pin", Point(cx, cy), {"golf": "pin", "hole": k}, "green centre (proposal)")
            continue
        p = trace_green(o, s["seed"], s["t"])
        if p is None:
            print(f"[trace] green {k}: nothing at the seed")
            continue
        p = green_shape(p)
        greens[k] = p
        add(f"tr_green_{k}", "green", p, {"golf": "green", "hole": k},
            f"smooth turf on the orthophoto at {s['seed']}, texture < {s['t']}")
        c = p.centroid if p.contains(p.centroid) else p.representative_point()
        add(f"tr_pin_{k}", "pin", c, {"golf": "pin", "hole": k}, "green centroid (proposal)")

    # tees ---------------------------------------------------------------------------
    pads = dem_pads(z)
    mapped = unary_union(list(g[g.kind.isin(["tee", "green"])].geometry)).buffer(2)
    tee_geoms = {}
    for i, t in enumerate(spec["tees"]):
        sp = Point(t["seed"])
        cand = [p for p in pads if p.distance(sp) < 6 and not p.centroid.within(mapped)]
        if not cand:
            print(f"[trace] tee seed {t['seed']} (hole {t['hole']}): no DEM pad within 6 m")
            continue
        pad = min(cand, key=lambda p: p.distance(sp))
        box = tee_box(pad)
        fid = f"tr_tee_{t['hole']}_{i}"
        tee_geoms[fid] = (t["hole"], box)
        add(fid, "tee", box, {"golf": "tee"},
            f"raised levelled DEM pad ({pad.area:.0f} m2) near {t['seed']}, as its rotated rectangle")

    # hole lines ---------------------------------------------------------------------
    lines = {}
    for k, h in spec["holes"].items():
        own = [b for (hh, b) in tee_geoms.values() if hh == k]
        tp = Point(h["tee"])
        start = min(own, key=lambda b: b.centroid.distance(tp)).centroid if own else tp
        L = LineString([start.coords[0], *map(tuple, h["bends"]), greens[k].centroid.coords[0]])
        lines[k] = L
        add(f"tr_hole_{k}", "hole", L, {"golf": "hole", "ref": k, "par": str(h["par"]), "handicap": str(h["handicap"])},
            "tee pad centroid -> bend points picked on the fairway -> green centroid")
    for _, r in g[g.kind == "hole"].iterrows():
        lines.setdefault(str(r.tags.get("ref")), r.geometry)

    # fairways -----------------------------------------------------------------------
    fs = spec["fairways"]
    keys = [k for k in fs["holes"] if k in lines]
    prob = fairway_probability(o, g) if keys else None  # none listed: OSM already maps the fairways
    yy, xx = np.mgrid[0:o.H, 0:o.W]
    X = (xx + 0.5) * o.res
    Y = o.top - (yy + 0.5) * o.res
    best = np.full((o.H, o.W), 1e9, np.float32)
    lab = np.zeros((o.H, o.W), np.int16)
    for i, k in enumerate(keys):
        b = lines[k].buffer(fs["corridor_m"] + 5).bounds
        c0, c1 = max(int(b[0] / o.res), 0), min(int(b[2] / o.res), o.W)
        r0, r1 = max(int((o.top - b[3]) / o.res), 0), min(int((o.top - b[1]) / o.res), o.H)
        d = sdistance(spoints(X[r0:r1, c0:c1].ravel(), Y[r0:r1, c0:c1].ravel()), lines[k]).reshape(r1 - r0, c1 - c0)
        blk = best[r0:r1, c0:c1]
        m = (d < blk) & (d < fs["corridor_m"])
        blk[m] = d[m]
        lab[r0:r1, c0:c1][m] = i + 1
    taken = list(g[g.kind.isin(["fairway", "green", "tee"])].geometry) + list(greens.values()) + [b for _, b in tee_geoms.values()]
    excl = o.mask([u.buffer(1.0) for u in taken])
    for i, k in enumerate(keys):
        m = (lab == i + 1) & (prob > fs["prob"]) & ~excl
        m = ndimage.binary_closing(m, iterations=4)
        m = ndimage.binary_fill_holes(ndimage.binary_opening(m, iterations=4))
        parts = [chaikin(rounded(p, 4.0).simplify(1.0), 3).simplify(0.6) for p in polys_of(m, o.tr, fs["min_area_m2"])]
        for j, p in enumerate(q for q in parts if q.area >= fs["min_area_m2"]):
            p = p.difference(unary_union(taken))
            if p.geom_type == "MultiPolygon":
                p = max(p.geoms, key=lambda a: a.area)
            add(f"tr_fairway_{k}_{j}", "fairway", p, {"golf": "fairway", "hole": k},
                f"fairway classifier (p > {fs['prob']}) within {fs['corridor_m']} m of hole {k}'s line")

    # bunkers ------------------------------------------------------------------------
    bs = spec["bunkers"]
    near = unary_union([lines[k].buffer(bs["near_m"]) for k in spec["holes"]] + [p.buffer(bs["near_m"]) for p in greens.values()])
    near = near.intersection(g[g.kind == "boundary"].geometry.iloc[0])  # not the sewage plant's tanks
    sand = (o.br > bs["min_brightness"]) & (o.exg < bs.get("max_exg", 8))
    sand = ndimage.binary_opening(ndimage.binary_closing(sand, iterations=2), iterations=2)
    sand = ndimage.binary_fill_holes(sand) & o.mask([near])
    old = unary_union(list(g[g.kind == "bunker"].geometry)).buffer(1)
    roads = unary_union([r.geometry.buffer(4) for _, r in g[g.kind.isin(["highway", "parking", "building"])].iterrows()])
    zi = lambda p: float(z[min(int(Hz - p.y), Hz - 1), min(int(p.x), z.shape[1] - 1)])  # noqa: E731
    nb = 0
    for p in polys_of(sand, o.tr, bs["min_area_m2"]):
        p = chaikin(rounded(p, 1.0).simplify(0.4), 3).simplify(0.25)
        if p.area > bs["max_area_m2"] or p.intersects(old) or zi(p.representative_point()) < bs["min_z_m"]:
            continue
        if 4 * math.pi * p.area / p.length ** 2 < bs["min_compactness"] or p.intersects(roads):
            continue
        add(f"tr_bunker_{nb}", "bunker", p, {"golf": "bunker"}, "bright sand on the orthophoto near a traced hole")
        nb += 1

    # a green never covers sand: cut the traced bunkers (and mapped ones) out of it
    sand_all = unary_union([f["geometry"] for f in feats if f["kind"] == "bunker"] + list(g[g.kind == "bunker"].geometry))
    for f in feats:
        if f["kind"] == "green" and f["geometry"].intersects(sand_all):
            q = f["geometry"].difference(sand_all.buffer(0.5))
            f["geometry"] = max(getattr(q, "geoms", [q]), key=lambda a: a.area)

    # water, penalty areas, boundary -----------------------------------------------
    ws = spec["water"]
    zf = z.astype(np.float32)
    flat = (ndimage.maximum_filter(zf, 5) - ndimage.minimum_filter(zf, 5) < ws["flat_m"]) & (zf < ws["max_z_m"])
    lab_w, n = ndimage.label(flat)
    sizes = ndimage.sum(flat, lab_w, range(1, n + 1))
    water = np.isin(lab_w, 1 + np.where(sizes > ws["min_area_m2"])[0])
    water = ndimage.binary_fill_holes(ndimage.binary_closing(water, iterations=2))
    water |= (zf < ws["edge_z_m"]) & ndimage.binary_dilation(water, iterations=25)
    water = ndimage.binary_opening(water, iterations=2)
    # the inlet pond (optional, `pond_seed`): low cells connected to the seed
    pond = None
    if "pond_seed" in ws:
        px, py = ws["pond_seed"]
        jj, ii = np.mgrid[0:Hz, 0:zf.shape[1]]
        near_seed = (ii - px) ** 2 + (jj - (Hz - py)) ** 2 <= ws["pond_radius_m"] ** 2  # the pond opens to the bay
        low = ndimage.binary_opening((zf < ws["pond_max_z_m"]) & near_seed, iterations=1)
        lab_p, _ = ndimage.label(low)
        pond_m = lab_p == lab_p[int(Hz - py), int(px)]
        water &= ~ndimage.binary_dilation(pond_m, iterations=2)
        pond = rounded(max(polys_of(pond_m, trz), key=lambda p: p.area), 1.5).simplify(0.5)
    bnd = g[g.kind == "boundary"].geometry.iloc[0]
    wname = ws.get("name", "Peconic River / Flanders Bay")
    wpolys = [rounded(p, 2.0).simplify(1.0) for p in polys_of(water, trz, ws["min_area_m2"])]
    strip = bnd.buffer(ws["hazard_strip_m"])
    hazards = []
    for i, p in enumerate(wpolys):
        add(f"tr_water_{i}", "water", p, {"natural": "water", "name": wname},
            "hydro-flattened water in the DEM")
        if p.distance(bnd) < 5:
            hz = p.intersection(strip)
            for q in getattr(hz, "geoms", [hz]):
                if q.area > 200 and q.distance(bnd) < 5:
                    hazards.append(q)
    for i, q in enumerate(hazards):
        add(f"tr_hazard_{i}", "lateral_water_hazard", q.simplify(0.5),
            {"golf": "lateral_water_hazard", "penalty": "red", "name": wname},
            f"DEM water within {ws['hazard_strip_m']} m of the course boundary "
            f"({ws.get('hazard_why', 'developer: river and bay are red')})")
    from shapely.geometry import box as sbox
    for i, part in enumerate(ws["pond_parts"] if pond is not None else []):
        q = pond.intersection(sbox(part.get("x_min", -1e9), -1e9, part.get("x_max", 1e9), 1e9))
        kind = {"red": "lateral_water_hazard", "yellow": "water_hazard"}[part["penalty"]]
        add(f"tr_pond_{i}", kind, q, {"golf": kind, "penalty": part["penalty"], "name": "inlet pond"},
            f"DEM ground below {ws['pond_max_z_m']} m within {ws['pond_radius_m']} m of {ws['pond_seed']}; "
            f"{part['penalty']}: {part['why']}")
    cl = ws["boundary_close_m"]
    nb_poly = rounded(unary_union([bnd, *([pond] if pond is not None else []), *hazards]), cl)
    add("tr_boundary", "boundary", nb_poly, {"leisure": "golf_course", "name": cfg.get("boundary_name", cfg["name"])},
        "OSM boundary grown to include the traced penalty areas")

    # write ----------------------------------------------------------------------------
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=None)
    out["geometry"] = out.geometry.translate(world.x0, world.y0)
    out = out.set_crs(cfg["epsg"]).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    pdir = cdir / "proposed"
    pdir.mkdir(exist_ok=True)
    out.to_file(pdir / "traced.geojson", driver="GeoJSON")
    counts = {}
    for f in feats:
        counts[f["kind"]] = counts.get(f["kind"], 0) + 1
    print(f"[trace] proposed/traced.geojson: {len(feats)} features {counts}")
    previews(o, g, feats, lines, pdir)


def fairway_probability(o, g):
    """Pixel probability of fairway from orthophoto colour/texture, trained on this course's OSM holes."""
    from sklearn.ensemble import HistGradientBoostingClassifier
    F = []
    for s in (1.5, 4, 9):
        m = ndimage.gaussian_filter(o.br, s)
        m2 = ndimage.gaussian_filter(o.br * o.br, s)
        F.append(np.sqrt(np.maximum(m2 - m * m, 0)))
    R, G, B = (o.rgb[..., i] for i in range(3))
    sat = o.rgb.max(-1) - o.rgb.min(-1)
    for s in (2, 6):
        F += [ndimage.gaussian_filter(a, s) for a in (o.exg, o.br, sat, G - R, B - R)]
    F = np.stack(F, -1).astype(np.float32).reshape(-1, len(F))
    fw = list(g[g.kind == "fairway"].geometry)
    mapped_lines = unary_union(list(g[g.kind == "hole"].geometry)).buffer(60)
    pos = o.mask([p.buffer(-2) for p in fw])
    neg = o.mask([mapped_lines.intersection(g[g.kind == "boundary"].geometry.iloc[0])]) & ~o.mask(
        [p.buffer(6) for p in fw] + [p.buffer(3) for p in g[g.kind.isin(["green", "tee", "bunker"])].geometry])
    rng = np.random.default_rng(0)
    ip = rng.choice(np.flatnonzero(pos.ravel()), 60000, replace=False)
    ineg = rng.choice(np.flatnonzero(neg.ravel()), 60000, replace=False)
    Xt = np.concatenate([F[ip], F[ineg]])
    yt = np.r_[np.ones(len(ip)), np.zeros(len(ineg))]
    clf = HistGradientBoostingClassifier(max_iter=200, random_state=0).fit(Xt, yt)
    P = clf.predict_proba(F)[:, 1].reshape(o.H, o.W).astype(np.float32)
    return ndimage.gaussian_filter(P, 3)


COL = {"green": (0, 255, 0), "tee": (255, 0, 255), "fairway": (0, 200, 255), "bunker": (255, 60, 60),
       "hole": (255, 255, 0), "pin": (255, 255, 255), "lateral_water_hazard": (255, 40, 40),
       "water_hazard": (255, 230, 0), "boundary": (255, 140, 0), "water": (80, 120, 255)}


def previews(o, g, feats, lines, pdir):
    img = np.clip(o.rgb, 0, 255).astype(np.uint8)

    def draw(box, scale, path, label):
        x0, y0, x1, y1 = box
        c0, r0 = max(int(x0 / o.res), 0), max(int((o.top - y1) / o.res), 0)
        c1, r1 = min(int(x1 / o.res), o.W), min(int((o.top - y0) / o.res), o.H)
        im = Image.fromarray(img[r0:r1, c0:c1]).resize((int((c1 - c0) * scale), int((r1 - r0) * scale)))
        d = ImageDraw.Draw(im)

        def to(x, y):
            return ((x / o.res - c0) * scale, ((o.top - y) / o.res - r0) * scale)
        for _, r in g.iterrows():  # mapped OSM features, thin
            if r.kind in COL and r.kind not in ("boundary",):
                shape_(d, to, r.geometry, tuple(v // 2 + 60 for v in COL[r.kind]), 1)
        for f in feats:
            if f["kind"] in COL:
                shape_(d, to, f["geometry"], COL[f["kind"]], 2)
        step = 50 if (x1 - x0) > 300 else 25
        for x in range(int(x0 // step * step), int(x1) + 1, step):
            d.line([to(x, y0), to(x, y1)], fill=(90, 90, 90), width=1)
            d.text((to(x, y1)[0] + 2, 2), str(x), fill=(255, 255, 255))
        for y in range(int(y0 // step * step), int(y1) + 1, step):
            d.line([to(x0, y), to(x1, y)], fill=(90, 90, 90), width=1)
            d.text((2, to(x0, y)[1] + 2), str(y), fill=(255, 255, 255))
        d.rectangle([0, im.height - 18, len(label) * 6 + 8, im.height], fill=(0, 0, 0))
        d.text((4, im.height - 15), label, fill=(255, 255, 255))
        im.save(path, optimize=True)

    draw((0, 0, o.W * o.res, o.top), 0.25, pdir / "traced_overview.png",
         "proposed (bright) over OSM (dim): green, tee, fairway, bunker, hole line, red/yellow water, boundary")
    for k, L in lines.items():
        b = L.buffer(45).bounds
        s = min(1.6, 1100 / ((b[2] - b[0]) / o.res), 900 / ((b[3] - b[1]) / o.res))
        draw(b, s, pdir / f"traced_hole{int(k):02d}.png", f"hole {k}: proposed features (bright), OSM (dim)")


def shape_(d, to, geom, col, w):
    t = geom.geom_type
    if t in ("Polygon", "MultiPolygon"):
        for p in getattr(geom, "geoms", [geom]):
            d.polygon([to(*c) for c in p.exterior.coords], outline=col, width=w)
    elif t in ("LineString", "MultiLineString"):
        for ln in getattr(geom, "geoms", [geom]):
            d.line([to(*c) for c in ln.coords], fill=col, width=w)
    elif t == "Point":
        x, y = to(geom.x, geom.y)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=col, width=2)


if __name__ == "__main__":
    main()

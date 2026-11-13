"""Gorse thickets from the orthophoto (course_config.json `gorse`; Bandon Dunes).

Used for Bandon Dunes (developer, 2026-10-20: the yellow-flowering gorse "is an
iconic part of this course"). The thickets of gorse and coastal scrub between
the holes are 1-4 m tall, mostly below the 4 m tree threshold of s05, and the
lidar (South Coast, probably 2008-09) is older than the thickets' current
outlines. So their extent comes from the course's recent orthophoto
(`cfg["ortho"]`, RGB): dark, blue-green, textured vegetation, which the
course's mown fescue (pale yellow-green), sand and greens are not.

Where (all on the 1 m world grid, rows south->north like s05's CHM):
  ortho class   smoothed RGB (5 px box) with V = (R+G+B)/3 in [v_min, v_max],
                G-R > gr_min and B-G in [bg_min, bg_max]; opened and closed
                twice (0.5 m pixels), patches under min_patch_m2 dropped
  not           water (OSM water and the s04 lake mask), ground below
                min_z_m (the beach), tall canopy (CHM > max_chm_m: the
                lidar trees stand there, and canopy_gap_m around it: their
                crowns and shadows in the photo), and within clear_m of a mapped
                green, tee, fairway, bunker, cart path, building or driving range (Gamble Sands: the range's mown turf read as scrub)
Bushes: a jittered grid (`spacing_m`, seeded by the course id) inside that
area; crown radius r_min_m-r_max_m; height from the CHM where it sees the
shrub layer (clamped to h_min_m-h_max_m), else h_default_m; no bush within
`tree_gap` x crown radius of a lidar tree. Each is a tree record of type
"shrub": s10 exports it with c: 3, and a theme with its own bush painter
(palette "trees": {"shrub": ...}; assets-src/trees_bandon_dunes.py draws gorse) has
the game and s09b draw it from that sheet; physics treats it as a small
deciduous tree. With "ground":
"gorse" (common.uses_gorse_ground, design chat), s08 paints the ground under the
thickets inside the course as the gorse surface (17), a penal lie. Species and bloom are flair: the photo shows dense scrub,
not which plant it is.

    "gorse": {"spacing_m": 3.4, "r_min_m": 1.5, "r_max_m": 2.3, "ground": "gorse"}

`extra_areas` (a GeoJSON file in data/<id>/): areas that are bushes whatever the photo
shows or the canopy over them (Silvies). Default none.

Without the key nothing here runs (every other course is unchanged).
"""
from __future__ import annotations

import zlib

import numpy as np
from scipy import ndimage

from common import build_dir, course_dir

DEFAULTS = {
    "v_min": 55.0, "v_max": 128.0, "gr_min": 9.0, "bg_min": -22.0, "bg_max": 4.0,
    "min_patch_m2": 10.0, "min_z_m": 4.0, "max_chm_m": 5.0, "canopy_gap_m": 3, "clear_m": 1.0,
    "spacing_m": 3.4, "jitter": 0.35, "r_min_m": 1.5, "r_max_m": 2.3,
    "h_min_m": 1.2, "h_max_m": 3.5, "h_default_m": 2.2, "tree_gap": 0.8,
    "ground": None, "extra_areas": None,
}


def enabled(cfg) -> bool:
    return bool(cfg.get("gorse"))


def params(cfg) -> dict:
    return {**DEFAULTS, **cfg.get("gorse", {})}


def ortho_on_world(cfg, world, res=0.5) -> np.ndarray:
    """The orthophoto (3 x rows x cols, uint8) resampled onto the world at `res` m, row 0 = north."""
    import rasterio
    from rasterio.transform import from_origin
    from rasterio.warp import Resampling, reproject
    W, H = int(round(world.width / res)), int(round(world.height / res))
    dst_tr = from_origin(world.x0, world.y0 + world.height, res, res)
    out = np.zeros((3, H, W), np.uint8)
    with rasterio.open(course_dir(cfg["id"]) / cfg["ortho"]["path"]) as src:
        for b in range(3):
            reproject(rasterio.band(src, b + 1), out[b], dst_transform=dst_tr, dst_crs=f"EPSG:{world.epsg}",
                      resampling=Resampling.bilinear)
    return out


def scrub_class(rgb: np.ndarray, p: dict) -> np.ndarray:
    """Dark blue-green textured vegetation (bool, same grid as rgb)."""
    R, G, B = (ndimage.uniform_filter(c.astype(np.float64), 5) for c in rgb)
    V = (R + G + B) / 3
    m = (V >= p["v_min"]) & (V < p["v_max"]) & ((G - R) > p["gr_min"]) & ((B - G) > p["bg_min"]) & ((B - G) < p["bg_max"])
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=2)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, 1 + np.where(sizes * 0.25 >= p["min_patch_m2"])[0])
    return m


def gorse_area(cfg, world, g, chm: np.ndarray) -> np.ndarray:
    """Where the thickets are, on the 1 m grid (H x W, rows south->north)."""
    from affine import Affine
    from rasterio.features import rasterize
    p = params(cfg)
    H, W = chm.shape
    veg05 = scrub_class(ortho_on_world(cfg, world), p)              # rows north->south, 0.5 m
    veg = veg05[:2 * H, :2 * W].reshape(H, 2, W, 2).mean(axis=(1, 3)) >= 0.5
    veg = np.flipud(veg)                                            # rows south->north
    bdir = build_dir(cfg["id"])
    z = np.load(bdir / "height_base.npy")[:H, :W]
    lake = np.load(bdir / "lake_mask.npy")[:H, :W]
    tr = Affine(1, 0, 0, 0, 1, 0)

    def burn(kinds, buf):
        geoms = [gg.buffer(buf) for gg in g[g.kind.isin(kinds)].geometry]
        if not geoms:
            return np.zeros((H, W), bool)
        return rasterize([(gg, 1) for gg in geoms], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool)

    water = burn(["water", "lateral_water_hazard", "water_hazard", "pool"], 1.0)
    play = burn(["green", "tee", "fairway", "bunker", "cartpath", "building", "driving_range"], p["clear_m"])
    tall = ndimage.binary_dilation(chm > p["max_chm_m"], iterations=int(p["canopy_gap_m"])) if p["canopy_gap_m"] else chm > p["max_chm_m"]
    area = veg & ~water & ~lake & ~play & (z >= p["min_z_m"]) & ~tall
    if p.get("extra_areas"):
        # optional (gorse.extra_areas: a GeoJSON file in data/<id>/, WGS84; Silvies' thicket by
        # the Craddock 9th green): areas that are bushes whatever their colour on the photo or
        # the canopy over them (still off water and the mown surfaces). Without the key: nothing.
        import geopandas as gpd
        from shapely.affinity import translate
        xa = gpd.read_file(course_dir(cfg["id"]) / p["extra_areas"]).to_crs(cfg["epsg"])
        geoms = [translate(gm, -world.x0, -world.y0) for gm in xa.geometry if gm is not None]
        if geoms:
            extra = rasterize([(gm, 1) for gm in geoms], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool)
            area |= extra & ~water & ~lake & ~play
    return area


def gorse_bushes(cfg, area: np.ndarray, chm: np.ndarray, trees: list, boundary) -> list[dict]:
    """Bush records (type "shrub", flagged gorse) on a jittered grid inside `area`."""
    from shapely.geometry import Point
    from shapely.prepared import prep
    p = params(cfg)
    rng = np.random.default_rng(zlib.crc32((cfg["id"] + ":gorse").encode()))
    H, W = area.shape
    s = float(p["spacing_m"])
    ys, xs = np.mgrid[s / 2:H:s, s / 2:W:s]
    xs = xs + rng.uniform(-p["jitter"], p["jitter"], xs.shape) * s
    ys = ys + rng.uniform(-p["jitter"], p["jitter"], ys.shape) * s
    rr = rng.uniform(p["r_min_m"], p["r_max_m"], xs.shape)
    xs, ys, rr = xs.ravel(), ys.ravel(), rr.ravel()
    ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H)
    xs, ys, rr = xs[ok], ys[ok], rr[ok]
    ii, jj = xs.astype(int), ys.astype(int)
    ok = area[jj, ii]
    xs, ys, rr, ii, jj = xs[ok], ys[ok], rr[ok], ii[ok], jj[ok]
    # no bush under a lidar tree's crown
    if trees:
        from scipy.spatial import cKDTree
        tx = np.array([[t["x"], t["y"]] for t in trees])
        tr_ = np.array([t["r"] for t in trees])
        kd = cKDTree(tx)
        near = kd.query_ball_point(np.c_[xs, ys], r=float(tr_.max()))
        keep = np.array([not any(np.hypot(*(tx[k] - (x, y))) < p["tree_gap"] * tr_[k] for k in ks)
                         for ks, x, y in zip(near, xs, ys)], bool)
        xs, ys, rr, ii, jj = xs[keep], ys[keep], rr[keep], ii[keep], jj[keep]
    hc = chm[jj, ii]
    h = np.where(hc >= p["h_min_m"], np.clip(hc, p["h_min_m"], p["h_max_m"]), p["h_default_m"])
    pb = prep(boundary)
    return [{"x": round(float(x), 2), "y": round(float(y), 2), "h": round(float(hh), 1), "r": round(float(r), 2),
             "type": "shrub", "gorse": True, "in": bool(pb.contains(Point(float(x), float(y))))}
            for x, y, hh, r in zip(xs, ys, h, rr)]


def missing_in_ortho(cfg, world, trees: list) -> list[bool]:
    """course_config.json `trees_need_ortho` ({"v_max": 120, "min_share": 0.1}): True for each
    lidar tree whose crown (0.8 x its radius) holds less than min_share of dark pixels
    (smoothed (R+G+B)/3 < v_max) in the orthophoto: a tree the older lidar saw that the
    newer photo doesn't (Bandon Dunes: the Preserve, built after the South Coast lidar,
    and the Punchbowl)."""
    rule = {"v_max": 120.0, "min_share": 0.1, **cfg["trees_need_ortho"]}
    rgb = ortho_on_world(cfg, world)                      # 0.5 m, rows north->south
    R, G, B = (ndimage.uniform_filter(c.astype(np.float64), 3) for c in rgb)
    dark = (R + G + B) / 3 < rule["v_max"]
    Hp, Wp = dark.shape
    out = []
    for t in trees:
        c = int(t["x"] / 0.5)
        r = int((world.height - t["y"]) / 0.5)
        k = max(1, int(t["r"] * 2 * 0.8))
        sub = dark[max(0, r - k):min(Hp, r + k + 1), max(0, c - k):min(Wp, c + k + 1)]
        out.append(bool(sub.size == 0 or sub.mean() < rule["min_share"]))
    return out

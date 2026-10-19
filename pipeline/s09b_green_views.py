"""Step 10c (playtest addition): high-resolution putting views.

For every hole two square windows around the green are drawn in the course's
style (see LAYERS): a "far" view at 6 px/m (three times the course art) for
long putts, and a "near" close-up at 12 px/m for short ones, where the golfer
is life-size next to the hole:

  * surfaces: smooth upsampling of the 0.5 m surface map (so rough, woods,
    the lake and everything off course match the physics map), then the
    course's own polygons painted on top at full resolution (greens, fringes,
    bunkers, fairways, tees, ponds, cart paths) for crisp shapes;
  * the terrain's hillshade (green models included), mowing stripes on
    fairways and tees, diagonal stripes on the green, outlines, textures;
  * tree and building shadows, buildings in 3/4 view, OB stakes.

Trees are not baked in: each one near the green becomes a high-resolution
sprite (same generator as the course trees) in a per-hole atlas, so the game
can depth-sort them and fade the ones in front of the ball.

Outputs (build/greens/): gNN.png, gNN_trees.png, gNN_trees.json (Phaser JSON
hash plus a "trees" list of placements), green_views.json (for s10).
"""
from __future__ import annotations

import json
import math
import os
import sys
import warnings

import geopandas as gpd
import numpy as np
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import rasterize
from scipy import ndimage
from shapely.geometry import MultiPolygon, Point, Polygon

from common import PX_PER_M, ROOT, SURF, World, build_dir, course_name_from_argv, load_config, write_json
from s08_surface import course_layers, road_geoms
from terrain import tier_offset
from s09_render import draw_lighthouse, LIGHTHOUSE_DRAW_SCALE  # noqa: E402
from s09_render import BAYER4, PRIO, SHADOW_DIR, SHADOW_MULT, band_lut, build_lut, load_palette, load_theme, rough_band_mask, wave_mask

sys.path.insert(0, str(ROOT / "assets-src"))
from atlas import Atlas  # noqa: E402
from trees import theme_painters  # noqa: E402

warnings.filterwarnings("ignore")

S = SURF
HEIGHT_K = 0.7      # vertical objects: px per metre of height = ppm * 0.7 (as in the course art)
# name, pixels per metre, window (m), tree sprite caps (px), size quantisation (px)
# (the windows cover a tall phone screen at that scale; caps keep very tall
# firs from filling the screen)
LAYERS = [
    {"name": "far", "suffix": "", "ppm": 6, "win": 120, "max_w": 96, "max_h": 180, "qw": 6, "qh": 8},
    {"name": "near", "suffix": "n", "ppm": 12, "win": 64, "max_w": 132, "max_h": 210, "qw": 8, "qh": 12},
    # short putts: 24 px/m, where the cup and ball can be drawn at about their real size
    {"name": "close", "suffix": "c", "ppm": 24, "win": 48, "max_w": 160, "max_h": 240, "qw": 10, "qh": 14},
]
TREE_MAX_H = 180  # shadows are drawn for the tree's full height up to this (overridden per layer)


class Grid:
    """A north-up pixel grid: top-left corner (x0, y1) in world metres, ppm pixels per metre."""

    def __init__(self, x0: float, y1: float, w_m: float, h_m: float, ppm: int):
        self.x0, self.y1, self.ppm = x0, y1, ppm
        self.W, self.H = int(round(w_m * ppm)), int(round(h_m * ppm))
        self.xs = x0 + (np.arange(self.W) + 0.5) / ppm
        self.ys = y1 - (np.arange(self.H) + 0.5) / ppm
        self.tr = Affine(1 / ppm, 0, x0, 0, -1 / ppm, y1)

    def px(self, x, y):
        return (x - self.x0) * self.ppm, (self.y1 - y) * self.ppm

    def mask(self, geoms):
        geoms = [gg for gg in geoms if gg is not None and not gg.is_empty]
        if not geoms:
            return np.zeros((self.H, self.W), bool)
        return rasterize([(gg, 1) for gg in geoms], out_shape=(self.H, self.W), transform=self.tr, fill=0, dtype="uint8").astype(bool)


def smooth_surface(surf05: np.ndarray, world: World, grid: Grid) -> np.ndarray:
    """Upsample the 0.5 m surface map with smooth class boundaries (no 3x3 blocks)."""
    X, Y = np.meshgrid(grid.xs, grid.ys)
    cc = X * PX_PER_M - 0.5
    rr = (world.height - Y) * PX_PER_M - 0.5
    c0 = max(0, int(np.floor(cc.min())) - 3)
    r0 = max(0, int(np.floor(rr.min())) - 3)
    c1 = min(surf05.shape[1], int(np.ceil(cc.max())) + 4)
    r1 = min(surf05.shape[0], int(np.ceil(rr.max())) + 4)
    sub = surf05[r0:r1, c0:c1]
    best = np.full((grid.H, grid.W), -1.0, np.float32)
    out = np.zeros((grid.H, grid.W), np.uint8)
    for c in np.unique(sub):
        ind = ndimage.gaussian_filter((sub == c).astype(np.float32), 0.6)
        v = ndimage.map_coordinates(ind, [rr - r0, cc - c0], order=1, mode="nearest")
        upd = v > best
        best[upd] = v[upd]
        out[upd] = c
    return out


def surface_grid(g, cfg, surf05, world, grid, boundary) -> np.ndarray:
    surf = smooth_surface(surf05, world, grid)
    inside = grid.mask([boundary])
    for geoms, value in course_layers(g, road_geoms(g), cfg):
        m = grid.mask(geoms) & inside
        surf[m] = value
    return surf


def terrain_z_grid(base: np.ndarray, greens: list, grid: Grid) -> np.ndarray:
    """Terrain height at every pixel centre (rows north->south), green models blended in."""
    X, Y = np.meshgrid(grid.xs, grid.ys)
    z = ndimage.map_coordinates(base, [Y, X], order=1, mode="nearest")
    ppm = grid.ppm
    for gm in greens:
        poly = Polygon(gm["poly"])
        bx0, by0, bx1, by1 = poly.buffer(gm["blend"] + 1).bounds
        c0, c1 = max(0, int((bx0 - grid.x0) * ppm)), min(grid.W, int((bx1 - grid.x0) * ppm) + 1)
        r0, r1 = max(0, int((grid.y1 - by1) * ppm)), min(grid.H, int((grid.y1 - by0) * ppm) + 1)
        if c1 <= c0 or r1 <= r0:
            continue
        inside = rasterize([(poly, 1)], out_shape=(r1 - r0, c1 - c0), transform=grid.tr * Affine.translation(c0, r0), fill=0, dtype="uint8").astype(bool)
        dist = ndimage.distance_transform_edt(~inside) / ppm
        t = np.clip(dist / gm["blend"], 0, 1)
        w = 1 - t * t * (3 - 2 * t)
        w[inside] = 1
        Xs, Ys = X[r0:r1, c0:c1], Y[r0:r1, c0:c1]
        zm = gm["z0"] + gm["gx"] * (Xs - gm["cx"]) + gm["gy"] * (Ys - gm["cy"])
        for b in gm["bumps"]:
            zm = zm + b["a"] * np.exp(-((Xs - b["x"]) ** 2 + (Ys - b["y"]) ** 2) / (2 * b["s"] ** 2))
        if gm.get("tiers"):
            zm = zm + tier_offset(Xs, Ys, gm["tiers"])
        pf = gm.get("pinFlat")
        if pf:
            dd = np.hypot(Xs - pf["px"], Ys - pf["py"])
            tt = np.clip((dd - pf["r0"]) / (pf["r1"] - pf["r0"]), 0, 1)
            wp = 1 - tt * tt * (3 - 2 * tt)
            zp = pf["zp"] + pf["fx"] * (Xs - pf["px"]) + pf["fy"] * (Ys - pf["py"])
            zm = zm + (zp - zm) * wp
        zs = z[r0:r1, c0:c1]
        z[r0:r1, c0:c1] = zs + (zm - zs) * w
    return z


def hillshade_tone(z, surf, ppm):
    """0 shadow / 1 base / 2 lit, posterised with ordered dither (as the course art)."""
    px = 1.0 / ppm
    zs = ndimage.gaussian_filter(z, 1.0 * ppm)  # 1 m, like the course art
    dzdx = np.gradient(zs, axis=1) / px
    dzdy = -np.gradient(zs, axis=0) / px
    k = 1.6
    nx, ny, nz = -dzdx * k, -dzdy * k, np.ones_like(zs)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    L = np.array([-1.0, 1.0, math.sqrt(2)]) / 2.0
    shade = (nx * L[0] + ny * L[1] + nz * L[2]) / norm / (math.sqrt(2) / 2) - 1.0
    H, W = z.shape
    blk = max(1, round(ppm / 6))  # keep the dither grain the same size on screen at every scale
    bay = np.kron(np.tile(BAYER4, (H // (4 * blk) + 1, W // (4 * blk) + 1)), np.ones((blk, blk)))[:H, :W]
    v = shade + bay * 0.03
    tone = np.ones((H, W), np.int8)
    tone[v < -0.055] = 0
    tone[v > 0.055] = 2
    for sid in (S["water"], S["ob_water"], S["cartpath"], S["ob_road"], S["ob_building"], S["building"]):
        tone[surf == sid] = 1
    return tone


def stripe_field(g, holes, grid: Grid, tee: str) -> np.ndarray:
    """+1 tone on alternate 4 m (fairway) / 2 m (tee) bands parallel to the nearest hole line."""
    stripe = np.zeros((grid.H, grid.W), np.int8)
    from shapely.geometry import LineString, box
    win = box(grid.x0, grid.y1 - grid.H / grid.ppm, grid.x0 + grid.W / grid.ppm, grid.y1)
    centerlines = [LineString(h["tees"][tee]["centerline"]) for h in holes]
    X, Y = np.meshgrid(grid.xs, grid.ys)
    for kind, band in (("fairway", 4.0), ("tee", 2.0)):
        for geom in g[g.kind == kind].geometry:
            if not geom.intersects(win):
                continue
            m = grid.mask([geom])
            if not m.any():
                continue
            line = min(centerlines, key=lambda ln: ln.distance(geom.centroid))
            pts = list(line.coords)
            best_d = np.full(X.shape, np.inf)
            best_u = np.zeros(X.shape)
            for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
                dx, dy = bx - ax, by - ay
                ln = math.hypot(dx, dy) or 1.0
                ux, uy = dx / ln, dy / ln
                t = np.clip((X - ax) * ux + (Y - ay) * uy, 0, ln)
                d = np.hypot(X - (ax + ux * t), Y - (ay + uy * t))
                perp = (X - ax) * (-uy) + (Y - ay) * ux
                upd = d < best_d
                best_d[upd] = d[upd]
                best_u[upd] = perp[upd]
            bands = (np.floor(best_u / band).astype(np.int64) % 2).astype(np.int8)
            stripe[m] = bands[m]
    return stripe


def render_art(surf, z, grid: Grid, g, holes, trees, buildings, boundary, P, lut, rng, tee, max_h=TREE_MAX_H, cfg=None, blut=None):
    H, W = surf.shape
    ppm = grid.ppm
    tone = hillshade_tone(z, surf, ppm)
    stripe = stripe_field(g, holes, grid, tee)
    t = tone.astype(np.int16)
    blk = max(1, round(ppm / 6))  # texture grain: the same size on screen at 6 and 12 px/m
    n1 = np.kron(rng.random((H // blk + 1, W // blk + 1)), np.ones((blk, blk)))[:H, :W]
    n2 = np.kron(rng.random((H // (2 * blk) + 1, W // (2 * blk) + 1)), np.ones((2 * blk, 2 * blk)))[:H, :W]
    grassy = np.isin(surf, [S["rough"], S["ob"], S["woods"], S["ob_woods"], S["range"], S["ob_building"], S["building"]])
    t = t + np.where(grassy & (n2 < 0.07), -1, 0) + np.where(grassy & (n2 > 0.95), 1, 0)
    fine = np.isin(surf, [S["fairway"], S["fringe"], S["tee"]])
    t = t + np.where(fine & (n1 < 0.02), -1, 0) + np.where(fine & (n1 > 0.988), 1, 0)
    striped = np.isin(surf, [S["fairway"], S["tee"], S["range"]])
    t = t + np.where(striped, stripe, 0)
    gm_ = surf == S["green"]
    t = np.where(gm_, np.clip(t, 0, 2), t)
    t = np.clip(t, 0, 3)
    rgb = lut[surf, t]
    Xg, Yg = np.meshgrid(grid.xs, grid.ys)
    mown = rough_band_mask(cfg or {}, g, surf, grid.mask, Xg, Yg, ppm)
    if blut is not None:
        rgb[mown] = blut[t[mown]]
    # green: diagonal mowing stripes, 1.5 m wide, as a subtle two-colour weave
    X, Y = np.meshgrid(grid.xs, grid.ys)
    band = (np.floor((X + Y) / (1.5 * math.sqrt(2))).astype(np.int64) % 2) == 1
    G7b = np.clip(np.array(P["G7"], np.int16) + np.array([7, 6, 4]), 0, 255).astype(np.uint8)
    rgb[gm_ & band & (tone == 1)] = G7b

    def put(mask, col):
        rgb[mask] = P[col]
    put((surf == S["bunker"]) & (n1 < 0.03), "S0")
    put((surf == S["bunker"]) & (n1 > 0.975), "S2")
    put((surf == S["woods"]) & (n1 < 0.08), "B1")
    put((surf == S["woods"]) & (n1 > 0.965), "B0")
    put((surf == S["ob_woods"]) & (n1 < 0.04), "B0")
    put((surf == S["ob_road"]) & (n1 < 0.025), "K2")
    put((surf == S["cartpath"]) & (n1 < 0.03), "K2")
    rough = surf == S["rough"]
    tuft = rough & ~mown & (n1 > 0.994)
    tuft2 = np.zeros_like(tuft)
    tuft2[:-1] = tuft[1:]
    tuft3 = np.zeros_like(tuft)
    tuft3[:-2] = tuft[2:]
    put(tuft | tuft2 | tuft3, "TUFT" if "TUFT" in P else "G5")
    # outlines
    pr = PRIO[surf]
    edge = np.zeros((H, W), bool)
    own_edge = np.zeros((H, W), bool)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= np.roll(np.roll(pr, dy, 0), dx, 1) > pr
        own_edge |= np.roll(np.roll(surf, dy, 0), dx, 1) != surf
    soft = edge & np.isin(surf, [S["rough"], S["fairway"], S["fringe"], S["tee"], S["ob"], S["woods"], S["range"], S["cartpath"]])
    rgb[soft] = lut[surf[soft], 0]
    if blut is not None:
        rgb[soft & mown] = blut[0]
    put(own_edge & (surf == S["bunker"]), "S0")
    put(own_edge & np.isin(surf, [S["water"], S["ob_water"]]), "W0")
    put(own_edge & (surf == S["green"]), "G6")
    bunk = surf == S["bunker"]
    off = max(2, int(round(ppm * 0.6)))
    nw = bunk & ~np.roll(np.roll(bunk, off, 0), off, 1)
    put(nw & ~own_edge, "S0")
    wat = np.isin(surf, [S["water"], S["ob_water"]])
    put(wave_mask(H, W, 0) & wat & ~own_edge, "W2")

    # shadows: trees and buildings (sun from the upper left)
    sh_img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(sh_img)
    hk = ppm * HEIGHT_K
    for tr_ in trees:
        cx, cy = grid.px(tr_["x"], tr_["y"])
        rpx = max(1.5 * ppm, tr_["r"] * ppm)
        hpx = min(tr_["h"] * hk, max_h)
        L = 0.45 * hpx
        ex, ey = cx + SHADOW_DIR[0] * L * 0.5, cy + SHADOW_DIR[1] * L * 0.5
        a = L * 0.5 + rpx * 0.55
        b = rpx * (0.62 if tr_["type"] == "conifer" else 0.85)
        ang = math.atan2(SHADOW_DIR[1], SHADOW_DIR[0])
        pts = []
        for k in range(28):
            th = 2 * math.pi * k / 28
            px_, py_ = a * math.cos(th), b * math.sin(th)
            pts.append((ex + px_ * math.cos(ang) - py_ * math.sin(ang), ey + px_ * math.sin(ang) + py_ * math.cos(ang)))
        d.polygon(pts, fill=255)
    for poly, hb, _osm in buildings:
        wall = hb * hk * (LIGHTHOUSE_DRAW_SCALE if _osm in LIGHTHOUSES else 1.0)
        L = wall * 0.9
        pp = [grid.px(x, y) for x, y in poly.exterior.coords]
        for tt in np.linspace(0, 1, 9):
            d.polygon([(x + SHADOW_DIR[0] * L * tt, y + SHADOW_DIR[1] * L * tt) for x, y in pp], fill=255)
    shadow = np.array(sh_img) > 0
    shadow &= ~np.isin(surf, [S["ob_building"], S["building"]])
    rgb[shadow] = (rgb[shadow].astype(np.float32) * SHADOW_MULT).astype(np.uint8)

    # buildings in 3/4 view
    roof_sets = [("R0", "K1"), ("B1", "B0"), ("B2", "B1"), ("K2", "K1"), ("R0", "K0")]
    img = Image.fromarray(rgb)
    draw = ImageDraw.Draw(img)
    for poly, hb, osm in sorted(buildings, key=lambda b: -b[0].centroid.y):
        wall = max(2, int(round(hb * hk)))
        if osm in LIGHTHOUSES:
            cx, cy = grid.px(poly.centroid.x, poly.centroid.y)
            draw_lighthouse(draw, P, cx, cy, math.sqrt(poly.area / math.pi) * ppm, wall * LIGHTHOUSE_DRAW_SCALE)
            continue
        pp = [grid.px(x, y) for x, y in poly.exterior.coords]
        roof = [(x, y - wall) for x, y in pp]
        ccw = Polygon(pp).exterior.is_ccw
        for (ax, ay), (bx, by) in zip(pp[:-1], pp[1:]):
            ex_, ey_ = bx - ax, by - ay
            nx_, ny_ = (ey_, -ex_) if ccw else (-ey_, ex_)  # outward normal (see s09_render)
            if ny_ <= 0:
                continue
            col = P["K4"] if nx_ < -0.3 * abs(ny_) else (P["K3"] if nx_ <= 0.6 * abs(ny_) else P["K2"])
            draw.polygon([(ax, ay), (bx, by), (bx, by - wall), (ax, ay - wall)], fill=col)
        lit, _dark = roof_sets[sum(map(ord, osm)) % len(roof_sets)]
        draw.polygon(roof, fill=P[lit])
        draw.line(roof + [roof[0]], fill=P["K0"], width=1)
    rgb = np.array(img)

    # OB stakes along the boundary (every 9 m, just outside it)
    ring = boundary.exterior
    for s_ in np.arange(0, ring.length, 9.0):
        p = ring.interpolate(s_)
        q = ring.interpolate(min(ring.length, s_ + 0.5))
        dx, dy = q.x - p.x, q.y - p.y
        ln = math.hypot(dx, dy) or 1
        nx_, ny_ = dy / ln, -dx / ln
        cand = Point(p.x + nx_ * 0.8, p.y + ny_ * 0.8)
        if boundary.contains(cand):
            cand = Point(p.x - nx_ * 0.8, p.y - ny_ * 0.8)
        col, row = (int(v) for v in grid.px(cand.x, cand.y))
        hpx = int(round(ppm * 1.0))
        if hpx + 1 <= row < H - 2 and 1 <= col < W - 2:
            rgb[row + 1, col:col + 2] = (rgb[row + 1, col:col + 2] * 0.6).astype(np.uint8)
            rgb[row - hpx:row + 1, col:col + 2] = P["WH"]
            rgb[row - hpx, col:col + 2] = P["K2"]
    return rgb


LIGHTHOUSES: set = set()  # building ids drawn as lighthouses (render_meta kind), set in main()


def tree_sprite_key(tr_, i, L):
    ppm = L["ppm"]
    hk = ppm * HEIGHT_K
    conif = tr_["type"] == "conifer"
    w = int(np.clip(round(tr_["r"] * 2 * ppm / L["qw"]) * L["qw"], 18, L["max_w"]))
    h = int(np.clip(round(tr_["h"] * hk / L["qh"]) * L["qh"], 24, L["max_h"]))
    if conif:
        while h < 1.15 * w and w > 18:
            w -= L["qw"]
    else:
        h = max(h, int(0.9 * w))
        h = min(h, int(2.6 * w + 6))
    return ("c" if conif else "d"), w, h, i % 3


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    bdir = build_dir(name)
    outd = bdir / "greens"
    outd.mkdir(exist_ok=True)
    P = load_palette(cfg["theme"])
    lut = build_lut(P, load_theme(cfg["theme"]).get("lut"))
    blut = band_lut(P, load_theme(cfg["theme"]))
    conifer, deciduous = theme_painters(cfg["theme"])
    surf05 = np.load(bdir / "surface.npy")
    base = np.load(bdir / "height_base.npy").astype(np.float64)
    greens = json.load(open(bdir / "greens.json"))
    holes = json.load(open(bdir / "holes.json"))
    trees_all = json.load(open(bdir / "trees.json"))
    g = gpd.read_file(bdir / "course_local.geojson")
    boundary = g[g.kind == "boundary"].geometry.iloc[0]
    if isinstance(boundary, MultiPolygon):
        boundary = max(boundary.geoms, key=lambda p_: p_.area)
    meta = json.load(open(bdir / "art" / "render_meta.json"))
    bh_by_osm = {b["osm"]: b["h"] for b in meta["buildings"]}
    building_polys = []
    kind_by_osm = {b["osm"]: b.get("kind", "house") for b in meta["buildings"]}
    for _, r in g[g.kind == "building"].iterrows():
        geom = r.geometry
        parts = [o for o in bh_by_osm if o.startswith(f"{r.osm}:")]
        if parts:  # split into OSM building parts by s09 (e.g. a lighthouse tower)
            for o in parts:
                part = g[g.osm == o.split(":", 1)[1]].geometry.iloc[0]
                building_polys.append((part, float(bh_by_osm[o]), o))
            continue
        for poly in (list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]):
            if poly.area >= 4:
                building_polys.append((poly, float(bh_by_osm.get(r.osm, 6.0)), r.osm))
    LIGHTHOUSES.update(o for o, k in kind_by_osm.items() if k == "lighthouse")
    green_by_osm = {gm["id"]: gm for gm in greens}
    views = []
    only = {int(v) for v in os.environ.get("HOLES", "").split(",") if v.strip()}
    for h in holes:
        n = h["number"]
        if only and n not in only:
            continue
        gpoly = Polygon(green_by_osm[h["green_osm"]]["poly"])
        cx, cy = gpoly.centroid.x, gpoly.centroid.y
        entry = {"hole": n}
        for L in LAYERS:
            WIN, ppm = L["win"], L["ppm"]
            x0 = float(np.clip(round(cx - WIN / 2), 0, world.width - WIN))
            y1 = float(np.clip(round(cy + WIN / 2), WIN, world.height))
            grid = Grid(x0, y1, WIN, WIN, ppm)
            y0, x1 = y1 - WIN, x0 + WIN
            surf = surface_grid(g, cfg, surf05, world, grid, boundary)
            z = terrain_z_grid(base, greens, grid)
            # trees whose sprite can reach into the window (tall ones south of it poke up)
            near = [t for t in trees_all if x0 - 12 <= t["x"] <= x1 + 12 and y0 - min(t["h"] * HEIGHT_K, L["max_h"] / ppm) - 4 <= t["y"] <= y1 + 12]
            box = Polygon([(x0 - 30, y0 - 30), (x1 + 30, y0 - 30), (x1 + 30, y1 + 30), (x0 - 30, y1 + 30)])
            blds = [(p, hb, o) for p, hb, o in building_polys if p.intersects(box)]
            rng = np.random.default_rng(20261018 + n + 1000 * ppm)
            rgb = render_art(surf, z, grid, g, holes, near, blds, boundary, P, lut, rng, cfg["default_tee"], max_h=L["max_h"], cfg=cfg, blut=blut)
            base_name = f"g{n:02d}{L['suffix']}"
            Image.fromarray(rgb).save(outd / f"{base_name}.png", optimize=True)
            # tree sprites
            atlas = Atlas(f"{base_name}_trees", max_w=1024)
            made = {}
            places = []
            for i, t in enumerate(near):
                kind, w, hh, v = tree_sprite_key(t, i, L)
                key = f"{kind}_{w}_{hh}_{v}"
                if key not in made:
                    made[key] = (conifer if kind == "c" else deciduous)(w, hh, v)  # the theme's tree painters
                    atlas.add(key, made[key])
                places.append({"f": key, "x": round(t["x"], 2), "y": round(t["y"], 2)})
            aw, ah = atlas.write(outd)
            js = json.load(open(outd / f"{base_name}_trees.json"))
            js["trees"] = places
            (outd / f"{base_name}_trees.json").write_text(json.dumps(js, separators=(",", ":")))
            entry[L["name"]] = {"file": f"greens/{base_name}.png", "trees": f"greens/{base_name}_trees.json",
                                "treesImage": f"greens/{base_name}_trees.png", "x0": x0, "y1": y1, "w": WIN, "h": WIN, "ppm": ppm}
            print(f"[s09b] hole {n:2d} {L['name']:4s}: window {x0:.0f},{y0:.0f}-{x1:.0f},{y1:.0f} at {ppm} px/m, {len(near)} trees ({len(made)} sprites, atlas {aw}x{ah})")
        views.append(entry)
    write_json(outd / "green_views.json", views, indent=1)


if __name__ == "__main__":
    main()

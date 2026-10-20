"""Step 10b (5.7.2): bake the terrain art from the surface map.

Per pixel (0.5 m): surface base colour from the course theme's palette, a posterised
hillshade (3 bands, ordered-dither transitions), mowing stripes on fairways
and tees aligned with the hole line, a 1 px outline between surfaces, a
per-surface noise texture, bunker lips and a wave pattern on water. Flat
35% shadows for trees and buildings (sun from the upper-left) and 3/4-view
building roofs are baked in too; the trees themselves stay runtime sprites.

Outputs (build/art/): terrain.png and render_meta.json; s10 cuts the chunks
and draws the overview and per-hole minimaps.
"""
from __future__ import annotations

import json
import math
import warnings

import geopandas as gpd
import numpy as np
from affine import Affine
from PIL import Image, ImageDraw
from rasterio.features import rasterize
from scipy import ndimage
from shapely.affinity import translate
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.ops import unary_union

from common import boundary_rings, build_dir, course_name_from_argv, layouts, load_config, PX_PER_M, ROOT, SURF, World, write_json
from terrain import tier_offset

warnings.filterwarnings("ignore")

S = SURF
BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0 - 0.5
SHADOW_MULT = 0.64           # ~35% black overlay
SHADOW_DIR = np.array([0.8, 0.6])  # screen px direction (right, down)
HEIGHT_PX_PER_M = PX_PER_M * 0.7   # vertical objects: 1.4 px per metre of height
LIGHTHOUSE_DRAW_SCALE = 2.0        # landmark towers are drawn (and cast shadows) at 2x their height; physics keeps the real height


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_theme(theme: str = "pnw") -> dict:
    """The whole theme file (assets-src/palettes/<theme>.json)."""
    return json.load(open(ROOT / "assets-src" / "palettes" / f"{theme}.json"))


def load_palette(theme: str = "pnw"):
    """Course theme palette: colour key -> RGB. Optional "aliases" name a role
    after a colour key (e.g. "TUFT": "F2" for the rough's grass tufts)."""
    d = load_theme(theme)
    P = {k: hex2rgb(v) for k, v in d["colors"].items()}
    for k, v in d.get("aliases", {}).items():
        P[k] = P[v]
    return P


def build_lut(P, overrides=None):
    """surface id -> 4 tones (shadow, base, lit, extra-lit). A theme may remap
    surfaces to other colour keys with "lut": {"rough": ["F0", "F1", "F2", "F2"]}."""
    t = {
        S["ob"]: ["L0", "L1", "L2", "L2"],
        S["rough"]: ["G2", "G3", "G4", "G4"],
        S["fairway"]: ["G4", "G5", "G6", "G7"],
        S["fringe"]: ["G5", "G6", "G7", "G7"],
        S["green"]: ["G6", "G7", "G8", "G8"],
        S["tee"]: ["G5", "G6", "G7", "G8"],
        S["bunker"]: ["S0", "S1", "S2", "S2"],
        S["water"]: ["W0", "W1", "W1", "W2"],
        S["cartpath"]: ["K2", "K3", "K4", "K4"],
        S["woods"]: ["G0", "G1", "G2", "G2"],
        S["ob_road"]: ["K1", "K1", "K2", "K2"],
        S["ob_water"]: ["W0", "W1", "W1", "W2"],
        S["ob_woods"]: ["G0", "G0", "G1", "G1"],
        S["ob_building"]: ["L0", "L0", "L1", "L1"],
        S["building"]: ["G2", "G2", "G3", "G3"],
        S["range"]: ["G5", "G6", "G7", "G7"],
        S["ob_sand"]: ["S0", "S1", "S2", "S2"],
    }
    for name, keys in (overrides or {}).items():
        if name in S:  # "rough_band" is an art role, not a surface (see rough_band_mask)
            t[S[name]] = keys
    lut = np.zeros((32, 4, 3), np.uint8)
    for sid, names in t.items():
        for i, n in enumerate(names):
            lut[sid, i] = P[n]
    return lut


# outline priority: a pixel next to a higher-priority surface takes its own shadow tone
PRIO = np.zeros(32, np.int16)
for k, v in {"ob_woods": 1, "ob": 2, "ob_building": 2, "ob_road": 3, "ob_water": 4, "woods": 5, "rough": 6,
             "range": 7, "fairway": 8, "fringe": 9, "cartpath": 10, "tee": 11, "bunker": 12, "green": 13,
             "water": 14, "building": 15, "ob_sand": 3}.items():
    PRIO[S[k]] = v


def terrain_z_px(world, base, greens, H, W):
    """Terrain height at every art pixel centre (rows north->south)."""
    xs = (np.arange(W) + 0.5) / PX_PER_M
    ys = world.height - (np.arange(H) + 0.5) / PX_PER_M
    X, Y = np.meshgrid(xs, ys)
    z = ndimage.map_coordinates(base, [Y, X], order=1, mode="nearest")
    tr = Affine(1 / PX_PER_M, 0, 0, 0, -1 / PX_PER_M, world.height)
    for gm in greens:
        poly = Polygon(gm["poly"])
        bx0, by0, bx1, by1 = poly.buffer(gm["blend"] + 1).bounds
        c0, c1 = max(0, int(bx0 * PX_PER_M)), min(W, int(bx1 * PX_PER_M) + 1)
        r0, r1 = max(0, int((world.height - by1) * PX_PER_M)), min(H, int((world.height - by0) * PX_PER_M) + 1)
        sub_tr = tr * Affine.translation(c0, r0)
        inside = rasterize([(poly, 1)], out_shape=(r1 - r0, c1 - c0), transform=sub_tr, fill=0, dtype="uint8").astype(bool)
        dist = ndimage.distance_transform_edt(~inside) / PX_PER_M
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


def hillshade_tone(z, surf):
    """0 shadow / 1 base / 2 lit, posterised with ordered dither."""
    px = 1.0 / PX_PER_M
    zs = ndimage.gaussian_filter(z, 2.0)
    dzdx = np.gradient(zs, axis=1) / px
    dzdy = -np.gradient(zs, axis=0) / px  # rows go south
    k = 1.6
    nx, ny, nz = -dzdx * k, -dzdy * k, np.ones_like(zs)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    L = np.array([-1.0, 1.0, math.sqrt(2)]) / 2.0
    shade = (nx * L[0] + ny * L[1] + nz * L[2]) / norm / (math.sqrt(2) / 2) - 1.0
    H, W = z.shape
    bay = np.tile(BAYER4, (H // 4 + 1, W // 4 + 1))[:H, :W]
    v = shade + bay * 0.03
    tone = np.ones((H, W), np.int8)
    tone[v < -0.055] = 0
    tone[v > 0.055] = 2
    # flat-by-design surfaces
    for sid in (S["water"], S["ob_water"], S["cartpath"], S["ob_road"], S["ob_building"], S["building"]):
        tone[surf == sid] = 1
    return tone, shade


def stake_lines(boundaries, g, cfg):
    """Lines of white OB stakes: (ring, polygon, ob_inside). Always each course
    boundary part given (common.boundary_rings in s09, the boundary's parts in
    s09b), stakes on its outer (OB) side; with cfg range_art "rough" also the edge
    of each driving range, stakes on its inner (OB) side, since a range drawn as
    rough has no other edge in the art."""
    out = [(b.exterior, b, False) for b in boundaries]
    if cfg.get("range_art") == "rough":
        for geom in g[g.kind == "driving_range"].geometry:
            for part in getattr(geom, "geoms", [geom]):
                out.append((part.exterior, part, True))
    return out


def stripe_field(world, g, holes, surf, H, W, tee):
    """+1 tone on alternate 4 m (fairway) / 2 m (tee) bands parallel to the hole line."""
    stripe = np.zeros((H, W), np.int8)
    tr = Affine(1 / PX_PER_M, 0, 0, 0, -1 / PX_PER_M, world.height)
    # each hole's stripes follow its own layout's default tee (s06 "stripe_tee"; one layout: `tee`)
    centerlines = [(h["number"], LineString(h["tees"][h.get("stripe_tee", tee)]["centerline"])) for h in holes]
    for kind, band in (("fairway", 4.0), ("tee", 2.0), ("driving_range", 6.0)):
        for geom in g[g.kind == kind].geometry:
            c = geom.centroid
            # associate with the hole whose centre line is nearest (dogleg-aware per pixel)
            n, line = min(centerlines, key=lambda nl: nl[1].distance(c))
            bx0, by0, bx1, by1 = geom.bounds
            c0, c1 = max(0, int(bx0 * PX_PER_M)), min(W, int(bx1 * PX_PER_M) + 1)
            r0, r1 = max(0, int((world.height - by1) * PX_PER_M)), min(H, int((world.height - by0) * PX_PER_M) + 1)
            if c1 <= c0 or r1 <= r0:
                continue
            m = rasterize([(geom, 1)], out_shape=(r1 - r0, c1 - c0), transform=tr * Affine.translation(c0, r0), fill=0, dtype="uint8").astype(bool)
            cols, rows = np.meshgrid(np.arange(c0, c1), np.arange(r0, r1))
            X = (cols + 0.5) / PX_PER_M
            Y = world.height - (rows + 0.5) / PX_PER_M
            pts = list(line.coords)
            best_d = np.full(X.shape, np.inf)
            best_u = np.zeros(X.shape)
            for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
                dx, dy = bx - ax, by - ay
                ln = math.hypot(dx, dy) or 1.0
                ux, uy = dx / ln, dy / ln
                t = np.clip((X - ax) * ux + (Y - ay) * uy, 0, ln)
                px_, py_ = ax + ux * t, ay + uy * t
                d = np.hypot(X - px_, Y - py_)
                perp = (X - ax) * (-uy) + (Y - ay) * ux  # signed offset across the hole
                upd = d < best_d
                best_d[upd] = d[upd]
                best_u[upd] = perp[upd]
            if kind == "driving_range":
                # range: bands across its long axis
                mrr = geom.minimum_rotated_rectangle
                xy = list(mrr.exterior.coords)
                e = max(((xy[i], xy[i + 1]) for i in range(4)), key=lambda ab: math.dist(*ab))
                ux, uy = (e[1][0] - e[0][0]), (e[1][1] - e[0][1])
                ln = math.hypot(ux, uy)
                best_u = (X * ux + Y * uy) / ln
            bands = (np.floor(best_u / band).astype(np.int64) % 2).astype(np.int8)
            sub = stripe[r0:r1, c0:c1]
            sub[m] = bands[m]
    return stripe


def band_width(cfg, X, Y):
    """Width (m) of the mown-rough band at world points: cfg["rough_band_m"] on average,
    drifting gently along the fairways (three seeded waves 14-50 m long, about +-35 %,
    independent of the image resolution so the course art and the putting views agree)."""
    import zlib
    bm = float(cfg["rough_band_m"])
    rng = np.random.default_rng(zlib.crc32(("band:" + cfg["id"]).encode()))
    f = np.zeros_like(X, dtype=np.float64)
    for wl, amp in ((50.0, 0.18), (29.0, 0.12), (14.0, 0.05)):
        a = rng.uniform(0, 2 * np.pi)
        ph = rng.uniform(0, 2 * np.pi)
        f += amp * np.sin(2 * np.pi * (X * np.cos(a) + Y * np.sin(a)) / wl + ph)
    return np.clip(bm * (1.0 + f), 0.6 * bm, 1.6 * bm)


def rough_band_mask(cfg, g, surf, rasterise, X, Y, ppm):
    """Mown rough: rough pixels within a wandering distance (band_width) of a fairway.
    Art only; physics treats it as rough like the rest. `rasterise(geoms)` -> bool mask,
    X / Y the world coordinates of the pixel centres, ppm pixels per metre."""
    bm = cfg.get("rough_band_m")
    fw = [geom for geom in g[g.kind == "fairway"].geometry if geom is not None]
    if not bm or not fw:
        return np.zeros(surf.shape, bool)
    union = unary_union(fw)
    near = rasterise([union.buffer(2.7 * bm)]) & (surf == S["rough"])
    if not near.any():
        return near
    dist = ndimage.distance_transform_edt(~rasterise([union])) / ppm
    return near & (dist <= band_width(cfg, X, Y))


def band_lut(P, theme: dict) -> np.ndarray:
    """4 tones for the mown-rough band (theme lut "rough_band", default the G2-G4 rough greens)."""
    keys = (theme.get("lut") or {}).get("rough_band", ["G2", "G3", "G4", "G4"])
    return np.array([P[k] for k in keys], np.uint8)


def _height(tags, default=None):
    if "height" in tags:
        try:
            return float(str(tags["height"]).split()[0])
        except ValueError:
            pass
    if "building:levels" in tags:
        try:
            return 3.2 * float(tags["building:levels"]) + 2.0  # storeys plus the roof
        except ValueError:
            pass
    return default


def building_pieces(g, chm):
    """Buildings as drawn and collided: [(poly, height m, id, kind)] in the order of g.

    A building with OSM building:part features inside it is split into its parts, each
    with its own height (height / building:levels). The tall part of a man_made=lighthouse
    (>= 12 m) is kind "lighthouse"; everything else is "house". Heights of whole buildings
    are as before: the height tag, else the canopy model's median over the footprint,
    clamped to 3-14 m; parts keep their tagged height (a lighthouse tower is 20 m)."""
    parts = g[g.kind == "building_part"]
    out = []
    for _, r in g[g.kind == "building"].iterrows():
        geom = r.geometry
        mine = [pr for _, pr in parts.iterrows() if geom.buffer(0.5).contains(pr.geometry.centroid)] if len(parts) else []
        if mine:
            light = r.tags.get("man_made") == "lighthouse" or r.tags.get("building") == "lighthouse"
            for pr in mine:
                h = _height(pr.tags, 6.0)
                kind = "lighthouse" if light and h >= 12 else "house"
                out.append((pr.geometry, float(np.clip(h, 3.0, 30.0)), f"{r.osm}:{pr.osm}", kind))
            continue
        polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        for poly in polys:
            if poly.area < 4:
                continue
            hb = _height({k: v for k, v in r.tags.items() if k == "height"})
            if hb is None:
                m = rasterize([(poly, 1)], out_shape=chm.shape, transform=Affine(1, 0, 0, 0, 1, 0), fill=0, dtype="uint8").astype(bool)
                vals = chm[m]
                hb = float(np.median(vals)) if vals.size else 6.0
            out.append((poly, float(np.clip(hb, 3.0, 14.0)), r.osm, "house"))
    return out


def draw_lighthouse(draw, P, cx, cy, rpx, hpx):
    """A white tapered tower with a black gallery, lantern and cap (3/4 view). (cx, cy) is
    the footprint centre in image px, rpx its radius, hpx the total height; lit from the left."""
    rb = max(3.0, rpx)
    rt = rb * 0.7
    base = cy + rb * 0.55                      # the wall meets the ground on the near side
    # the footprint itself is wall-coloured (seen from above, inside the tower)
    draw.ellipse([cx - rb, cy - rb * 0.6, cx + rb, cy + rb * 0.6], fill=P["K3"])
    gh = max(1.0, hpx * 0.03)
    lh = max(4.0, hpx * 0.12)
    cap = max(3.0, hpx * 0.06)
    body = max(4.0, hpx - gh - lh - cap)      # hpx is the whole tower, cap included
    ytop = base - body
    for x in range(int(math.floor(cx - rb)), int(math.ceil(cx + rb)) + 1):
        for y in range(int(ytop), int(base) + 1):
            t = (base - y) / max(1.0, body)
            r_here = rb + (rt - rb) * t
            uu = (x + 0.5 - cx) / r_here
            if abs(uu) <= 1:
                draw.point((x, y), fill=P["WH"] if uu < -0.1 else (P["K4"] if uu < 0.5 else P["K3"]))
    draw.line([(cx - rb, base), (cx - rt, ytop)], fill=P["K0"])
    draw.line([(cx + rb, base), (cx + rt, ytop)], fill=P["K0"])
    draw.arc([cx - rb, base - rb * 0.5, cx + rb, base + rb * 0.5], 0, 180, fill=P["K0"])
    # gallery: a black walkway wider than the top of the tower, with a railing line
    gw = rt + max(1.5, rb * 0.35)
    draw.rectangle([cx - gw, ytop - gh, cx + gw, ytop], fill=P["K0"])
    # lantern room: black frame, glass panes catching the light on the left
    lw = max(2.0, rt * 0.8)
    ly1 = ytop - gh
    ly0 = ly1 - lh
    draw.rectangle([cx - lw, ly0, cx + lw, ly1], fill=P["K0"])
    draw.rectangle([cx - lw + 1, ly0 + 1, cx + lw - 1, ly1 - 1], fill=P["W1"])
    draw.rectangle([cx - lw + 1, ly0 + 1, cx - 0.5, ly1 - 1], fill=P["W2"])
    draw.line([(cx, ly0), (cx, ly1)], fill=P["K0"])
    # cap and vent
    draw.polygon([(cx - lw - 1, ly0), (cx + lw + 1, ly0), (cx, ly0 - cap)], fill=P["K0"])
    draw.rectangle([cx - 0.5, ly0 - cap - 2, cx + 0.5, ly0 - cap], fill=P["K0"])


def wave_mask(H, W, phase):
    rows = np.arange(H)[:, None]
    cols = np.arange(W)[None, :]
    off = (rows // 6 % 2) * 9 + phase
    a = (rows % 6 == 0) & (((cols + off) % 18) < 3)
    b = (rows % 6 == 5) & (((cols + off) % 18) == 1)
    return a | b


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    bdir = build_dir(name)
    art = bdir / "art"
    art.mkdir(exist_ok=True)
    P = load_palette(cfg["theme"])
    lut = build_lut(P, load_theme(cfg["theme"]).get("lut"))
    surf = np.load(bdir / "surface.npy")
    H, W = surf.shape
    range_cells = surf == S["range"]
    if cfg.get("range_art") == "rough":
        # optional: a range that is rough on the ground (Oregon Golf Club) is drawn as
        # rough, without mowing stripes or range balls; it stays out of bounds in the
        # surface map and is marked by a line of OB stakes along its edge
        surf = surf.copy()
        surf[range_cells] = S["rough"]
    base = np.load(bdir / "height_base.npy").astype(np.float64)
    greens = json.load(open(bdir / "greens.json"))
    holes = json.load(open(bdir / "holes.json"))
    trees = json.load(open(bdir / "trees.json"))
    g = gpd.read_file(bdir / "course_local.geojson")
    rng = np.random.default_rng(20261018)

    z = terrain_z_px(world, base, greens, H, W)
    np.save(bdir / "z_px.npy", z.astype(np.float32))
    tone, shade = hillshade_tone(z, surf)
    stripe = stripe_field(world, g, holes, surf, H, W, layouts(cfg)[0]["default_tee"])

    t = tone.astype(np.int16)
    # textures -----------------------------------------------------------
    n1 = rng.random((H, W))
    n2 = np.kron(rng.random((H // 2 + 1, W // 2 + 1)), np.ones((2, 2)))[:H, :W]
    grassy = np.isin(surf, [S["rough"], S["ob"], S["woods"], S["ob_woods"], S["range"], S["ob_building"], S["building"]])
    t = t + np.where(grassy & (n2 < 0.07), -1, 0) + np.where(grassy & (n2 > 0.95), 1, 0)
    fine = np.isin(surf, [S["fairway"], S["fringe"], S["tee"]])
    t = t + np.where(fine & (n1 < 0.025), -1, 0) + np.where(fine & (n1 > 0.985), 1, 0)
    # stripes on fairway / tee / range
    striped = np.isin(surf, [S["fairway"], S["tee"], S["range"]])
    t = t + np.where(striped, stripe, 0)
    # greens: fine 1 m checker
    rows = np.arange(H)[:, None]
    cols = np.arange(W)[None, :]
    checker = ((rows // 2 + cols // 2) % 2).astype(np.int16)
    gm_ = surf == S["green"]
    t = np.where(gm_, np.clip(t, 0, 2) + np.where(checker == 1, 0, 0), t)
    t = np.clip(t, 0, 3)
    rgb = lut[surf, t]
    tr_px = Affine(1 / PX_PER_M, 0, 0, 0, -1 / PX_PER_M, world.height)
    Xw, Yw = np.meshgrid((np.arange(W) + 0.5) / PX_PER_M, world.height - (np.arange(H) + 0.5) / PX_PER_M)
    mown = rough_band_mask(cfg, g, surf, lambda geoms: rasterize([(gg, 1) for gg in geoms], out_shape=(H, W), transform=tr_px, fill=0, dtype="uint8").astype(bool), Xw, Yw, PX_PER_M)
    del Xw, Yw
    blut = band_lut(P, load_theme(cfg["theme"]))
    rgb[mown] = blut[t[mown]]
    # green checker as a subtle 2-colour weave
    G7b = np.array(P["G7"], np.int16) + np.array([6, 5, 4])
    sel = gm_ & (checker == 1) & (tone == 1)
    rgb[sel] = np.clip(G7b, 0, 255).astype(np.uint8)
    # speckles
    def put(mask, col):
        rgb[mask] = P[col]
    put((surf == S["bunker"]) & (n1 < 0.035), "S0")
    put((surf == S["bunker"]) & (n1 > 0.97), "S2")
    put((surf == S["woods"]) & (n1 < 0.10), "B1")
    put((surf == S["woods"]) & (n1 > 0.96), "B0")
    put((surf == S["ob_woods"]) & (n1 < 0.05), "B0")
    put((surf == S["ob_road"]) & (n1 < 0.03), "K2")
    put((surf == S["cartpath"]) & (n1 < 0.04), "K2")
    rough = surf == S["rough"]
    # rough tufts: small vertical 2-px marks in the lit tone
    tuft = rough & ~mown & (n1 > 0.992)
    tuft2 = np.zeros_like(tuft)
    tuft2[:-1] = tuft[1:]
    put(tuft | tuft2, "TUFT" if "TUFT" in P else "G5")
    # range balls
    if cfg.get("range_art") != "rough":  # a range drawn as rough shows only its OB stakes (developer, Oregon Golf Club)
        put(range_cells & (n1 > 0.9975), "WH")

    # outlines -----------------------------------------------------------
    pr = PRIO[surf]
    edge = np.zeros((H, W), bool)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = np.roll(np.roll(pr, dy, 0), dx, 1)
        edge |= sh > pr
    own_edge = np.zeros((H, W), bool)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = np.roll(np.roll(surf, dy, 0), dx, 1)
        own_edge |= sh != surf
    soft = edge & np.isin(surf, [S["rough"], S["fairway"], S["fringe"], S["tee"], S["ob"], S["woods"], S["range"], S["cartpath"]])
    rgb[soft] = lut[surf[soft], 0]
    rgb[soft & mown] = blut[0]
    put(own_edge & (surf == S["bunker"]), "S0")
    put(own_edge & np.isin(surf, [S["water"], S["ob_water"]]), "W0")
    put(own_edge & (surf == S["green"]), "G6")
    # bunker inner lip shadow (NW inside edge darker)
    bunk = surf == S["bunker"]
    nw = bunk & ~np.roll(np.roll(bunk, 2, 0), 2, 1)
    put(nw & ~own_edge, "S0")

    # water waves (frame 0 baked) --------------------------------------------
    wat = np.isin(surf, [S["water"], S["ob_water"]])
    wm = wave_mask(H, W, 0) & wat & ~own_edge
    put(wm, "W2")

    # road centre lines --------------------------------------------------------
    tr = Affine(1 / PX_PER_M, 0, 0, 0, -1 / PX_PER_M, world.height)
    major = [r.geometry for _, r in g[g.kind == "highway"].iterrows() if r.tags.get("highway") in ("primary", "secondary", "tertiary")]
    if major:
        cl = rasterize([(geom, 1) for geom in major], out_shape=(H, W), transform=tr, fill=0, dtype="uint8").astype(bool)
        dash = ((rows + cols) // 5 % 2 == 0)
        put(cl & dash & (surf == S["ob_road"]), "S0")

    # shadows (trees + buildings) ---------------------------------------------
    sh_img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(sh_img)
    for tr_ in trees:
        cx, cy = tr_["x"] * PX_PER_M, (world.height - tr_["y"]) * PX_PER_M
        rpx = max(3.0, tr_["r"] * PX_PER_M)
        hpx = tr_["h"] * HEIGHT_PX_PER_M
        L = 0.45 * hpx
        ex, ey = cx + SHADOW_DIR[0] * L * 0.5, cy + SHADOW_DIR[1] * L * 0.5
        a = L * 0.5 + rpx * 0.55
        b = rpx * (0.62 if tr_["type"] == "conifer" else 0.85)
        ang = math.atan2(SHADOW_DIR[1], SHADOW_DIR[0])
        pts = []
        for k in range(20):
            th = 2 * math.pi * k / 20
            px_, py_ = a * math.cos(th), b * math.sin(th)
            pts.append((ex + px_ * math.cos(ang) - py_ * math.sin(ang), ey + px_ * math.sin(ang) + py_ * math.cos(ang)))
        d.polygon(pts, fill=255)
    chm = np.load(bdir / "chm_local.npy")
    pieces = building_pieces(g, chm)
    kinds = {o: k for _, _, o, k in pieces}
    buildings = [(poly, hb, o) for poly, hb, o, _ in pieces]
    for poly, hb, o in buildings:
        wall = hb * HEIGHT_PX_PER_M * (LIGHTHOUSE_DRAW_SCALE if kinds.get(o) == "lighthouse" else 1.0)
        L = wall * 0.9
        pp = [(x * PX_PER_M, (world.height - y) * PX_PER_M) for x, y in poly.exterior.coords]
        for tt in np.linspace(0, 1, 7):
            d.polygon([(x + SHADOW_DIR[0] * L * tt, y + SHADOW_DIR[1] * L * tt) for x, y in pp], fill=255)
    shadow = np.array(sh_img) > 0
    shadow &= ~np.isin(surf, [S["ob_building"], S["building"]])
    rgb[shadow] = (rgb[shadow].astype(np.float32) * SHADOW_MULT).astype(np.uint8)
    np.save(bdir / "shadow.npy", shadow)

    # buildings in 3/4 view ----------------------------------------------------
    roof_sets = [("R0", "K1"), ("B1", "B0"), ("B2", "B1"), ("K2", "K1"), ("R0", "K0")]
    # optional (config "building_colours": {osm id: "#rrggbb"}): a building painted in its own
    # colour, walls and roof, outside the theme palette (Langdon Farms' red barns, developer 2026-10-19)
    bcol = {k: hex2rgb(v) for k, v in cfg.get("building_colours", {}).items()}
    shade = lambda c, f: tuple(int(round(v * f)) for v in c)  # noqa: E731
    img = Image.fromarray(rgb)
    draw = ImageDraw.Draw(img)
    buildings.sort(key=lambda b: -b[0].centroid.y)  # north first
    for poly, hb, osm in buildings:
        wall = max(2, int(round(hb * HEIGHT_PX_PER_M)))
        if kinds.get(osm) == "lighthouse":
            c = poly.centroid
            draw_lighthouse(draw, P, c.x * PX_PER_M, (world.height - c.y) * PX_PER_M, math.sqrt(poly.area / math.pi) * PX_PER_M, wall * LIGHTHOUSE_DRAW_SCALE)
            continue
        pp = [(x * PX_PER_M, (world.height - y) * PX_PER_M) for x, y in poly.exterior.coords]
        roof = [(x, y - wall) for x, y in pp]
        # walls: one quad per footprint edge that faces the viewer (down)
        ring = Polygon(pp)
        orient_ccw = ring.exterior.is_ccw
        for (ax, ay), (bx, by) in zip(pp[:-1], pp[1:]):
            ex_, ey_ = bx - ax, by - ay
            # outward normal in screen coords (y down)
            # outward normal: right of the edge for a counter-clockwise ring (as shapely reads the y-down coords)
            nx_, ny_ = (ey_, -ex_) if orient_ccw else (-ey_, ex_)
            if ny_ <= 0:
                continue
            col = P["K4"] if nx_ < -0.3 * abs(ny_) else (P["K3"] if nx_ <= 0.6 * abs(ny_) else P["K2"])
            if osm.split(":")[0] in bcol:
                bc = bcol[osm.split(":")[0]]
                col = bc if nx_ < -0.3 * abs(ny_) else (shade(bc, 0.82) if nx_ <= 0.6 * abs(ny_) else shade(bc, 0.66))
            draw.polygon([(ax, ay), (bx, by), (bx, by - wall), (ax, ay - wall)], fill=col)
        lit, dark = roof_sets[sum(map(ord, osm)) % len(roof_sets)]
        lit_c, dark_c = P[lit], P[dark]
        if osm.split(":")[0] in bcol:
            lit_c, dark_c = shade(bcol[osm.split(":")[0]], 0.92), shade(bcol[osm.split(":")[0]], 0.72)
        draw.polygon(roof, fill=lit_c)
        # ridge split: lower-right half of the roof is darker
        rp = Polygon(roof)
        mrr = rp.minimum_rotated_rectangle
        xy = list(mrr.exterior.coords)
        e = max(((xy[i], xy[i + 1]) for i in range(4)), key=lambda ab: math.dist(*ab))
        cxr, cyr = rp.centroid.x, rp.centroid.y
        ux, uy = e[1][0] - e[0][0], e[1][1] - e[0][1]
        ln = math.hypot(ux, uy) or 1
        ux, uy = ux / ln, uy / ln
        nxr, nyr = -uy, ux
        if nxr + nyr < 0:
            nxr, nyr = -nxr, -nyr
        big = 400
        half = Polygon([(cxr - ux * big, cyr - uy * big), (cxr + ux * big, cyr + uy * big),
                        (cxr + ux * big + nxr * big, cyr + uy * big + nyr * big), (cxr - ux * big + nxr * big, cyr - uy * big + nyr * big)])
        dh = rp.intersection(half)
        for part in getattr(dh, "geoms", [dh]):
            if part.geom_type == "Polygon" and part.area > 1:
                draw.polygon(list(part.exterior.coords), fill=dark_c)
        # outline
        sil = unary_union([rp, Polygon(pp).buffer(0)] + [Polygon([(ax, ay), (bx, by), (bx, by - wall), (ax, ay - wall)]).buffer(0) for (ax, ay), (bx, by) in zip(pp[:-1], pp[1:])])
        for part in getattr(sil, "geoms", [sil]):
            if part.geom_type == "Polygon":
                draw.line(list(part.exterior.coords), fill=P["K0"], width=1)
        draw.line(list(rp.exterior.coords), fill=P["K0"], width=1)
    rgb = np.array(img)

    # OB stakes along the boundary ------------------------------------------
    for ring, poly, ob_inside in stake_lines(boundary_rings(g, cfg), g, cfg):
        for s_ in np.arange(0, ring.length, 9.0):
            p = ring.interpolate(s_)
            q = ring.interpolate(min(ring.length, s_ + 0.5))
            dx, dy = q.x - p.x, q.y - p.y
            ln = math.hypot(dx, dy) or 1
            nx_, ny_ = dy / ln, -dx / ln  # right-hand normal
            cand = Point(p.x + nx_ * 0.8, p.y + ny_ * 0.8)
            if poly.contains(cand) != ob_inside:
                cand = Point(p.x - nx_ * 0.8, p.y - ny_ * 0.8)
            col = int(cand.x * PX_PER_M)
            row = int((world.height - cand.y) * PX_PER_M)
            if 2 <= row < H - 1 and 0 <= col < W - 1:
                rgb[row + 1, col + 1] = (rgb[row + 1, col + 1] * 0.6).astype(np.uint8)
                rgb[row - 2:row + 1, col] = P["WH"]
                rgb[row - 2, col] = P["K2"]

    Image.fromarray(rgb).save(art / "terrain.png")
    meta = {"buildings": [{"osm": o, "h": round(h, 1), **({"kind": kinds[o]} if kinds.get(o) != "house" else {})} for _, h, o in buildings]}
    write_json(art / "render_meta.json", meta)
    print(f"[s09] terrain {W}x{H}, {len(np.unique(rgb.reshape(-1, 3), axis=0))} colours, {len(buildings)} buildings")


if __name__ == "__main__":
    main()

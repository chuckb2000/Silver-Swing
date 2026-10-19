"""Step 10b (5.7.2): bake the terrain art from the surface map.

Per pixel (0.5 m): surface base colour from the PNW palette, a posterised
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

from common import PX_PER_M, ROOT, SURF, World, build_dir, course_name_from_argv, load_config, write_json

warnings.filterwarnings("ignore")

S = SURF
BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0 - 0.5
SHADOW_MULT = 0.64           # ~35% black overlay
SHADOW_DIR = np.array([0.8, 0.6])  # screen px direction (right, down)
HEIGHT_PX_PER_M = PX_PER_M * 0.7   # vertical objects: 1.4 px per metre of height


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_palette():
    d = json.load(open(ROOT / "assets-src" / "palettes" / "pnw.json"))
    return {k: hex2rgb(v) for k, v in d["colors"].items()}


def build_lut(P):
    """surface id -> 4 tones (shadow, base, lit, extra-lit)."""
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
    }
    lut = np.zeros((32, 4, 3), np.uint8)
    for sid, names in t.items():
        for i, n in enumerate(names):
            lut[sid, i] = P[n]
    return lut


# outline priority: a pixel next to a higher-priority surface takes its own shadow tone
PRIO = np.zeros(32, np.int16)
for k, v in {"ob_woods": 1, "ob": 2, "ob_building": 2, "ob_road": 3, "ob_water": 4, "woods": 5, "rough": 6,
             "range": 7, "fairway": 8, "fringe": 9, "cartpath": 10, "tee": 11, "bunker": 12, "green": 13,
             "water": 14, "building": 15}.items():
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


def stripe_field(world, g, holes, surf, H, W):
    """+1 tone on alternate 4 m (fairway) / 2 m (tee) bands parallel to the hole line."""
    stripe = np.zeros((H, W), np.int8)
    tr = Affine(1 / PX_PER_M, 0, 0, 0, -1 / PX_PER_M, world.height)
    centerlines = [(h["number"], LineString(h["tees"]["Blue"]["centerline"])) for h in holes]
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
    P = load_palette()
    lut = build_lut(P)
    surf = np.load(bdir / "surface.npy")
    H, W = surf.shape
    base = np.load(bdir / "height_base.npy").astype(np.float64)
    greens = json.load(open(bdir / "greens.json"))
    holes = json.load(open(bdir / "holes.json"))
    trees = json.load(open(bdir / "trees.json"))
    g = gpd.read_file(bdir / "course_local.geojson")
    rng = np.random.default_rng(20261018)

    z = terrain_z_px(world, base, greens, H, W)
    np.save(bdir / "z_px.npy", z.astype(np.float32))
    tone, shade = hillshade_tone(z, surf)
    stripe = stripe_field(world, g, holes, surf, H, W)

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
    tuft = rough & (n1 > 0.992)
    tuft2 = np.zeros_like(tuft)
    tuft2[:-1] = tuft[1:]
    put(tuft | tuft2, "G5")
    # range balls
    put((surf == S["range"]) & (n1 > 0.9975), "WH")

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
    buildings = []
    for _, r in g[g.kind == "building"].iterrows():
        geom = r.geometry
        polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        for poly in polys:
            if poly.area < 4:
                continue
            hb = None
            if "height" in r.tags:
                try:
                    hb = float(str(r.tags["height"]).split()[0])
                except ValueError:
                    hb = None
            if hb is None:
                m = rasterize([(poly, 1)], out_shape=chm.shape, transform=Affine(1, 0, 0, 0, 1, 0), fill=0, dtype="uint8").astype(bool)
                vals = chm[m]
                hb = float(np.median(vals)) if vals.size else 6.0
            hb = float(np.clip(hb, 3.0, 14.0))
            buildings.append((poly, hb, r.osm))
    for poly, hb, _ in buildings:
        wall = hb * HEIGHT_PX_PER_M
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
    img = Image.fromarray(rgb)
    draw = ImageDraw.Draw(img)
    buildings.sort(key=lambda b: -b[0].centroid.y)  # north first
    for poly, hb, osm in buildings:
        wall = max(2, int(round(hb * HEIGHT_PX_PER_M)))
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
            draw.polygon([(ax, ay), (bx, by), (bx, by - wall), (ax, ay - wall)], fill=col)
        lit, dark = roof_sets[sum(map(ord, osm)) % len(roof_sets)]
        draw.polygon(roof, fill=P[lit])
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
                draw.polygon(list(part.exterior.coords), fill=P[dark])
        # outline
        sil = unary_union([rp, Polygon(pp).buffer(0)] + [Polygon([(ax, ay), (bx, by), (bx, by - wall), (ax, ay - wall)]).buffer(0) for (ax, ay), (bx, by) in zip(pp[:-1], pp[1:])])
        for part in getattr(sil, "geoms", [sil]):
            if part.geom_type == "Polygon":
                draw.line(list(part.exterior.coords), fill=P["K0"], width=1)
        draw.line(list(rp.exterior.coords), fill=P["K0"], width=1)
    rgb = np.array(img)

    # OB stakes along the boundary ------------------------------------------
    boundary = g[g.kind == "boundary"].geometry.iloc[0]
    if boundary.geom_type == "MultiPolygon":
        boundary = max(boundary.geoms, key=lambda p_: p_.area)
    ring = boundary.exterior
    for s_ in np.arange(0, ring.length, 9.0):
        p = ring.interpolate(s_)
        q = ring.interpolate(min(ring.length, s_ + 0.5))
        dx, dy = q.x - p.x, q.y - p.y
        ln = math.hypot(dx, dy) or 1
        nx_, ny_ = dy / ln, -dx / ln  # right-hand normal
        cand = Point(p.x + nx_ * 0.8, p.y + ny_ * 0.8)
        if boundary.contains(cand):
            cand = Point(p.x - nx_ * 0.8, p.y - ny_ * 0.8)
        col = int(cand.x * PX_PER_M)
        row = int((world.height - cand.y) * PX_PER_M)
        if 2 <= row < H - 1 and 0 <= col < W - 1:
            rgb[row + 1, col + 1] = (rgb[row + 1, col + 1] * 0.6).astype(np.uint8)
            rgb[row - 2:row + 1, col] = P["WH"]
            rgb[row - 2, col] = P["K2"]

    Image.fromarray(rgb).save(art / "terrain.png")
    meta = {"buildings": [{"osm": o, "h": round(h, 1)} for _, h, o in buildings]}
    write_json(art / "render_meta.json", meta)
    print(f"[s09] terrain {W}x{H}, {len(np.unique(rgb.reshape(-1, 3), axis=0))} colours, {len(buildings)} buildings")


if __name__ == "__main__":
    main()

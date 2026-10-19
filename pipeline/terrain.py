"""Terrain height function shared by the pipeline (rendering, checks).

It mirrors game/src/systems/physics/terrain.ts exactly:
  z(x, y) = lerp(base(x, y), greenModel(x, y), w(x, y))
where base is the bilinear 1 m heightmap and w is 1 inside a green polygon,
falling to 0 over `blend` metres outside it (smoothstep).
"""
from __future__ import annotations

import math

import numpy as np
from shapely.geometry import Point, Polygon


def smoothstep(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def tier_offset(x, y, tiers):
    """Height added by tier lines (two-tiered greens); scalars or numpy arrays.

    Each tier {x, y, nx, ny, w, h} is a smooth step of height h across the line
    through (x, y) with unit normal (nx, ny) pointing to the upper tier, w metres
    wide, centred so the green's mean height is unchanged:
        h * (smoothstep(d / w + 0.5) - 0.5),  d = (p - (x, y)) . n
    Mirrors tierOffset() in game/src/systems/physics/terrain.ts.
    """
    z = 0.0
    for t in tiers:
        u = np.clip(((x - t["x"]) * t["nx"] + (y - t["y"]) * t["ny"]) / t["w"] + 0.5, 0.0, 1.0)
        z = z + t["h"] * (u * u * (3 - 2 * u) - 0.5)
    return z


class GreenModel:
    def __init__(self, d: dict):
        self.d = d
        self.poly = Polygon(d["poly"])
        self.prep_bounds = self.poly.buffer(d["blend"]).bounds

    def model(self, x, y):
        d = self.d
        z = d["z0"] + d["gx"] * (x - d["cx"]) + d["gy"] * (y - d["cy"])
        for b in d["bumps"]:
            dx, dy = x - b["x"], y - b["y"]
            z += b["a"] * math.exp(-(dx * dx + dy * dy) / (2 * b["s"] * b["s"]))
        if d.get("tiers"):
            z += float(tier_offset(x, y, d["tiers"]))
        return z

    def shaped(self, x, y):
        d = self.d
        z = self.model(x, y)
        pf = d.get("pinFlat")
        if pf:
            px, py = pf["px"], pf["py"]
            dist = math.hypot(x - px, y - py)
            wp = 1 - smoothstep((dist - pf["r0"]) / (pf["r1"] - pf["r0"]))
            if wp > 0:
                zp = pf["zp"] + pf["fx"] * (x - px) + pf["fy"] * (y - py)
                z = z + (zp - z) * wp
        return z

    def weight(self, x, y):
        b = self.prep_bounds
        if x < b[0] or x > b[2] or y < b[1] or y > b[3]:
            return 0.0
        p = Point(x, y)
        if self.poly.contains(p):
            return 1.0
        dist = self.poly.exterior.distance(p)
        return 1 - smoothstep(dist / self.d["blend"])


class Terrain:
    def __init__(self, base: np.ndarray, greens: list[dict]):
        self.base = base  # rows = y (south->north) at whole metres
        self.greens = [GreenModel(g) for g in greens]

    def base_z(self, x, y):
        a = self.base
        H, W = a.shape
        x = min(max(x, 0.0), W - 1.000001)
        y = min(max(y, 0.0), H - 1.000001)
        i, j = int(x), int(y)
        fx, fy = x - i, y - j
        z00, z10 = a[j, i], a[j, i + 1]
        z01, z11 = a[j + 1, i], a[j + 1, i + 1]
        return (z00 * (1 - fx) + z10 * fx) * (1 - fy) + (z01 * (1 - fx) + z11 * fx) * fy

    def z(self, x, y):
        zb = self.base_z(x, y)
        for g in self.greens:
            w = g.weight(x, y)
            if w > 0:
                return zb + (g.shaped(x, y) - zb) * w
        return zb

    def grid(self, x0, y0, x1, y1, step):
        """Evaluate z on a grid (for rendering); returns array rows south->north."""
        xs = np.arange(x0, x1, step)
        ys = np.arange(y0, y1, step)
        X, Y = np.meshgrid(xs, ys)
        # vectorised bilinear base
        a = self.base
        H, W = a.shape
        xc = np.clip(X, 0, W - 1.000001)
        yc = np.clip(Y, 0, H - 1.000001)
        i = xc.astype(int)
        j = yc.astype(int)
        fx = xc - i
        fy = yc - j
        z = (a[j, i] * (1 - fx) + a[j, i + 1] * fx) * (1 - fy) + (a[j + 1, i] * (1 - fx) + a[j + 1, i + 1] * fx) * fy
        for g in self.greens:
            bx0, by0, bx1, by1 = g.prep_bounds
            sel = (X >= bx0) & (X <= bx1) & (Y >= by0) & (Y <= by1)
            idx = np.argwhere(sel)
            for (r, c) in idx:
                w = g.weight(X[r, c], Y[r, c])
                if w > 0:
                    z[r, c] = z[r, c] + (g.shaped(X[r, c], Y[r, c]) - z[r, c]) * w
        return z

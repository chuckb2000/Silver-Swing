"""The practice ground (player improvements, item 5): a driving range with five
target greens at 50-250 yd and four practice putting greens (flat, 1 %, 2 % and
two-tier), built through the normal pipeline so it looks and plays like the
courses. Synthetic and not a real place (a practice ground is no course to copy;
CLAUDE.md hard rule 1 is about real courses): every shape here is made up.

Writes raw/practice.geojson (Overpass-style, WGS84), raw/dtm.tif and raw/chm.tif
(EPSG:32610, metres, a made-up spot at x 500000 / y 5000000) and scorecard.csv.
Run: python3 data/practice/make_practice.py  (then make course NAME=practice)
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
X0, Y0 = 500000.0, 5000000.0   # the world's south-west corner (EPSG:32610)
W, H = 512, 512                # world size, metres
PAD = 100                      # raster beyond the world
YD = 0.9144
to_ll = Transformer.from_crs(32610, 4326, always_xy=True)

TEES_Y = 40.0
TEE_XS = [196.0, 206.0, 216.0, 226.0, 236.0]       # range stalls, one per target
TARGET_YD = [50, 100, 150, 200, 250]
TARGET_DX = [-14.0, 18.0, -24.0, 22.0, -6.0]       # targets left and right of the stalls
TARGET_R = [6.5, 7.5, 9.0, 10.0, 11.0]
PUTT_C = [(392.0, 86.0), (392.0, 150.0), (392.0, 214.0), (392.0, 278.0)]  # flat, 1 %, 2 %, two-tier
PUTT_R = 11.5
BASE_Z = 20.0


def ll(x, y):
    lon, lat = to_ll.transform(X0 + x, Y0 + y)
    return [round(lon, 8), round(lat, 8)]


def ring(pts):
    p = [ll(x, y) for x, y in pts]
    return p + [p[0]]


def circle(cx, cy, r, n=40, sx=1.0, sy=1.0):
    return [(cx + sx * r * math.cos(2 * math.pi * k / n), cy + sy * r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def rounded_rect(x0, y0, x1, y1, r, n=6):
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


feats = []
nid = [1000]


def add(geom_type, coords, tags, kind="way"):
    nid[0] += 1
    feats.append({"type": "Feature", "id": f"{kind}/{nid[0]}", "properties": tags,
                  "geometry": {"type": geom_type, "coordinates": coords}})


def targets():
    out = []
    cx = TEE_XS[2]
    for i, yd in enumerate(TARGET_YD):
        d = yd * YD
        dx = TARGET_DX[i]
        out.append((cx + dx, TEES_Y + 3 + math.sqrt(d * d - dx * dx)))
    return out


def main():
    add("Polygon", [ring(rounded_rect(30, 14, 482, 470, 30))], {"leisure": "golf_course", "name": "Practice Ground"})
    # range: one wide mown strip from the stalls to past the last target
    add("Polygon", [ring(rounded_rect(140, 52, 296, 372, 22))], {"golf": "fairway"})
    for i, (x, (tx, ty)) in enumerate(zip(TEE_XS, targets())):
        n = i + 1
        add("Polygon", [ring(rect(x - 4, TEES_Y - 3, x + 4, TEES_Y + 3))], {"golf": "tee", "hole": str(n), "tee_set": "Practice"})
        add("Polygon", [ring(circle(tx, ty, TARGET_R[i]))], {"golf": "green"})
        add("Point", ll(tx, ty), {"golf": "pin", "ref": str(n)}, "node")
        add("LineString", [ll(x, TEES_Y), ll(tx, ty)], {"golf": "hole", "ref": str(n), "par": "3", "name": f"{TARGET_YD[i]} yd target"})
        # a bunker beside the far targets
        if i >= 2:
            side = 1 if TARGET_DX[i] < 0 else -1
            add("Polygon", [ring(circle(tx + side * (TARGET_R[i] + 6), ty - 3, 4.0, 24, 1.3, 0.8))], {"golf": "bunker"})
    # a pond out on the range (between the 150 and 200 yd targets)
    add("Polygon", [ring(circle(256, 210, 13, 36, 1.2, 0.8))], {"natural": "water", "golf": "lateral_water_hazard"})
    # putting greens with a short apron and a "tee" (the start spot) south-west of each
    for k, (cx, cy) in enumerate(PUTT_C):
        n = 6 + k
        add("Polygon", [ring(rounded_rect(cx - 22, cy - 22, cx + 22, cy + 22, 8))], {"golf": "fairway"})
        add("Polygon", [ring(circle(cx, cy, PUTT_R, 48))], {"golf": "green"})
        add("Point", ll(cx, cy), {"golf": "pin", "ref": str(n)}, "node")
        tx, ty = cx - 18.0, cy - 12.0
        add("Polygon", [ring(rect(tx - 2.5, ty - 2, tx + 2.5, ty + 2))], {"golf": "tee", "hole": str(n), "tee_set": "Practice"})
        add("LineString", [ll(tx, ty), ll(cx, cy)], {"golf": "hole", "ref": str(n), "par": "3", "name": ["flat", "1 %", "2 %", "two tiers"][k]})
    # a shed by the stalls, a path to the putting greens
    add("Polygon", [ring(rect(150, 20, 168, 32))], {"building": "yes", "name": "range shed"})
    add("LineString", [ll(250, 36), ll(320, 40), ll(360, 60), ll(366, 300)], {"golf": "cartpath", "highway": "path"})
    json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "raw" / "practice.geojson", "w"), indent=1)

    # ground: a gentle rise to the north over the range; each putting green its own plane
    xs = np.arange(-PAD, W + PAD) + 0.5
    ys = np.arange(H + PAD - 1, -PAD - 1, -1) + 0.5  # rows north -> south
    X, Y = np.meshgrid(xs, ys)
    z = BASE_Z + 0.004 * Y + 0.6 * np.sin(X / 70.0) * np.cos(Y / 90.0)
    planes = [(0.0, 0.0), (-0.007, -0.007), (0.02, 0.0), (0.0, -0.01)]  # (dz/dx, dz/dy) per green: flat, 1 % to the SW, 2 % to the W... east up
    for (cx, cy), (gx, gy) in zip(PUTT_C, planes):
        d = np.hypot(X - cx, Y - cy)
        zc = BASE_Z + 0.004 * cy + 0.6 * math.sin(cx / 70.0) * math.cos(cy / 90.0)
        plane = zc + gx * (X - cx) + gy * (Y - cy)
        w = np.clip((PUTT_R + 6 - d) / 6, 0, 1)  # the plane over the green, blended out over 6 m
        z = z * (1 - w) + plane * w
    # range targets sit on small raised pads
    for (tx, ty), r in zip(targets(), TARGET_R):
        d = np.hypot(X - tx, Y - ty)
        z += 0.35 * np.clip((r + 4 - d) / 4, 0, 1)
    tr = from_origin(X0 - PAD, Y0 + H + PAD, 1.0, 1.0)
    prof = dict(driver="GTiff", height=z.shape[0], width=z.shape[1], count=1, dtype="float32", crs="EPSG:32610", transform=tr)
    with rasterio.open(HERE / "raw" / "dtm.tif", "w", **prof) as f:
        f.write(z.astype(np.float32), 1)
    # trees: woods along the west and north edges, a line between range and putting greens, a few by the shed
    rng = np.random.default_rng(5)
    chm = np.zeros_like(z)
    spots = []
    for _ in range(140):
        spots.append((rng.uniform(-60, 120), rng.uniform(-40, 552)))
    for _ in range(90):
        spots.append((rng.uniform(100, 560), rng.uniform(400, 560)))
    for _ in range(70):
        spots.append((rng.uniform(470, 570), rng.uniform(-40, 420)))
    for y in np.arange(70, 360, 13):
        spots.append((326 + rng.uniform(-3, 3), y + rng.uniform(-3, 3)))
    spots += [(120, 30), (130, 44), (182, 22)]
    for x, y in spots:
        h = rng.uniform(12, 24)
        r = h * rng.uniform(0.18, 0.28)
        d = np.hypot(X - x, Y - y)
        chm = np.maximum(chm, np.where(d < r, h * np.sqrt(np.clip(1 - (d / r) ** 2, 0, 1)) ** 0.5, 0))
    with rasterio.open(HERE / "raw" / "chm.tif", "w", **prof) as f:
        f.write(chm.astype(np.float32), 1)

    with open(HERE / "scorecard.csv", "w", newline="") as f:
        wtr = csv.writer(f)
        wtr.writerow(["hole", "par", "handicap", "practice"])
        for i, ((tx, ty), x) in enumerate(zip(targets(), TEE_XS)):
            wtr.writerow([i + 1, 3, i + 1, round(math.hypot(tx - x, ty - TEES_Y) / YD)])
        for k, (cx, cy) in enumerate(PUTT_C):
            wtr.writerow([6 + k, 3, 6 + k, round(math.hypot(18, 12) / YD)])
    print(f"[practice] {len(feats)} features, {len(spots)} trees, dtm {z.min():.1f}-{z.max():.1f} m")


if __name__ == "__main__":
    main()

"""Title-screen art (mockups for the developer to choose from): the silver
trophy logo and a side-view panorama through the courses' landmarks.

    python3 assets-src/title_art.py <out_dir>

Everything is drawn here with numpy masks: flat colour bands, 1-px outlines,
light from the upper left, no gradients (dithered steps only).
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent


def rgba(h: str, a: int = 255) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [a], np.uint8)


def grid(w: int, h: int):
    y, x = np.mgrid[0:h, 0:w]
    return x + 0.5, y + 0.5


def ring_of(m: np.ndarray) -> np.ndarray:
    r = np.zeros_like(m)
    r[1:, :] |= m[:-1, :]
    r[:-1, :] |= m[1:, :]
    r[:, 1:] |= m[:, :-1]
    r[:, :-1] |= m[:, 1:]
    return r & ~m


def paint(img, m, col):
    img[m] = col


# ------------------------------------------------------------------ trophy
SILVER = {
    "hi": rgba("#ffffff"), "light": rgba("#e3e8ee"), "mid": rgba("#b9c1cb"), "dark": rgba("#8a939f"),
    "deep": rgba("#5c6470"), "edge": rgba("#141820"), "wood": rgba("#3a2618"), "wood_l": rgba("#5a3c26"),
    "plate": rgba("#d8b25a"), "plate_d": rgba("#a8843a"),
}


def trophy(W: int = 56, H: int = 72) -> np.ndarray:
    """A large silver loving cup: lidded bowl, two tall handles, stem, stepped foot, wooden plinth."""
    c = SILVER
    X, Y = grid(W, H)
    cx = W / 2
    img = np.zeros((H, W, 4), np.uint8)
    # handles first (behind the bowl): tall loops from the rim down to the bowl's waist
    handles = np.zeros(X.shape, bool)
    for s in (-1, 1):
        hx, hy = cx + s * 15.5, 24.0
        d = ((X - hx) / 9.0) ** 2 + ((Y - hy) / 12.0) ** 2
        loop = (d <= 1.0) & (d >= 0.45) & ((X - cx) * s > 10)
        handles |= loop
    paint(img, handles, c["mid"])
    paint(img, handles & (Y < 20), c["light"])
    paint(img, handles & (Y > 28), c["dark"])
    # bowl: a wide cup from the rim (y 14) narrowing to the stem (y 40)
    t = np.clip((Y - 14) / 26.0, 0, 1)
    half = 15.5 - 9.5 * t ** 1.6
    bowl = (Y >= 14) & (Y <= 40) & (np.abs(X - cx) <= half)
    rim = (Y >= 12.5) & (Y < 15.5) & (np.abs(X - cx) <= 17.0)
    lid = (((X - cx) / 14.0) ** 2 + ((Y - 13.0) / 6.0) ** 2 <= 1) & (Y < 13.0)
    knob_stem = (np.abs(X - cx) <= 1.2) & (Y >= 3.5) & (Y < 7.5)
    ball = np.hypot(X - cx, Y - 3.5) <= 3.0          # a golf ball on top
    stem = (np.abs(X - cx) <= 2.6 - 0.6 * np.clip((Y - 40) / 6, 0, 1)) & (Y > 40) & (Y <= 47)
    knot = (((X - cx) / 5.0) ** 2 + ((Y - 43.5) / 1.6) ** 2 <= 1)
    foot = ((Y > 47) & (Y <= 50) & (np.abs(X - cx) <= 8 + (Y - 47) * 1.5)) | ((Y > 50) & (Y <= 53) & (np.abs(X - cx) <= 13.5))
    body = bowl | rim | lid | knob_stem | stem | knot | foot
    paint(img, body, c["mid"])
    # light from the upper left: a bright streak and a lit left side, shade on the right
    rel = (X - cx) / np.maximum(half, 1)
    paint(img, bowl & (rel < -0.35), c["light"])
    paint(img, bowl & (rel > -0.62) & (rel < -0.45), c["hi"])
    paint(img, bowl & (rel > 0.45), c["dark"])
    paint(img, bowl & (rel > 0.78), c["deep"])
    paint(img, bowl & (np.abs(Y - 27.5) <= 0.5) & (np.abs(rel) < 0.95), c["dark"])   # a band round the bowl
    paint(img, rim, c["light"])
    paint(img, rim & (X > cx + 9), c["mid"])
    paint(img, rim & (Y >= 14.5), c["dark"])
    paint(img, lid, c["light"])
    paint(img, lid & (X > cx + 4), c["mid"])
    paint(img, lid & (X < cx - 6) & (Y < 11), c["hi"])
    paint(img, ball, c["hi"])
    paint(img, ball & ((X - cx) + (Y - 3.5) > 1.5), c["mid"])
    for bx, by in ((cx - 1, 2.5), (cx + 1, 4.5), (cx - 1.2, 5.0)):
        paint(img, np.hypot(X - bx, Y - by) <= 0.5, c["mid"])                         # dimples
    paint(img, knob_stem | stem, c["mid"])
    paint(img, (knob_stem | stem) & (X < cx - 0.2), c["light"])
    paint(img, knot, c["light"])
    paint(img, knot & (X > cx + 2), c["dark"])
    paint(img, foot, c["mid"])
    paint(img, foot & (X < cx - 4), c["light"])
    paint(img, foot & (X > cx + 7), c["dark"])
    # wooden plinth with a small gold plate
    plinth = (Y > 53) & (Y <= 66) & (np.abs(X - cx) <= 16.5 - 1.0 * (Y > 63))
    paint(img, plinth, c["wood"])
    paint(img, plinth & (Y <= 55), c["wood_l"])
    plate = (Y >= 57.5) & (Y <= 62.5) & (np.abs(X - cx) <= 8.5)
    paint(img, plate, c["plate"])
    paint(img, plate & ((Y > 61.5) | (X > cx + 7.5)), c["plate_d"])
    solid = img[..., 3] > 0
    paint(img, ring_of(solid), c["edge"])
    return img


# --------------------------------------------------------------- panorama
P = {
    "sky": [rgba(h) for h in ("#5aa7e6", "#74b8ec", "#92c9f0", "#b2daf3", "#cfe8f4")],
    "sun": rgba("#fff3b8"), "sun2": rgba("#ffe58a"),
    "cloud": rgba("#ffffff"), "cloud_s": rgba("#d9e6f2"), "cloud_e": rgba("#a9bfd4"),
    "mtn": rgba("#7d93b5"), "mtn_s": rgba("#62789c"), "snow": rgba("#f4f8fc"), "snow_s": rgba("#c8d6e6"),
    "hill_far": rgba("#7fae8d"), "hill_mid": rgba("#5d9a5d"),
    "lake": rgba("#4a86c0"), "lake_l": rgba("#86b8e2"), "ocean": rgba("#2f78c4"), "ocean_l": rgba("#7fb6ea"), "foam": rgba("#f2f8ff"),
    "fir": rgba("#1f4a34"), "fir_l": rgba("#2f6648"), "fir_d": rgba("#143425"),
    "dune": rgba("#e3cf96"), "dune_s": rgba("#c9b277"), "fescue": rgba("#b7a85a"), "pine": rgba("#3c5e3a"),
    "rough": rgba("#3f8a3f"), "rough_d": rgba("#33733a"), "fair": rgba("#6cbf55"), "fair_l": rgba("#7ccd62"),
    "green": rgba("#8fdb6c"), "green_l": rgba("#a3e67e"), "sand": rgba("#f0e2b4"), "sand_d": rgba("#d4c28c"),
    "trunk": rgba("#4a2e1d"), "oak": rgba("#2f6b33"), "oak_l": rgba("#468a3e"),
    "cherry": rgba("#f0a6c2"), "cherry_l": rgba("#fbd3e2"), "cherry_d": rgba("#d1789c"),
    "marble": rgba("#efe9dc"), "marble_l": rgba("#fbf8f0"), "marble_d": rgba("#c9c0ad"), "col_gap": rgba("#6b6f78"),
    "tower": rgba("#ece2c8"), "tower_d": rgba("#cbbd98"), "black": rgba("#17181c"), "lamp": rgba("#ffd84a"),
    "flag": rgba("#e5322b"), "pole": rgba("#f4f4f0"), "edge": rgba("#16241a"),
    "cap": rgba("#e5322b"), "shirt": rgba("#2f6fd1"), "shirt_d": rgba("#24569f"), "pants": rgba("#e8e2d0"), "pants_d": rgba("#c8c0a8"),
    "skin": rgba("#e8b48a"), "shoe": rgba("#2a2a2e"), "club": rgba("#c9ced6"),
}


def dither_band(mask_a, mask_b, X, Y):
    return (np.floor(X).astype(int) + np.floor(Y).astype(int)) % 2 == 0


def sky(img, X, Y, horizon):
    n = len(P["sky"])
    for k, col in enumerate(P["sky"]):
        y0 = horizon * k / n
        band = Y >= y0
        paint(img, band, col)
        # one dithered row at each step: no gradients, no hard seam
        edge = (np.abs(Y - y0 - 0.5) < 0.6) & ((np.floor(X).astype(int) + np.floor(Y).astype(int)) % 2 == 0)
        if k:
            paint(img, edge, P["sky"][k - 1])


def cloud(img, X, Y, cx, cy, s, rng):
    m = np.zeros(X.shape, bool)
    for k in range(5 + int(s)):
        a = rng.uniform(-1.0, 1.0)
        r = s * rng.uniform(4.0, 7.0)
        m |= np.hypot(X - (cx + a * s * 12), (Y - (cy - rng.uniform(0, 1) * s * 3)) * 1.25) <= r
    m &= Y <= cy + s * 3
    paint(img, m, P["cloud"])
    paint(img, m & (Y > cy + s * 0.5), P["cloud_s"])
    paint(img, ring_of(m) & (Y > cy - s), P["cloud_e"])


PANO_W = 1440


def ridge(xs, base, amp, seed, freq=1.0):
    """A wavy line that repeats every PANO_W px (whole cycles only), so the panorama loops."""
    rng = np.random.default_rng(seed)
    ph = rng.uniform(0, 6.28, 3)
    cyc = [max(1, round(f * freq * PANO_W / (2 * math.pi))) * 2 * math.pi / PANO_W for f in (0.011, 0.027, 0.071)]
    return base - amp * (0.55 * np.sin(xs * cyc[0] + ph[0]) + 0.3 * np.sin(xs * cyc[1] + ph[1]) + 0.15 * np.sin(xs * cyc[2] + ph[2]))


def fir(img, X, Y, x, base, h, w):
    """A side-view conifer: stacked jagged tiers, lit on the left."""
    m = np.zeros(X.shape, bool)
    tiers = max(3, int(h / 7))
    for k in range(tiers):
        ty = base - h + (k + 1) * h / (tiers + 0.6)
        tw = w * (k + 1.4) / (tiers + 0.4)
        top = ty - h / tiers * 1.6
        m |= (Y <= ty) & (Y >= top) & (np.abs(X - x) <= (Y - top) / (ty - top) * tw / 2)
    trunk = (np.abs(X - x) <= max(1, w / 10)) & (Y > base - h * 0.12) & (Y <= base)
    paint(img, trunk, P["trunk"])
    paint(img, m, P["fir"])
    paint(img, m & (X < x - 0.5) & ((np.floor(Y) % 3) != 0), P["fir_l"])
    paint(img, m & (X > x + w * 0.18), P["fir_d"])
    paint(img, ring_of(m | trunk) & ~(img[..., 3] == 0) & False, P["edge"])
    return m | trunk


def round_tree(img, X, Y, x, base, h, w, col, col_l, col_d, rng, speckle=None):
    trunk = (np.abs(X - x) <= max(1, w / 9)) & (Y > base - h * 0.45) & (Y <= base)
    crown = np.zeros(X.shape, bool)
    cy = base - h * 0.62
    for k in range(6):
        a = rng.uniform(0, 6.28)
        crown |= np.hypot(X - (x + math.cos(a) * w * 0.25), (Y - (cy + math.sin(a) * h * 0.14)) * 1.1) <= w * rng.uniform(0.28, 0.38)
    crown |= np.hypot(X - x, (Y - cy) * 1.15) <= w * 0.42
    paint(img, trunk, P["trunk"])
    paint(img, crown, col)
    paint(img, crown & ((X - x) + (Y - cy) < -w * 0.2), col_l)
    paint(img, crown & ((X - x) + (Y - cy) > w * 0.3), col_d)
    if speckle is not None:
        sp = rng.random(X.shape)
        paint(img, crown & (sp < 0.12), speckle)
    return crown | trunk


def flagstick(img, X, Y, x, base, wave=0):
    pole = (np.abs(X - x - 0.5) <= 0.5) & (Y >= base - 18) & (Y <= base)
    fl = (X >= x + 1) & (X <= x + 8) & (Y >= base - 18) & (Y <= base - 13 + 0.6 * np.sin((X - x) * 0.9 + wave))
    paint(img, fl, P["flag"])
    paint(img, pole, P["pole"])
    paint(img, (np.abs(X - x - 0.5) <= 1.6) & (np.abs(Y - base - 0.5) <= 0.6), P["edge"])


def golfer(img, X, Y, x, base, pose="finish"):
    """A side-view golfer about 30 px tall, finishing a swing (facing right)."""
    c = P
    m = {}
    # legs: front leg straight, back leg bent with heel up
    m["pants"] = (((np.abs(X - (x + 2)) <= 1.6) & (Y > base - 13) & (Y <= base - 1))
                  | ((np.abs(X - (x - 3 + (Y - (base - 13)) * 0.25)) <= 1.5) & (Y > base - 13) & (Y <= base - 2)))
    m["shoe"] = ((Y > base - 1.5) & (Y <= base) & (X >= x + 1) & (X <= x + 5)) | ((Y > base - 3) & (Y <= base - 1) & (np.abs(X - (x + 0.5)) <= 1.5))
    m["shirt"] = (((X - x) / 3.6) ** 2 + ((Y - (base - 18.5)) / 6.0) ** 2 <= 1)
    m["arm"] = (np.abs((X - x) - (Y - (base - 22)) * -0.9 - 2) <= 1.2) & (Y > base - 26) & (Y < base - 19)
    m["head"] = np.hypot(X - (x + 0.5), Y - (base - 26.5)) <= 2.6
    m["cap"] = ((np.hypot(X - (x + 0.5), Y - (base - 27.3)) <= 2.8) & (Y < base - 27.2)) | ((Y >= base - 28) & (Y < base - 27) & (X > x + 1) & (X < x + 5))
    # the club over the shoulder at the finish
    t = np.clip(((X - (x - 2)) * -0.7 + (Y - (base - 27)) * -0.7) / 14, 0, 1)
    cxl, cyl = x - 2 - t * 10, base - 27 - t * 8
    m["club"] = np.hypot(X - cxl, Y - cyl) <= 0.6
    body = np.zeros(X.shape, bool)
    for k in m.values():
        body |= k
    paint(img, ring_of(body), c["edge"])
    paint(img, m["club"], c["club"])
    paint(img, m["pants"], c["pants"])
    paint(img, m["pants"] & (X > x + 1.5), c["pants_d"])
    paint(img, m["shoe"], c["shoe"])
    paint(img, m["shirt"], c["shirt"])
    paint(img, m["shirt"] & (X > x + 1.2), c["shirt_d"])
    paint(img, m["arm"], c["skin"])
    paint(img, m["head"], c["skin"])
    paint(img, m["cap"], c["cap"])


def panorama(W: int = PANO_W, H: int = 270, seed: int = 4) -> np.ndarray:
    """The courses' landmarks side by side, Oregon -> Cape Cod -> DC; the right edge joins the left."""
    rng = np.random.default_rng(seed)
    X, Y = grid(W, H)
    img = np.zeros((H, W, 4), np.uint8)
    horizon = 150
    sky(img, X, Y, horizon + 20)
    # sun and clouds
    paint(img, np.hypot(X - 1400, Y - 40) <= 15, P["sun2"])
    paint(img, np.hypot(X - 1400, Y - 40) <= 12, P["sun"])
    for cx, cy, s in ((90, 40, 1.4), (300, 70, 1.0), (560, 34, 1.6), (780, 82, 1.0), (980, 46, 1.2), (1300, 72, 1.1), (1410, 36, 1.3)):
        state = rng.bit_generator.state
        for wrap in (-W, 0, W):          # a cloud over the seam shows on both ends
            rng.bit_generator.state = state
            cloud(img, X, Y, cx + wrap, cy, s, rng)
    xs = X[0]
    # --- far layer: Mt Hood behind Oregon, soft hills elsewhere
    MX = 110  # Mt Hood: left in the Oregon frame (its left foot wraps round the seam)
    dxm = np.minimum(np.abs(X - MX), np.abs(X - MX - W))
    mtn = (Y >= 58 + dxm * 0.62) & (Y <= horizon)
    mtn &= (Y >= 58 + dxm * 0.62 + 2 * np.sin(X * 0.3))
    paint(img, mtn, P["mtn"])
    paint(img, mtn & (X > MX), P["mtn_s"])
    snow = mtn & (Y < 58 + 26 - np.abs(np.sin(X * 0.45)) * 5)
    paint(img, snow, P["snow"])
    paint(img, snow & (X > MX), P["snow_s"])
    far = Y >= ridge(X, horizon - 6, 9, 1)
    paint(img, far & (Y <= horizon + 10), P["hill_far"])
    # --- water: the lake (Oregon), the ocean (Cape Cod), the Potomac (DC)
    def taper(x0, x1, ramp):
        # 0 at the ends of a stretch of water, 1 in the middle: the shore closes in over `ramp` px
        return np.clip(np.minimum(X - x0, x1 - X) / ramp, 0, 1)
    lake = (X < 420) & (Y >= horizon + 3) & (Y <= horizon + 15)   # meets the river at the seam
    # the open sea reaches the sky; headlands close it in at both ends
    sea_top = horizon - 10 + (1 - taper(450, 1000, 70)) * 26
    ocean = (X >= 450) & (X < 1000) & (Y >= sea_top) & (Y <= horizon + 16)
    river = (X >= 990) & (Y >= horizon + 3 + (1 - taper(990, 1600, 40)) * 12) & (Y <= horizon + 15)

    for w, col, cl in ((lake, P["lake"], P["lake_l"]), (ocean, P["ocean"], P["ocean_l"]), (river, P["lake"], P["lake_l"])):
        paint(img, w, col)
        dash = w & ((np.floor(X / 3).astype(int) + np.floor(Y / 2).astype(int) * 5) % 11 == 0)
        paint(img, dash, cl)
    # --- mid layer per course
    # Oregon: a wall of firs along the lake
    for k in range(34):
        x = 4 + k * 13 + rng.uniform(-4, 4)
        if x > 440:
            break
        fir(img, X, Y, x, horizon + 22 + rng.uniform(-2, 3), rng.uniform(26, 46), rng.uniform(12, 18))
    # Cape Cod: dunes, scrub pines and the lighthouse on the bluff
    dune = (X >= 455) & (X < 995) & (Y >= ridge(X, horizon + 10, 7, 3, 1.6))
    paint(img, dune & (Y <= horizon + 30), P["dune"])
    paint(img, dune & (Y <= horizon + 30) & ((X + Y) % 7 < 1), P["dune_s"])
    lx, lb = 870, horizon + 18   # right in the Cape Cod frame
    for k in range(14):
        x = 470 + k * 36 + rng.uniform(-8, 8)
        if lx - 30 < x < lx + 30:
            continue
        round_tree(img, X, Y, x, horizon + 22, rng.uniform(12, 18), rng.uniform(10, 15), P["pine"], P["oak_l"], P["fir_d"], rng)
    t = np.clip((Y - (lb - 52)) / 52, 0, 1)
    tower = (Y >= lb - 52) & (Y <= lb) & (np.abs(X - lx) <= 4.0 + 3.0 * t)
    paint(img, tower, P["tower"])
    paint(img, tower & (X > lx + 1.5 + 1.5 * t), P["tower_d"])
    paint(img, (Y >= lb - 61) & (Y < lb - 52) & (np.abs(X - lx) <= 3.6), P["black"])
    paint(img, (Y >= lb - 59) & (Y < lb - 55) & (np.abs(X - lx) <= 2.0), P["lamp"])
    paint(img, (np.hypot(X - lx, (Y - (lb - 61)) * 1.3) <= 3.8) & (Y < lb - 61), P["black"])
    paint(img, (np.abs(Y - (lb - 52)) <= 1.0) & (np.abs(X - lx) <= 6), P["black"])
    for a0, a1 in ((-0.25, 0.05), (math.pi - 0.05, math.pi + 0.25)):
        ang = np.arctan2(Y - (lb - 57), X - lx)
        d = np.hypot(X - lx, Y - (lb - 57))
        beam = (ang > a0) & (ang < a1) & (d > 5) & (d < 46)
        img[beam & (img[..., 3] > 0)] = (img[beam & (img[..., 3] > 0)].astype(int) * 0.55 + np.array([255, 243, 168, 255]) * 0.45).astype(np.uint8)
    # DC: the domed memorial across the river, cherry trees in bloom
    mx, mb = 1350, horizon + 4   # right in the DC frame
    dome = (((X - mx) / 20) ** 2 + ((Y - (mb - 22)) / 15) ** 2 <= 1) & (Y <= mb - 22)
    drum = (np.abs(X - mx) <= 20) & (Y > mb - 22) & (Y <= mb - 18)
    ped = (Y > mb - 18) & (Y <= mb - 12) & (np.abs(X - mx) <= 23 - (Y - (mb - 18)) * -0.0)
    cols = (np.abs(X - mx) <= 21) & (Y > mb - 12) & (Y <= mb - 2)
    base = (np.abs(X - mx) <= 25) & (Y > mb - 2) & (Y <= mb + 2)
    paint(img, dome | drum, P["marble"])
    paint(img, (dome | drum) & (X > mx + 9), P["marble_d"])
    paint(img, dome & (X < mx - 10), P["marble_l"])
    paint(img, ped, P["marble_l"])
    paint(img, cols, P["col_gap"])
    paint(img, cols & ((np.floor(X - mx + 21).astype(int) % 5) < 3), P["marble"])
    paint(img, base, P["marble"])
    for k in range(13):
        x = 1015 + k * 33 + rng.uniform(-6, 6)
        if abs(x - mx) < 30 or x > W - 14:
            continue
        round_tree(img, X, Y, x, horizon + 24, rng.uniform(16, 22), rng.uniform(15, 22), P["cherry"], P["cherry_l"], P["cherry_d"], rng, speckle=P["cherry_l"])
    # --- foreground: one rolling course from end to end
    ground = ridge(X, horizon + 26, 6, 9, 0.6)
    land = Y >= ground
    paint(img, land, P["rough"])
    paint(img, land & ((np.floor(X).astype(int) * 7 + np.floor(Y).astype(int) * 13) % 23 == 0), P["rough_d"])
    fair = land & (Y >= ground + 10) & (Y <= ground + 10 + 40 + 10 * np.sin(X * 6 * math.pi / W))
    paint(img, fair, P["fair"])
    paint(img, fair & ((np.floor((X + Y * 2) / 18).astype(int)) % 2 == 0), P["fair_l"])     # mowing stripes
    for gx in (350, 820, 1300):
        g = land & (((X - gx) / 46) ** 2 + ((Y - (ground + 16)) / 7) ** 2 <= 1)
        paint(img, g, P["green"])
        paint(img, g & (X < gx - 10) & (Y < ground + 14), P["green_l"])
        bunker = land & (((X - (gx + 58)) / 16) ** 2 + ((Y - (ground + 24)) / 4.5) ** 2 <= 1)
        paint(img, bunker, P["sand"])
        paint(img, bunker & (Y < ground + 22), P["sand_d"])
        flagstick(img, X, Y, gx + 6, ground[0, gx] + 15)
    # a golfer at each course, finishing a swing toward the green
    for gx in (70, 545, 1020):
        golfer(img, X, Y, gx, 214)
    # near rough at the bottom edge, darker
    paint(img, land & (Y > 236), P["rough_d"])
    paint(img, land & (Y > 236) & ((np.floor(X).astype(int) * 3 + np.floor(Y).astype(int) * 5) % 9 == 0), P["rough"])
    return img


def frame_with_ui(scene: np.ndarray, x0: int, troph: np.ndarray, golfer_at=None) -> Image.Image:
    W, H = 480, 270
    view = scene[:, x0:x0 + W].copy()
    if golfer_at is not None:
        X, Y = grid(W, H)
        golfer(view, X, Y, *golfer_at)
    im = Image.fromarray(view, "RGBA")
    t = Image.fromarray(troph, "RGBA")
    im.alpha_composite(t, (W // 2 - t.width // 2, 4))
    return im


def write_sprites(out: Path = HERE.parent / "game" / "public" / "sprites"):
    """The title screen's art: sprites/title_pano.png (scrolls, loops) and sprites/trophy.png (the logo)."""
    Image.fromarray(trophy(), "RGBA").save(out / "trophy.png", optimize=True)
    Image.fromarray(panorama(), "RGBA").save(out / "title_pano.png", optimize=True)
    print(f"[title] trophy.png, title_pano.png -> {out}")


def main():
    if len(sys.argv) < 2:
        write_sprites()
        return
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    t = trophy()
    Image.fromarray(t, "RGBA").save(out / "trophy.png")
    pano = panorama()
    Image.fromarray(pano, "RGBA").save(out / "panorama.png")
    print("[title] trophy", t.shape[1], "x", t.shape[0], "panorama", pano.shape[1], "x", pano.shape[0])


if __name__ == "__main__":
    main()

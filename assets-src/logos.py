"""Course logos: small original pixel-art emblems (never a club's real logo),
written to game/public/sprites/logos/<id>.png (32 x 32, transparent).

    python3 assets-src/logos.py

Each course has an entry in LOGOS: a drawing function and its colours. A
course without a logo gets a lettered badge in the game instead.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "game" / "public" / "sprites" / "logos"
S = 32  # logo size (px)


def rgba(h: str, a: int = 255) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a], np.uint8)


def grid():
    y, x = np.mgrid[0:S, 0:S]
    return x + 0.5, y + 0.5  # pixel centres


def ring_of(mask: np.ndarray) -> np.ndarray:
    """Pixels next to the mask (4-neighbourhood) that are not in it."""
    m = np.zeros_like(mask)
    m[1:, :] |= mask[:-1, :]
    m[:-1, :] |= mask[1:, :]
    m[:, 1:] |= mask[:, :-1]
    m[:, :-1] |= mask[:, 1:]
    return m & ~mask


def paint(img, mask, col):
    img[mask] = col


# ------------------------------------------------------------------ anchor
def anchor(c: dict) -> np.ndarray:
    """A blue anchor with a white outline (Oswego Lake)."""
    X, Y = grid()
    cx = 16.0
    ring_d = np.hypot(X - cx, Y - 5.5)
    ring = (ring_d <= 3.6) & (ring_d >= 1.7)
    stock = (np.abs(Y - 10.5) <= 1.0) & (np.abs(X - cx) <= 6.6)
    stock_ends = (np.hypot(X - (cx - 6.6), Y - 10.5) <= 1.3) | (np.hypot(X - (cx + 6.6), Y - 10.5) <= 1.3)
    shaft = (np.abs(X - cx) <= 1.3) & (Y >= 8.0) & (Y <= 27.0)
    # arms: the lower part of a circle round (cx, 17.5)
    arm_d = np.hypot(X - cx, Y - 17.0)
    arms = (arm_d >= 8.3) & (arm_d <= 10.6) & (Y >= 18.5)
    # flukes: arrowheads at the arm tips, pointing up and out
    flukes = np.zeros_like(arms)
    for sx in (-1, 1):
        tx = cx + sx * 9.5
        dy = Y - 15.0
        flukes |= (dy >= 0) & (dy <= 5.0) & (np.abs(X - tx) <= (dy * 0.62 + 0.4)) & (np.abs(X - tx) <= 2.9)
    crown = (np.hypot(X - cx, Y - 27.0) <= 1.9)
    body = ring | stock | stock_ends | shaft | arms | flukes | crown
    img = np.zeros((S, S, 4), np.uint8)
    paint(img, body, c["mid"])
    # light from the upper left: lighter left edges, darker right edges
    left = body & ~np.roll(body, 1, axis=1)
    right = body & ~np.roll(body, -1, axis=1)
    paint(img, left, c["light"])
    paint(img, right, c["dark"])
    white = ring_of(body)
    paint(img, white, c["outline"])
    paint(img, ring_of(body | white), c["edge"])
    return img


# -------------------------------------------------------------- lighthouse
def lighthouse(c: dict) -> np.ndarray:
    """A beige-white lighthouse with a black lantern and a beam (Highland Links)."""
    X, Y = grid()
    cx = 16.0
    img = np.zeros((S, S, 4), np.uint8)
    # beams first (behind the tower): two wedges from the lantern, out to the sides
    lx, ly = cx, 7.5
    ang = np.arctan2(Y - ly, X - lx)
    dist = np.hypot(X - lx, Y - ly)
    for a0 in (math.radians(-6), math.radians(186)):   # right and left, angled slightly up
        da = np.angle(np.exp(1j * (ang - a0)))
        beam = (np.abs(da) <= 0.24) & (dist >= 3.5) & (dist <= 15.8)
        # the light fades with distance: three bands
        paint(img, beam & (dist <= 8.0), c["beam"])
        paint(img, beam & (dist > 8.0) & (dist <= 12.0), c["beam_mid"])
        paint(img, beam & (dist > 12.0), c["beam_far"])
    # tower: a tapered body from y 12 to 27
    top_y, bot_y = 12.0, 27.5
    t = np.clip((Y - top_y) / (bot_y - top_y), 0, 1)
    half = 2.6 + 2.4 * t
    tower = (Y >= top_y) & (Y <= bot_y) & (np.abs(X - cx) <= half)
    paint(img, tower, c["tower"])
    paint(img, tower & (X - cx > half - 1.6), c["tower_dark"])    # shaded right side
    paint(img, tower & (X - cx < -half + 1.2), c["tower_light"])  # lit left edge
    door = (np.abs(X - cx) <= 1.0) & (Y >= 24.5) & (Y <= 27.5)
    paint(img, door, c["black"])
    win = (np.abs(X - cx) <= 0.6) & (np.abs(Y - 17.5) <= 1.0)
    paint(img, win, c["black"])
    # gallery (the balcony) and the black lantern room with its light
    gallery = (np.abs(Y - 11.0) <= 1.0) & (np.abs(X - cx) <= 4.6)
    lantern = (Y >= 5.5) & (Y < 10.0) & (np.abs(X - cx) <= 2.6)
    paint(img, gallery | lantern, c["black"])
    light = (Y >= 6.5) & (Y < 9.0) & (np.abs(X - cx) <= 1.6)
    paint(img, light, c["lamp"])
    dome = (np.hypot(X - cx, (Y - 5.6) * 1.25) <= 3.0) & (Y < 5.6)
    finial = (np.abs(X - cx) <= 0.5) & (Y >= 1.0) & (Y < 3.0)
    paint(img, dome | finial, c["black"])
    # a strip of dune grass at the foot
    ground = (Y >= 27.5) & (Y <= 29.5) & (np.abs(X - cx) <= 8.5 - 2.0 * (Y - 27.5))
    paint(img, ground & ~tower, c["grass"])
    body = img[..., 3] > 0
    beam_px = np.zeros((S, S), bool)
    for k in ("beam", "beam_mid", "beam_far"):
        beam_px |= np.all(img == c[k], axis=-1)
    solid = body & ~beam_px
    paint(img, ring_of(solid) & ~beam_px, c["edge"])
    return img


def shade(img, mask, light=None, dark=None):
    """Light from the upper left: lighter left/top edges, darker right/bottom edges of a region."""
    if light is not None:
        edge = mask & (~np.roll(mask, 1, axis=1) | ~np.roll(mask, 1, axis=0))
        paint(img, edge, light)
    if dark is not None:
        edge = mask & (~np.roll(mask, -1, axis=1) | ~np.roll(mask, -1, axis=0))
        paint(img, edge, dark)


def outlined(img, edge_col):
    """Dark 1 px outline around everything drawn so far."""
    solid = img[..., 3] > 0
    paint(img, ring_of(solid), edge_col)
    return img


def outlined_outside(img, edge_col):
    """Dark 1 px outline around the outside only: gaps inside a drawing (between rails) stay open."""
    solid = img[..., 3] > 0
    out = np.zeros_like(solid)
    out[0, :] = out[-1, :] = out[:, 0] = out[:, -1] = True
    out &= ~solid
    while True:
        grown = out | ((np.roll(out, 1, 0) | np.roll(out, -1, 0) | np.roll(out, 1, 1) | np.roll(out, -1, 1)) & ~solid)
        if (grown == out).all():
            break
        out = grown
    paint(img, ring_of(solid) & out, edge_col)
    return img


def poly(X, Y, pts):
    """Inside test for a polygon given as [(x, y), ...] (even-odd rule)."""
    inside = np.zeros(X.shape, bool)
    n = len(pts)
    for k in range(n):
        x1, y1 = pts[k]
        x2, y2 = pts[(k + 1) % n]
        cond = (y1 > Y) != (y2 > Y)
        xint = (x2 - x1) * (Y - y1) / ((y2 - y1) if y2 != y1 else 1e-9) + x1
        inside ^= cond & (X < xint)
    return inside


# --------------------------------------------------------------------- barn
def barn(c: dict) -> np.ndarray:
    """A red barn with white trim (Langdon)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    ground = (Y >= 27) & (Y <= 29.5) & (X >= 2) & (X <= 30)
    paint(img, ground, c["grass"])
    # gambrel roof and walls as one outline
    walls = (X >= 6) & (X <= 26) & (Y >= 15) & (Y < 28)
    roof = poly(X, Y, [(4, 16.5), (8.5, 9), (16, 4.5), (23.5, 9), (28, 16.5)])
    paint(img, walls, c["red"])
    shade(img, walls, c["red_light"], c["red_dark"])
    paint(img, roof, c["roof"])
    shade(img, roof, c["roof_light"], None)
    # white trim along the roof's lower edge
    trim = roof & ~poly(X, Y, [(5.5, 16.5), (9.3, 10.2), (16, 6.2), (22.7, 10.2), (26.5, 16.5)])
    paint(img, trim & (Y > 8), c["white"])
    # hay-loft door
    loft = (np.abs(X - 16) <= 2.0) & (Y >= 9.5) & (Y <= 13.5)
    paint(img, loft, c["white"])
    paint(img, (np.abs(X - 16) <= 1.0) & (Y >= 10.5) & (Y <= 12.5), c["dark"])
    # big double doors with a white X
    door = (np.abs(X - 16) <= 5.0) & (Y >= 18.5) & (Y < 28)
    paint(img, door, c["white"])
    inner = (np.abs(X - 16) <= 4.0) & (Y >= 19.5) & (Y < 27.5)
    paint(img, inner, c["red_dark"])
    def seg(x1, y1, x2, y2, w=0.6):
        t = np.clip(((X - x1) * (x2 - x1) + (Y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 1)
        return np.hypot(X - (x1 + t * (x2 - x1)), Y - (y1 + t * (y2 - y1))) <= w
    cross = inner & (seg(12, 19.5, 20, 27.5) | seg(20, 19.5, 12, 27.5))
    paint(img, cross, c["white"])
    return outlined(img, c["edge"])


# -------------------------------------------------------- memorial (dome)
def memorial(c: dict) -> np.ndarray:
    """A domed, columned memorial (East Potomac: the Jefferson Memorial across the Tidal Basin)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    dome = (((X - 16) / 9.5) ** 2 + ((Y - 15.0) / 10.0) ** 2 <= 1.0) & (Y <= 15.0)
    paint(img, dome, c["marble"])
    shade(img, dome, c["marble_light"], c["marble_dark"])
    paint(img, dome & (X > 20.5), c["marble_dark"])  # the dome's shaded right side
    # the drum under the dome, down to the roof line, so the dome sits on the building
    drum = (np.abs(X - 16) <= 9.5) & (Y > 13.0) & (Y <= 18.0)
    paint(img, drum, c["marble"])
    paint(img, drum & (X > 20.5), c["marble_dark"])
    paint(img, drum & (X < 7.5), c["marble_light"])
    paint(img, (np.abs(X - 16) <= 9.5) & (np.abs(Y - 15.0) <= 0.5) & ~poly(X, Y, [(5.0, 18.0), (16, 11.5), (27.0, 18.0)]), c["marble_dark"])  # cornice line
    pediment = poly(X, Y, [(5.0, 18.0), (16, 11.5), (27.0, 18.0)])
    paint(img, pediment, c["marble"])
    # the pediment's sloping edges read against the dome behind it
    slopes = pediment & ~poly(X, Y, [(6.6, 18.0), (16, 12.6), (25.4, 18.0)])
    paint(img, slopes, c["marble_light"])
    paint(img, ring_of(pediment) & (dome | drum) & (Y < 17.5), c["marble_dark"])
    entab = (np.abs(X - 16) <= 10.5) & (Y > 17.5) & (Y <= 19.5)
    paint(img, entab, c["marble"])
    paint(img, entab & (Y > 18.8), c["marble_dark"])
    # columns: light shafts with dark gaps
    colzone = (np.abs(X - 16) <= 9.5) & (Y > 19.5) & (Y <= 25.0)
    paint(img, colzone, c["shadow"])
    for k in range(6):
        cx = 7.5 + k * 3.4
        col = colzone & (np.abs(X - cx - 0.5) <= 0.9)
        paint(img, col, c["marble"])
        paint(img, col & (X > cx + 0.6), c["marble_dark"])
    base = (np.abs(X - 16) <= 11.0) & (Y > 25.0) & (Y <= 26.5)
    paint(img, base, c["marble"])
    steps = (np.abs(X - 16) <= 13.0 - 0.0) & (Y > 26.5) & (Y <= 29.0)
    paint(img, steps, c["marble_light"])
    paint(img, steps & (np.abs(Y - 27.8) <= 0.5), c["marble_dark"])
    return outlined(img, c["edge"])


# -------------------------------------------------------------- wildflower
def wildflower(c: dict) -> np.ndarray:
    """A three-petalled orange wildflower (Langston)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    cx, cy = 16.0, 12.5
    stem = (np.abs(X - 16.0 - 0.15 * (Y - 18)) <= 0.8) & (Y >= 16) & (Y <= 29.5)
    leaf_l = (((X - 11.0) * 0.82 + (Y - 23.0) * 0.57) / 4.6) ** 2 + ((-(X - 11.0) * 0.57 + (Y - 23.0) * 0.82) / 1.8) ** 2 <= 1
    leaf_r = (((X - 21.0) * 0.82 - (Y - 21.5) * 0.57) / 4.6) ** 2 + (((X - 21.0) * 0.57 + (Y - 21.5) * 0.82) / 1.8) ** 2 <= 1
    paint(img, stem, c["stem"])
    for lf in (leaf_l, leaf_r):
        paint(img, lf, c["leaf"])
        shade(img, lf, c["leaf_light"], c["leaf_dark"])
    petals = np.zeros_like(stem)
    for a in (-90, 30, 150):  # one up, two down-left / down-right
        r = math.radians(a)
        px, py = cx + 5.6 * math.cos(r), cy + 5.6 * math.sin(r)
        # an egg-shaped petal pointing out from the centre
        ux, uy = math.cos(r), math.sin(r)
        along = (X - px) * ux + (Y - py) * uy
        across = -(X - px) * uy + (Y - py) * ux
        petals |= (along / 5.6) ** 2 + (across / (3.6 - 0.25 * along)) ** 2 <= 1
    paint(img, petals, c["petal"])
    shade(img, petals, c["petal_light"], c["petal_dark"])
    # vein down each petal
    for a in (-90, 30, 150):
        r = math.radians(a)
        ux, uy = math.cos(r), math.sin(r)
        along = (X - cx) * ux + (Y - cy) * uy
        across = -(X - cx) * uy + (Y - cy) * ux
        paint(img, petals & (np.abs(across) <= 0.45) & (along > 2.5) & (along < 8.5), c["petal_dark"])
    centre = np.hypot(X - cx, Y - cy) <= 2.2
    paint(img, centre, c["centre"])
    paint(img, np.hypot(X - cx + 0.6, Y - cy + 0.6) <= 0.9, c["centre_light"])
    return outlined(img, c["edge"])


# --------------------------------------------------------------- waterfall
def waterfall(c: dict) -> np.ndarray:
    """A little waterfall between mossy stones into a pool (Stone Creek)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    pool = (((X - 16) / 13.0) ** 2 + ((Y - 26.0) / 4.0) ** 2 <= 1) & (Y >= 23.0)
    paint(img, pool, c["water"])
    paint(img, pool & (Y >= 27.5), c["water_dark"])
    rock_l = poly(X, Y, [(2.5, 27), (3.5, 15), (6, 9), (11.5, 7), (12.5, 25), (8, 28)])
    rock_r = poly(X, Y, [(19.5, 25), (20.5, 7), (26, 8.5), (28.5, 14), (29.5, 27), (24, 28.5)])
    ledge = poly(X, Y, [(9, 9.5), (11, 5.5), (21, 5.5), (23, 9.5)])
    for r in (rock_l, rock_r, ledge):
        paint(img, r, c["stone"])
        shade(img, r, c["stone_light"], c["stone_dark"])
    # a few cracks in the stone
    for (x1, y1, x2, y2) in ((5, 16, 9, 18), (7, 22, 10, 21), (23, 13, 26, 15), (22, 20, 25, 21)):
        t = np.clip(((X - x1) * (x2 - x1) + (Y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 1)
        d = np.hypot(X - (x1 + t * (x2 - x1)), Y - (y1 + t * (y2 - y1)))
        paint(img, (d <= 0.5) & (rock_l | rock_r), c["stone_dark"])
    moss = (ledge | rock_l | rock_r) & (Y <= 8.0)
    paint(img, moss, c["moss"])
    paint(img, moss & ~np.roll(moss, 1, axis=0), c["moss_light"])
    # the falling water: blue with light streaks, from the ledge into the pool
    fall = (X >= 11.5) & (X <= 20.5) & (Y >= 8.5) & (Y <= 25.5)
    paint(img, fall, c["water"])
    streak = fall & (((X - 11.5).astype(int) % 3) == 1)
    paint(img, streak, c["water_light"])
    paint(img, fall & (X >= 19.5), c["water_dark"])
    lip = (X >= 11.5) & (X <= 20.5) & (np.abs(Y - 8.5) <= 0.6)
    paint(img, lip, c["foam"])
    # foam where it lands
    foam = (((X - 16) / 6.5) ** 2 + ((Y - 25.0) / 1.7) ** 2 <= 1)
    paint(img, foam, c["foam"])
    for fx, fy in ((9, 25), (23, 25), (12, 27), (20, 27)):
        paint(img, np.hypot(X - fx, Y - fy) <= 0.8, c["foam"])
    return outlined(img, c["edge"])


# ------------------------------------------------------------------- train
def train(c: dict) -> np.ndarray:
    """A green and white locomotive (Waverley)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    rail = (Y >= 27.5) & (Y <= 28.5) & (X >= 1) & (X <= 31)
    paint(img, rail, c["rail"])
    cab = (X >= 19) & (X <= 28) & (Y >= 8) & (Y <= 22)
    roof = (X >= 18) & (X <= 29) & (Y >= 6.5) & (Y < 8.5)
    boiler = (X >= 5) & (X <= 19.5) & (Y >= 12.5) & (Y <= 21)
    nose = (((X - 5.5) / 2.0) ** 2 + ((Y - 16.75) / 4.25) ** 2 <= 1)
    stack = ((np.abs(X - 9) <= 1.4) & (Y >= 7.5) & (Y < 12.5)) | ((np.abs(X - 9) <= 2.4) & (Y >= 6) & (Y < 8))
    dome = (np.hypot(X - 14.5, (Y - 12.5) * 1.4) <= 2.4) & (Y <= 12.6)
    frame = (X >= 3) & (X <= 29) & (Y > 21) & (Y <= 23)
    catcher = poly(X, Y, [(1.0, 26.5), (5.0, 21.5), (5.0, 26.5)])
    body = boiler | nose | cab
    paint(img, body, c["green"])
    shade(img, body, c["green_light"], c["green_dark"])
    paint(img, roof, c["white"])
    paint(img, stack | dome, c["dark"])
    paint(img, frame | catcher, c["dark"])
    # white stripe along the engine and the cab windows
    paint(img, (boiler | cab | nose) & (np.abs(Y - 18.0) <= 0.6), c["white"])
    win = (X >= 21) & (X <= 26) & (Y >= 10) & (Y <= 14)
    paint(img, win, c["white"])
    paint(img, (X >= 22) & (X <= 25) & (Y >= 11) & (Y <= 13), c["glass"])
    paint(img, (boiler) & (np.abs(X - 12) <= 0.5) & (Y >= 13.5), c["green_dark"])
    # wheels
    for wx, rad in ((9.0, 3.6), (16.5, 3.6), (25.0, 2.8)):
        wheel = np.hypot(X - wx, Y - 24.5) <= rad
        paint(img, wheel, c["dark"])
        paint(img, wheel & (np.hypot(X - wx, Y - 24.5) <= rad - 1.2), c["wheel"])
        paint(img, np.hypot(X - wx, Y - 24.5) <= 0.9, c["dark"])
    rod = (np.abs(Y - 24.5) <= 0.5) & (X >= 9) & (X <= 16.5)
    paint(img, rod, c["wheel_light"])
    lamp = np.hypot(X - 4.8, Y - 13.6) <= 1.3
    paint(img, lamp, c["lamp"])
    # puffs of steam from the stack
    for px, py, r in ((8.5, 3.2, 2.3), (4.6, 2.6, 1.8), (2.0, 2.0, 1.2)):
        paint(img, np.hypot(X - px, Y - py) <= r, c["steam"])
    return outlined(img, c["edge"])


# ------------------------------------------------------------ rhododendron
def rhododendron(c: dict) -> np.ndarray:
    """A pink rhododendron truss over its glossy leaves (Eastmoreland)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # leaves radiating below the flower head
    for ang, ln in ((200, 11.5), (235, 11.0), (305, 11.0), (340, 11.5), (270, 9.0)):
        r = math.radians(ang)
        ux, uy = math.cos(r), -math.sin(r)  # screen y points down
        cx, cy = 16 + ux * ln * 0.55, 19.5 + uy * ln * 0.55
        along = (X - cx) * ux + (Y - cy) * uy
        across = -(X - cx) * uy + (Y - cy) * ux
        lf = (along / (ln * 0.55)) ** 2 + (across / 2.4) ** 2 <= 1
        paint(img, lf, c["leaf"])
        shade(img, lf, c["leaf_light"], c["leaf_dark"])
        paint(img, lf & (np.abs(across) <= 0.4), c["leaf_dark"])
    # the truss: a dome of five-petalled florets
    florets = [(16, 7.8), (10.6, 11.0), (21.4, 11.0), (13.2, 15.0), (18.8, 15.0)]
    for fx, fy in sorted(florets, key=lambda p: p[1]):
        petal = np.zeros(X.shape, bool)
        for k in range(5):
            a = math.radians(-90 + k * 72)
            petal |= np.hypot(X - (fx + 2.3 * math.cos(a)), Y - (fy + 2.3 * math.sin(a))) <= 2.1
        petal |= np.hypot(X - fx, Y - fy) <= 2.5
        paint(img, ring_of(petal) & (img[..., 3] > 0), c["pink_dark"])
        paint(img, petal, c["pink"])
        paint(img, petal & (X - fx + Y - fy < -2.5), c["pink_light"])
        paint(img, np.hypot(X - fx, Y - fy) <= 1.2, c["throat"])
        paint(img, np.hypot(X - fx, Y - fy + 1.6) <= 0.6, c["spot"])
    return outlined(img, c["edge"])


# -------------------------------------------------------------- wine glass
def wine(c: dict) -> np.ndarray:
    """A glass of red wine (Willamette Valley)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # tulip bowl: wide at the bottom, narrowing a little at the rim
    t = np.clip((Y - 3.0) / 14.0, 0, 1)
    half = 6.0 + 2.2 * np.sin(t * math.pi * 0.8)
    bowl_side = (Y >= 3.0) & (Y <= 17.0) & (np.abs(X - 16) <= half)
    bottom = (((X - 16) / 8.0) ** 2 + ((Y - 15.0) / 5.0) ** 2 <= 1) & (Y > 15.0)
    bowl = bowl_side | bottom
    paint(img, bowl, c["glass"])
    wine_ = bowl & (Y >= 10.5)
    paint(img, wine_, c["wine"])
    shade(img, wine_, c["wine_light"], c["wine_dark"])
    paint(img, wine_ & (np.abs(Y - 10.5) <= 0.5), c["wine_light"])  # the surface
    # glass rim and walls
    rim = bowl & ~np.roll(bowl, 1, axis=0)
    walls = bowl & (~np.roll(bowl, 1, axis=1) | ~np.roll(bowl, -1, axis=1))
    paint(img, (rim | walls) & ~wine_, c["glass_edge"])
    paint(img, walls & wine_, c["wine_dark"])
    glint = (np.abs(X - 11.5) <= 0.5) & (Y >= 5) & (Y <= 9)
    paint(img, glint, c["white"])
    paint(img, (np.abs(X - 11.5) <= 0.5) & (Y >= 12) & (Y <= 13), c["glint_wine"])
    stem = (np.abs(X - 16) <= 0.9) & (Y > 19.5) & (Y <= 27)
    paint(img, stem, c["glass_edge"])
    foot = (((X - 16) / 7.0) ** 2 + ((Y - 27.6) / 1.6) ** 2 <= 1)
    paint(img, foot, c["glass_edge"])
    paint(img, foot & (Y <= 27.0) & (np.abs(X - 16) <= 5.5), c["glass"])
    return outlined(img, c["edge"])


# --------------------------------------------------------------- arrowhead
def arrowhead(c: dict) -> np.ndarray:
    """A knapped flint arrowhead, corner-notched, pointing right (Indian Island)."""
    gx, gy = grid()
    # drawn in its own frame - X across the blade, Y from the tip back to the base -
    # turned so the tip points right; the upper face (X < 16) catches the light
    X, Y = gy, 32.0 - gx
    img = np.zeros((S, S, 4), np.uint8)
    head = poly(X, Y, [(16, 0.8), (20.4, 7.5), (24.4, 14.5), (27.4, 23.2),   # tip, lower edge, lower barb
                       (21.6, 20.6), (20.2, 23.6), (22.2, 30.0),              # lower notch, stem, base corner
                       (16, 28.4),                                            # concave base
                       (9.8, 30.0), (11.8, 23.6), (10.4, 20.6),               # upper base corner, stem, notch
                       (4.6, 23.2), (7.6, 14.5), (11.6, 7.5)])                # upper barb, upper edge
    # flake scars: chevron bands down each face
    left = X < 16
    band = np.floor((Y - 0.62 * np.abs(X - 16)) / 3.6).astype(int) % 2 == 0
    paint(img, head & left & band, c["light"])
    paint(img, head & left & ~band, c["mid"])
    paint(img, head & ~left & band, c["mid"])
    paint(img, head & ~left & ~band, c["dark"])
    paint(img, head & (np.abs(X - 16) <= 0.5) & (Y > 3) & (Y < 26), c["ridge"])  # the ridge down the middle
    stem = head & (Y > 23.0)
    paint(img, stem & left, c["mid"])
    paint(img, stem & ~left, c["dark"])
    # chipped edges: a darker nick every few pixels, light on the lit side
    rim = head & ring_of(~head)
    nicks = rim & ((np.round(Y).astype(int) % 3) == 0) & (Y > 4) & (Y < 21)
    paint(img, nicks, c["deep"])
    paint(img, rim & ~nicks & left & (Y < 22), c["glint"])
    return outlined(img, c["edge"])


# ----------------------------------------------------------------- shipwreck
def seg(X, Y, x1, y1, x2, y2, w):
    """Pixels within w of the segment (x1, y1)-(x2, y2)."""
    t = np.clip(((X - x1) * (x2 - x1) + (Y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 1)
    return np.hypot(X - (x1 + t * (x2 - x1)), Y - (y1 + t * (y2 - y1))) <= w


def shipwreck(c: dict) -> np.ndarray:
    """A wrecked wooden ship, listing and half sunk, with a snapped mast and a torn sail (Gearhart)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    a = math.radians(-14)                       # listing: the bow lifts to the right
    cx, cy = 16.0, 17.8
    U = (X - cx) * math.cos(a) + (Y - cy) * math.sin(a)
    V = -(X - cx) * math.sin(a) + (Y - cy) * math.cos(a)
    to_xy = lambda u, v: (cx + u * math.cos(a) - v * math.sin(a), cy + u * math.sin(a) + v * math.cos(a))  # noqa: E731
    def spar(u0, v0, u1, v1, w):
        x0, y0 = to_xy(u0, v0); x1, y1 = to_xy(u1, v1)
        return seg(X, Y, x0, y0, x1, y1, w)
    # masts behind the hull: the main mast snapped at the top, the foremast a stump
    main = spar(0.5, -2.0, 0.5, -16.8, 1.1)
    splinter = spar(0.5, -16.8, 3.0, -14.6, 0.55)
    fore = spar(8.5, -4.0, 9.0, -10.0, 1.0)
    yard = spar(-6.0, -13.0, 6.5, -14.2, 0.6)
    # the torn sail hanging from the yard, ragged at the foot, with holes
    foot = -4.8 - 1.4 * (np.abs(((U + 5.4) % 2.6) - 1.3))           # ragged, saw-toothed foot
    sail = (U > -5.4) & (U < 5.8) & (V > -13.5 + 0.1 * U) & (V < foot)
    sail &= ~((V > -10.0 + 1.6 * np.abs(U - 2.0)) & (np.abs(U - 2.0) < 2.2))   # a tear up from the foot
    paint(img, sail, c["sail"])
    paint(img, sail & (U > 3.4), c["sail_dark"])
    paint(img, main | fore | splinter, c["wood_dark"])
    paint(img, yard, c["wood"])
    # the hull: deep and curved, raked stem at the bow, a little sheer
    top = -2.0 - 3.2 * np.clip((U - 4.0) / 9.0, 0, 1) ** 2 - 0.8 * np.clip((-U - 8.0) / 5.0, 0, 1)
    bot = 7.2 - 0.045 * U * U
    hull = (V > top) & (V < bot) & (U < 14.5 - 0.55 * (V - top)) & (U > -13.5 + 0.3 * (V - top))
    paint(img, hull, c["wood"])
    paint(img, hull & ((np.floor(V - top).astype(int) % 3) == 2), c["wood_dark"])
    paint(img, hull & (V < top + 1.0), c["wood_light"])           # gunwale
    hole = (((U + 4.5) / 3.2) ** 2 + ((V - 1.8) / 2.0) ** 2 <= 1)
    paint(img, hull & hole, c["dark"])
    paint(img, hull & hole & (np.abs(((U + 4.5) % 2.2) - 1.1) < 0.5), c["wood_dark"])   # ribs
    # the sea: a rounded patch over the lower hull, wave crests and foam
    sea = (Y >= 23.8 + 0.9 * np.sin(X * 0.85)) & (((X - 16) / 16.2) ** 2 + ((Y - 25.0) / 7.2) ** 2 <= 1)
    paint(img, sea, c["water"])
    paint(img, sea & (Y >= 27.5), c["water_dark"])
    paint(img, sea & ~np.roll(sea, 1, axis=0), c["foam"])
    for wx, wy in ((5, 26.5), (25, 27), (12, 29.5), (20, 30)):
        paint(img, sea & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["water_light"])
    return outlined(img, c["edge"])


# -------------------------------------------------------------------- bridge
def bridge(c: dict) -> np.ndarray:
    """An arched wooden footbridge over a creek, grassy banks (Tualatin)."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    water = (Y >= 22.5) & (((X - 16) / 15.5) ** 2 + ((Y - 23.0) / 8.4) ** 2 <= 1)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 27.5), c["water_dark"])
    for wx, wy in ((16, 29.0), (10, 26.2), (22, 26.5)):
        paint(img, water & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["water_light"])
    # banks: grass sloping down to the water at both ends
    for bx in (0.0, 32.0):
        bank = (Y >= 21.5 + 0.7 * np.abs(X - bx)) & (np.abs(X - bx) <= 7.5) & (Y <= 31.5)
        paint(img, bank, c["grass"])
        paint(img, bank & ~np.roll(bank, 1, axis=0), c["grass_light"])
    span = np.abs(X - 16) <= 14.5
    deck = 15.0 + 0.026 * (X - 16) ** 2          # top of the deck, arched
    # the arch rib under the deck, springing from the banks, with struts up to the deck
    rib_d = ((X - 16) / 12.5) ** 2 + ((Y - 26.0) / 10.0) ** 2
    rib = (rib_d <= 1.0) & (rib_d >= 0.72) & (Y <= 24.5)
    paint(img, rib, c["wood"])
    paint(img, rib & (rib_d < 0.85), c["wood_dark"])
    for sx in (8.0, 12.0, 20.0, 24.0):
        paint(img, (np.abs(X - sx) <= 0.55) & (Y > deck + 2.0) & (rib_d >= 0.72) & ~rib, c["wood_dark"])
    # deck: a thick curved beam, lit on top, plank ends along its side
    beam = span & (Y >= deck) & (Y < deck + 2.7)
    paint(img, beam, c["wood"])
    paint(img, beam & (Y < deck + 0.9), c["wood_light"])
    paint(img, beam & (Y >= deck + 1.9), c["wood_dark"])
    # railing: posts, a top rail and a middle rail following the arch; the gaps stay open
    posts = np.zeros(X.shape, bool)
    for px in (2.0, 7.5, 13.0, 19.0, 24.5, 30.0):
        posts |= (np.abs(X - px) <= 0.9) & (Y >= deck - 7.5) & (Y < deck)
    paint(img, posts, c["wood"])
    paint(img, posts & ~np.roll(posts, -1, axis=1), c["wood_dark"])
    rail_mid = span & (Y >= deck - 4.0) & (Y < deck - 3.0)
    paint(img, rail_mid, c["wood_dark"])
    rail_top = span & (Y >= deck - 7.6) & (Y < deck - 6.0)
    paint(img, rail_top, c["wood"])
    paint(img, rail_top & (Y < deck - 6.8), c["wood_light"])
    return outlined_outside(img, c["edge"])


def colour_disc(fn, fill, rim):
    """A logo drawn over a disc in a course's colour: one course of several at a
    place (East Potomac Blue / White / Red)."""
    def draw(c: dict) -> np.ndarray:
        X, Y = grid()
        img = np.zeros((S, S, 4), np.uint8)
        d = np.hypot(X - 16, Y - 16)
        paint(img, d <= 15.5, c["edge"])
        paint(img, d <= 14.5, fill)
        paint(img, (d <= 14.5) & (d > 13.0), rim)
        top = fn(c)
        solid = top[..., 3] > 0
        img[solid] = top[solid]
        return img
    return draw


EDGE = rgba("#0d1620", 220)

LOGOS = {
    "oswego_lake": (anchor, {
        "mid": rgba("#2f6fd1"), "light": rgba("#5d97ee"), "dark": rgba("#1c4a98"),
        "outline": rgba("#f6f6f2"), "edge": rgba("#0d1620", 200),
    }),
    "highland_links": (lighthouse, {
        "tower": rgba("#ece2c8"), "tower_light": rgba("#f8f1dd"), "tower_dark": rgba("#cbbd98"),
        "black": rgba("#17181c"), "lamp": rgba("#ffd84a"),
        "beam": rgba("#fff3a8", 220), "beam_mid": rgba("#fff3a8", 150), "beam_far": rgba("#fff3a8", 85),
        "grass": rgba("#6b8f45"), "edge": rgba("#0d1620", 220),
    }),
    "langdon": (barn, {
        "red": rgba("#c23b2e"), "red_light": rgba("#e0573f"), "red_dark": rgba("#8a2720"),
        "roof": rgba("#5b2b26"), "roof_light": rgba("#7c3a31"), "white": rgba("#f4f0e6"),
        "dark": rgba("#2a1714"), "grass": rgba("#5f8f45"), "edge": EDGE,
    }),
    "east_potomac": (memorial, {
        "marble": rgba("#efe9dc"), "marble_light": rgba("#fbf8f0"), "marble_dark": rgba("#c9c0ad"),
        "shadow": rgba("#5d636e"), "edge": EDGE,
    }),
    "langston": (wildflower, {
        "petal": rgba("#f2892a"), "petal_light": rgba("#ffb257"), "petal_dark": rgba("#c45f14"),
        "centre": rgba("#6b3d14"), "centre_light": rgba("#ffd84a"),
        "stem": rgba("#3f7a3a"), "leaf": rgba("#4f9447"), "leaf_light": rgba("#74b860"), "leaf_dark": rgba("#2f6030"),
        "edge": EDGE,
    }),
    "stone_creek": (waterfall, {
        "stone": rgba("#8c929b"), "stone_light": rgba("#b4bac2"), "stone_dark": rgba("#626872"),
        "moss": rgba("#5f8f45"), "moss_light": rgba("#86b35c"),
        "water": rgba("#4c8fd8"), "water_light": rgba("#86bdf0"), "water_dark": rgba("#336eb3"),
        "foam": rgba("#eef6ff"), "edge": EDGE,
    }),
    "waverley": (train, {
        "green": rgba("#2c8a4c"), "green_light": rgba("#4fb06a"), "green_dark": rgba("#1d6337"),
        "white": rgba("#f4f2ea"), "dark": rgba("#1b1d22"), "wheel": rgba("#5c626c"), "wheel_light": rgba("#9aa1ab"), "lamp": rgba("#ffd84a"),
        "glass": rgba("#9fd3f0"), "rail": rgba("#7a6a58"), "steam": rgba("#e8edf2", 230), "edge": EDGE,
    }),
    "eastmoreland": (rhododendron, {
        "pink": rgba("#ea6aa8"), "pink_light": rgba("#f8a9cf"), "pink_dark": rgba("#b8407c"),
        "throat": rgba("#fde3ef"), "spot": rgba("#a8306a"),
        "leaf": rgba("#2f7a3e"), "leaf_light": rgba("#4f9d55"), "leaf_dark": rgba("#1d4f2a"), "edge": EDGE,
    }),
    "willamette_valley": (wine, {
        "glass": rgba("#dfeaf2", 120), "glass_edge": rgba("#e9f1f6"), "white": rgba("#ffffff"),
        "wine": rgba("#8c1a30"), "wine_light": rgba("#b8324a"), "wine_dark": rgba("#5e0f1f"),
        "glint_wine": rgba("#d9677a"), "edge": EDGE,
    }),
    "indian_island": (arrowhead, {
        "glint": rgba("#e6eaf1"), "light": rgba("#b9c0cc"), "mid": rgba("#8c94a3"), "dark": rgba("#646b7a"),
        "deep": rgba("#454b58"), "ridge": rgba("#d7dce5"), "edge": EDGE,
    }),
    "gearhart": (shipwreck, {
        "wood": rgba("#8a5a34"), "wood_light": rgba("#b07a48"), "wood_dark": rgba("#5e3a20"),
        "dark": rgba("#2a1a10"), "sail": rgba("#e8dcc0"), "sail_dark": rgba("#c4b38e"),
        "water": rgba("#2f7fc4"), "water_dark": rgba("#205f9a"), "water_light": rgba("#7fbcea"), "foam": rgba("#eaf5ff"),
        "edge": EDGE,
    }),
    "tualatin": (bridge, {
        "wood": rgba("#a8743f"), "wood_light": rgba("#d39b5e"), "wood_dark": rgba("#6b4423"),
        "water": rgba("#3f86c8"), "water_dark": rgba("#2c66a0"), "water_light": rgba("#86bdf0"),
        "grass": rgba("#4f9447"), "grass_light": rgba("#74b860"), "edge": EDGE,
    }),
}

# the East Potomac courses: the memorial on a disc in the course's colour
for _layout, _fill, _rim in (("blue", "#2f6fd1", "#5d97ee"), ("white", "#f6f6f2", "#cfd3d8"), ("red", "#d23a2e", "#ef6a5a")):
    LOGOS[f"east_potomac_{_layout}"] = (colour_disc(memorial, rgba(_fill), rgba(_rim)), LOGOS["east_potomac"][1])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for cid, (fn, colours) in LOGOS.items():
        Image.fromarray(fn(colours), "RGBA").save(OUT / f"{cid}.png", optimize=True)
        print(f"[logos] {cid} -> sprites/logos/{cid}.png")


if __name__ == "__main__":
    main()

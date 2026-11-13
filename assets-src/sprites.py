"""Character, ball, flag, markers and UI icon sprites, drawn from code."""
from __future__ import annotations

import math

import numpy as np

from atlas import from_template, hex2rgba, outline

PAL = {
    "K": "#14161c",  # outline
    "C": "#3b7bc4", "c": "#2a5b97", "b": "#1f3f6c",  # cap
    "S": "#eab38a", "s": "#c48a62",  # skin
    "W": "#eceee6", "w": "#b8bcb3",  # shirt
    "P": "#8f7f5f", "p": "#6c5e45",  # trousers
    "F": "#2b2b31",  # shoes
    "G": "#c3c9d2",  # shaft
    "M": "#7a818d",  # club head
    "H": "#5a3b25",  # hair
    # holiday hats (holiday.py): santa's, a pilgrim's
    "R": "#d8282c", "r": "#a2181e", "T": "#f6f4ee", "t": "#cfd3d6",
    "Y": "#26262e", "y": "#45454f", "N": "#5a3e22", "U": "#f0c23c",
}


def _canvas(w, h):
    return np.zeros((h, w, 4), np.uint8)


def _px(img, x, y, col):
    if 0 <= y < img.shape[0] and 0 <= x < img.shape[1]:
        img[y, x] = hex2rgba(PAL[col]) if col in PAL else hex2rgba(col)


def _line(img, x0, y0, x1, y1, col):
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        _px(img, x0, y0, col)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def _rect(img, x0, y0, x1, y1, col):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            _px(img, x, y, col)


# --- golfer --------------------------------------------------------------
# Canvas 18 x 20, feet centre at (8, 18). Three orientations: side (facing
# right; mirrored for left), front (facing the camera) and back.

def _body_side(img, crouch=0, hat="cap"):
    # legs
    _rect(img, 6, 13, 7, 17, "P"); _rect(img, 9, 13, 10, 17, "p")
    _rect(img, 5, 18, 7, 18, "F"); _rect(img, 9, 18, 11, 18, "F")
    # torso (leaning toward the ball)
    _rect(img, 6, 7 + crouch, 10, 12, "W")
    _rect(img, 9, 8 + crouch, 10, 12, "w")
    _px(img, 6, 12, "w")
    # head + cap (brim to the right)
    _rect(img, 7, 4 + crouch, 9, 6 + crouch, "S")
    _px(img, 7, 6 + crouch, "s")
    _px(img, 6, 5 + crouch, "H")
    _hat_side(img, crouch, hat)


def _hat_side(img, c, hat):
    if hat == "santa":  # red, a white fur band, the tip falling back with its white bobble
        _rect(img, 6, 2 + c, 9, 2 + c, "R"); _px(img, 9, 2 + c, "r")
        _rect(img, 6, 1 + c, 8, 1 + c, "R")
        _rect(img, 4, 0 + c, 6, 0 + c, "R")
        _px(img, 3, 1 + c, "T")
        _rect(img, 6, 3 + c, 10, 3 + c, "T"); _px(img, 10, 3 + c, "t")
        return
    if hat == "pilgrim":  # a tall black crown, a band with a gold buckle, a wide brim
        _rect(img, 6, 0 + c, 9, 1 + c, "Y"); _px(img, 6, 0 + c, "y"); _px(img, 6, 1 + c, "y")
        _rect(img, 6, 2 + c, 9, 2 + c, "N"); _px(img, 9, 2 + c, "U")
        _rect(img, 4, 3 + c, 11, 3 + c, "Y")
        return
    _rect(img, 6, 2 + c, 9, 3 + c, "C")
    _rect(img, 7, 1 + c, 8, 1 + c, "C")
    _px(img, 9, 2 + c, "c"); _px(img, 9, 3 + c, "c")
    _rect(img, 10, 3 + c, 11, 3 + c, "b")


def golfer_side(pose: str, hat: str = "cap") -> np.ndarray:
    img = _canvas(18, 20)
    crouch = 1 if pose in ("address", "putt", "impact") else 0
    if pose in ("backswing",):
        _line(img, 8, 2, 3, 0, "G"); _px(img, 2, 0, "M"); _px(img, 3, 1, "M")
    if pose == "follow":
        _line(img, 10, 2, 15, 0, "G"); _px(img, 16, 0, "M")
    _body_side(img, crouch, hat)
    if pose == "address":
        _line(img, 9, 9, 11, 11, "S")
        _line(img, 11, 11, 14, 17, "G"); _rect(img, 14, 18, 15, 18, "M")
    elif pose == "putt":
        _line(img, 9, 9, 11, 12, "S")
        _line(img, 11, 12, 13, 17, "G"); _rect(img, 13, 18, 14, 18, "M")
    elif pose == "impact":
        _line(img, 9, 9, 11, 12, "S")
        _line(img, 11, 12, 15, 16, "G"); _rect(img, 15, 17, 16, 17, "M")
    elif pose == "backswing":
        _line(img, 9, 8, 8, 4, "S"); _px(img, 8, 3, "S")
    elif pose == "follow":
        _line(img, 9, 8, 10, 4, "S"); _px(img, 10, 3, "S")
    elif pose == "idle":
        _line(img, 9, 9, 10, 12, "S")
        _line(img, 10, 12, 12, 17, "G"); _rect(img, 12, 18, 13, 18, "M")
    return outline(img)


def _body_front(img, crouch=0, back=False, hat="cap"):
    _rect(img, 6, 13, 7, 17, "P"); _rect(img, 9, 13, 10, 17, "P")
    _px(img, 7, 13, "p"); _px(img, 10, 14, "p")
    _rect(img, 5, 18, 7, 18, "F"); _rect(img, 9, 18, 11, 18, "F")
    _rect(img, 5, 7 + crouch, 11, 12, "W")
    _rect(img, 10, 8 + crouch, 11, 12, "w")
    if back:
        _rect(img, 6, 3 + crouch, 10, 6 + crouch, "H")
        if hat == "cap":
            _rect(img, 6, 2 + crouch, 10, 4 + crouch, "C")
            _rect(img, 7, 1 + crouch, 9, 1 + crouch, "C")
            _rect(img, 9, 2 + crouch, 10, 4 + crouch, "c")
        _rect(img, 7, 5 + crouch, 9, 5 + crouch, "s")
    else:
        _rect(img, 6, 4 + crouch, 10, 6 + crouch, "S")
        _px(img, 10, 5 + crouch, "s"); _px(img, 10, 6 + crouch, "s")
        _px(img, 7, 5 + crouch, "K"); _px(img, 9, 5 + crouch, "K")
        if hat == "cap":
            _rect(img, 6, 2 + crouch, 10, 3 + crouch, "C")
            _rect(img, 7, 1 + crouch, 9, 1 + crouch, "C")
            _rect(img, 9, 2 + crouch, 10, 3 + crouch, "c")
            _rect(img, 5, 4 + crouch, 11, 4 + crouch, "b")
    if hat != "cap":
        _hat_front(img, crouch, hat, back)


def _hat_front(img, c, hat, back):
    if hat == "santa":
        _rect(img, 6, 2 + c, 10, 3 + c, "R"); _rect(img, 9, 2 + c, 10, 3 + c, "r")
        _rect(img, 7, 1 + c, 9, 1 + c, "R")
        _rect(img, 9, 0 + c, 10, 0 + c, "R")
        _px(img, 11, 0 + c, "T"); _px(img, 12, 1 + c, "T")
        _rect(img, 6, 4 + c, 10, 4 + c, "T"); _px(img, 10, 4 + c, "t")
        return
    if hat == "pilgrim":
        _rect(img, 6, 0 + c, 10, 2 + c, "Y"); _rect(img, 6, 0 + c, 6, 2 + c, "y")
        _rect(img, 6, 3 + c, 10, 3 + c, "N")
        if not back:
            _px(img, 8, 3 + c, "U")
        _rect(img, 4, 4 + c, 12, 4 + c, "Y")


def golfer_front(pose: str, back=False, hat: str = "cap") -> np.ndarray:
    """Facing the camera (front) or away from it (back). Target is to the
    right for the front view, to the left for the back view."""
    img = _canvas(18, 20)
    crouch = 1 if pose in ("address", "putt", "impact") else 0
    tgt = -1 if back else 1  # +x is toward the target in the front view
    cx = 8
    if pose == "backswing":
        hx = cx - 4 * tgt
        _line(img, hx, 4, hx - 3 * tgt, 0, "G"); _px(img, hx - 4 * tgt, 0, "M")
    if pose == "follow":
        hx = cx + 4 * tgt
        _line(img, hx, 4, hx + 3 * tgt, 0, "G"); _px(img, hx + 4 * tgt, 0, "M")
    _body_front(img, crouch, back, hat)
    if pose in ("address", "putt", "idle"):
        _line(img, 6, 9, 8, 12, "S"); _line(img, 10, 9, 8, 12, "S")
        _line(img, 8, 13, 8, 18, "G"); _rect(img, 8, 19, 9, 19, "M") if not back else _rect(img, 7, 19, 8, 19, "M")
    elif pose == "impact":
        _line(img, 6, 9, 8 + tgt, 12, "S"); _line(img, 10, 9, 8 + tgt, 12, "S")
        _line(img, 8 + tgt, 13, 8 + 3 * tgt, 18, "G"); _px(img, 8 + 4 * tgt, 19, "M")
    elif pose == "backswing":
        hx = cx - 4 * tgt
        _line(img, 6 if tgt > 0 else 10, 8, hx, 4, "S"); _line(img, 10 if tgt > 0 else 6, 8, hx, 4, "S")
    elif pose == "follow":
        hx = cx + 4 * tgt
        _line(img, 6 if tgt > 0 else 10, 8, hx, 4, "S"); _line(img, 10 if tgt > 0 else 6, 8, hx, 4, "S")
    return outline(img)


GOLFER_POSES = ["idle", "address", "backswing", "impact", "follow", "putt"]


def golfer_frames(hat: str = "cap"):
    out = []
    for p in GOLFER_POSES:
        out.append((f"golfer_side_{p}", golfer_side(p, hat)))
        out.append((f"golfer_front_{p}", golfer_front(p, back=False, hat=hat)))
        out.append((f"golfer_back_{p}", golfer_front(p, back=True, hat=hat)))
    return out


# --- portrait 48x48 --------------------------------------------------------

def portrait(hat: str = "cap") -> np.ndarray:
    W = H = 48
    img = np.zeros((H, W, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]

    def fill(mask, col):
        img[mask] = hex2rgba(col)

    # shoulders / polo
    sh = ((xx - 24) / 21) ** 2 + ((yy - 50) / 13) ** 2 <= 1
    fill(sh & (yy >= 37), "#eceee6")
    fill(sh & (yy >= 37) & (xx > 31), "#c3c7bf")
    collar = (yy >= 36) & (yy <= 40) & (np.abs(xx - 24) <= 6) & (np.abs(xx - 24) >= (yy - 36) * 1.3)
    fill(collar, "#ffffff")
    fill((yy >= 38) & (yy <= 41) & (np.abs(xx - 24) <= 1), "#3b7bc4")
    # neck
    fill((xx >= 20) & (xx <= 28) & (yy >= 31) & (yy <= 37), "#d9a07a")
    fill((xx >= 25) & (xx <= 28) & (yy >= 31) & (yy <= 36), "#c48a62")
    # head
    head = ((xx - 24) / 10.5) ** 2 + ((yy - 23) / 12) ** 2 <= 1
    fill(head, "#eab38a")
    fill(head & (xx > 29) & (yy > 17), "#d49b72")
    # ear
    ear = ((xx - 13.5) / 2.2) ** 2 + ((yy - 24) / 3) ** 2 <= 1
    fill(ear, "#d49b72")
    # hair at the sides
    fill(head & (yy < 22) & (yy > 15) & ((xx < 16) | (xx > 32)), "#5a3b25")
    if hat == "santa":
        # the red hat, its tip falling to the right with a white bobble, and a white fur band
        left = 13 + (15 - yy) * 1.05
        right = 34 + (15 - yy) * 0.35
        cone = (yy >= 5) & (yy <= 15) & (xx >= left) & (xx <= right)
        tip = ((xx - 37) / 4.5) ** 2 + ((yy - 7.5) / 3) ** 2 <= 1
        drop = (xx >= 37) & (xx <= 41) & (yy >= 7) & (yy <= 11) & (xx - 37 <= (yy - 6) * 1.2)
        red = cone | tip | drop
        fill(red, "#d8282c")
        fill(red & (xx > 30), "#a2181e")
        fill(red & (xx < 20) & (yy < 13), "#ee4a46")
        fill(((xx - 42) / 2.6) ** 2 + ((yy - 12) / 2.6) ** 2 <= 1, "#f6f4ee")
        band = (yy >= 15) & (yy <= 18) & (xx >= 12) & (xx <= 37) & ~(((yy == 15) | (yy == 18)) & ((xx == 12) | (xx == 37)))
        fill(band, "#f6f4ee")
        fill(band & (yy == 18), "#cfd3d6")
        fill(band & (yy == 15) & (xx % 4 == 1), "#ffffff")
    elif hat == "pilgrim":
        # a tall black crown, a band with a gold buckle, a wide flat brim
        crown_p = (yy >= 1) & (yy <= 15) & (xx >= 15 + (15 - yy) * 0.08) & (xx <= 33 - (15 - yy) * 0.08)
        fill(crown_p, "#26262e")
        fill(crown_p & (xx <= 17), "#45454f")
        fill(crown_p & (yy <= 2), "#33333c")
        fill((yy >= 11) & (yy <= 14) & (xx >= 15) & (xx <= 33), "#5a3e22")
        buckle = (yy >= 10) & (yy <= 15) & (xx >= 21) & (xx <= 27)
        fill(buckle, "#f0c23c")
        fill((yy >= 12) & (yy <= 13) & (xx >= 23) & (xx <= 25), "#26262e")
        brim_p = ((xx - 24) / 17) ** 2 + ((yy - 16.5) / 2.2) ** 2 <= 1
        fill(brim_p, "#26262e")
        fill(brim_p & (yy <= 15), "#45454f")
    else:
        # cap crown + brim
        crown = ((xx - 23.5) / 12) ** 2 + ((yy - 15) / 8) ** 2 <= 1
        fill(crown & (yy <= 17), "#3b7bc4")
        fill(crown & (yy <= 17) & (xx > 28), "#2a5b97")
        fill(crown & (yy <= 11) & (xx < 20), "#5c95d6")
        brim = (yy >= 16) & (yy <= 18) & (xx >= 16) & (xx <= 40) & ~((yy == 18) & (xx > 37))
        fill(brim, "#1f3f6c")
        fill((yy == 16) & (xx >= 18) & (xx <= 38), "#2a5b97")
        fill((yy == 7) & (np.abs(xx - 23) <= 1), "#ffffff")  # button
    # face details
    fill((yy == 22) & ((xx == 21) | (xx == 22) | (xx == 28) | (xx == 29)), "#2b2b31")  # eyes
    fill((yy == 20) & (((xx >= 20) & (xx <= 23)) | ((xx >= 27) & (xx <= 30))), "#7a4e33")  # brows
    fill((xx == 26) & (yy >= 23) & (yy <= 26), "#c48a62")  # nose
    fill((yy == 27) & (xx == 27), "#c48a62")
    fill((yy == 29) & (xx >= 22) & (xx <= 27), "#a3604a")  # smile
    fill((yy == 28) & ((xx == 21) | (xx == 28)), "#a3604a")
    a = img[..., 3] > 0
    ring = np.zeros_like(a)
    # shifted without wrapping (np.roll carried the shoulders on the bottom row round to a dark line
    # along the top of the picture)
    ring[1:, :] |= a[:-1, :]
    ring[:-1, :] |= a[1:, :]
    ring[:, 1:] |= a[:, :-1]
    ring[:, :-1] |= a[:, 1:]
    img[ring & ~a] = hex2rgba("#14161c")
    return img


# --- small world sprites -------------------------------------------------------

def ball():
    return from_template(["WW", "Wg"], {"W": "#ffffff", "g": "#d8dce2"})


def ball_shadow():
    return from_template(["kk"], {"k": (0, 0, 0, 120)})


def flag(frame: int):
    """Pin (2 px pole) with a waving flag, 2 frames; anchor at the pole base."""
    rows_a = ["RRRRR.", "RRRRRR", "RRRrR.", "RRr...", "......"]
    rows_b = ["RRRR..", "RRRRRR", "RRRRR.", "rRr...", "......"]
    rows = rows_a if frame == 0 else rows_b
    img = np.zeros((17, 8, 4), np.uint8)
    for y in range(17):
        img[y, 0] = hex2rgba("#f2f2ee")
        img[y, 1] = hex2rgba("#b9bdc4")
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "R":
                img[y, x + 2] = hex2rgba("#e2382f")
            elif ch == "r":
                img[y, x + 2] = hex2rgba("#a8241e")
    img[0, 0] = hex2rgba("#ffd84a")
    return outline(img, color=(20, 22, 28, 220))


def cup():
    return from_template([".kkk.", "kkkkk", ".kkk."], {"k": "#1d2a1c"})


def ball_big():
    """Ball for the putting view: 2 px with a soft outline - clearly smaller than the cup."""
    img = from_template(["WW", "Wg"], {"W": "#ffffff", "g": "#d3d8de"})
    return outline(img, color=(16, 22, 18, 120))


def cup_big():
    """Cup for the putting view (7 x 5): dark hole, shaded rim, lit far wall."""
    return from_template([".kkkkk.", "kKKKKKk", "kKKKKKk", "kKKKKKk", ".kllll."],
                         {"K": "#0a110a", "k": "#22331d", "l": "#4c6b3f"})


def cup_true():
    """Cup for the close-up putting view (24 texels/m): 4 texels across, the real 10.8 cm hole plus its lip.
    The 2 x 2 ball (8 cm) is then drawn at about its real size relative to the cup."""
    return from_template(["kKKk", "KKKK", "KKKK", "kllk"],
                         {"K": "#0a110a", "k": "#22331d", "l": "#4c6b3f"})


def putt_target():
    ring = ["..WWW..", ".W...W.", "W.....W", "W.....W", "W.....W", ".W...W.", "..WWW.."]
    return outline(from_template(ring, {"W": (255, 255, 255, 235)}), color=(16, 22, 18, 120))


def aim_tick():
    return outline(from_template(["OO", "OO"], {"O": "#f59a4e"}), color=(40, 24, 12, 200))


def tee_marker():
    return outline(from_template([".BB.", "BBBB", "bBBb", ".bb."], {"B": "#3d7fe0", "b": "#2457a6"}))


def landing_marker(scale=1):
    s = [
        "....WWW....",
        "..WW...WW..",
        ".W.......W.",
        ".W...W...W.",
        "W...WWW...W",
        ".W...W...W.",
        ".W.......W.",
        "..WW...WW..",
        "....WWW....",
    ]
    return from_template(s, {"W": "#ffffff"})


def aim_dot():
    return from_template(["WW", "WW"], {"W": "#ffffff"})


def cross_marker():
    return from_template(["W...W", ".W.W.", "..W..", ".W.W.", "W...W"], {"W": "#ffffff"})


def slope_arrow(direction: int, level: int):
    """Tiny 5x5 arrow pointing downhill; level 0..2 (gentle, medium, steep)."""
    cols = ["#d9f2c4", "#f2d34a", "#f0662e"]
    ang = direction * math.pi / 4
    img = np.zeros((7, 7, 4), np.uint8)
    L = [1.5, 2.2, 3.0][level]
    cx = cy = 3
    dx, dy = math.cos(ang), -math.sin(ang)
    for k in np.linspace(-L, L, 12):
        x, y = int(round(cx + dx * k)), int(round(cy + dy * k))
        img[y, x] = hex2rgba(cols[level])
    # head
    hx, hy = cx + dx * L, cy + dy * L
    for a in (2.5, -2.5):
        x = int(round(hx - math.cos(ang + a / 3) * 1.6))
        y = int(round(hy + math.sin(ang + a / 3) * 1.6))
        if 0 <= x < 7 and 0 <= y < 7:
            img[y, x] = hex2rgba(cols[level])
    return img


# --- UI icons --------------------------------------------------------------------

def icon_arrow(direction: str):
    base = [
        "..W..",
        ".WWW.",
        "WWWWW",
    ]
    img = from_template(base, {"W": "#ffffff"})
    if direction == "down":
        img = img[::-1]
    elif direction == "left":
        img = np.rot90(img, 1)
    elif direction == "right":
        img = np.rot90(img, -1)
    return np.ascontiguousarray(img)


def _bres(img, x0, y0, x1, y1, col):
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        if 0 <= y0 < img.shape[0] and 0 <= x0 < img.shape[1]:
            img[y0, x0] = col
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def wind_arrow(k: int, n: int = 16):
    """Arrow pointing in direction k*360/n (0 = east, CCW): 2 px shaft and a
    filled triangular head, sampled at pixel centres on a 15x15 canvas."""
    S = 19
    c = (S - 1) / 2
    img = np.zeros((S, S, 4), np.uint8)
    W = hex2rgba("#ffffff")
    ang = 2 * math.pi * k / n
    dx, dy = math.cos(ang), -math.sin(ang)   # screen y grows downward
    px_, py_ = -dy, dx                        # perpendicular
    tip = 7.6
    base = 2.4
    for y in range(S):
        for x in range(S):
            vx, vy = x - c, y - c
            a = vx * dx + vy * dy                 # along the arrow
            b = vx * px_ + vy * py_               # across
            shaft = -7.0 <= a <= base and abs(b) <= 0.95
            head = base - 0.2 <= a <= tip and abs(b) <= (tip - a) * 0.8
            if shaft or head:
                img[y, x] = W
    return outline(img)


def ball_air(size: int):
    if size == 3:
        rows = [".W.", "WWW", ".Wg"]
    else:
        rows = [".WW.", "WWWW", "WWWg", ".gg."]
    return outline(from_template(rows, {"W": "#ffffff", "g": "#d4d9e0"}), color=(20, 24, 30, 230))


def club_icon(kind: str):
    c = {"H": "#9aa2ad", "h": "#6e7580", "S": "#c3c9d2", "D": "#2c2f36", "d": "#4a4f59", "g": "#d8a548"}
    shapes = {
        "driver": [
            "...........SS",
            "..........SS.",
            ".........SS..",
            "...dddd.SS...",
            ".dDDDDDdS....",
            "dDDDdddDd....",
            "dDDDDDDDd....",
            ".dDDDDDd.....",
            "..ddddd......",
        ],
        "wood": [
            "..........SS",
            ".........SS.",
            "........SS..",
            "..ddd..SS...",
            ".dDDDdSS....",
            "dDDDDDDd....",
            ".dDDDDd.....",
            "..dddd......",
        ],
        "hybrid": [
            ".........SS",
            "........SS.",
            ".......SS..",
            "......SS...",
            ".hhhhSS....",
            "hHHHHHh....",
            ".hhhhh.....",
        ],
        "iron": [
            "........SS",
            ".......SS.",
            "......SS..",
            ".....SS...",
            "....SS....",
            ".hHHHh....",
            "hHHHHH....",
            "hhhhh.....",
        ],
        "wedge": [
            ".......SS",
            "......SS.",
            ".....SS..",
            "....SS...",
            ".hHHSh...",
            "hHHHHH...",
            "hHHHHh...",
            ".hhhh....",
        ],
        "putter": [
            "....SS",
            "....SS",
            "....SS",
            "....SS",
            "....SS",
            "hHHHHH",
            "hhhhhh",
        ],
    }
    return outline(from_template(shapes[kind], c))


def spin_icon(state: int):
    """Ball with a marker at the top (topspin), bottom (backspin) or none."""
    rows = [
        "..WWWW..",
        ".WWWWWW.",
        "WWWWWWWg",
        "WWWWWWWg",
        "WWWWWWgg",
        "WWWWWWgg",
        ".WWWggg.",
        "..gggg..",
    ]
    img = from_template(rows, {"W": "#ffffff", "g": "#cfd4dc"})
    red = hex2rgba("#e2382f")
    if state > 0:
        img[0:2, 3:5] = red
    elif state < 0:
        img[6:8, 3:5] = red
    return outline(img)


def flag_icon():
    rows = [
        "#RRRR",
        "#RRRRR",
        "#RRRR",
        "#",
        "#",
        "#",
    ]
    img = np.zeros((6, 6, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "#":
                img[y, x] = hex2rgba("#f2f2ee")
            elif ch == "R":
                img[y, x] = hex2rgba("#e2382f")
    return outline(img)


def tee_icon():
    rows = [
        "..WWWW..",
        ".WWWWWg.",
        ".WWWWgg.",
        "..gggg..",
        "TTTTTTTT",
        "..TTTT..",
        "...TT...",
        "...TT...",
    ]
    return outline(from_template(rows, {"W": "#ffffff", "g": "#cfd4dc", "T": "#e8c66a"}))


def hatch_tile():
    img = np.zeros((4, 4, 4), np.uint8)
    for i in range(4):
        img[i, (3 - i) % 4] = (255, 255, 255, 18)
    return img


def all_sprites():
    out = []
    out += golfer_frames()
    out.append(("portrait", portrait()))
    out.append(("ball", ball()))
    out.append(("ball_shadow", ball_shadow()))
    out.append(("ball_air3", ball_air(3)))
    out.append(("ball_air4", ball_air(4)))
    out.append(("ball_shadow2", from_template([".kk.", "kkkk", ".kk."], {"k": (0, 0, 0, 125)})))
    out.append(("ball_shadow3", from_template(["kkk", ".k."], {"k": (0, 0, 0, 125)})))
    out.append(("trail", from_template(["WW", "WW"], {"W": (255, 255, 255, 150)})))
    out.append(("flag_0", flag(0)))
    out.append(("flag_1", flag(1)))
    out.append(("cup", cup()))
    out.append(("cup_big", cup_big()))
    out.append(("ball_big", ball_big()))
    out.append(("cup_true", cup_true()))
    out.append(("putt_target", putt_target()))
    out.append(("aim_tick", aim_tick()))
    out.append(("tee_marker", tee_marker()))
    out.append(("landing", landing_marker()))
    out.append(("aim_dot", aim_dot()))
    out.append(("cross", cross_marker()))
    for d in range(8):
        for lv in range(3):
            out.append((f"slope_{d}_{lv}", slope_arrow(d, lv)))
    for d in ("up", "down", "left", "right"):
        out.append((f"arrow_{d}", icon_arrow(d)))
    for k in range(16):
        out.append((f"wind_{k}", wind_arrow(k)))
    for k in ("driver", "wood", "hybrid", "iron", "wedge", "putter"):
        out.append((f"club_{k}", club_icon(k)))
    for s in (-1, 0, 1):
        out.append((f"spin_{s}", spin_icon(s)))
    out.append(("flag_icon", flag_icon()))
    out.append(("tee_icon", tee_icon()))
    out.append(("hatch", hatch_tile()))
    return out

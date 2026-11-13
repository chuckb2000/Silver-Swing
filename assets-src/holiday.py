"""Holiday sprites (design chat, 2026-11-13): sprites/holiday_<name>.png/json.

The game loads one of these over the usual sprites during a holiday (game/src/data/holiday.ts):
the golfer and the portrait in a holiday hat and the holiday's flag (the same frame names as in
sprites.json, so they swap in), and the holiday's own decorations.

    thanksgiving  a pilgrim's hat, an orange flag on a wooden pole, pumpkins, a hay bale, corn
                  shocks, leaves, a turkey for the title screen and the "turkey" note
    christmas     santa's hat, a candy-cane pin with a green flag, presents, a snowman for the
                  "snowman" note, santa's hat for the trophy

    python3 assets-src/holiday.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from atlas import Atlas, from_template, hex2rgba, outline
from sprites import golfer_frames, portrait

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "game" / "public" / "sprites"


def _flag(frame: int, pole: tuple[str, str], cloth: tuple[str, str], stripes: str | None = None, top: str = "#ffd84a"):
    """The pin and its flag, as sprites.flag: 2 px pole, 17 tall, anchor at the pole base."""
    rows_a = ["RRRRR.", "RRRRRR", "RRRrR.", "RRr...", "......"]
    rows_b = ["RRRR..", "RRRRRR", "RRRRR.", "rRr...", "......"]
    rows = rows_a if frame == 0 else rows_b
    img = np.zeros((17, 8, 4), np.uint8)
    for y in range(17):
        a, b = pole
        if stripes and (y // 2) % 2 == 1:
            a, b = stripes, stripes
        img[y, 0] = hex2rgba(a)
        img[y, 1] = hex2rgba(b)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "R":
                img[y, x + 2] = hex2rgba(cloth[0])
            elif ch == "r":
                img[y, x + 2] = hex2rgba(cloth[1])
    img[0, 0] = hex2rgba(top)
    return outline(img, color=(20, 22, 28, 220))


# ---------------------------------------------------------------- thanksgiving

def pumpkin(big: bool):
    if big:
        rows = ["...gg...",
                "..ogg...",
                ".OoOOoO.",
                "OOoOOoOO",
                "OOoOOoOd",
                "OOoOOoOd",
                ".ddoddd."]
    else:
        rows = ["..g..",
                ".OoO.",
                "OoOoO",
                "OoOod",
                ".ddd."]
    return outline(from_template(rows, {"O": "#ec8a24", "o": "#c86a14", "d": "#a8520e", "g": "#4f7a2a"}), color=(40, 20, 8, 230))


def hay_bale():
    rows = ["HHHHHHHHHHHH",
            "HhHHHhHHHHhH",
            "HHHtHHHHtHHH",
            "hHHtHHhHtHHh",
            "HHHtHHHHtHHH",
            "hhhthhhhthhh",
            "dddddddddddd"]
    return outline(from_template(rows, {"H": "#e3c25e", "h": "#c9a440", "t": "#8a5a2a", "d": "#a7842e"}), color=(48, 34, 12, 230))


def corn_shock():
    rows = ["....y...",
            "...yY.y.",
            "..yYyYy.",
            ".yYyYYy.",
            ".YyYyYy.",
            "..YyYy..",
            "..YyyY..",
            "..yYyy..",
            "..YrrY..",
            "..yYyY..",
            ".yYyYyy.",
            "yYyYyYyy"]
    return outline(from_template(rows, {"Y": "#d8b866", "y": "#b0903e", "r": "#8a3a22"}), color=(48, 34, 12, 220))


LEAF_COLOURS = [("#e8701e", "#b84c10"), ("#c8321e", "#8e1e12"), ("#e8b42a", "#b88618")]


def leaf(k: int):
    a, b = LEAF_COLOURS[k % 3]
    rows = [".A.", "AAb", ".b."] if k < 3 else ["Ab.", "bAA", ".A."]
    return from_template(rows, {"A": a, "b": b})


def turkey():
    """An original pixel turkey: a fanned tail in bands, a round brown body, a red wattle."""
    W, H = 40, 36
    img = np.zeros((H, W, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = 20, 22
    ang = np.arctan2(cy - yy, xx - cx)
    r = np.hypot(xx - cx, (yy - cy) * 1.05)
    fan = (r <= 18.5) & (yy <= cy + 2)
    bands = [(18.5, "#6a3a1c"), (16.0, "#e8701e"), (13.0, "#c8321e"), (10.0, "#e8b42a"), (7.5, "#8a4a22")]
    for rad, col in bands:
        img[fan & (r <= rad)] = hex2rgba(col)
    # feather tips
    tips = fan & (r > 16.0) & ((np.round(ang * 180 / np.pi) % 16) < 5)
    img[tips] = hex2rgba("#f4f0e4")
    # the body
    body = ((xx - cx) / 9.5) ** 2 + ((yy - 26) / 8.5) ** 2 <= 1
    img[body] = hex2rgba("#8a4a22")
    img[body & (xx > cx + 3)] = hex2rgba("#6a3a1c")
    img[body & (yy < 22) & (xx < cx - 2)] = hex2rgba("#a8602c")
    # wings (feather lines)
    for k in (-1, 1):
        wing = ((xx - (cx + 5 * k)) / 3.5) ** 2 + ((yy - 27) / 5) ** 2 <= 1
        img[wing] = hex2rgba("#6a3a1c")
        img[wing & ((yy % 2) == 0)] = hex2rgba("#7a4420")
    # head and neck
    head = ((xx - cx) / 3.2) ** 2 + ((yy - 15) / 3.6) ** 2 <= 1
    img[head] = hex2rgba("#c9a284")
    img[(xx >= cx - 1) & (xx <= cx + 1) & (yy >= 17) & (yy <= 19)] = hex2rgba("#c9a284")
    img[(yy == 14) & ((xx == cx - 1) | (xx == cx + 1))] = hex2rgba("#14161c")  # eyes
    img[(yy >= 15) & (yy <= 16) & (xx == cx)] = hex2rgba("#f0c23c")  # beak
    img[(yy >= 17) & (yy <= 20) & (xx == cx + 1)] = hex2rgba("#d8282c")  # wattle
    img[(yy == 18) & (xx == cx + 2)] = hex2rgba("#d8282c")
    # feet
    for fx in (cx - 3, cx + 3):
        img[(yy >= 34) & (yy <= 35) & (xx >= fx - 1) & (xx <= fx + 1)] = hex2rgba("#e0a43a")
        img[(yy >= 33) & (yy <= 34) & (xx == fx)] = hex2rgba("#e0a43a")
    return outline(img, color=(30, 18, 10, 255))


# ------------------------------------------------------------------- christmas

def present(k: int):
    boxes = [("#d8282c", "#a2181e", "#f0c23c"), ("#2f9a46", "#1f6e30", "#f6f4ee"), ("#3a78d8", "#2556a4", "#f0c23c")]
    a, b, ribbon = boxes[k % 3]
    rows = ["..r.r..",
            "...r...",
            "AAArAAA",
            "AAArAAB",
            "rrrrrrr",
            "AAArAAB",
            "BBBrBBB"] if k != 1 else [".r.r.",
                                       "..r..",
                                       "AArAB",
                                       "rrrrr",
                                       "AArAB",
                                       "BBrBB"]
    return outline(from_template(rows, {"A": a, "B": b, "r": ribbon}), color=(20, 22, 28, 230))


def snowman():
    """A snowman (an 8 on a hole is a "snowman"): coal eyes and buttons, a carrot nose, a red scarf."""
    rows = ["....KKKK....",
            "....KKKK....",
            "...KKKKKK...",
            "....WWWW....",
            "...WKWWKW...",
            "...WWWoow...",
            "...WWWWWw...",
            "...rrrrrrr..",
            "..WWWWrrWww.",
            ".WWWWWrWWWww",
            ".WWWWKWWWWww",
            ".WWWWWWWWWww",
            ".WWWWKWWWWww",
            "..WWWWWWWww.",
            ".WWWWWWWWWWw",
            "WWWWWWKWWWWw",
            "WWWWWWWWWWWw",
            "WWWWWWKWWWWw",
            "WWWWWWWWWWww",
            ".wWWWWWWWww.",
            "..wwwwwwww.."]
    return outline(from_template(rows, {"W": "#f6f8fc", "w": "#c6d2e2", "K": "#22242c", "o": "#f08a24", "r": "#d8282c"}), color=(30, 40, 60, 255))


def santa_hat_big():
    """Santa's hat for the trophy on the title screen (it sits on the lid, the tip falling right)."""
    W, H = 34, 22
    img = np.zeros((H, W, 4), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    left = 3 + (15 - yy) * 0.9
    right = 26 + (15 - yy) * 0.2
    cone = (yy >= 4) & (yy <= 15) & (xx >= left) & (xx <= right)
    tip = ((xx - 26) / 4.0) ** 2 + ((yy - 5.5) / 2.6) ** 2 <= 1
    drop = (xx >= 26) & (xx <= 30) & (yy >= 5) & (yy <= 10) & (xx - 26 <= (yy - 4) * 1.1)
    red = cone | tip | drop
    img[red] = hex2rgba("#d8282c")
    img[red & (xx > 21)] = hex2rgba("#a2181e")
    img[red & (xx < 12) & (yy < 13)] = hex2rgba("#ee4a46")
    img[((xx - 30) / 2.6) ** 2 + ((yy - 11.5) / 2.6) ** 2 <= 1] = hex2rgba("#f6f4ee")
    band = (yy >= 15) & (yy <= 19) & (xx >= 1) & (xx <= 28)
    img[band] = hex2rgba("#f6f4ee")
    img[band & (yy == 19)] = hex2rgba("#cfd3d6")
    img[band & (yy == 15) & (xx % 3 == 0)] = hex2rgba("#ffffff")
    return outline(img, color=(30, 18, 20, 255))


def snowflake():
    return from_template([".W.", "WWW", ".W."], {"W": (255, 255, 255, 230)})


# ---------------------------------------------------------------------- write

def frames(name: str):
    if name == "thanksgiving":
        out = golfer_frames("pilgrim")
        out.append(("portrait", portrait("pilgrim")))
        for f in (0, 1):
            out.append((f"flag_{f}", _flag(f, ("#a8743e", "#7a5028"), ("#ec8a24", "#b85a18"), top="#f0c23c")))
        out += [("pumpkin_0", pumpkin(False)), ("pumpkin_1", pumpkin(True)), ("hay", hay_bale()), ("corn", corn_shock()), ("turkey", turkey())]
        out += [(f"leaf_{k}", leaf(k)) for k in range(6)]
    elif name == "christmas":
        out = golfer_frames("santa")
        out.append(("portrait", portrait("santa")))
        for f in (0, 1):
            out.append((f"flag_{f}", _flag(f, ("#f6f4ee", "#cfd3d6"), ("#2f9a46", "#1f6e30"), stripes="#d8282c")))
        out += [(f"present_{k}", present(k)) for k in range(3)]
        out += [("snowman", snowman()), ("santa_hat", santa_hat_big()), ("snowflake", snowflake())]
    else:
        raise ValueError(name)
    return out


HOLIDAYS = ("thanksgiving", "christmas")


def main():
    for name in HOLIDAYS:
        a = Atlas(f"holiday_{name}", max_w=256)
        for k, img in frames(name):
            a.add(k, img)
        w, h = a.write(OUT)
        print(f"[holiday] {name}: {len(a.frames)} frames ({w}x{h}) -> {OUT}")


if __name__ == "__main__":
    main()

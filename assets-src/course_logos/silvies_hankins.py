"""Silvies Valley Ranch, Hankins course logo: a pioneer homestead cabin of squared logs
with a shake roof and a fieldstone chimney, smoke drifting off, on the tawny bunchgrass.
Craddock and Hankins are "named after the original pioneers who homesteaded the site"
(GolfPass, 2017); the Craddock wagon is the arrival, this is the homestead. An original
drawing (course chat, 2026-10-25); the club's own emblem is not used. The file name is the
layout id; the ranch's card shows `silvies.png` (the goat caddie).

    python3 assets-src/logos.py silvies_hankins          # writes game/public/sprites/logos/silvies_hankins.png
    python3 assets-src/course_logos/silvies_hankins.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def cabin(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # bunchgrass across the bottom
    ground = (Y >= 26.2 + 0.5 * np.sin(X * 0.9 + 1.0)) & (Y <= 30.4) & (X >= 0.6) & (X <= 31.4)
    paint(img, ground, c["grass"])
    paint(img, ground & (Y >= 28.8), c["grass_dark"])
    rng = np.random.default_rng(1878)
    paint(img, ground & (Y < 28.6) & (rng.random((S, S)) < 0.22), c["grass_light"])

    # smoke from the chimney, drifting to the right
    smoke = ell(X, Y, 25.6, 5.2, 1.6, 1.2) | ell(X, Y, 27.8, 3.2, 1.9, 1.3) | ell(X, Y, 30.0, 1.8, 1.4, 1.0)
    paint(img, smoke, c["smoke"])
    paint(img, smoke & (Y > 3.6) & (X > 26.0), c["smoke_dark"])

    # fieldstone chimney on the right gable
    chim = (X >= 22.6) & (X <= 26.0) & (Y >= 6.6) & (Y <= 26.6)
    paint(img, chim, c["stone"])
    fx, fy = np.floor(X), np.floor(Y)
    paint(img, chim & (((fx + 2 * (fy // 2)) % 3) == 0) & (fy % 2 == 0), c["stone_dark"])
    paint(img, chim & (X < 23.4), c["stone_light"])

    # walls: squared logs, the ends showing at the left corner
    wall = (X >= 4.0) & (X <= 22.8) & (Y >= 15.6) & (Y <= 26.6)
    paint(img, wall, c["log"])
    for ly in np.arange(16.8, 26.6, 2.0):
        paint(img, wall & (np.abs(Y - ly) < 0.4), c["chink"])                 # chinking between logs
    for ly in np.arange(15.9, 26.6, 2.0):
        paint(img, (np.abs(X - 3.4) < 0.9) & (np.abs(Y - ly - 0.9) < 0.8), c["log_end"])   # log ends
    shade(img, wall, None, c["log_dark"])

    # door and a small window
    door = (X >= 9.2) & (X <= 12.6) & (Y >= 19.8) & (Y <= 26.6)
    paint(img, door, c["door"])
    paint(img, door & (X > 11.8), c["door_dark"])
    win = (X >= 15.4) & (X <= 19.0) & (Y >= 18.6) & (Y <= 21.8)
    paint(img, win, c["window"])
    paint(img, win & ((np.abs(X - 17.2) < 0.4) | (np.abs(Y - 20.2) < 0.4)), c["log_dark"])

    # shake roof, overhanging the walls
    roof = poly(X, Y, [(1.8, 16.4), (13.2, 7.0), (24.6, 16.4), (24.6, 17.0), (1.8, 17.0)])
    roof &= ~(chim & (Y < 15.0))
    paint(img, roof, c["roof"])
    for ry in (10.6, 13.4, 16.0):
        paint(img, roof & (np.abs(Y - ry) < 0.4), c["roof_dark"])
    paint(img, roof & (X < 13.2) & (np.abs(Y - (16.4 - (X - 1.8) * 9.4 / 11.4)) < 0.9), c["roof_light"])
    return outlined_outside(img, c["edge"])


LOGO = (cabin, {
    "log": rgba("#9b6a3e"), "log_dark": rgba("#6a4426"), "log_end": rgba("#c99a62"),
    "chink": rgba("#d8c8a4"),
    "roof": rgba("#6f5640"), "roof_light": rgba("#94785a"), "roof_dark": rgba("#4c3a2a"),
    "stone": rgba("#8c8a84"), "stone_light": rgba("#b4b0a6"), "stone_dark": rgba("#5e5c58"),
    "door": rgba("#5a3820"), "door_dark": rgba("#3e2615"), "window": rgba("#f2c35a"),
    "smoke": rgba("#d4d6d8"), "smoke_dark": rgba("#a9adb2"),
    "grass": rgba("#bfa265"), "grass_light": rgba("#dcc489"), "grass_dark": rgba("#8f7547"),
    "edge": EDGE,
})


if __name__ == "__main__":
    import sys

    from PIL import Image
    fn, cols = LOGO
    im = Image.fromarray(fn(cols), "RGBA").resize((S * 8, S * 8), Image.NEAREST)
    bg = Image.new("RGBA", im.size, (40, 44, 52, 255))
    bg.alpha_composite(im)
    bg.save(sys.argv[1])
    print(sys.argv[1])

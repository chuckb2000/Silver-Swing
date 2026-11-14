"""The Olympic Club Lake logo: a wind-bent Monterey cypress on a bank above Lake Merced,
the lake the course is named for, its corridors lined with cypress and pine. An original
drawing. `python3 assets-src/logos.py olympic_club_lake` writes
game/public/sprites/logos/olympic_club_lake.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def cypress_lake(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the lake, and a grassy bank on its left
    lake = ((X - 16.0) / 15.0) ** 2 + ((Y - 27.0) / 3.8) ** 2 <= 1.0
    paint(img, lake, c["water"])
    paint(img, lake & (Y > 28.0), c["water_dark"])
    for wx, wy in ((22.0, 25.5), (27.0, 27.5), (18.0, 29.0)):
        paint(img, lake & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["water_light"])
    bank = ((X - 9.0) / 8.0) ** 2 + ((Y - 25.5) / 3.6) ** 2 <= 1.0
    paint(img, bank, c["grass"])
    paint(img, bank & (Y > 26.5), c["grass_dark"])
    # leaning trunk and flat, layered cypress pads
    paint(img, seg(X, Y, 7.5, 25.0, 11.0, 14.0, 1.0), c["trunk"])
    paint(img, seg(X, Y, 10.4, 16.5, 17.0, 10.5, 0.7), c["trunk"])
    paint(img, seg(X, Y, 9.0, 19.0, 4.5, 15.0, 0.6), c["trunk"])
    for px, py, rx, ry in ((10.0, 10.5, 7.0, 3.0), (18.5, 7.5, 7.0, 2.8), (25.5, 10.5, 5.0, 2.2), (5.0, 13.5, 4.4, 2.0), (16.0, 13.0, 4.5, 1.8)):
        pad = ((X - px) / rx) ** 2 + ((Y - py) / ry) ** 2 <= 1.0
        paint(img, pad, c["leaf"])
        paint(img, pad & (Y < py - 0.7), c["leaf_light"])
        paint(img, pad & (Y > py + 1.0), c["leaf_dark"])
    # a flag on the far bank of the water
    paint(img, (X >= 25.0) & (X < 26.0) & (Y >= 17.0) & (Y < 25.5), c["pole"])
    paint(img, poly(X, Y, [(26.0, 17.0), (29.6, 18.3), (26.0, 19.6)]), c["flag"])
    paint(img, ((X - 25.5) / 3.0) ** 2 + ((Y - 25.6) / 1.0) ** 2 <= 1.0, c["green"])
    return outlined(img, c["edge"])


LOGO = (cypress_lake, {
    "water": rgba("#2c5d7c"), "water_dark": rgba("#1f4560"), "water_light": rgba("#6e98b0"),
    "grass": rgba("#4ea055"), "grass_dark": rgba("#357a43"), "green": rgba("#72bf6d"),
    "trunk": rgba("#5b514b"),
    "leaf": rgba("#1a422b"), "leaf_light": rgba("#387249"), "leaf_dark": rgba("#0f2a1b"),
    "pole": rgba("#f2efe6"), "flag": rgba("#b8322a"),
    "edge": EDGE,
})

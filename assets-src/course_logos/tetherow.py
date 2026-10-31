"""Tetherow logo: Broken Top's jagged, snow-streaked summit (the broken volcano west of
Bend, in view across the course) behind a ponderosa pine with its cinnamon trunk, over a
bank of purple-flowering heather and tawny fescue: the Cascades, the high-desert pines and
the heather-and-fescue links ground David McLay Kidd built there (course chat,
2026-10-31). An original drawing; the club's own emblem is not used.
`python3 assets-src/logos.py tetherow` writes game/public/sprites/logos/tetherow.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def broken_top(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the mountain: a broad cone whose summit is broken into jagged crags
    mtn = poly(X, Y, [(0.5, 21.5), (5.0, 15.0), (8.6, 10.0), (10.2, 4.6), (11.6, 8.8), (13.2, 3.2),
                      (14.8, 9.0), (16.2, 5.0), (17.6, 9.6), (19.2, 6.6), (20.8, 11.4), (24.0, 15.0),
                      (29.0, 21.5)])
    paint(img, mtn, c["rock"])
    shade(img, mtn, c["rock_light"], c["rock_dark"])
    # snow: the crown of the crags and streaks running down the gullies
    snow = mtn & ((Y < 7.4) | seg(X, Y, 10.2, 6.0, 8.2, 12.6, 0.55) | seg(X, Y, 13.2, 5.0, 12.4, 13.0, 0.55)
                  | seg(X, Y, 16.2, 6.4, 16.8, 12.0, 0.5) | seg(X, Y, 19.2, 8.0, 21.4, 13.0, 0.5))
    paint(img, snow, c["snow"])
    paint(img, snow & (X > 14.6) & (Y > 7.5), c["snow_shade"])

    # the ponderosa: straight cinnamon trunk, open crown of rounded tufts
    trunk = seg(X, Y, 23.6, 28.0, 23.6, 5.0, 0.85)
    limbs = seg(X, Y, 23.6, 12.6, 21.4, 11.2, 0.4) | seg(X, Y, 23.6, 13.0, 26.2, 11.8, 0.4) | seg(X, Y, 23.6, 8.6, 22.0, 7.6, 0.4)
    paint(img, trunk, c["bark"])
    paint(img, trunk & (X > 23.8), c["bark_dark"])
    paint(img, limbs, c["bark_dark"])
    crown = (ell(X, Y, 24.0, 4.6, 2.2, 1.8) | ell(X, Y, 21.6, 7.6, 2.4, 1.7) | ell(X, Y, 26.4, 8.2, 2.6, 1.7)
             | ell(X, Y, 20.6, 11.6, 2.6, 1.7) | ell(X, Y, 26.8, 12.2, 2.8, 1.8) | ell(X, Y, 23.6, 9.8, 1.6, 1.4))
    paint(img, crown, c["needle"])
    shade(img, crown, c["needle_light"], c["needle_dark"])

    # the ground: tawny fescue with a bank of heather in bloom
    fescue = (Y >= 22.0 + 0.7 * np.sin(X * 0.7)) & (Y <= 30.5) & (X >= 1.0) & (X <= 31.0)
    paint(img, fescue, c["fescue"])
    rng = np.random.default_rng(2008)
    paint(img, fescue & (rng.random((S, S)) < 0.22), c["fescue_light"])
    heather = fescue & (ell(X, Y, 8.0, 27.4, 7.4, 3.6) | ell(X, Y, 17.0, 28.6, 5.0, 2.6))
    paint(img, heather, c["heather"])
    paint(img, heather & (Y < 28.0) & (rng.random((S, S)) < 0.45), c["bloom"])
    paint(img, heather & (Y < 26.6) & (X < 9.0) & (rng.random((S, S)) < 0.4), c["bloom_light"])
    paint(img, heather & (Y >= 29.4), c["heather_dark"])
    paint(img, fescue & (Y >= 29.6) & ~heather, c["fescue_dark"])
    return outlined(img, c["edge"])


COLOURS = {
    "rock": rgba("#6f7584"), "rock_light": rgba("#8f96a6"), "rock_dark": rgba("#4c5260"),
    "snow": rgba("#f4f6fa"), "snow_shade": rgba("#c9d2e2"),
    "bark": rgba("#b0673b"), "bark_dark": rgba("#7c4426"),
    "needle": rgba("#2f5a32"), "needle_light": rgba("#4c7d44"), "needle_dark": rgba("#1b3a22"),
    "fescue": rgba("#b6a774"), "fescue_light": rgba("#d4c690"), "fescue_dark": rgba("#8c7f55"),
    "heather": rgba("#5f5a3a"), "heather_dark": rgba("#45412a"), "bloom": rgba("#9a62a0"), "bloom_light": rgba("#c08cc4"),
    "edge": EDGE,
}


LOGO = (broken_top, COLOURS)

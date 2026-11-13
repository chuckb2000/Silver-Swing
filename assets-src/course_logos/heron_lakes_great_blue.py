"""Heron Lakes, Great Blue course logo: a great blue heron in flight, neck folded back and
legs trailing, over a still pond, the bird the course is named for. Drawn in flight so it
is not the standing heron of Oregon Golf Club's logo. An original drawing; the club's own
marks are not used. `python3 assets-src/logos.py heron_lakes_great_blue`.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def heron_flying(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the pond below
    pond = ((X - 16) / 14.0) ** 2 + ((Y - 27.0) / 3.2) ** 2 <= 1
    paint(img, pond, c["water"])
    paint(img, pond & (Y > 27.5), c["water_dark"])
    paint(img, pond & (np.abs(Y - 26.0) < 0.5) & (np.abs(X - 11) < 2), c["water_light"])
    # wings: a long broad wing raised up-left and one down-right, dark flight feathers at the tips
    up = poly(X, Y, [(10.0, 13.5), (11.0, 8.0), (15.0, 3.0), (21.0, 1.5), (19.0, 5.0), (17.5, 10.0), (17.0, 14.0)])
    down = poly(X, Y, [(11.0, 15.5), (17.0, 15.5), (22.0, 19.0), (28.0, 21.5), (24.0, 23.0), (16.0, 21.0)])
    for w in (up, down):
        paint(img, w, c["blue"])
        shade(img, w, c["blue_light"], c["blue_dark"])
    paint(img, up & (Y < 5.5), c["tip"])
    paint(img, down & (X > 23.5), c["tip"])
    # body: a long grey-blue body flying left
    body = ((X - 14.0) / 6.5) ** 2 + ((Y - 14.5) / 2.6) ** 2 <= 1
    paint(img, body, c["blue"])
    shade(img, body, c["blue_light"], c["blue_dark"])
    # folded S-neck and head at the front (left), dagger bill
    neck = ((X - 7.5) / 2.0) ** 2 + ((Y - 13.0) / 1.8) ** 2 <= 1
    paint(img, neck, c["neck"])
    head = ((X - 5.5) / 1.6) ** 2 + ((Y - 12.2) / 1.3) ** 2 <= 1
    paint(img, head, c["white"])
    paint(img, head & (Y < 11.6), c["plume"])
    paint(img, poly(X, Y, [(4.2, 11.8), (0.6, 12.6), (4.2, 12.9)]), c["bill"])
    paint(img, (np.abs(X - 5.2) < 0.5) & (np.abs(Y - 12.2) < 0.5), c["eye"])
    # legs trailing behind (right)
    paint(img, seg(X, Y, 19.0, 15.0, 26.5, 13.5, 0.5), c["leg"])
    paint(img, seg(X, Y, 19.0, 15.6, 26.0, 15.0, 0.5), c["leg"])
    return outlined(img, c["edge"])


LOGO = (heron_flying, {
    "blue": rgba("#7d92ab"), "blue_light": rgba("#a8bbcf"), "blue_dark": rgba("#56697f"), "tip": rgba("#2c3442"),
    "neck": rgba("#9aa3b4"), "white": rgba("#f4f4f0"), "plume": rgba("#1d2129"), "bill": rgba("#e8b13a"),
    "eye": rgba("#f0c23a"), "leg": rgba("#5a5040"),
    "water": rgba("#4f7a74"), "water_dark": rgba("#3c605b"), "water_light": rgba("#9cc4bb"),
    "edge": EDGE,
})

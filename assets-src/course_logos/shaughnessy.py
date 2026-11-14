"""Shaughnessy Golf and Country Club logo: a Fraser River tugboat towing a boom of logs
along the North Arm, the river the course runs beside, a sight of the Vancouver waterfront
since the sawmill days. An original drawing; the club's own marks are not used.
`python3 assets-src/logos.py shaughnessy` writes game/public/sprites/logos/shaughnessy.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def tug_and_boom(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the river
    water = (Y >= 16.0) & (Y <= 30.5)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 26.0), c["water_dark"])
    for wx, wy in ((5.0, 27.5), (14.0, 29.0), (26.0, 27.6)):
        paint(img, (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 2.0), c["water_light"])

    # the log boom behind (right): rows of logs, ends showing
    for row, ly in enumerate((19.0, 21.4, 23.8)):
        for k, lx in enumerate(np.arange(17.5 + 0.8 * row, 31.0, 4.4)):
            log = (np.abs(Y - ly) <= 0.9) & (X >= lx) & (X <= lx + 3.8)
            paint(img, log, c["log"])
            paint(img, log & (Y < ly - 0.2), c["log_light"])
            paint(img, (np.abs(Y - ly) <= 0.9) & (np.abs(X - (lx + 3.6)) < 0.5), c["log_end"])
    # the tow line
    paint(img, seg(X, Y, 12.0, 17.5, 17.5, 20.0, 0.4), c["line"])

    # the tug: a red hull, white wheelhouse, black stack, heading left
    hull = poly(X, Y, [(1.5, 18.5), (14.5, 18.5), (13.5, 23.0), (4.0, 23.0)])
    paint(img, hull, c["red"])
    shade(img, hull, c["red_light"], c["red_dark"])
    paint(img, hull & (Y > 21.8), c["black"])
    house = (X >= 4.5) & (X <= 10.5) & (Y >= 13.0) & (Y < 18.5)
    paint(img, house, c["white"])
    shade(img, house, None, c["grey"])
    paint(img, house & (np.abs(Y - 15.0) < 0.6) & (X > 5.2) & (X < 10.0) & (np.floor(X) % 2 == 1), c["window"])
    paint(img, (X >= 4.0) & (X <= 11.0) & (Y >= 12.2) & (Y < 13.0), c["red"])
    stack = (X >= 11.2) & (X <= 13.0) & (Y >= 10.0) & (Y < 18.5)
    paint(img, stack, c["black"])
    paint(img, stack & (Y < 11.0), c["red"])
    # bow wave
    paint(img, poly(X, Y, [(0.8, 22.6), (3.6, 21.6), (3.0, 23.4)]), c["foam"])
    return outlined(img, c["edge"])


LOGO = (tug_and_boom, {
    "water": rgba("#5f7d74"), "water_dark": rgba("#4a645c"), "water_light": rgba("#a7c2b7"),
    "log": rgba("#9a6a3e"), "log_light": rgba("#c08a54"), "log_end": rgba("#e3c08a"), "line": rgba("#2a2a2e"),
    "red": rgba("#c23b2e"), "red_light": rgba("#e0573f"), "red_dark": rgba("#8a2720"), "black": rgba("#24262b"),
    "white": rgba("#f2efe6"), "grey": rgba("#b9b6ad"), "window": rgba("#3d5a73"), "foam": rgba("#eef6f2"),
    "edge": EDGE,
})

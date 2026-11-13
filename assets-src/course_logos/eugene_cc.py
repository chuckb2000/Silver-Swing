"""Eugene Country Club logo: a giant Douglas fir, the trees that tower over Egan's and
Jones's holes, with a flag on the green at its foot, in the club's emerald and gold. An
original drawing; the club's own marks are not used. `python3 assets-src/logos.py eugene_cc`
writes game/public/sprites/logos/eugene_cc.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def giant_fir(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the green and its fringe
    ground = ((X - 16.0) / 15.0) ** 2 + ((Y - 27.0) / 3.6) ** 2 <= 1.0
    paint(img, ground, c["fringe"])
    paint(img, ground & (Y > 28.0), c["fringe_dark"])
    green = ((X - 22.5) / 6.0) ** 2 + ((Y - 26.6) / 2.0) ** 2 <= 1.0
    paint(img, green, c["green"])
    # the fir: tiers of drooping boughs
    paint(img, (np.abs(X - 11.0) < 1.0) & (Y > 22.0) & (Y < 27.5), c["trunk"])
    for k, (yb, half) in enumerate(((23.5, 8.5), (19.5, 7.0), (15.5, 5.6), (11.5, 4.2), (7.5, 2.8))):
        tier = poly(X, Y, [(11.0 - half, yb), (11.0, yb - 6.5), (11.0 + half, yb)])
        paint(img, tier, c["fir"])
        paint(img, tier & (X < 11.0) & (Y < yb - 1.0), c["fir_light"])
        paint(img, tier & (Y > yb - 1.0), c["fir_dark"])
    paint(img, poly(X, Y, [(10.2, 2.5), (11.0, 0.5), (11.8, 2.5)]), c["fir"])
    # flagstick with a gold flag
    paint(img, (X >= 23.0) & (X < 24.0) & (Y >= 15.5) & (Y < 26.8), c["pole"])
    paint(img, poly(X, Y, [(24.0, 15.5), (29.0, 17.2), (24.0, 19.0)]), c["flag"])
    paint(img, poly(X, Y, [(24.0, 17.6), (27.0, 17.4), (24.0, 19.0)]), c["flag_dark"])
    return outlined(img, c["edge"])


LOGO = (giant_fir, {
    "fringe": rgba("#3a8a4a"), "fringe_dark": rgba("#2a6a38"), "green": rgba("#78c26a"),
    "trunk": rgba("#5a3a24"),
    "fir": rgba("#1d5a3c"), "fir_light": rgba("#2f7a52"), "fir_dark": rgba("#123d29"),
    "pole": rgba("#f2efe6"), "flag": rgba("#e8b52a"), "flag_dark": rgba("#b98a14"),
    "edge": EDGE,
})

"""Crosswater logo: a cedar-strip canoe with its paddle on the Little Deschutes, the river
the course crosses again and again where it meets the Deschutes (the club is on Canoe Camp
Drive). An original drawing; the club's own marks are not used.
`python3 assets-src/logos.py crosswater` writes game/public/sprites/logos/crosswater.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def canoe(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the river, with reeds at one end
    river = ((X - 16.0) / 15.0) ** 2 + ((Y - 24.5) / 5.0) ** 2 <= 1.0
    paint(img, river, c["water"])
    paint(img, river & (Y > 26.0), c["water_dark"])
    for wx, wy in ((5.0, 22.0), (26.0, 27.5), (14.0, 28.5)):
        paint(img, river & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 2.0), c["water_light"])
    for rx, top in ((27.0, 14.0), (28.5, 16.0), (25.5, 17.0)):
        paint(img, seg(X, Y, rx, 23.0, rx + 0.6, top, 0.5), c["reed"])
    paint(img, ((X - 27.6) / 0.8) ** 2 + ((Y - 15.2) / 1.6) ** 2 <= 1.0, c["cattail"])
    # the canoe: long and low, upswept at both ends
    hull = poly(X, Y, [(2.0, 15.5), (5.0, 19.0), (10.0, 21.5), (22.0, 21.5), (27.0, 19.0), (29.5, 15.5),
                       (25.0, 18.0), (16.0, 18.6), (7.0, 18.0)])
    paint(img, hull, c["wood"])
    shade(img, hull, c["wood_light"], c["wood_dark"])
    paint(img, hull & ~np.roll(hull, 1, axis=0), c["gunwale"])
    for sx in (9.0, 14.0, 19.0, 24.0):
        paint(img, hull & (np.abs(X - sx) < 0.35) & (Y > 18.8), c["wood_dark"])
    paint(img, hull & (Y > 21.0), c["water_dark"])
    # a paddle laid across it
    paint(img, seg(X, Y, 8.0, 10.0, 20.0, 19.0, 0.55), c["paddle"])
    paint(img, ((X - 7.0) / 1.4) ** 2 + ((Y - 9.0) / 2.6) ** 2 <= 1.0, c["paddle"])
    paint(img, seg(X, Y, 19.5, 18.6, 21.0, 19.8, 0.7), c["paddle_dark"])
    return outlined(img, c["edge"])


LOGO = (canoe, {
    "water": rgba("#2b5262"), "water_dark": rgba("#1e3a46"), "water_light": rgba("#6f98a2"),
    "reed": rgba("#6b8a3a"), "cattail": rgba("#6b4024"),
    "wood": rgba("#b8662e"), "wood_light": rgba("#d98c48"), "wood_dark": rgba("#7a3e1a"),
    "gunwale": rgba("#e8c27a"),
    "paddle": rgba("#d9b06a"), "paddle_dark": rgba("#8a5a2a"),
    "edge": EDGE,
})

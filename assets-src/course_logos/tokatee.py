"""Tokatee Golf Club logo: a McKenzie River drift boat, the high-ended, flat-bottomed river
dory first built on the McKenzie, the river the course runs beside, side on with its oars
out on emerald water, firs on the far bank. An original drawing; the club's own marks are
not used. `python3 assets-src/logos.py tokatee` writes game/public/sprites/logos/tokatee.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def drift_boat(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # far bank: a row of firs
    for fx, h in ((3.5, 9.0), (10.0, 11.5), (16.5, 8.5), (22.5, 12.0), (29.0, 9.5)):
        fir = poly(X, Y, [(fx - 3.6, 16.0), (fx, 16.0 - h), (fx + 3.6, 16.0)])
        paint(img, fir, c["fir"])
        paint(img, fir & (X < fx - 0.4) & (Y < 15.0), c["fir_light"])
    paint(img, (Y >= 15.0) & (Y < 17.0), c["fir_dark"])

    # the river
    water = (Y >= 17.0) & (Y <= 30.5)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 26.5), c["water_dark"])
    for wx, wy in ((4.5, 19.0), (27.0, 19.5), (8.0, 28.0), (22.0, 28.6), (15.0, 29.4)):
        paint(img, (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 2.0), c["water_light"])

    # hull: rocker bottom, flared sides rising to a high pointed bow (left) and stern (right)
    hull = poly(X, Y, [(2.0, 12.0), (5.5, 18.5), (10.0, 22.0), (22.0, 22.0), (26.5, 18.5), (30.0, 12.0),
                       (26.0, 15.4), (21.0, 16.6), (11.0, 16.6), (6.0, 15.4)])
    paint(img, hull, c["wood"])
    shade(img, hull, c["wood_light"], c["wood_dark"])
    # a white sheer strake: the top two rows of the side
    top = hull & ~np.roll(hull, 2, axis=0)
    paint(img, top, c["white"])
    paint(img, hull & (Y > 20.6), c["wood_dark"])
    paint(img, (Y >= 22.0) & (Y < 22.8) & (X > 10.0) & (X < 22.0), c["water_dark"])

    # oarsman in the middle seat, and two oars sweeping down into the water
    paint(img, (X - 16.0) ** 2 + (Y - 11.4) ** 2 <= 1.6 ** 2, c["skin"])
    paint(img, (X >= 14.6) & (X <= 17.4) & (Y >= 9.0) & (Y < 10.6), c["hat"])
    paint(img, (X >= 13.4) & (X <= 18.6) & (Y >= 10.0) & (Y < 10.8), c["hat"])
    paint(img, (X >= 14.4) & (X <= 17.6) & (Y >= 12.8) & (Y < 16.8), c["shirt"])
    paint(img, seg(X, Y, 14.2, 14.6, 6.0, 23.4, 0.55), c["oar"])
    paint(img, seg(X, Y, 17.8, 14.6, 26.0, 23.4, 0.55), c["oar"])
    paint(img, poly(X, Y, [(4.6, 22.8), (6.6, 22.4), (6.2, 24.8), (4.2, 25.2)]), c["oar"])
    paint(img, poly(X, Y, [(25.4, 22.4), (27.4, 22.8), (27.8, 25.2), (25.8, 24.8)]), c["oar"])

    return outlined(img, c["edge"])


LOGO = (drift_boat, {
    "fir": rgba("#1f4a37"), "fir_light": rgba("#2f6650"), "fir_dark": rgba("#14332a"),
    "water": rgba("#2f8a7c"), "water_dark": rgba("#21665c"), "water_light": rgba("#8fd0c2"),
    "wood": rgba("#3f6f9e"), "wood_light": rgba("#5d8fc0"), "wood_dark": rgba("#2a4d70"),
    "white": rgba("#f1ede2"), "oar": rgba("#c9a46a"),
    "skin": rgba("#e0b48c"), "hat": rgba("#8a3a2a"), "shirt": rgba("#d9a83a"),
    "edge": EDGE,
})

"""Columbia Edgewater Country Club logo: a Columbia River sternwheeler, side on and steaming
to the left on the river the course is named for (the club sits on the old bottomland
between Marine Drive and the Columbia Slough). White decks, a red paddle wheel at the
stern, twin stacks with a wisp of smoke. An original drawing; the club's own marks are
not used. `python3 assets-src/logos.py columbia_edgewater` writes
game/public/sprites/logos/columbia_edgewater.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def sternwheeler(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the river
    water = (Y >= 23.0) & (Y <= 30.5)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 27.5), c["water_dark"])
    for wx, wy in ((4.0, 25.0), (14.0, 28.6), (23.0, 25.6), (9.0, 29.0)):
        paint(img, water & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["water_light"])

    # hull: a long low hull, bow to the left
    hull = poly(X, Y, [(1.5, 19.5), (26.0, 19.5), (26.0, 23.8), (4.5, 23.8)])
    paint(img, hull, c["white"])
    paint(img, hull & (Y > 22.4), c["red"])
    shade(img, hull, c["white_light"], c["grey"])

    # main deck cabin and texas deck, with a row of windows
    cabin = (X >= 5.0) & (X <= 23.0) & (Y >= 15.0) & (Y < 19.5)
    paint(img, cabin, c["white"])
    shade(img, cabin, c["white_light"], c["grey"])
    paint(img, cabin & (np.abs(Y - 17.0) < 0.6) & ((np.floor(X) % 2) == 0) & (X > 6) & (X < 22), c["window"])
    roof = (X >= 4.0) & (X <= 24.0) & (Y >= 14.0) & (Y < 15.0)
    paint(img, roof, c["red"])
    texas = (X >= 9.0) & (X <= 19.0) & (Y >= 10.5) & (Y < 14.0)
    paint(img, texas, c["white"])
    shade(img, texas, c["white_light"], c["grey"])
    paint(img, texas & (np.abs(Y - 12.2) < 0.6) & ((np.floor(X) % 2) == 1) & (X > 10) & (X < 18), c["window"])
    # pilot house
    pilot = (X >= 11.0) & (X <= 14.5) & (Y >= 7.5) & (Y < 10.5)
    paint(img, pilot, c["white"])
    paint(img, pilot & (np.abs(Y - 9.0) < 0.6) & (X > 11.5) & (X < 14.0), c["window"])
    paint(img, (X >= 10.5) & (X <= 15.0) & (Y >= 7.0) & (Y < 7.8), c["red"])

    # twin stacks forward of the pilot house, with smoke drifting back
    for sx in (6.0, 9.0):
        stack = (np.abs(X - sx) <= 0.6) & (Y >= 4.0) & (Y < 14.0)
        paint(img, stack, c["black"])
        paint(img, (np.abs(X - sx) <= 0.9) & (Y >= 3.4) & (Y < 4.4), c["black"])
    for k, (px, py, r) in enumerate(((11.0, 2.0, 1.3), (13.8, 1.6, 1.1))):
        paint(img, (X - px) ** 2 + (Y - py) ** 2 <= r * r, c["smoke"])

    # the stern paddle wheel: red, with buckets
    wcx, wcy, wr = 27.5, 20.5, 3.6
    r2 = (X - wcx) ** 2 + (Y - wcy) ** 2
    wheel = r2 <= wr ** 2
    paint(img, wheel, c["red"])
    paint(img, wheel & (r2 <= (wr - 1.2) ** 2), c["red_dark"])
    ang = np.arctan2(Y - wcy, X - wcx)
    paint(img, wheel & (np.abs(((ang * 8 / np.pi) % 2) - 1) < 0.35), c["white"])
    paint(img, r2 <= 0.8 ** 2, c["black"])
    # flag on the jackstaff at the bow
    paint(img, (np.abs(X - 3.0) < 0.5) & (Y > 14.5) & (Y < 19.5), c["black"])
    paint(img, poly(X, Y, [(3.4, 14.5), (6.0, 15.4), (3.4, 16.4)]), c["red"])

    return outlined(img, c["edge"])


LOGO = (sternwheeler, {
    "white": rgba("#f2efe6"), "white_light": rgba("#ffffff"), "grey": rgba("#b9b6ad"),
    "red": rgba("#c23b2e"), "red_dark": rgba("#8a2720"), "black": rgba("#24262b"),
    "window": rgba("#3d5a73"), "smoke": rgba("#d9dde2", 230),
    "water": rgba("#3a7a8c"), "water_dark": rgba("#2a5d6c"), "water_light": rgba("#8cc6d6"),
    "edge": EDGE,
})

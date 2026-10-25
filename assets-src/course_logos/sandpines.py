"""Sandpines Golf Links logo: the Siuslaw River Bridge at Florence (Conde
McCullough, 1936; two concrete tied arches either side of a bascule span, with
Art Deco obelisk pylons at the lift span), seen side on over the river, with dune
banks at both ends (the Oregon Dunes border the course). The club's own mark (a
lone pine on a dune) is not used. `python3 assets-src/logos.py sandpines`
writes game/public/sprites/logos/sandpines.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def siuslaw_bridge(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the river, with dune banks at both ends (the Oregon Dunes)
    water = (Y >= 22.0) & (Y <= 30.5)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 27.0), c["water_dark"])
    for wx, wy in ((7.0, 24.4), (16.0, 28.6), (25.0, 24.4), (11.5, 29.0), (21.0, 25.6)):
        paint(img, water & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.6), c["water_light"])
    for side in (0, 1):
        xs = X if side == 0 else 32.0 - X
        bank = (Y >= 19.0 + 0.9 * xs) & (xs <= 7.0) & (Y <= 30.5)
        paint(img, bank, c["sand"])
        paint(img, bank & (Y < 21.2 + 0.9 * xs), c["sand_light"])
        paint(img, bank & ((xs * 1.7 + Y) % 3.4 < 0.9) & (Y > 23.5), c["grass"])

    # piers standing in the river
    for px in (2.0, 10.5, 21.5, 30.0):
        pier = (np.abs(X - px) <= 1.0) & (Y >= 19.0) & (Y <= 26.0)
        paint(img, pier, c["concrete_dark"])

    # the deck, end to end
    deck = (Y >= 17.0) & (Y <= 19.4)
    paint(img, deck, c["concrete"])
    paint(img, deck & (Y < 17.9), c["concrete_light"])
    paint(img, deck & (Y > 18.6), c["concrete_dark"])

    # the two tied arches over the side spans: a 2 px rib and hangers, open sky between
    for x0, x1 in ((1.0, 11.0), (21.0, 31.0)):
        cx, half = (x0 + x1) / 2, (x1 - x0) / 2
        rise = 8.5
        u = np.clip((X - cx) / half, -1, 1)
        top = 17.0 - rise * (1 - u ** 2)
        rib = (np.abs(X - cx) <= half) & (Y >= top - 1.8) & (Y <= top + 0.2)
        paint(img, rib, c["concrete"])
        paint(img, rib & (Y < top - 1.0), c["concrete_light"])
        for hx in (cx - half * 0.42, cx + half * 0.42):
            hang = (np.abs(X - hx) < 0.5) & (Y > top) & (Y < 17.0)
            paint(img, hang, c["concrete_dark"])

    # the obelisk pylons either side of the lift span: square shafts, stepped
    # Art Deco shoulders and a pyramid cap
    for px in (12.5, 19.5):
        shaft = (np.abs(X - px) <= 1.8) & (Y >= 6.0) & (Y <= 19.4)
        step = (np.abs(X - px) <= 1.2) & (Y >= 4.0) & (Y < 6.0)
        cap = poly(X, Y, [(px - 1.2, 4.0), (px, 1.0), (px + 1.2, 4.0)])
        tower = shaft | step | cap
        paint(img, tower, c["concrete"])
        shade(img, tower, c["concrete_light"], c["concrete_dark"])
        paint(img, shaft & (np.abs(Y - 8.5) < 0.6) & (np.abs(X - px) < 1.0), c["window"])
        paint(img, shaft & (Y > 10.5) & (Y < 16.0) & (np.abs(X - px) < 0.45), c["concrete_dark"])

    # the bascule leaves between the pylons, meeting at the lift joint
    leaves = (Y >= 17.0) & (Y <= 19.4) & (X > 14.3) & (X < 17.7)
    paint(img, leaves & (np.abs(X - 16.0) < 0.5), c["concrete_dark"])

    return outlined(img, c["edge"])


COLOURS = {
    "concrete": rgba("#e4ddcc"), "concrete_light": rgba("#fbf6ea"), "concrete_dark": rgba("#a9a08c"),
    "window": rgba("#3d5a73"),
    "sand": rgba("#e9d6a4"), "sand_light": rgba("#f6e9c4"), "sand_dark": rgba("#cdb37b"),
    "grass": rgba("#8f9a4c"),
    "water": rgba("#2f73a8"), "water_dark": rgba("#215783"), "water_light": rgba("#8cc0e6"),
    "edge": EDGE,
}


LOGO = (siuslaw_bridge, COLOURS)

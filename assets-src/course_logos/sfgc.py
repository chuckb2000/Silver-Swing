"""San Francisco Golf Club logo: two crossed duelling pistols over the 7th green, with the
granite obelisks of the duel site either side, for the Duel Hole: the 7th plays into the valley where Senator Broderick and
Judge Terry fought in 1859, the last legal duel in the United States, marked by two
granite obelisks beside the tee. An original drawing; the club's own marks are not used.
`python3 assets-src/logos.py sfgc` writes game/public/sprites/logos/sfgc.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def _pistol(X, Y, flip: bool):
    """A flintlock pistol, barrel up and inward from a grip at the bottom (mirrored if flip)."""
    if flip:
        X = 31.0 - X
    barrel = seg(X, Y, 10.0, 17.0, 25.5, 4.0, 1.1)
    stock = poly(X, Y, [(7.0, 17.0), (11.0, 13.6), (13.4, 16.2), (11.0, 19.4), (10.0, 25.0), (6.0, 26.6), (4.8, 24.0)])
    lock = poly(X, Y, [(10.0, 14.0), (12.8, 12.0), (13.8, 13.4), (11.2, 15.6)])
    guard = ((X - 10.8) ** 2 + (Y - 19.0) ** 2 <= 2.0 ** 2) & ((X - 10.8) ** 2 + (Y - 19.0) ** 2 >= 1.0) & (Y > 18.6)
    return barrel, stock, lock, guard


def duel(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # a patch of the 7th's green round the obelisk
    ground = ((X - 16.0) / 14.5) ** 2 + ((Y - 28.0) / 2.8) ** 2 <= 1.0
    paint(img, ground, c["grass"])
    paint(img, ground & (Y > 28.8), c["grass_dark"])
    # the two small obelisks of the duel site, either side
    for ox in (4.0, 28.0):
        ob = poly(X, Y, [(ox - 1.2, 28.5), (ox - 0.6, 20.5), (ox, 19.0), (ox + 0.6, 20.5), (ox + 1.2, 28.5)])
        paint(img, ob, c["granite"])
        paint(img, ob & (X < ox), c["granite_light"])
    for flip in (False, True):
        barrel, stock, lock, guard = _pistol(X, Y, flip)
        paint(img, stock, c["wood"])
        shade(img, stock, c["wood_light"], c["wood_dark"])
        paint(img, barrel, c["steel"])
        shade(img, barrel, c["steel_light"], c["steel_dark"])
        paint(img, lock, c["brass"])
        paint(img, guard, c["brass"])
    return outlined(img, c["edge"])


LOGO = (duel, {
    "grass": rgba("#3a673b"), "grass_dark": rgba("#2f5734"),
    "granite": rgba("#9a978e"), "granite_light": rgba("#c2bfb5"), "granite_dark": rgba("#6f6c64"),
    "wood": rgba("#7a4a2a"), "wood_light": rgba("#a8693d"), "wood_dark": rgba("#4e2e1a"),
    "steel": rgba("#7c858c"), "steel_light": rgba("#b9c2c6"), "steel_dark": rgba("#4a5258"),
    "brass": rgba("#c9a14a"),
    "edge": EDGE,
})

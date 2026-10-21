"""Sheep Ranch logo: a black-faced sheep on a clifftop above the sea (developer,
2026-10-21, from the course chat's suggestion). The club's own emblem (lettering
round a crook) is not used. `python3 assets-src/logos.py sheep_ranch` writes
game/public/sprites/logos/sheep_ranch.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def sheep(c: dict) -> np.ndarray:
    """A woolly white sheep with a black face and legs standing on a green clifftop,
    looking out to sea; the cliff drops to the surf at the right."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the sea at the foot of the cliff
    sea = (Y >= 25.0) & (Y <= 30.5) & (X >= 17.0) & (X <= 31.0)
    paint(img, sea, c["water"])
    paint(img, sea & (Y >= 28.0), c["water_dark"])
    paint(img, sea & (Y < 26.2) & ((X % 5.0) < 2.6), c["foam"])
    # the headland: grass on top, a sandstone face falling to the right
    land = poly(X, Y, [(1.0, 30.5), (1.0, 21.0), (8.0, 20.2), (16.0, 20.4), (22.0, 21.2),
                       (24.6, 23.0), (23.4, 26.2), (25.0, 30.5)])
    paint(img, land, c["rock"])
    paint(img, land & (X > 21.0), c["rock_dark"])
    paint(img, land & (np.abs(X * 0.5 - Y + 14.5) < 0.45) & (X > 12.0), c["rock_dark"])  # a ledge
    grass = land & (Y < 23.2 + 0.0 * X) & ~((X > 22.4) & (Y > 22.0))
    paint(img, grass, c["grass"])
    paint(img, grass & (Y < 21.4), c["grass_light"])
    # the sheep, facing right: a lumpy fleece, black head and legs
    wool = (ell(X, Y, 12.2, 13.6, 7.2, 4.6) | ell(X, Y, 8.0, 11.2, 3.0, 2.8) | ell(X, Y, 12.0, 9.8, 3.4, 2.8)
            | ell(X, Y, 16.0, 11.0, 2.8, 2.6) | ell(X, Y, 6.0, 15.0, 2.6, 2.6) | ell(X, Y, 18.0, 15.0, 2.4, 2.4))
    legs = ((np.abs(X - 7.5) < 0.6) | (np.abs(X - 10.0) < 0.6) | (np.abs(X - 15.0) < 0.6) | (np.abs(X - 17.4) < 0.6)) \
        & (Y > 16.0) & (Y < 21.0)
    head = poly(X, Y, [(19.0, 12.0), (21.6, 11.6), (24.8, 13.8), (26.0, 15.0), (25.0, 16.2), (21.6, 15.6), (19.2, 14.8)])
    ear = poly(X, Y, [(20.6, 12.2), (18.4, 11.0), (17.8, 11.8), (19.8, 13.2)])
    paint(img, legs, c["black"])
    paint(img, wool, c["wool"])
    curls = wool & ((((X + Y) % 3.0) < 0.9) & (((X - Y) % 3.0) < 1.6))
    paint(img, curls, c["wool_shade"])
    top = wool & ~np.roll(wool, 1, axis=0)
    paint(img, top | (wool & ~np.roll(wool, 1, axis=1)), c["wool_light"])
    paint(img, wool & (Y > 16.0), c["wool_shade"])
    paint(img, head | ear, c["black"])
    paint(img, head & (Y < 13.4) & (X < 23.0), c["face_light"])
    paint(img, (np.abs(X - 22.0) < 0.5) & (np.abs(Y - 13.5) < 0.5), c["eye"])
    return outlined(img, c["edge"])


SHEEP = {
    "wool": rgba("#eeeae0"), "wool_light": rgba("#ffffff"), "wool_shade": rgba("#cdc6b6"),
    "black": rgba("#24211f"), "face_light": rgba("#4a4541"), "eye": rgba("#e8d9a0"),
    "grass": rgba("#6f9a3a"), "grass_light": rgba("#94bf54"),
    "rock": rgba("#b08a5e"), "rock_dark": rgba("#7d6040"),
    "water": rgba("#2c6ea0"), "water_dark": rgba("#1e527c"), "foam": rgba("#eef5f8"),
    "edge": EDGE,
}


LOGO = (sheep, SHEEP)

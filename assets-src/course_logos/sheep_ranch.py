"""Sheep Ranch logo: a woolly white sheep with a black face, standing on a clifftop
of grass over the sea (developer, 2026-10-20). An original drawing; nothing of the
club's own marks is used. `python3 assets-src/logos.py sheep_ranch` writes
game/public/sprites/logos/sheep_ranch.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def sheep(c: dict) -> np.ndarray:
    """A sheep facing left: a lumpy fleece of overlapping puffs, black head and ears,
    four black legs, on a strip of clifftop turf with the sea beyond."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the sea behind, and the clifftop turf the sheep stands on
    sea = (Y >= 18.5) & (Y <= 24.5) & (X >= 1.5) & (X <= 30.5)
    paint(img, sea, c["water"])
    paint(img, sea & (Y < 19.6), c["water_light"])
    paint(img, sea & (np.abs(Y - 22.0) < 0.5) & (((X + 2.0) % 7.0) < 2.5), c["water_light"])
    turf = poly(X, Y, [(1.5, 30.5), (1.5, 24.4), (8.0, 23.6), (18.0, 24.2), (30.5, 23.0), (30.5, 30.5)])
    paint(img, turf, c["grass"])
    paint(img, turf & (Y < 25.2), c["grass_light"])
    paint(img, turf & (Y > 28.6), c["grass_dark"])
    paint(img, turf & (X > 26.5) & (Y > 25.6), c["cliff"])                    # the cliff face at the right
    # legs (behind the fleece), hooves in the grass
    for lx in (11.6, 14.4, 21.4, 24.2):
        paint(img, (np.abs(X - lx) <= 0.9) & (Y >= 19.0) & (Y <= 26.6), c["face"])
    # the fleece: overlapping puffs
    puffs = [(18.4, 15.4, 8.2, 5.4), (13.0, 12.8, 3.6, 3.4), (17.4, 10.6, 3.8, 3.2), (22.2, 11.0, 3.6, 3.3),
             (26.0, 14.8, 3.4, 3.6), (23.6, 19.2, 3.6, 2.8), (17.6, 20.0, 4.2, 2.6), (12.4, 18.6, 3.4, 2.8)]
    wool = np.zeros(X.shape, bool)
    for p in puffs:
        wool |= ell(X, Y, *p)
    paint(img, wool, c["wool"])
    for (px, py, rx, ry) in puffs:
        inner = ell(X, Y, px - 0.9, py - 0.9, rx, ry)
        paint(img, wool & ell(X, Y, px, py, rx, ry) & ~inner, c["wool_dark"])
    paint(img, wool & (Y > 20.6), c["wool_dark"])
    for (px, py) in ((14.0, 11.2), (17.2, 9.0), (21.6, 9.4)):
        paint(img, ell(X, Y, px, py, 1.4, 0.8), c["wool_light"])
    # the head: black, a skull and a long muzzle angled down to the left, ears out sideways
    skull = ell(X, Y, 8.6, 13.0, 3.2, 3.0)
    muzzle = ell(X, Y, 5.4, 16.2, 2.6, 2.1)
    neck = poly(X, Y, [(8.0, 10.4), (11.6, 12.0), (8.6, 17.4), (5.4, 16.4)])
    ears = poly(X, Y, [(6.8, 11.2), (2.6, 9.4), (2.0, 10.8), (6.4, 12.8)]) | poly(X, Y, [(10.6, 11.0), (13.0, 9.6), (13.4, 10.8), (11.2, 12.4)])
    head = skull | muzzle | neck
    paint(img, head | ears, c["face"])
    paint(img, ears & ~np.roll(ears, 1, axis=0), c["face_light"])
    paint(img, skull & ~np.roll(skull, 1, axis=0), c["face_light"])          # light on the crown
    paint(img, (np.abs(X - 7.5) < 1.0) & (np.abs(Y - 13.5) < 0.5), c["eye"])    # the eye: white, pupil on its right
    paint(img, (np.abs(X - 8.0) < 0.5) & (np.abs(Y - 13.5) < 0.5), c["pupil"])
    paint(img, (np.abs(X - 3.5) < 0.5) & (np.abs(Y - 16.5) < 0.5), c["face_light"])  # the nostril's sheen
    # a woolly topknot
    paint(img, ell(X, Y, 9.0, 10.4, 2.0, 1.2), c["wool"])
    paint(img, ell(X, Y, 8.6, 10.0, 1.0, 0.5), c["wool_light"])
    return outlined(img, c["edge"])


LOGO = (sheep, {
    "wool": rgba("#f2efe6"), "wool_light": rgba("#ffffff"), "wool_dark": rgba("#c9c3b4"),
    "face": rgba("#1e1d22"), "face_light": rgba("#4a4852"), "eye": rgba("#f2efe6"), "pupil": rgba("#2a1d14"),
    "grass": rgba("#5f9a45"), "grass_light": rgba("#86bf5c"), "grass_dark": rgba("#3f6f30"), "cliff": rgba("#8a7a62"),
    "water": rgba("#2f7fc4"), "water_light": rgba("#6fb0e6"),
    "edge": EDGE,
})

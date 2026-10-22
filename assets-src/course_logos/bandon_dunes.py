"""Bandon Dunes logo: a harbor seal hauled out on a sea rock, head up (developer,
2026-10-20: "it should be a seal"). The club's own emblem is a puffin; nothing of
it is used. `python3 assets-src/logos.py bandon_dunes` writes
game/public/sprites/logos/bandon_dunes.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def seal(c: dict) -> np.ndarray:
    """A grey, speckled harbor seal lying on a dark rock above a breaking wave,
    head raised and facing left, hind flippers up at the right."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the sea and a breaking wave behind the rock
    sea = (Y >= 24.5) & (Y <= 29.5) & (X >= 1.5) & (X <= 30.5)
    paint(img, sea, c["water"])
    paint(img, sea & (Y >= 27.6), c["water_dark"])
    foam = sea & (Y < 25.8) & (((X * 0.9 + Y * 0.3) % 5.0) < 2.6)
    paint(img, foam, c["foam"])
    # the rock: a low, lumpy slab
    rock = poly(X, Y, [(4.0, 27.6), (5.5, 23.2), (9.5, 21.6), (16.0, 22.0), (22.5, 20.8), (27.0, 22.4), (28.6, 27.6)])
    paint(img, rock, c["rock"])
    paint(img, rock & (Y < 23.4), c["rock_light"])
    paint(img, rock & (X > 23.0) & (Y > 24.0), c["rock_dark"])
    paint(img, rock & (np.abs(X - Y * 0.6 - 4.5) < 0.45) & (Y > 23.5), c["rock_dark"])   # a crack
    # the seal: a banana shape, round head raised at the left, hind flippers up at the right
    body = ell(X, Y, 17.6, 18.6, 9.8, 4.6)
    chest = ell(X, Y, 10.6, 15.0, 5.4, 5.2)
    head = ell(X, Y, 9.0, 9.4, 4.8, 4.2)
    muzzle = ell(X, Y, 5.4, 11.3, 2.7, 2.3)
    tail = poly(X, Y, [(25.6, 17.0), (29.0, 12.6), (31.0, 13.4), (29.4, 16.4), (31.2, 18.6), (26.4, 20.6)])
    fore = ell(X, Y, 13.6, 21.6, 2.6, 1.1)
    seal_m = body | chest | head | muzzle | tail
    paint(img, seal_m, c["fur"])
    top = seal_m & ~np.roll(seal_m, 1, axis=0) | (seal_m & ~np.roll(seal_m, 2, axis=0) & (X < 14))
    paint(img, top, c["fur_light"])                                  # sunlit back and crown
    paint(img, seal_m & (Y > 20.6) & (X > 9.0), c["fur_dark"])        # shaded belly on the rock
    rng = np.random.default_rng(1999)
    spots = seal_m & ~muzzle & ~head & (rng.random((S, S)) < 0.1) & (Y < 20.4) & ~top
    paint(img, spots, c["spot"])
    paint(img, muzzle, c["muzzle"])
    paint(img, fore, c["fur_dark"])
    paint(img, fore & (X < 12.4), c["spot"])
    # face: a big dark eye with a glint, the nose, whisker dots
    paint(img, ell(X, Y, 8.2, 8.4, 1.15, 1.15), c["eye"])
    paint(img, (np.abs(X - 7.5) < 0.5) & (np.abs(Y - 7.5) < 0.5), c["whisker"])
    paint(img, ell(X, Y, 3.5, 10.6, 0.55, 0.55), c["eye"])
    paint(img, (np.abs(Y - 12.5) < 0.5) & (np.abs(X - 5.5) < 0.5), c["fur_dark"])
    for wx, wy in ((4.5, 11.5), (6.5, 11.5)):
        paint(img, (np.abs(X - wx) < 0.5) & (np.abs(Y - wy) < 0.5), c["fur_dark"])
    return outlined(img, c["edge"])


SEAL = {
    "fur": rgba("#8c939b"), "fur_light": rgba("#bcc3ca"), "fur_dark": rgba("#626a74"),
    "spot": rgba("#4f5660"), "muzzle": rgba("#a7aeb6"), "eye": rgba("#111317"), "whisker": rgba("#e9ecef"),
    "rock": rgba("#6d5f51"), "rock_light": rgba("#91806c"), "rock_dark": rgba("#473d34"),
    "water": rgba("#2c6ea0"), "water_dark": rgba("#1e527c"), "foam": rgba("#e8f2f6"),
    "edge": EDGE,
}


LOGO = (seal, SEAL)

"""Pacific Dunes logo: a grey whale surfacing in the Pacific and spouting
(developer, 2026-10-20). An original drawing; nothing of the club's own marks is
used. `python3 assets-src/logos.py pacific_dunes` writes
game/public/sprites/logos/pacific_dunes.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def whale(c: dict) -> np.ndarray:
    """A mottled grey whale's back arching out of the swell, head to the left, the
    tail flukes lifting at the right, and a tall spout from its blowhole."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the whale's back: a broad arch, head at the left, tail stock dipping right
    back = poly(X, Y, [(2.0, 23.0), (3.0, 18.6), (6.4, 15.0), (12.0, 13.2), (17.6, 13.6), (22.0, 16.0), (25.0, 19.4), (25.8, 23.0)])
    # the flukes lifting at the right
    fluke = poly(X, Y, [(23.8, 21.6), (26.0, 18.4), (27.0, 15.2), (25.4, 12.0), (28.4, 13.8), (31.0, 11.2), (30.6, 15.0), (28.2, 19.0), (26.2, 22.6)])
    body = back | fluke
    paint(img, body, c["grey"])
    top = body & (~np.roll(body, 1, axis=0) | ~np.roll(body, 2, axis=0))
    paint(img, top & (X < 22), c["grey_light"])
    paint(img, body & (Y > 19.6), c["grey_dark"])
    paint(img, fluke & (X > 27.6), c["grey_dark"])
    rng = np.random.default_rng(7)
    mott = body & ~top & (rng.random((S, S)) < 0.18) & (Y < 19.6) & (X > 8)
    paint(img, mott, c["mottle"])
    paint(img, ell(X, Y, 6.6, 17.6, 0.7, 0.7), c["eye"])                      # the eye
    paint(img, body & seg(X, Y, 2.6, 20.6, 7.4, 20.2, 0.5), c["grey_dark"])   # the mouth line
    paint(img, body & ell(X, Y, 10.0, 13.8, 1.0, 0.5), c["grey_dark"])        # the blowhole
    # the spout: two plumes from the blowhole, spreading into a V of spray
    plume = seg(X, Y, 10.0, 13.0, 6.6, 5.0, 1.1) | seg(X, Y, 10.0, 13.0, 13.6, 5.0, 1.1)
    puffs = ell(X, Y, 5.6, 4.0, 2.6, 2.2) | ell(X, Y, 14.6, 4.0, 2.6, 2.2) | ell(X, Y, 10.0, 11.4, 1.6, 1.6)
    spout = (plume | puffs) & ~body
    paint(img, spout, c["spray"])
    paint(img, spout & (X > 11.6), c["spray_dark"])
    paint(img, (ell(X, Y, 5.0, 3.4, 1.2, 0.9) | ell(X, Y, 14.0, 3.4, 1.2, 0.9)), c["spray_light"])
    drops = (rng.random((S, S)) < 0.3) & (ell(X, Y, 2.6, 6.6, 1.4, 1.4) | ell(X, Y, 17.6, 6.6, 1.4, 1.4) | ell(X, Y, 10.0, 2.2, 1.2, 1.0)) & ~puffs
    paint(img, drops, c["spray"])
    # the sea over the whale's lower half: swell with whitecaps
    crest = 22.0 + 0.9 * np.sin(X * 0.7)
    sea = (Y >= crest) & (Y <= 30.0) & (X >= 1.0) & (X <= 31.0)
    paint(img, sea, c["water"])
    paint(img, sea & (Y >= 25.6), c["water_dark"])
    paint(img, sea & (Y < crest + 1.0), c["water_light"])
    foam = sea & (Y < crest + 1.2) & (((X + 1.0) % 7.0) < 2.4)
    paint(img, foam, c["foam"])
    paint(img, sea & (np.abs(Y - 27.5) < 0.5) & (((X + 3.0) % 8.0) < 3.0), c["water"])   # a lower swell line
    return outlined(img, c["edge"])


LOGO = (whale, {
    "grey": rgba("#6f7f8e"), "grey_light": rgba("#a3b2bf"), "grey_dark": rgba("#4b5866"), "mottle": rgba("#c9d2da"), "eye": rgba("#1b2028"),
    "spray": rgba("#dcecf6"), "spray_light": rgba("#ffffff"), "spray_dark": rgba("#a9c6da"),
    "water": rgba("#1f6fb4"), "water_light": rgba("#4c98d8"), "water_dark": rgba("#14507f"), "foam": rgba("#eaf6ff"),
    "edge": EDGE,
})

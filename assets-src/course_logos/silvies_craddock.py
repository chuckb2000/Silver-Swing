"""Silvies Valley Ranch, Craddock course logo: a homestead windmill (a steel wheel of blades
and a red tail vane on a braced tower) pumping into a stock tank, on the tawny bunchgrass.
Craddock and Hankins are "named after the original pioneers who homesteaded the site"
(GolfPass, 2017): the windmill is how a high-desert homestead got its water, the Hankins
cabin the homestead itself. Chosen by the developer, 2026-10-25, over a buck-and-pole fence
and a branding iron (a covered wagon was dropped: another course already has one). An
original drawing; the club's own emblem is not used. The file name is the layout id; the
ranch's card shows `silvies.png` (the goat caddie).

    python3 assets-src/logos.py silvies_craddock          # writes game/public/sprites/logos/silvies_craddock.png
    python3 assets-src/course_logos/silvies_craddock.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def windmill(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # bunchgrass across the bottom
    ground = (Y >= 26.2 + 0.5 * np.sin(X * 0.9 + 3)) & (Y <= 30.4) & (X >= 0.6) & (X <= 31.4)
    paint(img, ground, c["grass"])
    paint(img, ground & (Y >= 28.8), c["grass_dark"])
    rng = np.random.default_rng(3)
    paint(img, ground & (Y < 28.6) & (rng.random((S, S)) < 0.22), c["grass_light"])

    # the stock tank, water showing at the top, ribbed sides
    tank = (X >= 17.0) & (X <= 29.0) & (Y >= 22.6) & (Y <= 27.4)
    paint(img, tank, c["steel"])
    paint(img, tank & (Y < 23.6), c["water"])
    for bx in (19.5, 23.0, 26.5):
        paint(img, tank & (Y >= 23.6) & (np.abs(X - bx) < 0.4), c["steel_dark"])

    # the tower: two legs meeting under the wheel, three cross braces and a diagonal
    tower = seg(X, Y, 6.0, 27.0, 10.5, 9.0, 0.55) | seg(X, Y, 15.0, 27.0, 10.5, 9.0, 0.55)
    for yy in (14.0, 19.0, 24.0):
        half = (yy - 9.0) * 4.5 / 18.0
        tower |= (np.abs(Y - yy) < 0.45) & (np.abs(X - 10.5) <= half)
    tower |= seg(X, Y, 10.5 - 5 * 4.5 / 18, 14.0, 10.5 + 10 * 4.5 / 18, 19.0, 0.4)
    paint(img, tower, c["tower"])

    # the wheel of blades, lit from the upper left, with its rim and hub
    d = np.hypot(X - 10.5, Y - 7.0)
    a = np.arctan2(Y - 7.0, X - 10.5)
    blades = (d <= 6.4) & (d >= 1.4) & (np.cos(9 * a) > 0.1)
    paint(img, blades, c["steel"])
    paint(img, blades & (X < 10.5) & (Y < 7.0), c["steel_light"])
    paint(img, (d <= 6.4) & (d > 5.5), c["steel_dark"])
    paint(img, d <= 1.3, c["steel_dark"])

    # the tail vane, red, keeping the wheel into the wind
    vane = poly(X, Y, [(12.0, 6.4), (19.0, 5.0), (21.6, 3.4), (22.0, 8.6), (19.0, 7.4), (12.0, 7.6)])
    paint(img, vane, c["vane"])
    paint(img, vane & (Y < 6.0), c["vane_light"])
    return outlined_outside(img, c["edge"])


LOGO = (windmill, {
    "steel": rgba("#8c939a"), "steel_dark": rgba("#5c636a"), "steel_light": rgba("#b8bec4"),
    "tower": rgba("#6b6f74"), "water": rgba("#6fa0c8"),
    "vane": rgba("#b3352c"), "vane_light": rgba("#d85a46"),
    "grass": rgba("#bfa265"), "grass_light": rgba("#dcc489"), "grass_dark": rgba("#8f7547"),
    "edge": EDGE,
})


if __name__ == "__main__":
    import sys

    from PIL import Image
    fn, cols = LOGO
    im = Image.fromarray(fn(cols), "RGBA").resize((S * 8, S * 8), Image.NEAREST)
    bg = Image.new("RGBA", im.size, (40, 44, 52, 255))
    bg.alpha_composite(im)
    bg.save(sys.argv[1])
    print(sys.argv[1])

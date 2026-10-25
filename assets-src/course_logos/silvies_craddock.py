"""Silvies Valley Ranch, Craddock course logo: a pioneer's covered wagon on the tawny
bunchgrass, heading right. Craddock and Hankins are "named after the original pioneers who
homesteaded the site" (GolfPass, 2017); the wagon is the arrival, the Hankins cabin the
homestead. An original drawing (course chat, 2026-10-25); the club's own emblem is not
used. The file name is the layout id; the ranch's card shows `silvies.png` (the goat
caddie).

    python3 assets-src/logos.py silvies_craddock          # writes game/public/sprites/logos/silvies_craddock.png
    python3 assets-src/course_logos/silvies_craddock.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def wheel(img, X, Y, cx, cy, r, c):
    d = np.hypot(X - cx, Y - cy)
    rim = (d <= r) & (d >= r - 1.2)
    hub = d <= 1.1
    spokes = (d < r - 0.6) & ((np.abs(X - cx) < 0.5) | (np.abs(Y - cy) < 0.5)
                              | (np.abs(np.abs(X - cx) - np.abs(Y - cy)) < 0.6))
    paint(img, (d < r) & ~spokes & ~rim, np.zeros(4, np.uint8))       # see through between the spokes
    paint(img, spokes, c["spoke"])
    paint(img, rim, c["wheel"])
    paint(img, rim & (X < cx) & (Y < cy), c["wheel_light"])
    paint(img, hub, c["wheel_dark"])


def wagon(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # bunchgrass and a wheel track across the bottom
    ground = (Y >= 26.0 + 0.5 * np.sin(X * 0.8)) & (Y <= 30.4) & (X >= 0.6) & (X <= 31.4)
    paint(img, ground, c["grass"])
    paint(img, ground & (Y >= 28.8), c["grass_dark"])
    rng = np.random.default_rng(1862)
    paint(img, ground & (Y < 28.6) & (rng.random((S, S)) < 0.22), c["grass_light"])

    # the bonnet: white canvas over three hoops, puckered at both ends
    bonnet = poly(X, Y, [(5.0, 18.2), (4.0, 11.8), (6.4, 8.0), (11.0, 6.0), (17.0, 5.6),
                         (22.4, 6.6), (26.4, 9.2), (27.6, 13.0), (26.6, 18.2)])
    paint(img, bonnet, c["canvas"])
    shade(img, bonnet, c["canvas_light"], c["canvas_dark"])
    for hx in (11.0, 16.2, 21.4):                       # hoops showing through the canvas
        paint(img, bonnet & (np.abs(X - hx) < 0.5) & (Y > 7.4) & (Y < 17.0), c["canvas_mid"])
    paint(img, ell(X, Y, 26.4, 13.6, 1.3, 2.6) & bonnet, c["canvas_dark"])   # the open, shaded front

    # the wagon box with a plank line, the tongue reaching forward;
    # painted the old way, a blue box on red wheels
    box = (X >= 4.4) & (X <= 27.4) & (Y >= 17.6) & (Y <= 21.6)
    paint(img, box, c["wood"])
    paint(img, box & (np.abs(Y - 19.6) < 0.4), c["wood_dark"])
    shade(img, box, c["wood_light"], c["wood_dark"])
    paint(img, seg(X, Y, 27.0, 21.4, 31.0, 23.2, 0.5), c["wood_dark"])

    # wheels: a smaller front pair, a larger back pair (one of each seen)
    wheel(img, X, Y, 9.0, 23.4, 4.6, c)
    wheel(img, X, Y, 23.4, 24.2, 3.8, c)
    return outlined_outside(img, c["edge"])


LOGO = (wagon, {
    "canvas": rgba("#ece4cf"), "canvas_light": rgba("#fffaf0"), "canvas_dark": rgba("#b9ad92"),
    "canvas_mid": rgba("#d4caae"),
    "wood": rgba("#3f6a8c"), "wood_light": rgba("#5f8aac"), "wood_dark": rgba("#2a4a66"),
    "wheel": rgba("#a8382a"), "wheel_light": rgba("#cf5a44"), "wheel_dark": rgba("#5a1e16"),
    "spoke": rgba("#8e2e22"),
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

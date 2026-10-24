"""Pumpkin Ridge, Ghost Creek logo: a pale wisp of morning mist rising off a
reed-lined creek at dawn, dark firs on the far bank. A round badge. Original
drawing (the scouting chat's idea, 2026-10-24); nothing from the club's own
branding.

The file name is the layout id (`pumpkin_ridge_ghost_creek`).

    python3 assets-src/course_logos/pumpkin_ridge_ghost_creek.py out.png   # an 8x preview
"""
from __future__ import annotations

import math

import numpy as np

from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg


def mist(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    cx, cy, R = 16.0, 16.0, 14.6
    disc = np.hypot(X - cx, Y - cy) <= R

    # dawn sky in flat bands (no gradients): pale gold low, soft lilac high
    paint(img, disc, c["sky_high"])
    paint(img, disc & (Y > 8.5), c["sky_mid"])
    paint(img, disc & (Y > 13.0), c["sky_low"])

    # far bank: a row of Douglas fir spires, and the dark bank under them
    firs = np.zeros(X.shape, bool)
    for fx, top, half in ((4.0, 10.4, 2.2), (7.6, 7.6, 2.6), (11.0, 11.0, 2.0), (21.4, 9.0, 2.4),
                          (24.8, 6.8, 2.8), (28.2, 10.6, 2.2)):
        t = np.clip((Y - top) / (17.6 - top), 0, 1)
        firs |= (Y >= top) & (Y <= 17.8) & (np.abs(X - fx) <= 0.4 + half * t)
    bank = (Y >= 16.4) & (Y <= 18.4)
    paint(img, disc & (firs | bank), c["fir"])

    # the creek: slate water across the lower part, two light ripple lines
    water = disc & (Y > 18.4) & (Y <= 25.0)
    paint(img, water, c["water"])
    paint(img, water & (Y > 23.2), c["water_dark"])
    paint(img, water & seg(X, Y, 8.0, 20.4, 14.0, 20.4, 0.5), c["ripple"])
    paint(img, water & seg(X, Y, 18.0, 22.4, 25.0, 22.4, 0.5), c["ripple"])
    # near bank
    paint(img, disc & (Y > 25.0), c["bank"])
    paint(img, disc & (Y > 28.0), c["bank_dark"])

    # reeds and cattails on both sides of the foreground
    reeds = np.zeros(X.shape, bool)
    heads = np.zeros(X.shape, bool)
    for rx, top, lean in ((3.6, 16.0, -0.6), (5.4, 13.4, 0.4), (7.0, 18.0, 1.0), (24.6, 17.4, -1.0),
                          (26.4, 14.2, -0.3), (28.2, 17.0, 0.7)):
        reeds |= seg(X, Y, rx, 30.6, rx + lean, top, 0.45)
        heads |= seg(X, Y, rx + lean * 0.9, top + 1.0, rx + lean * 0.8, top + 2.8, 0.5)
    blades = seg(X, Y, 4.4, 30.4, 9.4, 21.4, 0.4) | seg(X, Y, 27.4, 30.4, 22.4, 22.6, 0.4)
    paint(img, disc & (reeds | blades), c["reed"])
    paint(img, disc & heads, c["cattail"])

    # the mist: a pale wisp rising off the water in an S, wider and fainter as it climbs
    wisp = np.zeros(X.shape, bool)
    core = np.zeros(X.shape, bool)
    for k in range(40):
        t = k / 39.0
        y = 21.0 - 15.5 * t
        x = 15.6 + 2.6 * math.sin(t * 2.2 * math.pi) * (0.3 + t)
        w = 0.55 + 0.9 * t
        wisp |= np.hypot(X - x, (Y - y) * 1.2) <= w
        if t < 0.45:
            core |= np.hypot(X - x - 0.2, (Y - y) * 1.2) <= 0.5
    paint(img, disc & wisp, c["mist"])
    paint(img, disc & core, c["mist_light"])
    # a low bank of mist lying on the water
    lying = disc & (np.abs(Y - 18.6) < 0.55) & (np.abs(X - 15.0) < 7.5) & ~((X > 9.0) & (X < 10.5))
    paint(img, lying, c["mist"])

    # a rim to the badge
    rim = disc & (np.hypot(X - cx, Y - cy) > R - 1.0)
    paint(img, rim, c["rim"])
    return outlined(img, c["edge"])


LOGO = (mist, {
    "sky_high": rgba("#b7a6c9"), "sky_mid": rgba("#e6c2a6"), "sky_low": rgba("#f6dca4"),
    "fir": rgba("#1f3a33"),
    "water": rgba("#4d7480"), "water_dark": rgba("#355863"), "ripple": rgba("#9cc1c4"),
    "bank": rgba("#5b6a2c"), "bank_dark": rgba("#3d4a1e"),
    "reed": rgba("#7a8a35"), "cattail": rgba("#6a3f1f"),
    "mist": rgba("#dfe4e8"), "mist_light": rgba("#ffffff"),
    "rim": rgba("#c9a24a"),
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

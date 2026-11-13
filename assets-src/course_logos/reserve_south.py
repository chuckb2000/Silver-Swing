"""The Reserve South logo: an Oregon white oak acorn on a sprig of its round-lobed leaves,
for the oaks and firs that line John Fought's parkland South course. A round badge like the
club's (reserve). Original drawing (course chat, 2026-11-13); nothing from the club's own
branding.

    python3 assets-src/course_logos/reserve_south.py out.png   # an 8x preview
"""
from __future__ import annotations

import math

import numpy as np

from logos import EDGE, S, grid, paint, seg, rgba


def _lobed_leaf(X, Y, x0, y0, ang, length, width):
    """An oak leaf: a pointed oval with three rounded lobes a side, along angle `ang`."""
    ca, sa = math.cos(ang), math.sin(ang)
    u = (X - x0) * ca + (Y - y0) * sa          # along the leaf, 0 at the stalk
    v = -(X - x0) * sa + (Y - y0) * ca         # across
    t = np.clip(u / length, 0, 1)
    half = width * np.sin(math.pi * t) ** 0.8 * (0.42 + 0.58 * np.abs(np.cos(3 * math.pi * t)))
    return (u >= 0) & (u <= length) & (np.abs(v) <= half), u, v


def acorn(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    d = np.hypot(X - 16, Y - 16)
    disc = d <= 14.6
    paint(img, d <= 15.6, c["edge"])
    paint(img, disc, c["ground"])
    paint(img, disc & (Y > 25.5), c["ground_dark"])
    # two leaves fanning out behind the acorn, lit on the upper left, with a midrib
    for x0, y0, ang, ln in ((15.0, 9.4, math.radians(200), 10.6), (16.6, 9.0, math.radians(-25), 10.4)):
        leaf, u, v = _lobed_leaf(X, Y, x0, y0, ang, ln, 3.5)
        leaf &= disc
        paint(img, leaf, c["leaf"])
        paint(img, leaf & (v < -0.8), c["leaf_light"])
        paint(img, leaf & (v > 1.6), c["leaf_dark"])
        paint(img, leaf & (np.abs(v) <= 0.35) & (u > 0.8), c["leaf_dark"])
    # the acorn: nut below, scaly cap above, a stub of stalk
    nut = np.hypot((X - 16.0) / 4.4, (Y - 20.2) / 5.6) <= 1
    nut &= Y > 15.5
    paint(img, nut, c["nut"])
    paint(img, nut & (np.hypot(X - 14.2, Y - 18.4) <= 2.0), c["nut_light"])
    paint(img, nut & (X > 18.0) & (Y > 20.0), c["nut_dark"])
    paint(img, (np.floor(X) == 16) & (np.floor(Y) == 25), c["nut_dark"])  # the point
    cap = (np.hypot((X - 16.0) / 5.4, (Y - 16.0) / 3.0) <= 1) & (Y <= 17.2)
    paint(img, cap, c["cap"])
    paint(img, cap & (((np.floor(X) + 2 * np.floor(Y)) % 3) == 0), c["cap_dark"])
    paint(img, cap & (Y <= 14.6) & (X < 15.6), c["cap_light"])
    paint(img, seg(X, Y, 16.0, 13.2, 16.6, 10.6, 0.55), c["stalk"])
    return img


LOGO = (acorn, {
    "ground": rgba("#f0e6c4"), "ground_dark": rgba("#d9c890"),
    "leaf": rgba("#4f7a2e"), "leaf_light": rgba("#74a042"), "leaf_dark": rgba("#33561e"),
    "nut": rgba("#b37a3a"), "nut_light": rgba("#d39c52"), "nut_dark": rgba("#875627"),
    "cap": rgba("#7a5a34"), "cap_dark": rgba("#5b4126"), "cap_light": rgba("#9a7a4c"),
    "stalk": rgba("#5b4126"),
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

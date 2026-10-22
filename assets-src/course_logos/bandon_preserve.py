"""Bandon Preserve logo: a sprig of salal, glossy pointed leaves on a red stem,
a drooping stalk of pink-white bell flowers, in a tuft of moss (developer,
2026-10-22: "a salal plant for the preserve"). Original drawing; nothing from
the course's own branding.

The file name is the course id the course chat is expected to use
(`bandon_preserve`); rename the file if the course is built under another id.

    python3 assets-src/course_logos/bandon_preserve.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import math

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, rgba, ring_of, seg


def leaf(X, Y, bx, by, deg, length, width):
    """A pointed oval leaf from its base (bx, by), pointing at `deg` (0 = right, -90 = up)."""
    a = math.radians(deg)
    U = (X - bx) * math.cos(a) + (Y - by) * math.sin(a)
    V = -(X - bx) * math.sin(a) + (Y - by) * math.cos(a)
    u = U / length                                   # 0 at the base, 1 at the tip
    half = width * np.sqrt(np.clip(u * (1 - u), 0, None)) * (1.25 - 0.5 * u)
    return (u >= 0) & (u <= 1) & (np.abs(V) <= half), U, V


def salal(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # a tuft of moss at the foot
    moss = (((X - 15.0) / 9.0) ** 2 + ((Y - 30.2) / 2.6) ** 2 <= 1) & (Y <= 31.0)
    paint(img, moss, c["moss"])
    paint(img, moss & ~np.roll(moss, 1, axis=0), c["moss_light"])
    paint(img, moss & (Y > 30.2), c["moss_dark"])

    # the stem, curving up from the moss
    stem = seg(X, Y, 14.6, 29.0, 14.2, 21.0, 0.6) | seg(X, Y, 14.2, 21.0, 15.0, 12.0, 0.55) | seg(X, Y, 15.0, 12.0, 16.4, 5.6, 0.5)
    paint(img, stem, c["stem"])

    # leaves, alternating up the stem; light from the upper left, a darker midrib
    leaves = np.zeros(X.shape, bool)
    for bx, by, deg, ln, wd in ((14.4, 25.6, -165, 10.6, 6.6), (14.4, 21.4, -14, 10.6, 6.6),
                                (14.8, 15.8, -152, 9.2, 5.8), (15.4, 11.8, -30, 8.2, 5.2),
                                (16.0, 7.6, -100, 6.4, 4.4)):
        m, U, V = leaf(X, Y, bx, by, deg, ln, wd)
        under = leaves.copy()
        paint(img, m, c["leaf"])
        paint(img, ring_of(m) & under, c["leaf_dark"])          # a dark line where it lies over a lower leaf
        leaves |= m
        lit = m & ((V < -0.3) if math.cos(math.radians(deg)) >= 0 else (V > 0.3))
        paint(img, lit, c["leaf_light"])
        paint(img, m & (np.abs(V) <= 0.45) & (U > 1.0) & (U < ln - 1.4), c["vein"])

    # the flower stalk: from high on the stem, arching out to the right and hanging down
    pts = [(16.0, 8.4), (19.6, 8.2), (23.0, 10.0), (25.6, 13.4), (26.8, 17.4), (27.0, 21.0)]
    stalk = np.zeros(X.shape, bool)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        stalk |= seg(X, Y, x0, y0, x1, y1, 0.45)
    paint(img, stalk, c["stem"])
    # bell-shaped flowers hanging under the stalk, open end down
    for fx, fy in ((19.4, 10.4), (22.8, 12.2), (25.0, 15.4), (25.8, 19.4), (27.0, 23.2)):
        bell = (((X - fx) / 1.35) ** 2 + ((Y - fy) / 1.5) ** 2 <= 1)
        paint(img, bell, c["bell"])
        paint(img, bell & (X > fx + 0.2), c["bell_shade"])
        paint(img, bell & (Y > fy + 0.9) & (np.abs(X - fx) < 0.6), c["bell_mouth"])
    return outlined_outside(img, c["edge"])


LOGO = (salal, {
    "leaf": rgba("#2f6b3a"), "leaf_dark": rgba("#1b3f24"), "leaf_light": rgba("#4f9a4a"), "vein": rgba("#1f4a2a"),
    "stem": rgba("#8a3a2a"),
    "bell": rgba("#f4dde2"), "bell_shade": rgba("#d993a6"), "bell_mouth": rgba("#a8506a"),
    "moss": rgba("#5d7f34"), "moss_light": rgba("#86a84a"), "moss_dark": rgba("#3f5a26"),
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

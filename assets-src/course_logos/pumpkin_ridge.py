"""Pumpkin Ridge (the club: its card on the course-select screen) logo: a ripe pumpkin with
a curled stem and a leaf (developer, 2026-10-24: "it should be a pumpkin"). Original
drawing; nothing from the club's own branding. The two courses keep their own logos
(pumpkin_ridge_witch_hollow, pumpkin_ridge_ghost_creek).

    python3 assets-src/course_logos/pumpkin_ridge.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, seg, rgba


def pumpkin(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    cy = 19.0
    # five lobes, drawn back to front (outer, inner, middle) so each overlaps the one behind;
    # each lit on its upper left and shaded on its lower right, with a dark groove where it
    # meets the lobe behind (light from the upper left)
    lobes = [(-8.4, 5.6, 8.2), (8.4, 5.6, 8.2), (-4.4, 5.8, 9.2), (4.4, 5.8, 9.2), (0.0, 5.8, 9.8)]
    body = np.zeros_like(X, bool)
    for dx, rx, ry in lobes:
        x0 = 16.0 + dx
        d = np.hypot((X - x0) / rx, (Y - cy) / ry)
        m = d <= 1
        lit = np.hypot((X - x0 + 1.6) / rx, (Y - cy + 1.4) / ry) <= 0.78
        dark = np.hypot((X - x0 + 1.2) / rx, (Y - cy + 1.0) / ry) > 1.0
        paint(img, m, c["orange"])
        paint(img, m & dark, c["orange_dark"])
        paint(img, m & lit & (X < x0 - 0.6) & (Y < cy - 1.5), c["orange_light"])
        if body.any():
            paint(img, m & (d > 0.86) & body & (np.abs(X - x0) > rx * 0.55), c["groove"])
        body |= m
    # stem: a short curled green-brown stalk
    stem = seg(X, Y, 16.0, 10.4, 16.6, 6.4, 1.3) | seg(X, Y, 16.6, 6.4, 19.2, 4.6, 0.9)
    paint(img, stem, c["stem"])
    paint(img, stem & (X < 16.2), c["stem_light"])
    # a leaf on the left, with its midrib
    leaf = poly(X, Y, [(15.2, 9.6), (11.4, 6.0), (7.0, 6.6), (9.4, 9.6), (13.0, 10.8)])
    paint(img, leaf, c["leaf"])
    paint(img, leaf & (Y < 8.0) & (X < 11.0), c["leaf_light"])
    paint(img, seg(X, Y, 14.6, 9.8, 8.6, 7.4, 0.35) & leaf, c["leaf_dark"])
    # a little curly tendril on the right
    paint(img, seg(X, Y, 19.4, 4.8, 22.0, 5.4, 0.45) | seg(X, Y, 22.0, 5.4, 22.6, 7.2, 0.45), c["leaf_dark"])
    return outlined_outside(img, c["edge"])


LOGO = (pumpkin, {
    "orange": rgba("#e8862a"), "orange_light": rgba("#f6ad55"), "orange_dark": rgba("#b85d1a"),
    "groove": rgba("#a34f15"),
    "stem": rgba("#6b5a2c"), "stem_light": rgba("#8d7a3e"),
    "leaf": rgba("#4f8a2e"), "leaf_light": rgba("#6dab42"), "leaf_dark": rgba("#33601e"),
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

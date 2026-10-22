"""The Muni (Lake Oswego) logo: a sailboat on the lake, white sails and a red
hull, a pennant at the masthead, small waves (developer, 2026-10-22: "a
sailboat for the muni"). Original drawing; nothing from the course's own
branding.

    python3 assets-src/course_logos/lake_oswego_muni.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def sailboat(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the lake: a rounded patch under the boat, darker toward the front, a few wave crests
    lake = (Y >= 23.6 + 0.7 * np.sin(X * 0.9)) & (((X - 16) / 15.6) ** 2 + ((Y - 25.6) / 6.6) ** 2 <= 1)
    paint(img, lake, c["water"])
    paint(img, lake & (Y >= 28.0), c["water_dark"])
    paint(img, lake & ~np.roll(lake, 1, axis=0), c["water_light"])
    for wx, wy in ((5.5, 26.5), (25.5, 26.0), (10.5, 29.5), (21.0, 29.5)):
        paint(img, lake & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.6), c["water_light"])

    # mainsail (behind the mast, to the left) and jib (to the right), a little belly in each
    main = poly(X, Y, [(14.6, 2.6), (14.6, 19.6), (4.6, 19.6), (8.0, 13.0), (11.6, 7.0)])
    jib = poly(X, Y, [(16.4, 5.0), (16.4, 19.6), (25.4, 19.6), (21.6, 13.6)])
    paint(img, main | jib, c["sail"])
    # light from the upper left: the jib, turned away, and the sail's foot in shade; a seam on the main
    paint(img, jib & (X > 20.0 + 0.0 * Y) & (Y > 12.0), c["sail_shade"])
    paint(img, main & (Y > 17.6), c["sail_shade"])
    paint(img, jib & (Y > 17.6), c["sail_shade"])
    paint(img, seg(X, Y, 14.2, 9.0, 8.6, 14.6, 0.35) & main, c["seam"])
    # mast and boom
    mast = (np.abs(X - 15.5) <= 0.6) & (Y >= 1.6) & (Y <= 21.0)
    boom = (np.abs(Y - 20.2) <= 0.5) & (X >= 5.0) & (X <= 15.5)
    paint(img, mast | boom, c["wood"])
    # pennant at the masthead, flying left
    pennant = poly(X, Y, [(15.0, 1.2), (15.0, 3.6), (10.6, 2.4)])
    paint(img, pennant, c["flag"])

    # hull: sheer line rising to the bow on the right, rounded stern, sitting in the water
    hull = poly(X, Y, [(4.4, 21.0), (27.6, 20.4), (25.0, 24.4), (8.0, 24.6), (5.4, 23.2)])
    paint(img, hull, c["hull"])
    paint(img, hull & (Y < 21.8), c["hull_light"])          # lit gunwale
    paint(img, hull & (Y > 23.4), c["hull_dark"])           # shade at the waterline
    paint(img, hull & (np.abs(Y - 22.6) < 0.45) & (X > 7.0) & (X < 25.0), c["stripe"])
    # the boat's reflection just under the hull
    paint(img, lake & ~hull & (Y >= 24.6) & (Y < 25.6) & (X > 8.5) & (X < 24.0), c["water_dark"])
    return outlined_outside(img, c["edge"])


LOGO = (sailboat, {
    "water": rgba("#2f78c4"), "water_light": rgba("#7cc2ee"), "water_dark": rgba("#1f4f8f"),
    "sail": rgba("#f6f3ea"), "sail_shade": rgba("#c9c4b6"), "seam": rgba("#d8d3c6"),
    "wood": rgba("#6b4a2a"), "flag": rgba("#f08a24"),
    "hull": rgba("#c2352a"), "hull_light": rgba("#e0563f"), "hull_dark": rgba("#8a2219"), "stripe": rgba("#f6f3ea"),
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

"""Wildwood logo: a double-bit felling axe sunk in a fresh-cut stump, on a tuft of
grass (developer, 2026-10-24: "just the axe in the stump"; a first draft also had a
Douglas fir and the creek).

Why: Bill O'Meara bought the overgrown site of a nine-hole course that had
closed in 1971, logged the land himself to pay for the build, and the family
sold firewood while the first nine was built (opened 1991). Original drawing;
nothing from the course's own branding.

    python3 assets-src/course_logos/wildwood.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def axe_in_stump(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # grass underfoot
    grass = (Y >= 27.4 - 0.5 * np.sin(X * 1.3) - 0.3 * np.sin(X * 2.9 + 0.6)) & (Y <= 30.6) & (np.abs(X - 16) <= 14.0)
    paint(img, grass, c["grass"])
    paint(img, grass & ~np.roll(grass, 1, axis=0), c["grass_light"])
    paint(img, grass & (Y > 29.8), c["grass_dark"])

    # stump: a short wide trunk with flared roots; the cut face seen slightly from above
    sx, top_y, bot_y, r, ry = 16.5, 16.0, 28.0, 8.6, 3.0
    side = (np.abs(X - sx) <= r) & (Y >= top_y) & (Y <= bot_y + 0.8 * np.sqrt(np.clip(1 - ((X - sx) / r) ** 2, 0, 1)))
    roots = (poly(X, Y, [(sx - r - 2.6, 28.6), (sx - r, 21.6), (sx - r + 2.0, 28.2)])
             | poly(X, Y, [(sx + r + 2.6, 28.6), (sx + r, 21.6), (sx + r - 2.0, 28.2)])
             | poly(X, Y, [(sx - 2.0, 28.9), (sx + 0.6, 26.0), (sx + 2.6, 28.9)]))
    body = side | roots
    paint(img, body, c["bark"])
    paint(img, body & (X < sx - r + 1.8), c["bark_light"])                         # lit left side
    paint(img, body & (X > sx + r - 2.2), c["bark_dark"])                          # shaded right side
    for k in (-4.6, -1.4, 1.8, 5.0):                                               # bark furrows
        paint(img, side & (np.abs(X - (sx + k)) < 0.45) & (Y > top_y + ry + 0.6) & (Y < bot_y - 0.4), c["bark_dark"])
    e = np.hypot((X - sx) / r, (Y - top_y) / ry)
    face = e <= 1
    paint(img, face, c["wood"])
    paint(img, face & (np.abs(e - 0.62) < 0.1), c["ring"])                         # growth rings
    paint(img, face & (np.abs(e - 0.3) < 0.1), c["ring"])
    paint(img, face & (e > 0.86), c["sapwood"])                                    # the pale rim under the bark
    paint(img, face & (e > 0.86) & (Y < top_y), c["wood_light"])

    # double-bit axe: the lower bit driven into the face, the upper bit standing above it,
    # the handle running out to the upper left
    hx, hy = 17.6, top_y + 0.4
    paint(img, seg(X, Y, hx - 2.4, hy + 0.6, hx + 2.4, hy - 0.6, 0.55), c["bark_dark"])   # the cut
    upper = poly(X, Y, [(hx - 1.3, hy - 0.4), (hx - 1.5, 10.6), (hx - 2.6, 8.6), (hx - 4.4, 6.2),
                        (hx - 2.2, 4.9), (hx, 4.5), (hx + 2.2, 4.9), (hx + 4.4, 6.2),
                        (hx + 2.6, 8.6), (hx + 1.5, 10.6), (hx + 1.3, hy - 0.4)])
    eye = (np.abs(X - hx) <= 1.6) & (np.abs(Y - (hy - 2.6)) <= 1.2)
    handle = seg(X, Y, hx - 0.8, hy - 2.6, 2.6, 6.2, 1.0)
    paint(img, handle, c["handle"])
    paint(img, handle & ~np.roll(handle, 1, axis=0), c["handle_light"])
    paint(img, handle & ~np.roll(handle, -1, axis=0), c["handle_dark"])
    paint(img, seg(X, Y, 3.4, 6.6, 1.8, 5.8, 1.1), c["handle_dark"])               # swell at the end
    steel = upper | eye
    paint(img, steel, c["steel"])
    paint(img, upper & (X < hx - 0.2), c["steel_light"])                            # lit from the upper left
    paint(img, upper & (X > hx + 0.8) & (Y > 7.0), c["steel_dark"])
    paint(img, upper & (Y < 6.0), c["edge_bright"])                                 # the honed edge
    return outlined_outside(img, c["edge"])


LOGO = (axe_in_stump, {
    "bark": rgba("#7a4a2a"), "bark_light": rgba("#9c6438"), "bark_dark": rgba("#4e2e1a"),
    "wood": rgba("#e3bf7a"), "wood_light": rgba("#f2d9a2"), "ring": rgba("#b98c4c"), "sapwood": rgba("#c99a58"),
    "steel": rgba("#9aa6b2"), "steel_light": rgba("#c4ced8"), "steel_dark": rgba("#6c7782"),
    "edge_bright": rgba("#f2f6fa"),
    "handle": rgba("#c9a063"), "handle_light": rgba("#e6c48a"), "handle_dark": rgba("#8a6436"),
    "grass": rgba("#4f8a3a"), "grass_light": rgba("#78b24c"), "grass_dark": rgba("#2f5f2a"),
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

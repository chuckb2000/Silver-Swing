"""Wildwood logo: a double-bit felling axe sunk in a fresh-cut stump, a tall
Douglas fir behind it, and the creek running past along the bottom.

Why: Bill O'Meara bought the overgrown site of a nine-hole course that had
closed in 1971, logged the land himself to pay for the build, and the family
sold firewood while the first nine was built (opened 1991); the course sits in
a creek valley among firs below the Tualatin Mountains. Original drawing;
nothing from the course's own branding.

    python3 assets-src/course_logos/wildwood.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def axe_and_fir(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # creek: a band of water across the bottom, with a lighter ripple
    creek = (Y >= 27.2 + 0.6 * np.sin(X * 0.55)) & (Y <= 30.8) & (np.abs(X - 16) <= 14.5)
    paint(img, creek, c["water"])
    paint(img, creek & (np.abs(Y - (28.9 + 0.6 * np.sin(X * 0.55 + 1.2))) < 0.45) & ((X.astype(int) % 6) < 3), c["water_light"])
    paint(img, creek & (Y > 30.0), c["water_dark"])
    # grass bank behind the stump
    bank = (Y >= 25.0 - 0.5 * np.sin(X * 0.8 + 0.4)) & (Y < 27.2 + 0.6 * np.sin(X * 0.55)) & (np.abs(X - 16) <= 14.5)
    paint(img, bank, c["grass"])
    paint(img, bank & ~np.roll(bank, 1, axis=0), c["grass_light"])

    # Douglas fir: a tall narrow cone of drooping tiers, right of centre
    fx = 21.0
    fir = np.zeros(X.shape, bool)
    tiers = [(2.0, 7.0, 2.2), (5.0, 11.0, 3.4), (8.6, 15.4, 4.6), (12.4, 20.0, 5.8), (16.0, 24.6, 6.8)]
    for top, base, half in tiers:
        fir |= poly(X, Y, [(fx, top), (fx - half, base), (fx - half * 0.35, base - 0.9),
                           (fx + half * 0.35, base - 0.9), (fx + half, base)])
    fir |= seg(X, Y, fx, 0.8, fx, 2.8, 0.5)                       # leader
    trunk = (np.abs(X - fx) <= 0.9) & (Y > 24.0) & (Y < 26.4)
    paint(img, trunk, c["bark_dark"])
    paint(img, fir, c["fir"])
    paint(img, fir & (X < fx - 0.4) & ~np.roll(fir, 1, axis=1), c["fir_light"])   # lit left edges
    paint(img, fir & (X > fx + 0.6), c["fir_dark"])                               # shaded right side
    for top, base, half in tiers:                                                  # tier undersides
        paint(img, fir & (np.abs(Y - (base - 0.5)) < 0.5) & (X > fx - half * 0.5), c["fir_dark"])

    # stump: a short wide cylinder, left of centre, its cut face toward the viewer's eye
    sx, top_y, bot_y, r = 10.5, 19.0, 26.6, 5.6
    side = (np.abs(X - sx) <= r) & (Y >= top_y) & (Y <= bot_y + 0.6 * np.sqrt(np.clip(1 - ((X - sx) / r) ** 2, 0, 1)))
    roots = poly(X, Y, [(sx - r - 1.6, 26.8), (sx - r, 22.6), (sx - r + 1.0, 26.4)]) | \
        poly(X, Y, [(sx + r + 1.6, 26.8), (sx + r, 22.6), (sx + r - 1.0, 26.4)])
    body = side | roots
    paint(img, body, c["bark"])
    paint(img, body & (X < sx - r + 1.4), c["bark_light"])
    paint(img, body & (X > sx + r - 1.6), c["bark_dark"])
    for k in (-3.0, 0.2, 3.2):                                                     # bark furrows
        paint(img, side & (np.abs(X - (sx + k)) < 0.45) & (Y > top_y + 2.2), c["bark_dark"])
    face = np.hypot((X - sx) / r, (Y - top_y) / 2.1) <= 1
    paint(img, face, c["wood"])
    paint(img, face & (np.abs(np.hypot((X - sx) / r, (Y - top_y) / 2.1) - 0.55) < 0.12), c["ring"])
    paint(img, face & ~np.roll(face, -1, axis=0) & (X > sx), c["ring"])

    # double-bit axe: the lower bit driven into the cut face, the upper bit standing
    # above it, the handle running out to the left and a little up
    hx = 11.0
    paint(img, seg(X, Y, hx - 1.6, top_y + 0.4, hx + 1.6, top_y + 0.4, 0.5), c["bark_dark"])   # the cut
    upper = poly(X, Y, [(hx - 0.9, top_y), (hx - 2.8, 12.4), (hx - 1.2, 11.6), (hx, 11.4),
                        (hx + 1.2, 11.6), (hx + 2.8, 12.4), (hx + 0.9, top_y)])
    eye = (np.abs(X - hx) <= 1.3) & (np.abs(Y - 17.4) <= 1.0)
    steel = upper | eye
    handle = seg(X, Y, hx - 0.6, 17.3, 1.8, 13.0, 0.8)
    paint(img, handle, c["handle"])
    paint(img, handle & ~np.roll(handle, 1, axis=0), c["handle_light"])
    paint(img, handle & ~np.roll(handle, -1, axis=0), c["handle_dark"])
    paint(img, seg(X, Y, 2.4, 13.3, 1.4, 12.8, 0.9), c["handle_dark"])              # swell at the end
    paint(img, steel, c["steel"])
    paint(img, upper & (X < hx), c["steel_light"])
    paint(img, upper & (Y < 12.6), c["edge_bright"])                               # the honed edge
    paint(img, upper & (X > hx + 0.6) & (Y > 13.0), c["steel_dark"])
    return outlined_outside(img, c["edge"])


LOGO = (axe_and_fir, {
    "fir": rgba("#2f6b3a"), "fir_light": rgba("#4f9a4c"), "fir_dark": rgba("#1d4628"),
    "bark": rgba("#7a4a2a"), "bark_light": rgba("#9c6438"), "bark_dark": rgba("#4e2e1a"),
    "wood": rgba("#e3bf7a"), "ring": rgba("#b98c4c"),
    "steel": rgba("#9aa6b2"), "steel_light": rgba("#c4ced8"), "steel_dark": rgba("#6c7782"),
    "edge_bright": rgba("#f2f6fa"),
    "handle": rgba("#c9a063"), "handle_light": rgba("#e6c48a"), "handle_dark": rgba("#8a6436"),
    "grass": rgba("#4f8a3a"), "grass_light": rgba("#78b24c"),
    "water": rgba("#3d7fb8"), "water_light": rgba("#8cc4ea"), "water_dark": rgba("#285d8c"),
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

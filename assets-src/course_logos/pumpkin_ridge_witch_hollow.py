"""Pumpkin Ridge, Witch Hollow logo: a great horned owl perched on the crooked
limb of an old Oregon white oak, in front of a low harvest moon. Original
drawing (the scouting chat's idea, 2026-10-24); nothing from the club's own
branding.

The file name is the layout id (`pumpkin_ridge_witch_hollow`); the club's card
on the course-select screen shows the first of its courses' logos.

    python3 assets-src/course_logos/pumpkin_ridge_witch_hollow.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def owl(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the moon: a big pale disc low behind the owl, lit from the upper left, with two soft maria
    md = np.hypot(X - 17.0, Y - 15.5)
    moon = md <= 13.2
    paint(img, moon, c["moon"])
    paint(img, moon & (md > 11.6) & ((X - 17.0) + (Y - 15.5) > 4), c["moon_dark"])
    paint(img, moon & (md > 11.8) & ((X - 17.0) + (Y - 15.5) < -6), c["moon_light"])
    paint(img, moon & (np.hypot((X - 8.0) / 1.8, (Y - 11.0) / 1.4) <= 1), c["moon_dark"])
    paint(img, moon & (np.hypot((X - 26.0) / 1.4, (Y - 18.0) / 1.8) <= 1), c["moon_dark"])

    # the oak limb: thick and crooked, from the lower left up to the right, a twig with two leaves
    limb = (seg(X, Y, 0.5, 27.8, 7.0, 25.6, 1.9) | seg(X, Y, 7.0, 25.6, 13.0, 26.6, 1.7)
            | seg(X, Y, 13.0, 26.6, 21.0, 24.4, 1.5) | seg(X, Y, 21.0, 24.4, 27.0, 25.4, 1.2)
            | seg(X, Y, 27.0, 25.4, 31.0, 23.2, 0.9))
    twig = seg(X, Y, 24.0, 25.0, 27.6, 29.4, 0.6) | seg(X, Y, 5.0, 26.0, 3.4, 30.4, 0.7)
    paint(img, limb | twig, c["bark"])
    paint(img, limb & ~np.roll(limb, 1, axis=0), c["bark_light"])          # lit top of the limb
    paint(img, limb & ~np.roll(limb, -1, axis=0), c["bark_dark"])
    leaf1 = np.hypot((X - 28.4) / 1.4, (Y - 30.0) / 0.9) <= 1
    leaf2 = np.hypot((X - 2.6) / 1.0, (Y - 30.8) / 1.3) <= 1
    paint(img, leaf1 | leaf2, c["leaf"])

    # body: a pear shape sitting on the limb, slightly to the left
    cx = 15.0
    body = np.hypot((X - cx) / 5.6, (Y - 19.0) / 6.2) <= 1
    body &= Y <= 25.2
    paint(img, body, c["feather"])
    paint(img, body & (X > cx + 3.0), c["feather_dark"])                   # shaded right side
    # pale barred chest
    chest = np.hypot((X - cx + 0.4) / 3.4, (Y - 20.2) / 4.4) <= 1
    paint(img, chest, c["chest"])
    fx, fy = np.floor(X), np.floor(Y)
    flecks = chest & (((fx + 2 * fy) % 4) == 0) & (Y > 17.0)                # staggered flecks, not bars
    paint(img, flecks, c["chest_bar"])
    # folded wing edge on the right, a few mottles on the left
    paint(img, seg(X, Y, cx + 4.2, 15.6, cx + 4.6, 23.6, 0.7), c["feather_dark"])
    for mx, my in ((cx - 4.2, 16.6), (cx - 4.6, 19.8), (cx - 4.0, 22.8)):
        paint(img, (np.abs(X - mx) < 0.6) & (np.abs(Y - my) < 0.6), c["feather_dark"])
    # talons over the limb
    for tx in (cx - 1.6, cx + 1.4):
        paint(img, (np.abs(X - tx) < 1.1) & (Y > 24.6) & (Y < 26.0), c["talon"])

    # head: broad, with ear tufts and a round facial disc
    head = np.hypot((X - cx) / 5.0, (Y - 10.6) / 4.2) <= 1
    tuft_l = poly(X, Y, [(cx - 4.8, 9.4), (cx - 5.4, 3.6), (cx - 2.4, 7.6)])
    tuft_r = poly(X, Y, [(cx + 2.4, 7.6), (cx + 5.6, 3.6), (cx + 4.8, 9.4)])
    paint(img, head | tuft_l | tuft_r, c["feather"])
    paint(img, (tuft_l | tuft_r | head) & ~np.roll(head | tuft_l | tuft_r, 1, axis=0) & (X < cx + 1), c["feather_light"])
    paint(img, head & (X > cx + 3.4), c["feather_dark"])
    disc = (np.hypot((X - cx + 2.1) / 2.2, (Y - 11.2) / 2.4) <= 1) | (np.hypot((X - cx - 2.1) / 2.2, (Y - 11.2) / 2.4) <= 1)
    paint(img, disc, c["face"])
    from logos import ring_of
    paint(img, ring_of(disc) & head & (Y > 8.6), c["feather_dark"])         # rim of the facial disc
    # big round yellow eyes with black pupils, a dark beak between
    for ex in (cx - 2.1, cx + 2.1):
        eye = np.hypot(X - ex, Y - 10.9) <= 1.5
        paint(img, eye, c["eye"])
        paint(img, (np.abs(X - ex) < 0.55) & (np.abs(Y - 10.9) < 0.55), c["pupil"])
    paint(img, (np.abs(X - cx) < 0.6) & (Y > 8.8) & (Y < 12.0), c["feather_dark"])  # the brow between the eyes
    beak = poly(X, Y, [(cx - 0.8, 12.2), (cx + 0.8, 12.2), (cx, 14.4)])
    paint(img, beak, c["beak"])
    return outlined_outside(img, c["edge"])


LOGO = (owl, {
    "moon": rgba("#f3d58a"), "moon_light": rgba("#fbe9b6"), "moon_dark": rgba("#d9b35e"),
    "bark": rgba("#5a4330"), "bark_light": rgba("#7d6248"), "bark_dark": rgba("#3a2a1d"),
    "leaf": rgba("#c46a24"),
    "feather": rgba("#7a5a3a"), "feather_light": rgba("#a07b52"), "feather_dark": rgba("#4e3825"),
    "chest": rgba("#d8c39b"), "chest_bar": rgba("#8e6c46"),
    "face": rgba("#c08a52"), "eye": rgba("#f4c21c"), "pupil": rgba("#141010"),
    "beak": rgba("#2a2420"), "talon": rgba("#3a3430"),
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

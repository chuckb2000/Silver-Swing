"""Sydney R. Marovitz logo: a Gothic clock tower above Lake Michigan waves, with a
flagstick on a green beside it (course chat, 2026-10-31; the developer gave the
course chats complete permission for logos that night).

Why: the course opened in 1932 as Waveland Golf Course, on land filled in from
Lake Michigan, and the Waveland field house's seven-storey English Gothic
carillon tower (1931; hmdb.org marker 155667) stands at its south end. Every hole
runs parallel to the lake. Original drawing; nothing from the course's or the
Chicago Park District's own branding.

    python3 assets-src/course_logos/marovitz.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def clock_tower(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the green on the right, a low mound the flagstick stands in
    mound = (Y >= 22.6 + 0.10 * (X - 25.0) ** 2 / 2.2) & (Y <= 26.0) & (X >= 17.0) & (X <= 31.0)
    paint(img, mound, c["green"])
    paint(img, mound & ~np.roll(mound, 1, axis=0), c["green_light"])
    paint(img, mound & (X > 28.5), c["green_dark"])

    # the flagstick and a pennant blowing off the lake (to the left: an onshore wind)
    pole = (np.abs(X - 25.5) <= 0.5) & (Y >= 7.0) & (Y <= 23.4)
    paint(img, pole, c["pole"])
    flag = poly(X, Y, [(25.4, 7.0), (25.4, 12.4), (19.8, 9.9)])
    paint(img, flag, c["flag"])
    paint(img, flag & (Y < 9.0), c["flag_light"])
    paint(img, flag & (Y > 11.2), c["flag_dark"])

    # the tower: a square shaft of buff stone, battlements and corner pinnacles on top
    x0, x1, top, bot = 7.0, 15.0, 7.0, 26.0
    shaft = (X >= x0) & (X <= x1) & (Y >= top) & (Y <= bot)
    paint(img, shaft, c["stone"])
    paint(img, shaft & (X < x0 + 1.2), c["stone_light"])            # lit left face
    paint(img, shaft & (X > x1 - 2.0), c["stone_dark"])             # shaded right
    belt = shaft & ((np.abs(Y - 14.6) < 0.5) | (np.abs(Y - 20.6) < 0.5))
    paint(img, belt, c["stone_dark"])                                # string courses
    # battlements: three merlons between two taller corner pinnacles
    crown = ((X >= x0 - 0.6) & (X <= x1 + 0.6) & (Y >= top - 1.0) & (Y < top))
    merl = (Y >= top - 2.0) & (Y < top - 1.0) & (X >= x0 - 0.6) & (X <= x1 + 0.6) & (np.floor(X) % 2 == 0)
    pinn = (Y >= top - 3.0) & (Y < top - 1.0) & ((np.floor(X) == 6) | (np.floor(X) == 14))
    tips = np.zeros_like(pinn)
    paint(img, crown | merl | pinn | tips, c["stone"])
    paint(img, (crown | merl | pinn | tips) & (X > x1 - 1.4), c["stone_dark"])
    paint(img, (pinn | tips) & (X < x0 + 0.2), c["stone_light"])
    # clock face: hour hand at ten, minute hand at twelve
    cx, cy = 11.0, 10.8
    face = np.hypot(X - cx, Y - cy) <= 2.9
    paint(img, face, c["clock_rim"])
    paint(img, np.hypot(X - cx, Y - cy) <= 2.2, c["clock"])
    paint(img, seg(X, Y, cx, cy, cx, cy - 2.0, 0.45) | seg(X, Y, cx, cy, cx - 1.5, cy - 0.6, 0.45), c["hands"])
    # a lancet window and the belfry openings
    lancet = poly(X, Y, [(10.2, 18.8), (10.2, 16.6), (11.0, 15.6), (11.8, 16.6), (11.8, 18.8)])
    paint(img, lancet, c["window"])
    paint(img, (np.abs(X - 11.0) <= 1.1) & (Y >= 22.0) & (Y <= 24.6), c["window"])

    # Lake Michigan along the bottom: teal water with white crests
    wave_top = 25.6 + 0.6 * np.sin(X * 0.9)
    lake = (Y >= wave_top) & (Y <= 30.6) & (np.abs(X - 16) <= 15.0)
    paint(img, lake, c["lake"])
    paint(img, lake & (Y - wave_top < 0.9), c["crest"])
    paint(img, lake & (np.abs(Y - (28.4 + 0.5 * np.sin(X * 0.9 + 2.0))) < 0.45), c["lake_light"])
    paint(img, lake & (Y > 29.8), c["lake_dark"])
    return outlined_outside(img, c["edge"])


LOGO = (clock_tower, {
    "stone": rgba("#d9c69a"), "stone_light": rgba("#f0e2bd"), "stone_dark": rgba("#a99268"),
    "clock": rgba("#f6f2e6"), "clock_rim": rgba("#8a7650"), "hands": rgba("#1d1d24"),
    "window": rgba("#3b4150"),
    "pole": rgba("#eeeeee"), "flag": rgba("#d8432b"), "flag_light": rgba("#f06a45"), "flag_dark": rgba("#a52d1d"),
    "green": rgba("#4f9a3c"), "green_light": rgba("#7cc257"), "green_dark": rgba("#2f6a2c"),
    "lake": rgba("#1f8fa8"), "lake_light": rgba("#5cc3d0"), "lake_dark": rgba("#156a85"), "crest": rgba("#e8f6f6"),
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

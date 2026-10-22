"""RedTail Golf Center logo: a red fox sitting on grass, facing left, its
bushy white-tipped tail curled round its feet (developer, 2026-10-22: "make a
fox logo"). Original drawing; nothing from the course's own branding.

    python3 assets-src/course_logos/redtail.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import math

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def fox(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # grass underfoot
    grass = (Y >= 28.0 - 0.6 * np.sin(X * 1.3) - 0.4 * np.sin(X * 2.9 + 1.0)) & (Y <= 31.0) & (np.abs(X - 16) <= 13.5)
    paint(img, grass, c["grass"])
    paint(img, grass & ~np.roll(grass, 1, axis=0), c["grass_light"])
    paint(img, grass & (Y > 30.0), c["grass_dark"])

    # body: an upright egg, haunch bulging to the right
    a = math.radians(12)
    U = (X - 18.2) * math.cos(a) + (Y - 19.6) * math.sin(a)
    V = -(X - 18.2) * math.sin(a) + (Y - 19.6) * math.cos(a)
    body = (U / 6.4) ** 2 + (V / 8.0) ** 2 <= 1
    haunch = np.hypot(X - 21.0, Y - 23.6) <= 4.6
    body = (body | haunch) & (Y <= 28.4)
    neck = seg(X, Y, 15.6, 15.0, 13.4, 10.6, 3.0)
    paint(img, body | neck, c["red"])
    paint(img, (body | neck) & (X - 0.6 * Y < 5.2), c["red_light"])      # lit upper-left flank
    paint(img, haunch & (np.hypot(X - 23.0, Y - 25.0) <= 2.6), c["red_dark"])  # shaded haunch
    paint(img, body & (X > 23.4), c["red_dark"])
    # white chest down the front
    chest = poly(X, Y, [(11.6, 12.0), (15.4, 13.4), (15.6, 18.0), (14.6, 22.6), (13.0, 21.0), (12.0, 16.4)])
    paint(img, chest & (body | neck | (X > 11.4)), c["white"])
    paint(img, chest & (X > 14.8), c["white_dark"])

    # front legs with black socks
    legs = seg(X, Y, 14.0, 21.0, 13.6, 28.6, 0.9) | seg(X, Y, 16.8, 21.6, 16.8, 28.6, 0.9)
    paint(img, legs, c["red"])
    paint(img, legs & (Y >= 25.0), c["sock"])
    paint(img, seg(X, Y, 13.6, 28.6, 12.2, 28.8, 0.6) | seg(X, Y, 16.8, 28.6, 15.6, 28.8, 0.6), c["sock"])

    # tail: a thick brush from the haunch, along the ground and curling up on the right, white tip
    pts = [(21.0, 27.0), (24.6, 27.6), (27.6, 26.2), (29.2, 23.0), (29.2, 19.2), (27.8, 15.6)]
    radii = [2.2, 2.9, 3.2, 3.1, 2.7, 2.2]
    tail = np.zeros(X.shape, bool)
    for k in range(len(pts) - 1):
        for t in np.linspace(0.0, 1.0, 12):
            cx = pts[k][0] + t * (pts[k + 1][0] - pts[k][0])
            cy = pts[k][1] + t * (pts[k + 1][1] - pts[k][1])
            r = radii[k] + t * (radii[k + 1] - radii[k])
            tail |= np.hypot(X - cx, Y - cy) <= r
    tail &= (Y <= 30.0) & (X <= 31.0)
    tip = tail & (Y < 18.6)
    paint(img, tail, c["red"])
    paint(img, tail & (X < 28.0) & (Y < 26.0) & (X - Y > 3.0), c["red_light"])
    paint(img, tail & ((Y > 28.4) | (X > 30.0)), c["red_dark"])
    paint(img, tail & ~np.roll(tail, -1, axis=1) & (X > 26) & (Y > 18.6), c["red_dark"])
    paint(img, tip, c["white"])
    paint(img, tip & (X > 28.8), c["white_dark"])
    # a dark line where the tail passes in front of the haunch
    paint(img, tail & ~np.roll(tail, 1, axis=0) & body & (Y > 23.0), c["red_dark"])

    # head: a rounded wedge, muzzle pointing left
    skull = np.hypot((X - 13.4) / 1.05, Y - 8.2) <= 3.8
    muzzle = poly(X, Y, [(11.6, 6.6), (4.4, 9.4), (4.6, 10.6), (11.0, 11.6)])
    head = skull | muzzle
    paint(img, head, c["red"])
    paint(img, skull & (X < 13.6) & (Y < 7.6), c["red_light"])
    # white cheek and lower jaw
    cheek = poly(X, Y, [(5.2, 10.2), (11.0, 9.4), (14.6, 10.0), (12.6, 12.4), (9.0, 11.6)])
    paint(img, cheek & (head | neck), c["white"])
    # ears: two pointed triangles with black tips
    ear_l = poly(X, Y, [(10.6, 6.6), (11.4, 1.0), (14.0, 5.2)])
    ear_r = poly(X, Y, [(13.6, 5.0), (16.4, 1.4), (17.0, 7.4)])
    paint(img, ear_l | ear_r, c["red"])
    paint(img, ear_r & (X < 16.0) & (Y > 3.6), c["ear_in"])
    paint(img, (ear_l | ear_r) & (Y < 3.2), c["sock"])
    # eye and nose
    paint(img, (np.abs(X - 11.6) < 0.6) & (np.abs(Y - 7.6) < 0.6), c["eye"])
    paint(img, np.hypot(X - 4.9, Y - 9.8) <= 0.9, c["sock"])
    return outlined_outside(img, c["edge"])


LOGO = (fox, {
    "red": rgba("#d4601e"), "red_light": rgba("#f08a3a"), "red_dark": rgba("#9a3e14"),
    "white": rgba("#f4f0e6"), "white_dark": rgba("#c9c2b2"),
    "sock": rgba("#2a1c18"), "ear_in": rgba("#5a2a1a"), "eye": rgba("#1a1010"),
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

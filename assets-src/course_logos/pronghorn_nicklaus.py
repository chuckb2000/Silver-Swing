"""Pronghorn, Nicklaus course, logo: an old western juniper, its trunk twisted silver-grey
and forked, its ragged blue-green crown wider than tall, rooted in a black basalt outcrop
with a tuft of sage and a golf ball at its foot (course chat, 2026-10-31). Nicklaus routed
the course through an old-growth juniper woodland and round the lava outcrops of the high
desert east of Bend; the resort is now named Juniper Preserve. An original drawing: the
club's own emblem is not used, and no pronghorn (the club's name) is drawn.
`python3 assets-src/logos.py pronghorn_nicklaus` writes
game/public/sprites/logos/pronghorn_nicklaus.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def juniper_on_lava(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    rng = np.random.default_rng(2004)

    # the basalt outcrop: a low, blocky black ledge across the bottom
    rock = poly(X, Y, [(1.5, 30.5), (2.5, 26.2), (6.0, 24.6), (9.5, 25.4), (12.0, 23.6), (17.5, 23.8),
                       (21.0, 25.2), (25.0, 24.4), (28.6, 26.0), (30.5, 30.5)])
    paint(img, rock, c["rock"])
    shade(img, rock, c["rock_light"], c["rock_dark"])
    # a couple of cracks in the rock
    paint(img, seg(X, Y, 8.0, 26.4, 9.2, 29.6, 0.35) | seg(X, Y, 22.6, 26.2, 21.6, 29.4, 0.35), c["rock_dark"])
    # pale pumice-sand ground strip at the very bottom
    paint(img, (Y >= 29.4) & (Y <= 30.6) & (X >= 1.0) & (X <= 31.0), c["sand"])

    # trunk: short, twisted, forked
    trunk = (seg(X, Y, 15.4, 24.6, 15.0, 19.6, 1.3) | seg(X, Y, 15.0, 19.6, 16.4, 15.4, 1.0)
             | seg(X, Y, 15.2, 20.0, 12.0, 15.6, 0.85) | seg(X, Y, 16.2, 16.0, 19.6, 13.2, 0.7))
    paint(img, trunk, c["bark"])
    shade(img, trunk, c["bark_light"], c["bark_dark"])
    # roots gripping the rock
    paint(img, seg(X, Y, 15.2, 24.0, 12.4, 25.2, 0.55) | seg(X, Y, 15.8, 24.0, 18.8, 25.0, 0.55), c["bark_dark"])

    # crown: ragged clumps, broader than tall, flat-topped
    crown = np.zeros((S, S), bool)
    for cx, cy, rx, ry in ((9.4, 13.4, 5.0, 3.6), (15.6, 10.6, 6.0, 4.2), (22.0, 12.4, 5.4, 3.8),
                           (12.4, 9.0, 3.8, 2.8), (19.4, 8.4, 3.8, 2.6), (25.4, 14.6, 3.0, 2.2), (6.2, 15.6, 2.6, 2.0)):
        crown |= ell(X, Y, cx, cy, rx, ry)
    crown &= Y >= 5.6
    # shaggy rim
    rim = crown & ~(np.roll(crown, 1, 0) & np.roll(crown, -1, 0) & np.roll(crown, 1, 1) & np.roll(crown, -1, 1))
    crown &= ~(rim & (rng.random((S, S)) < 0.3))
    paint(img, crown, c["leaf"])
    shade(img, crown, c["leaf_light"], c["leaf_dark"])
    paint(img, crown & (rng.random((S, S)) < 0.12), c["leaf_dark"])
    # blue-grey juniper berries
    for bx, by in ((10.0, 12.0), (17.0, 9.0), (21.0, 13.0), (13.0, 14.0), (24.0, 11.0)):
        paint(img, (np.abs(X - bx) < 0.5) & (np.abs(Y - by) < 0.5), c["berry"])
    # the trunk shows through the bottom of the crown
    paint(img, trunk & (Y >= 13.6), c["bark"])
    shade(img, trunk & (Y >= 13.6), c["bark_light"], c["bark_dark"])

    # a tuft of sage on the rock, right, and a golf ball at the foot, left
    sage = ell(X, Y, 25.6, 23.4, 2.8, 1.8) & (Y <= 24.6)
    paint(img, sage, c["sage"])
    shade(img, sage, c["sage_light"], c["sage_dark"])
    ball = ell(X, Y, 8.6, 23.0, 1.25, 1.25)
    paint(img, ball, c["ball"])
    shade(img, ball, None, c["ball_dark"])
    return outlined(img, c["edge"])


JUNIPER = {
    "rock": rgba("#3a3a3e"), "rock_light": rgba("#5c5c62"), "rock_dark": rgba("#1f1f23"),
    "sand": rgba("#c8b893"),
    "bark": rgba("#8c8174"), "bark_light": rgba("#b7ad9e"), "bark_dark": rgba("#5a5047"),
    "leaf": rgba("#3d5a4b"), "leaf_light": rgba("#5d7e68"), "leaf_dark": rgba("#26392f"),
    "berry": rgba("#8fa3c4"),
    "sage": rgba("#7c8a6e"), "sage_light": rgba("#a3b092"), "sage_dark": rgba("#56624b"),
    "ball": rgba("#f4f3ee"), "ball_dark": rgba("#b9b8b0"),
    "edge": EDGE,
}


LOGO = (juniper_on_lava, JUNIPER)

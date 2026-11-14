"""Aldarra logo: a shed elk antler standing in a mound of moss and sword fern, a golf ball
beside it (course chat, 2026-11-13). Roosevelt elk winter on the Snoqualmie valley floor
below the plateau, and bulls drop their antlers in the woods round the course in spring.
An original drawing: the club's own marks are not used.
`python3 assets-src/logos.py aldarra` writes game/public/sprites/logos/aldarra.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def antler(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # moss mound with two fern fronds
    moss = ell(X, Y, 16.0, 28.6, 12.6, 3.2) & (Y <= 30.8)
    paint(img, moss, c["moss"])
    shade(img, moss, c["moss_light"], c["moss_dark"])
    for (x0, y0, x1, y1) in ((7.0, 27.4, 3.6, 23.6), (24.6, 27.2, 28.6, 23.2)):
        frond = seg(X, Y, x0, y0, x1, y1, 0.45)
        for k in range(1, 5):
            fx, fy = x0 + (x1 - x0) * k / 5, y0 + (y1 - y0) * k / 5
            frond |= seg(X, Y, fx, fy, fx - 1.2, fy - 0.2, 0.3) | seg(X, Y, fx, fy, fx + 0.2, fy - 1.2, 0.3)
        paint(img, frond, c["fern"])

    # the antler: a main beam curving up and back, with tines forward
    beam = (seg(X, Y, 13.0, 27.0, 12.0, 20.0, 1.25) | seg(X, Y, 12.0, 20.0, 13.4, 12.0, 1.1)
            | seg(X, Y, 13.4, 12.0, 17.2, 5.0, 0.95) | seg(X, Y, 17.2, 5.0, 20.6, 2.4, 0.8))
    tines = (seg(X, Y, 12.6, 23.4, 18.6, 21.6, 0.8) | seg(X, Y, 12.2, 19.0, 19.6, 16.0, 0.8)
             | seg(X, Y, 13.2, 13.0, 20.2, 10.4, 0.75) | seg(X, Y, 15.8, 7.4, 21.4, 6.4, 0.7))
    ant = beam | tines
    paint(img, ant, c["bone"])
    shade(img, ant, c["bone_light"], c["bone_dark"])
    # the burr at the base and pale tips
    paint(img, ell(X, Y, 13.0, 26.8, 2.0, 1.1), c["burr"])
    for tx, ty in ((18.6, 21.6), (19.6, 16.0), (20.2, 10.4), (21.4, 6.4), (20.6, 2.4)):
        paint(img, ell(X, Y, tx, ty, 0.8, 0.8) & ant, c["tip"])

    ball = ell(X, Y, 21.4, 26.4, 1.25, 1.25)
    paint(img, ball, c["ball"])
    shade(img, ball, None, c["ball_dark"])
    return outlined(img, c["edge"])


LOGO = (antler, {
    "moss": rgba("#4a7a34"), "moss_light": rgba("#6fa04a"), "moss_dark": rgba("#2c4f22"),
    "fern": rgba("#2f6a2a"),
    "bone": rgba("#b8a07a"), "bone_light": rgba("#dcc8a0"), "bone_dark": rgba("#7e6646"),
    "burr": rgba("#6a5236"), "tip": rgba("#f2ead6"),
    "ball": rgba("#f4f3ee"), "ball_dark": rgba("#b9b8b0"),
    "edge": EDGE,
})

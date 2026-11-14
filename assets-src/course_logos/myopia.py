"""Myopia Hunt Club logo: a brass hunting horn with a red hunt cord, lying in the tawny
fescue of Leeds' fields, for the fox-hunting club the course was laid out at. An original
drawing; the club's own marks are not used. `python3 assets-src/logos.py myopia` writes
game/public/sprites/logos/myopia.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def hunting_horn(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # a tuft of fescue under the horn
    tuft = ((X - 16.0) / 14.5) ** 2 + ((Y - 25.0) / 5.0) ** 2 <= 1.0
    paint(img, tuft, c["fescue"])
    paint(img, tuft & (Y > 27.5), c["fescue_dark"])
    for bx in (5.0, 9.0, 14.0, 19.0, 23.0, 27.0):
        paint(img, tuft & (np.abs(X - bx - (Y - 24.0) * 0.4) < 0.5) & (Y < 26.5), c["fescue_light"])
    # the horn: a long tapering brass tube, mouthpiece left, flared bell right
    tube = poly(X, Y, [(2.0, 15.6), (19.0, 13.4), (19.0, 16.6), (2.0, 17.4)])
    bell = poly(X, Y, [(18.0, 13.6), (26.0, 9.0), (29.5, 9.0), (30.5, 15.0), (29.5, 21.0), (26.0, 21.0), (18.0, 16.4)])
    paint(img, tube | bell, c["brass"])
    shade(img, tube | bell, c["brass_light"], c["brass_dark"])
    paint(img, (X > 28.6) & bell, c["brass_dark"])
    paint(img, poly(X, Y, [(29.4, 10.4), (30.2, 15.0), (29.4, 19.6), (28.8, 15.0)]), c["bell_inside"])
    paint(img, poly(X, Y, [(0.6, 15.0), (2.6, 15.4), (2.6, 17.6), (0.6, 18.0)]), c["brass_dark"])
    # bands and the red cord with a tassel
    for bx in (9.0, 16.5):
        paint(img, (tube | bell) & (np.abs(X - bx) < 0.6), c["brass_dark"])
    paint(img, seg(X, Y, 9.0, 17.2, 12.5, 22.0, 0.55), c["cord"])
    paint(img, seg(X, Y, 12.5, 22.0, 16.5, 16.8, 0.55), c["cord"])
    paint(img, poly(X, Y, [(11.2, 21.6), (13.8, 21.6), (14.6, 25.0), (10.4, 25.0)]), c["cord"])
    paint(img, poly(X, Y, [(11.2, 21.6), (12.4, 21.6), (11.6, 25.0), (10.4, 25.0)]), c["cord_dark"])
    return outlined(img, c["edge"])


LOGO = (hunting_horn, {
    "fescue": rgba("#9a8d4a"), "fescue_dark": rgba("#6b6a36"), "fescue_light": rgba("#b8a65a"),
    "brass": rgba("#c9962e"), "brass_light": rgba("#f0cf6a"), "brass_dark": rgba("#7e5a1a"),
    "bell_inside": rgba("#5a3e12"),
    "cord": rgba("#c23a2e"), "cord_dark": rgba("#8a2420"),
    "edge": EDGE,
})

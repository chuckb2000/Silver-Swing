"""Heron Lakes Golf Club logo: a clump of cattails and a water lily in a pond, the wetland
of West Delta Park the two courses are cut from. An original drawing; the club's own marks
are not used. `python3 assets-src/logos.py heron_lakes` writes
game/public/sprites/logos/heron_lakes.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def cattails(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the pond
    pond = ((X - 16.0) / 15.0) ** 2 + ((Y - 26.5) / 4.0) ** 2 <= 1.0
    paint(img, pond, c["water"])
    paint(img, pond & (Y > 27.5), c["water_dark"])
    paint(img, pond & (np.abs(Y - 25.5) < 0.5) & (np.abs(X - 26.0) < 2.0), c["water_light"])
    # reeds: long blades leaning out
    for x0, x1, top in ((9.0, 5.0, 6.0), (11.0, 10.0, 3.0), (13.0, 15.5, 5.0), (15.0, 19.0, 8.0), (10.0, 13.0, 9.0), (7.5, 3.5, 12.0)):
        paint(img, seg(X, Y, x0, 26.0, x1, top, 0.55), c["reed"])
    # cattail stems and heads
    for sx, hx, top in ((8.5, 7.0, 4.0), (12.0, 12.5, 2.0), (16.0, 17.5, 6.0)):
        paint(img, seg(X, Y, sx, 26.0, hx, top + 5.5, 0.45), c["stem"])
        head = ((X - hx) / 1.3) ** 2 + ((Y - (top + 3.0)) / 3.0) ** 2 <= 1.0
        paint(img, head, c["head"])
        paint(img, head & (X < hx - 0.3), c["head_light"])
        paint(img, seg(X, Y, hx, top - 1.5, hx, top, 0.3), c["stem"])
    # a lily pad with a flower
    pad = ((X - 23.5) / 5.0) ** 2 + ((Y - 25.5) / 2.0) ** 2 <= 1.0
    pad &= ~(poly(X, Y, [(23.5, 25.5), (28.6, 24.6), (28.6, 26.4)]))
    paint(img, pad, c["pad"])
    paint(img, pad & (Y < 25.0), c["pad_light"])
    flower = poly(X, Y, [(20.0, 24.5), (21.0, 20.5), (22.2, 23.0), (23.5, 19.5), (24.8, 23.0), (26.0, 20.5), (27.0, 24.5)])
    paint(img, flower, c["petal"])
    paint(img, flower & (Y > 23.0), c["petal_dark"])
    paint(img, (np.abs(X - 23.5) < 1.0) & (np.abs(Y - 23.4) < 0.8), c["centre"])
    return outlined(img, c["edge"])


LOGO = (cattails, {
    "water": rgba("#4f7a74"), "water_dark": rgba("#3c605b"), "water_light": rgba("#9cc4bb"),
    "reed": rgba("#5f8f3a"), "stem": rgba("#4a6e2c"),
    "head": rgba("#6b4024"), "head_light": rgba("#8f5a34"),
    "pad": rgba("#3f7a3a"), "pad_light": rgba("#5f9a4a"),
    "petal": rgba("#f4eef0"), "petal_dark": rgba("#e8b7c8"), "centre": rgba("#f0c23a"),
    "edge": EDGE,
})

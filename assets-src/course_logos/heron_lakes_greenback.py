"""Heron Lakes, Greenback course logo: a green heron, the small dark heron of the ponds,
hunched on a snag over the water with its chestnut neck and dark green back (the course
takes its name from it). An original drawing; the club's own marks are not used.
`python3 assets-src/logos.py heron_lakes_greenback`.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def green_heron(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # water and the snag the bird perches on
    water = (Y >= 24.0) & (Y <= 30.5) & (X >= 1.5) & (X <= 30.5)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 27.5), c["water_dark"])
    paint(img, water & (np.abs(Y - 26.0) < 0.5) & (np.abs(X - 7) < 2.5), c["water_light"])
    snag = seg(X, Y, 3.0, 22.5, 29.0, 20.5, 1.0) | seg(X, Y, 22.0, 21.0, 26.0, 26.0, 0.8)
    paint(img, snag, c["wood"])
    paint(img, snag & (Y < 21.0), c["wood_light"])
    # body: a squat, hunched bird, back dark green, belly grey
    body = poly(X, Y, [(9.0, 13.0), (15.5, 9.5), (24.5, 11.5), (27.0, 15.5), (19.0, 20.5), (12.0, 19.5)])
    paint(img, body, c["back"])
    shade(img, body, c["back_light"], c["back_dark"])
    paint(img, body & (Y > 17.0) & (X < 20.0), c["belly"])
    # wing feather edges
    for k in range(3):
        paint(img, body & (np.abs((Y - 11.5) - 0.35 * (X - 16) - 2.0 * k) < 0.45) & (X > 15) & (X < 25), c["back_light"])
    # chestnut neck and dark cap, head forward-left, long bill
    neck = ((X - 9.5) / 2.6) ** 2 + ((Y - 13.5) / 3.2) ** 2 <= 1
    paint(img, neck, c["chestnut"])
    paint(img, neck & (X > 9.5) & (Y > 14.5), c["white"])
    head = ((X - 8.0) / 2.6) ** 2 + ((Y - 9.0) / 2.2) ** 2 <= 1
    paint(img, head, c["chestnut"])
    paint(img, head & (Y < 8.6), c["cap"])
    paint(img, poly(X, Y, [(5.8, 8.8), (0.8, 10.2), (5.8, 10.0)]), c["bill"])
    paint(img, (np.abs(X - 7.3) < 0.5) & (np.abs(Y - 8.9) < 0.5), c["eye"])
    # yellow-orange legs gripping the snag
    paint(img, seg(X, Y, 15.0, 19.5, 14.0, 22.0, 0.5), c["leg"])
    paint(img, seg(X, Y, 18.0, 20.0, 18.5, 22.0, 0.5), c["leg"])
    return outlined(img, c["edge"])


LOGO = (green_heron, {
    "back": rgba("#3f6a4a"), "back_light": rgba("#5f8f63"), "back_dark": rgba("#284634"),
    "belly": rgba("#8c929a"), "chestnut": rgba("#8a3f2a"), "cap": rgba("#1f3027"), "white": rgba("#ece7da"),
    "bill": rgba("#2c2c30"), "eye": rgba("#f0c23a"), "leg": rgba("#e0a030"),
    "wood": rgba("#6b4a32"), "wood_light": rgba("#8f6a48"),
    "water": rgba("#4f7a74"), "water_dark": rgba("#3c605b"), "water_light": rgba("#9cc4bb"),
    "edge": EDGE,
})

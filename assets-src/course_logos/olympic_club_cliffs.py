"""The Olympic Club Cliffs logo: a par-3 green on a bluff above the Pacific, its flag in
the sea wind, surf at the foot of the cliff. An original drawing.
`python3 assets-src/logos.py olympic_club_cliffs` writes
game/public/sprites/logos/olympic_club_cliffs.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def bluff(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the sea round the foot of the bluff
    sea = ((X - 16.0) / 15.0) ** 2 + ((Y - 27.0) / 3.8) ** 2 <= 1.0
    paint(img, sea, c["sea"])
    paint(img, sea & (Y > 28.0), c["sea_dark"])
    for wx, wy in ((4.0, 26.5), (9.0, 28.5), (26.5, 28.0)):
        paint(img, sea & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["sea_light"])
    # the bluff: a rock stack with a flat grassy top
    cliff = poly(X, Y, [(5.0, 27.0), (7.0, 22.5), (5.5, 18.0), (7.5, 14.5), (6.8, 12.0), (12.0, 11.0), (20.0, 11.2), (25.5, 11.5), (24.5, 14.0), (26.8, 17.5), (25.0, 21.0), (27.5, 24.0), (27.0, 27.0)])
    paint(img, cliff, c["rock"])
    shade(img, cliff, c["rock_light"], c["rock_dark"])
    for x0, y0, x1, y1 in ((12.0, 13.0, 10.5, 20.0), (17.5, 14.0, 19.0, 22.0), (22.0, 16.0, 21.0, 25.0), (9.0, 21.0, 8.0, 26.0)):
        paint(img, cliff & seg(X, Y, x0, y0, x1, y1, 0.45), c["rock_dark"])
    top = poly(X, Y, [(7.4, 12.6), (8.6, 9.4), (23.4, 9.0), (24.8, 12.6)])
    paint(img, top, c["grass"])
    green = ((X - 17.5) / 4.6) ** 2 + ((Y - 10.6) / 1.2) ** 2 <= 1.0
    paint(img, green, c["green"])
    paint(img, ((X - 10.5) / 1.8) ** 2 + ((Y - 11.0) / 0.8) ** 2 <= 1.0, c["sand"])
    # surf at the foot
    paint(img, sea & (Y < 26.5) & ((X < 8.5) | (X > 24.5)) & ((X + Y) % 3 < 1.5), c["foam"])
    # the flag, streaming in the wind
    paint(img, (X >= 18.0) & (X < 19.0) & (Y >= 1.5) & (Y < 10.8), c["pole"])
    paint(img, poly(X, Y, [(19.0, 1.5), (24.0, 2.8), (19.0, 4.2)]), c["flag"])
    return outlined(img, c["edge"])


LOGO = (bluff, {
    "sea": rgba("#2c5d7c"), "sea_dark": rgba("#1f4560"), "sea_light": rgba("#6e98b0"), "foam": rgba("#f5f6f3"),
    "rock": rgba("#ab9f88"), "rock_light": rgba("#d4cab4"), "rock_dark": rgba("#7a6f5d"),
    "grass": rgba("#357a43"), "green": rgba("#72bf6d"), "sand": rgba("#efe8d6"),
    "pole": rgba("#f2efe6"), "flag": rgba("#b8322a"),
    "edge": EDGE,
})

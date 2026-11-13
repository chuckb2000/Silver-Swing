"""Capilano Golf and Country Club logo: the Lions, the twin granite peaks on the North Shore
skyline above West Vancouver, snow on their summits, over a dark band of Douglas firs (the
course is cut through the rainforest on the mountain's lower slope). An original drawing;
the club's own marks are not used. `python3 assets-src/logos.py capilano` writes
game/public/sprites/logos/capilano.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def lions(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # sky disc behind the peaks
    disc = (X - 16) ** 2 + (Y - 16) ** 2 <= 14.5 ** 2
    paint(img, disc, c["sky"])
    paint(img, disc & (Y > 15), c["sky_low"])

    # the ridge and the two Lions: west peak taller, east peak a little lower
    ridge = poly(X, Y, [(1.5, 22.0), (6.0, 17.5), (9.0, 14.0), (11.0, 6.0), (12.6, 4.5), (14.0, 9.5),
                        (16.0, 13.0), (18.0, 11.0), (20.0, 7.5), (21.4, 6.8), (23.0, 11.5), (26.0, 15.0), (30.5, 21.0), (30.5, 24.0), (1.5, 24.0)])
    paint(img, ridge & disc, c["rock"])
    shade(img, ridge & disc, c["rock_light"], c["rock_dark"])
    # snow on the summits and in the gullies
    snow = ridge & disc & ((Y < 9.5 + 0.25 * np.abs(X - 12.6)) & (np.abs(X - 12.6) < 3.0) | (Y < 10.0 + 0.25 * np.abs(X - 21.4)) & (np.abs(X - 21.4) < 2.8))
    paint(img, snow, c["snow"])
    paint(img, snow & (X > 12.8) & (X < 21), c["snow_shade"])
    paint(img, ridge & disc & (np.abs(X - 9.8) < 0.5) & (Y > 13) & (Y < 17), c["snow_shade"])
    paint(img, ridge & disc & (np.abs(X - 24.0) < 0.5) & (Y > 13) & (Y < 16), c["snow_shade"])

    # a tree line of firs across the bottom of the disc: a sawtooth of crowns, taller in the middle
    period = 4.0
    tooth = np.abs(((X + 1.0) % period) - period / 2) * 2.2
    top = 19.5 + tooth + 0.05 * (X - 16) ** 2 * 0.35
    forest = disc & (Y >= top)
    paint(img, forest, c["fir"])
    paint(img, forest & (Y > 26.5), c["fir_dark"])
    paint(img, forest & (Y < top + 1.0) & (((X + 1.0) % period) < period / 2), c["fir_light"])
    # the rim of the disc
    rim = disc & ~((X - 16) ** 2 + (Y - 16) ** 2 <= 13.5 ** 2)
    paint(img, rim, c["rim"])

    return outlined(img, c["edge"])


LOGO = (lions, {
    "sky": rgba("#7fb3d8"), "sky_low": rgba("#a8cde6"),
    "rock": rgba("#6d7684"), "rock_light": rgba("#929bab"), "rock_dark": rgba("#4c5360"),
    "snow": rgba("#f7f9fb"), "snow_shade": rgba("#cfdbe6"),
    "fir": rgba("#1f4a37"), "fir_dark": rgba("#14332a"), "fir_light": rgba("#2f6650"),
    "rim": rgba("#1b3b2c"), "edge": EDGE,
})

"""Capilano Golf and Country Club logo: the Lions, the twin granite peaks on the North Shore
skyline above West Vancouver, snow on their summits, rising from a mound of Douglas firs
(the course is cut through the rainforest on the mountain's lower slope). An original
drawing; the club's own marks are not used. `python3 assets-src/logos.py capilano` writes
game/public/sprites/logos/capilano.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def lions(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the two peaks: the west Lion taller, the east one squatter, a notch between
    west = poly(X, Y, [(2.0, 24.0), (7.5, 11.0), (9.5, 4.0), (12.0, 3.0), (13.5, 7.0), (16.0, 13.0), (17.5, 24.0)])
    east = poly(X, Y, [(14.0, 24.0), (18.0, 13.5), (20.5, 8.0), (23.0, 6.5), (25.0, 9.5), (28.5, 16.0), (30.5, 24.0)])
    rock = west | east
    paint(img, rock, c["rock"])
    shade(img, rock, c["rock_light"], c["rock_dark"])
    paint(img, west & (X > 11.5) & (Y > 6.0), c["rock_dark"])
    paint(img, east & (X > 23.0) & (Y > 9.0), c["rock_dark"])
    # snow caps and gullies
    paint(img, west & (Y < 9.5) | west & (Y < 13.0) & (np.abs(X - 9.0) < 1.0), c["snow"])
    paint(img, east & (Y < 11.5) | east & (Y < 15.0) & (np.abs(X - 21.5) < 0.8), c["snow"])
    paint(img, rock & (Y < 13.0) & (X > 12.0) & (X < 13.5), c["snow_shade"])
    # a mound of firs across the foot
    for fx, top in ((2.5, 17.0), (6.0, 15.0), (9.5, 17.5), (13.0, 15.5), (16.5, 17.0), (20.0, 15.0), (23.5, 17.0), (27.0, 15.5), (30.0, 18.0)):
        fir = poly(X, Y, [(fx - 3.2, 25.0), (fx, top), (fx + 3.2, 25.0)])
        paint(img, fir, c["fir"])
        paint(img, fir & (X < fx - 0.3), c["fir_light"])
    base = ((X - 16.0) / 15.0) ** 2 + ((Y - 26.0) / 3.6) ** 2 <= 1.0
    paint(img, base, c["fir_dark"])
    paint(img, base & (Y < 25.0), c["fir"])
    return outlined(img, c["edge"])


LOGO = (lions, {
    "rock": rgba("#6d7684"), "rock_light": rgba("#929bab"), "rock_dark": rgba("#4c5360"),
    "snow": rgba("#f7f9fb"), "snow_shade": rgba("#cfdbe6"),
    "fir": rgba("#1f4a37"), "fir_dark": rgba("#14332a"), "fir_light": rgba("#2f6650"),
    "edge": EDGE,
})

"""Lofoten Links logo concepts (course chat, 2026-11-13; the developer picks one):

  midnight_sun  the midnight sun on the horizon behind Hoven, the lone peak over the course,
                with the sea in front
  hjell         a stockfish drying rack (hjell): a timber A-frame hung with cod, the
                islands' oldest trade
  sea_eagle     a white-tailed sea eagle in flight over a wave

Original drawings; the club's own mark is not used. `python3 assets-src/logos.py lofoten`
writes game/public/sprites/logos/lofoten.png from LOGO.
"""
import math

import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def _waves(img, X, Y, c, y0=26.0):
    """A strip of sea along the bottom, as the other coastal logos stand on."""
    sea = (Y >= y0 + 0.8 * np.sin(X * 0.9)) & (Y <= 30.5) & (X >= 0.5) & (X <= 31.5)
    paint(img, sea, c["sea"])
    paint(img, sea & (Y >= y0 + 2.4), c["sea_dark"])
    paint(img, sea & (Y < y0 + 0.9 + 0.8 * np.sin(X * 0.9)), c["foam"])
    return sea


def midnight_sun(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    sun = (X - 21.0) ** 2 + (Y - 17.5) ** 2 <= 6.3 ** 2
    paint(img, sun, c["sun"])
    paint(img, sun & ((X - 19.3) ** 2 + (Y - 15.6) ** 2 <= 2.4 ** 2), c["sun_light"])
    paint(img, sun & (Y > 20.5), c["sun_low"])
    hoven = poly(X, Y, [(1.0, 27.0), (5.5, 16.0), (8.5, 9.0), (10.5, 6.5), (13.0, 9.5), (16.5, 16.5), (21.0, 27.0)])
    paint(img, hoven, c["rock"])
    paint(img, hoven & poly(X, Y, [(1.0, 27.0), (5.5, 16.0), (8.5, 9.0), (10.5, 6.5), (10.0, 27.0)]), c["rock_light"])
    paint(img, poly(X, Y, [(8.3, 9.6), (10.5, 6.5), (12.8, 9.6), (11.4, 10.6), (10.4, 9.4), (9.4, 10.8)]), c["snow"])
    paint(img, hoven & (Y > 23.5), c["heather"])
    sea = _waves(img, X, Y, c)
    glint = sea & (np.abs(X - 21.0) < 4.0 - 0.6 * (Y - 26.0)) & ((Y.astype(int) % 2) == 0) & (Y < 29.5)
    paint(img, glint, c["sun"])
    return outlined(img, c["edge"])


def hjell(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    def beam(x1, y1, x2, y2, w):
        dx, dy = x2 - x1, y2 - y1
        t = np.clip(((X - x1) * dx + (Y - y1) * dy) / (dx * dx + dy * dy), 0, 1)
        return (X - x1 - t * dx) ** 2 + (Y - y1 - t * dy) ** 2 <= w * w
    ground = (Y >= 27.0) & (Y <= 30.5) & (X >= 1.0) & (X <= 31.0)
    paint(img, ground, c["ground"])
    paint(img, ground & (Y < 27.9), c["ground_light"])
    wood = np.zeros((S, S), bool)
    for x in (5.0, 27.0):
        wood |= beam(x - 3.2, 27.5, x, 5.5, 0.85) | beam(x + 3.2, 27.5, x, 5.5, 0.85)
    rail = beam(2.0, 6.0, 30.0, 6.0, 0.9) | beam(3.5, 11.0, 28.5, 11.0, 0.7)
    paint(img, wood | rail, c["wood"])
    paint(img, rail & (Y < 6.0), c["wood_light"])
    for row_y, xs in ((6.8, (9.0, 12.6, 16.2, 19.8, 23.4)), (11.7, (10.8, 14.4, 18.0, 21.6))):
        for fx in xs:
            body = ((X - fx) / 1.2) ** 2 + ((Y - (row_y + 4.3)) / 3.5) ** 2 <= 1
            tail = poly(X, Y, [(fx - 1.4, row_y), (fx + 1.4, row_y), (fx, row_y + 1.5)])
            fish = body | tail
            paint(img, fish, c["fish"])
            paint(img, fish & (X < fx - 0.2), c["fish_light"])
            paint(img, body & (Y > row_y + 6.6), c["fish_dark"])
    return outlined(img, c["edge"])


def sea_eagle(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    _waves(img, X, Y, c, y0=26.5)
    wing = poly(X, Y, [(1.0, 9.0), (7.0, 6.5), (13.5, 10.5), (18.5, 10.5), (25.0, 6.5), (31.0, 9.0),
                        (29.0, 11.2), (30.5, 12.4), (27.5, 12.8), (28.5, 14.2), (23.0, 13.6), (18.5, 15.5),
                        (13.5, 15.5), (9.0, 13.6), (3.5, 14.2), (4.5, 12.8), (1.5, 12.4), (3.0, 11.2)])
    body = ((X - 16) / 2.5) ** 2 + ((Y - 14.5) / 4.8) ** 2 <= 1
    tail = poly(X, Y, [(14.0, 18.0), (18.0, 18.0), (19.0, 22.5), (13.0, 22.5)])
    head = ((X - 16) / 1.9) ** 2 + ((Y - 9.3) / 2.1) ** 2 <= 1
    beak = poly(X, Y, [(15.0, 7.4), (17.0, 7.4), (16.0, 5.3)])
    paint(img, wing | body, c["brown"])
    paint(img, wing & (Y < 10.0), c["brown_light"])
    paint(img, wing & ((X < 5.5) | (X > 26.5)), c["brown_dark"])
    paint(img, tail, c["white"])
    paint(img, tail & (X > 16.8), c["white_dark"])
    paint(img, head, c["head"])
    paint(img, beak, c["beak"])
    paint(img, (np.abs(X - 16.9) < 0.5) & (np.abs(Y - 8.8) < 0.5), c["edge"])
    return outlined(img, c["edge"])


SEA = {"sea": rgba("#2b6f95"), "sea_dark": rgba("#1d4f6d"), "foam": rgba("#e7f2f6")}
SUN_COLOURS = {"sun": rgba("#f6a23c"), "sun_light": rgba("#ffd77a"), "sun_low": rgba("#e0703a"),
               "rock": rgba("#4a4f58"), "rock_light": rgba("#6c727c"), "snow": rgba("#eef1f4"),
               "heather": rgba("#6b4a5a"), **SEA, "edge": EDGE}
HJELL_COLOURS = {"ground": rgba("#6f8a4a"), "ground_light": rgba("#8ea65e"),
                 "wood": rgba("#6b4a2f"), "wood_light": rgba("#91683f"), "fish": rgba("#c9b48d"),
                 "fish_light": rgba("#e6d7b4"), "fish_dark": rgba("#9c8661"), "edge": EDGE}
EAGLE_COLOURS = {"brown": rgba("#5a3d26"), "brown_light": rgba("#7c5838"), "brown_dark": rgba("#3b281a"),
                 "white": rgba("#f4f2ea"), "white_dark": rgba("#cfcabd"), "head": rgba("#d9cfb4"),
                 "beak": rgba("#f0c22c"), **SEA, "edge": EDGE}

CONCEPTS = {"midnight_sun": (midnight_sun, SUN_COLOURS), "hjell": (hjell, HJELL_COLOURS),
            "sea_eagle": (sea_eagle, EAGLE_COLOURS)}
LOGO = CONCEPTS["sea_eagle"]   # the developer's pick, 2026-11-13 ("let's do the bird")

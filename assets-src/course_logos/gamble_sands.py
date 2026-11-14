"""Gamble Sands logo: a red apple with its stalk and one leaf, resting on a small mound of
pale sand with a tuft of sagebrush (course chat, 2026-11-13). The course was built on
sand hills above the Columbia that belong to an orchard family, with apple orchards on the
terraces below; the sand is what the course is named for. An original drawing: the club's
own marks are not used. `python3 assets-src/logos.py gamble_sands` writes
game/public/sprites/logos/gamble_sands.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def apple_on_sand(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    rng = np.random.default_rng(2014)

    # the sand mound: a low dune across the bottom, ripples on its face
    mound = poly(X, Y, [(2.0, 30.6), (5.0, 27.2), (10.0, 25.0), (16.0, 24.2), (22.0, 25.0),
                        (27.0, 27.0), (30.0, 30.6)])
    paint(img, mound, c["sand"])
    shade(img, mound, c["sand_light"], c["sand_dark"])
    for y0 in (27.6, 29.4):
        paint(img, mound & (np.abs(Y - y0 - 0.25 * np.sin(X * 0.9)) < 0.32) & (X > 6) & (X < 26), c["sand_dark"])

    # the apple: two lobes on top, a dimple at the stalk, rounder below
    body = ell(X, Y, 16.0, 17.0, 8.6, 8.2) | ell(X, Y, 12.6, 13.0, 4.6, 4.4) | ell(X, Y, 19.4, 13.0, 4.6, 4.4)
    body &= ~ell(X, Y, 16.0, 7.6, 1.8, 1.6)
    body &= Y <= 25.2
    paint(img, body, c["red"])
    shade(img, body, c["red_light"], c["red_dark"])
    # streaks of yellow-red down the skin, and the shine
    streak = body & (rng.random((S, S)) < 0.08) & (X > 11) & (X < 22)
    paint(img, streak, c["red_dark"])
    paint(img, ell(X, Y, 11.4, 13.6, 1.4, 2.4) & body, c["shine"])
    paint(img, ell(X, Y, 12.2, 17.6, 0.6, 0.9) & body, c["shine"])
    # where it sits on the sand: a darker line under it
    paint(img, ell(X, Y, 16.0, 25.0, 6.0, 0.8) & ~body & mound, c["sand_dark"])

    # stalk and leaf
    stalk = seg(X, Y, 16.0, 9.2, 17.2, 4.4, 0.55)
    paint(img, stalk, c["stalk"])
    leaf = poly(X, Y, [(17.4, 5.6), (19.8, 3.4), (23.6, 3.0), (22.0, 5.8), (18.8, 6.8)])
    paint(img, leaf, c["leaf"])
    shade(img, leaf, c["leaf_light"], c["leaf_dark"])
    paint(img, seg(X, Y, 17.8, 5.8, 22.4, 3.6, 0.3), c["leaf_dark"])

    # a tuft of sage on the mound, right, and a golf ball, left
    sage = (ell(X, Y, 26.4, 25.4, 2.6, 1.9) | ell(X, Y, 24.6, 26.2, 1.6, 1.3)) & (Y <= 27.0)
    paint(img, sage, c["sage"])
    shade(img, sage, c["sage_light"], c["sage_dark"])
    ball = ell(X, Y, 5.8, 26.0, 1.25, 1.25)
    paint(img, ball, c["ball"])
    shade(img, ball, None, c["ball_dark"])
    return outlined(img, c["edge"])


LOGO = (apple_on_sand, {
    "sand": rgba("#ddcfa6"), "sand_light": rgba("#f1e8cc"), "sand_dark": rgba("#b4a37a"),
    "red": rgba("#c2302a"), "red_light": rgba("#e0584a"), "red_dark": rgba("#86201f"),
    "shine": rgba("#f6c9b8"),
    "stalk": rgba("#5a3a22"),
    "leaf": rgba("#4f8a34"), "leaf_light": rgba("#79b14e"), "leaf_dark": rgba("#2f5a22"),
    "sage": rgba("#7d8a70"), "sage_light": rgba("#a7b396"), "sage_dark": rgba("#56624b"),
    "ball": rgba("#f4f3ee"), "ball_dark": rgba("#b9b8b0"),
    "edge": EDGE,
})

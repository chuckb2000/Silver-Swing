"""Pasatiempo logo: a little wooden footbridge across a barranca, the golden-grass
ravine that cuts across the back nine (the bridges after the 10th and 18th tee shots),
with a Monterey pine on the near bank and a flag on the green beyond. An original
drawing from the scouting's logo idea and the course's setting; nothing of the club's
own emblem. `python3 assets-src/logos.py pasatiempo` writes
game/public/sprites/logos/pasatiempo.png (assets-src/course_logos/README.md)."""
import numpy as np
from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def barranca(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the ground: a lens of hillside cut by a V-shaped ravine
    land = ell(X, Y, 16.0, 21.0, 15.6, 10.6) & (Y >= 15.5 + 0.06 * (X - 16) ** 2 * 0.15)
    ravine = poly(X, Y, [(9.5, 17.2), (22.8, 16.2), (18.0, 29.5), (14.6, 29.5)])
    bank = land & ~ravine
    paint(img, bank, c["grass"])
    paint(img, bank & (Y > 22.5), c["grass_dark"])
    paint(img, bank & ~np.roll(bank, 1, axis=0), c["grass_light"])           # lit bank tops
    paint(img, bank & (((X * 1.3 + Y * 0.7) % 5.0) < 0.8) & (Y > 19), c["brush"])  # brush on the banks
    inner = land & ravine
    paint(img, inner, c["ravine"])
    paint(img, inner & (X > 16.3), c["ravine_dark"])                          # far wall in shade
    creek = inner & (Y > 26.0) & (np.abs(X - 16.4) < 1.4)
    paint(img, creek, c["water"])
    # mown grass on the far bank: the green, a fringe ring
    green = ell(X, Y, 26.0, 17.2, 4.4, 1.7)
    paint(img, green & land, c["green"])
    paint(img, green & land & (X < 24.5), c["green_light"])
    # Monterey pine on the near bank
    trunk = seg(X, Y, 5.6, 17.5, 6.4, 10.5, 0.75)
    paint(img, trunk, c["bark"])
    crown = ell(X, Y, 6.2, 8.2, 5.4, 3.0) | ell(X, Y, 3.6, 9.6, 2.6, 1.8) | ell(X, Y, 9.2, 9.0, 2.6, 1.9)
    crown &= Y > 4.6
    paint(img, crown, c["pine"])
    paint(img, crown & (Y < 7.4) & (X < 8.5), c["pine_light"])
    paint(img, crown & (Y > 9.6), c["pine_dark"])
    # the footbridge: an arched deck with a rail and posts
    deck = seg(X, Y, 9.0, 17.0, 15.8, 15.0, 0.6) | seg(X, Y, 15.8, 15.0, 23.0, 16.4, 0.6)
    rail = seg(X, Y, 9.5, 13.8, 15.8, 11.8, 0.45) | seg(X, Y, 15.8, 11.8, 22.5, 13.2, 0.45)
    posts = np.zeros_like(deck)
    for px in (10.5, 15.5, 21.5):
        yt = 13.6 - 1.8 * (1 - abs(px - 15.8) / 6.5)
        posts |= (np.abs(X - px) < 0.5) & (Y > yt) & (Y < yt + 3.2)
    paint(img, rail | posts, c["wood_light"])
    paint(img, deck, c["wood"])
    paint(img, deck & (Y > 15.6 - 0.0 * X) & ~np.roll(deck, -1, axis=0), c["wood_dark"])
    # the flag on the green
    pole = (np.abs(X - 27.5) < 0.5) & (Y > 3.0) & (Y < 17.5)
    paint(img, pole, c["pole"])
    flag = poly(X, Y, [(28.0, 3.0), (31.6, 4.8), (28.0, 6.8)])
    paint(img, flag, c["flag"])
    paint(img, flag & (Y > 5.2), c["flag_dark"])
    return outlined_outside(img, c["edge"])


COLOURS = {
    "grass": rgba("#c9a95a"), "grass_light": rgba("#e3c878"), "grass_dark": rgba("#a8873f"), "brush": rgba("#6f6a32"),
    "ravine": rgba("#5b5a2c"), "ravine_dark": rgba("#3e4020"), "water": rgba("#3d7f9c"),
    "green": rgba("#62a845"), "green_light": rgba("#86c45c"),
    "bark": rgba("#5a3a26"), "pine": rgba("#245236"), "pine_light": rgba("#3c7550"), "pine_dark": rgba("#163826"),
    "wood": rgba("#9a6a3f"), "wood_light": rgba("#c08a55"), "wood_dark": rgba("#6b4528"),
    "pole": rgba("#f1efe6"), "flag": rgba("#d8432f"), "flag_dark": rgba("#a8301f"),
    "edge": EDGE,
}

LOGO = (barranca, COLOURS)

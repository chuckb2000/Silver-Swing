"""Silvies Valley Ranch logo: a goat caddie, facing left, a small red golf bag strapped
on its back with three club heads showing, standing in tawny bunchgrass (course chat, 2026-10-25; the developer: "just the goat caddie",
no tree: the ranch's goats carry players' bags
on McVeigh's Gauntlet; the ranch is a working cattle and goat ranch in ponderosa
country). The club's own emblem is not used. `python3 assets-src/logos.py silvies`
writes game/public/sprites/logos/silvies.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def goat_caddie(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # bunchgrass across the bottom
    grass = (Y >= 26.6 + 0.6 * np.sin(X * 0.9)) & (Y <= 30.5) & (X >= 1.0) & (X <= 31.0)
    paint(img, grass, c["grass"])
    paint(img, grass & (Y >= 29.0), c["grass_dark"])
    rng = np.random.default_rng(2017)
    paint(img, grass & (Y < 29.0) & (rng.random((S, S)) < 0.25), c["grass_light"])

    # the goat: white body, red-brown head (a Boer goat), facing left
    body = ell(X, Y, 15.4, 19.4, 6.8, 3.9)
    legs = (seg(X, Y, 10.4, 21.4, 10.2, 27.0, 0.75) | seg(X, Y, 12.6, 22.0, 12.8, 27.0, 0.75)
            | seg(X, Y, 18.4, 22.0, 18.2, 27.0, 0.75) | seg(X, Y, 20.6, 21.4, 21.2, 26.6, 0.75))
    tail = seg(X, Y, 21.6, 18.0, 23.0, 15.8, 0.6)
    neck = seg(X, Y, 10.6, 18.6, 8.4, 13.6, 2.0)
    head = poly(X, Y, [(8.0, 10.2), (9.8, 11.6), (9.4, 14.0), (6.4, 15.0), (4.0, 16.4), (2.8, 15.8), (3.4, 14.6), (6.2, 11.2)])
    paint(img, body | tail, c["coat"])
    paint(img, legs, c["leg"])
    paint(img, neck, c["coat"])
    paint(img, head, c["head"])
    shade(img, body, c["coat_light"], c["coat_dark"])
    paint(img, ell(X, Y, 3.4, 15.6, 0.8, 0.7), c["head_dark"])            # muzzle
    paint(img, seg(X, Y, 5.0, 16.0, 4.8, 18.0, 0.5), c["head_dark"])      # beard
    paint(img, (np.abs(X - 7.4) < 0.5) & (np.abs(Y - 12.4) < 0.5), c["eye"])
    paint(img, seg(X, Y, 9.0, 12.6, 11.6, 14.0, 0.55), c["head_dark"])     # floppy ear
    horns = seg(X, Y, 8.4, 10.4, 9.6, 8.0, 0.5) | seg(X, Y, 9.6, 8.0, 11.8, 7.8, 0.5)
    paint(img, horns, c["horn"])

    # the golf bag, strapped on the back and leaning toward the tail
    bag = poly(X, Y, [(13.0, 17.2), (17.4, 16.2), (19.6, 7.6), (15.4, 8.4)])
    paint(img, bag, c["bag"])
    band = bag & (Y >= 10.0) & (Y <= 11.2)
    paint(img, band, c["band"])
    shade(img, bag, c["bag_light"], c["bag_dark"])
    strap = seg(X, Y, 14.2, 17.0, 14.6, 22.4, 0.5) | seg(X, Y, 17.0, 16.6, 17.4, 22.6, 0.5)
    paint(img, strap & ~bag, c["strap"])
    # three club heads out of the top of the bag
    for x1, y1, x2, y2 in ((16.2, 8.2, 15.4, 4.6), (17.6, 7.9, 17.8, 3.8), (19.0, 7.6, 20.4, 4.8)):
        paint(img, seg(X, Y, x1, y1, x2, y2, 0.4), c["shaft"])
    paint(img, ell(X, Y, 15.0, 4.2, 1.1, 0.8), c["club"])
    paint(img, ell(X, Y, 18.0, 3.4, 1.0, 0.7), c["club"])
    paint(img, ell(X, Y, 20.8, 4.4, 0.9, 0.7), c["club"])
    return outlined(img, c["edge"])


GOAT = {
    "coat": rgba("#ece6d8"), "coat_light": rgba("#ffffff"), "coat_dark": rgba("#b8ae9c"),
    "head": rgba("#9a4f2c"), "head_dark": rgba("#6a3219"), "eye": rgba("#140c08"),
    "horn": rgba("#5b5148"), "leg": rgba("#cfc6b4"),
    "bag": rgba("#b3352c"), "bag_light": rgba("#d85a46"), "bag_dark": rgba("#7d2119"),
    "band": rgba("#efe6cc"), "strap": rgba("#4a3424"),
    "shaft": rgba("#9aa0a6"), "club": rgba("#d6dade"),
    "grass": rgba("#bfa265"), "grass_light": rgba("#dcc489"), "grass_dark": rgba("#8f7547"),
    "edge": EDGE,
}


LOGO = (goat_caddie, GOAT)

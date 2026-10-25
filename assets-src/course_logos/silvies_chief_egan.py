"""Silvies Valley Ranch, Chief Egan course logo: a conical twined willow burden basket with
a carrying strap, standing on the bunchgrass. The course is named for Egan, a Northern
Paiute war chief who led his band to the Malheur Reservation (which settlers in 1876 asked
to have the Silvies River Valley cut out of) and the Paiutes in the Bannock-Paiute War of
1878. His people, the Wadatika of the Harney Basin, made baskets of willow, sagebrush,
tule and Indian hemp, and still do (Burns Paiute Tribe; Malheur Indian Reservation,
Wikipedia). The logo honours them through their own craft rather than a portrait. The
twined bands are plain on purpose, so no real tribal pattern is copied. Chosen by the
developer, 2026-10-25, over a tule duck decoy, Steens Mountain over Malheur Lake and a hand
drum. An original drawing; the club's own emblem is not used. The file name is the layout
id; the ranch's card shows `silvies.png` (the goat caddie).

    python3 assets-src/logos.py silvies_chief_egan          # writes game/public/sprites/logos/silvies_chief_egan.png
    python3 assets-src/course_logos/silvies_chief_egan.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg, shade


def basket(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # bunchgrass across the bottom
    ground = (Y >= 27.0 + 0.5 * np.sin(X * 0.9 + 7)) & (Y <= 30.4) & (X >= 0.6) & (X <= 31.4)
    paint(img, ground, c["grass"])
    paint(img, ground & (Y >= 29.6), c["grass_dark"])
    rng = np.random.default_rng(7)
    paint(img, ground & (Y < 29.4) & (rng.random((S, S)) < 0.22), c["grass_light"])

    # the basket: a cone of twined willow, rows of stitches offset row to row
    b = poly(X, Y, [(5.0, 4.6), (27.0, 4.6), (18.0, 27.4), (14.0, 27.4)])
    paint(img, b, c["willow"])
    rows = b & ((np.floor(Y) % 2) == 0)
    paint(img, rows & ((np.floor(X + np.floor(Y) / 2) % 2) == 0), c["willow_dark"])
    # two plain dark bands, the upper one flecked
    upper = b & (Y >= 8.0) & (Y <= 10.6)
    paint(img, upper, c["band"])
    paint(img, upper & ((np.floor(X) + np.floor(Y)) % 4 == 0), c["willow_light"])
    paint(img, b & (Y >= 17.0) & (Y <= 18.4), c["band"])
    # the rim, and light on the left edge
    rim = (Y >= 3.6) & (Y <= 5.0) & (X >= 4.6) & (X <= 27.4)
    paint(img, rim, c["willow_dark"])
    paint(img, rim & (Y < 4.4), c["willow_light"])
    shade(img, b, c["willow_light"], None)

    # the carrying strap over the top
    strap = seg(X, Y, 6.6, 4.4, 10.0, 1.2, 0.5) | seg(X, Y, 10.0, 1.2, 22.0, 1.2, 0.5) | seg(X, Y, 22.0, 1.2, 25.4, 4.4, 0.5)
    paint(img, strap, c["strap"])
    return outlined_outside(img, c["edge"])


LOGO = (basket, {
    "willow": rgba("#c49a5c"), "willow_dark": rgba("#8a6334"), "willow_light": rgba("#e2bf84"),
    "band": rgba("#5a3a22"), "strap": rgba("#6a4426"),
    "grass": rgba("#bfa265"), "grass_light": rgba("#dcc489"), "grass_dark": rgba("#8f7547"),
    "edge": EDGE,
})


if __name__ == "__main__":
    import sys

    from PIL import Image
    fn, cols = LOGO
    im = Image.fromarray(fn(cols), "RGBA").resize((S * 8, S * 8), Image.NEAREST)
    bg = Image.new("RGBA", im.size, (40, 44, 52, 255))
    bg.alpha_composite(im)
    bg.save(sys.argv[1])
    print(sys.argv[1])

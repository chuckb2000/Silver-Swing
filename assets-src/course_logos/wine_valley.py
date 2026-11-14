"""Wine Valley logo: a Walla Walla sweet onion, papery gold with its green tops, sitting on a
small mound of tan loess with a golf ball beside it (course chat, 2026-11-13). The course
lies in the wheat and onion country west of Walla Walla, best known for its sweet onions;
no wine glass or grapes, which other logos and the club's own marks use. An original
drawing. `python3 assets-src/logos.py wine_valley` writes
game/public/sprites/logos/wine_valley.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def sweet_onion(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the loess mound
    mound = poly(X, Y, [(2.5, 30.6), (6.0, 27.4), (11.0, 25.6), (16.0, 25.0), (21.0, 25.6),
                        (26.0, 27.4), (29.5, 30.6)])
    paint(img, mound, c["soil"])
    shade(img, mound, c["soil_light"], c["soil_dark"])
    for x0 in (8.0, 13.0, 19.0, 24.0):   # a few wheat stubble tufts
        paint(img, seg(X, Y, x0, 29.6, x0 + 0.6, 27.4, 0.28), c["straw"])

    # the bulb: broad, a little flattened, drawing up to a neck
    bulb = ell(X, Y, 16.0, 19.0, 8.2, 6.6) | poly(X, Y, [(12.6, 14.0), (16.0, 8.8), (19.4, 14.0)])
    paint(img, bulb, c["skin"])
    shade(img, bulb, c["skin_light"], c["skin_dark"])
    # papery stripes running up to the neck
    for k in (-5.0, -2.4, 0.0, 2.4, 5.0):
        stripe = seg(X, Y, 16.0 + k, 24.6, 16.0 + k * 0.25, 11.0, 0.22) & bulb
        paint(img, stripe, c["skin_dark"])
    paint(img, ell(X, Y, 12.0, 16.8, 1.2, 2.2) & bulb, c["skin_shine"])
    # roots under it, in the soil
    for dx in (-1.6, 0.0, 1.6):
        paint(img, seg(X, Y, 16.0 + dx * 0.6, 25.2, 16.0 + dx, 26.8, 0.25), c["root"])

    # green tops: three blades from the neck, one bent over
    tops = (seg(X, Y, 16.0, 9.4, 14.4, 2.2, 0.8) | seg(X, Y, 16.2, 9.4, 18.0, 2.0, 0.8)
            | seg(X, Y, 16.4, 9.6, 20.4, 5.2, 0.7) | seg(X, Y, 20.4, 5.2, 23.6, 6.8, 0.6))
    paint(img, tops, c["leaf"])
    shade(img, tops, c["leaf_light"], c["leaf_dark"])

    ball = ell(X, Y, 25.8, 25.6, 1.25, 1.25)
    paint(img, ball, c["ball"])
    shade(img, ball, None, c["ball_dark"])
    return outlined(img, c["edge"])


LOGO = (sweet_onion, {
    "soil": rgba("#a8875a"), "soil_light": rgba("#c8a878"), "soil_dark": rgba("#7a5e3c"),
    "straw": rgba("#e2c97a"),
    "skin": rgba("#d9a843"), "skin_light": rgba("#f0cf73"), "skin_dark": rgba("#a87628"),
    "skin_shine": rgba("#fbe8b0"), "root": rgba("#e8dcc0"),
    "leaf": rgba("#4f8f34"), "leaf_light": rgba("#7cb752"), "leaf_dark": rgba("#2f5f22"),
    "ball": rgba("#f4f3ee"), "ball_dark": rgba("#b9b8b0"),
    "edge": EDGE,
})

"""Yale Golf Course logo: a draft horse in harness pulling a walking plough across a strip of
turned earth (course chat, 2026-10-31, from the
scouting's idea: a horse died hauling a plough while the course was built in 1924-26 and is
buried under the 7th green). No Yale "Y", bulldog, shield or other university mark is used.
`python3 assets-src/logos.py yale` writes game/public/sprites/logos/yale.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def plough_horse(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # turned earth: a strip of furrows across the bottom, a green turf edge on top
    earth = (Y >= 26.0) & (Y <= 30.5) & (X >= 0.5) & (X <= 31.5)
    paint(img, earth, c["earth"])
    paint(img, earth & ((X.astype(int) + Y.astype(int)) % 4 == 0), c["earth_dark"])
    paint(img, earth & (Y < 27.0), c["turf"])
    paint(img, earth & (Y >= 29.6), c["earth_dark"])

    # the plough behind the horse: handles up and back to the right, a beam, the share in the soil
    plough = (seg(X, Y, 25.0, 22.0, 30.4, 14.4, 0.55) | seg(X, Y, 26.2, 22.6, 31.0, 16.6, 0.5)
              | seg(X, Y, 22.6, 23.0, 28.0, 24.0, 0.65))
    share = poly(X, Y, [(26.2, 23.2), (29.4, 23.8), (28.4, 26.8), (25.8, 26.2)])
    paint(img, plough, c["wood"])
    paint(img, share, c["iron"])
    paint(img, share & (X < 27.0), c["iron_light"])

    # the draft horse, facing left, neck arched and head down into the pull
    body = ell(X, Y, 15.0, 15.6, 7.0, 4.2)
    rump = ell(X, Y, 20.2, 14.8, 2.8, 3.8)
    legs = (seg(X, Y, 10.2, 18.0, 9.0, 25.0, 1.2) | seg(X, Y, 12.8, 18.8, 13.2, 25.0, 1.2)
            | seg(X, Y, 18.2, 18.6, 17.6, 25.0, 1.2) | seg(X, Y, 21.0, 17.4, 22.0, 24.8, 1.2))
    neck = poly(X, Y, [(6.4, 7.6), (9.4, 6.4), (12.6, 10.4), (11.6, 16.4), (8.2, 15.6), (6.6, 11.4)])
    head = poly(X, Y, [(2.0, 13.6), (3.0, 10.4), (5.6, 7.0), (8.4, 7.6), (7.6, 11.6), (4.6, 15.6), (2.6, 15.6)])
    tail = seg(X, Y, 22.6, 12.8, 24.0, 19.6, 0.9)
    paint(img, tail, c["mane"])
    paint(img, body | rump | neck | head, c["coat"])
    paint(img, legs, c["coat_dark"])
    shade(img, body | rump | neck, c["coat_light"], c["coat_dark"])
    paint(img, seg(X, Y, 7.0, 6.4, 11.8, 9.6, 0.8), c["mane"])                # mane along the crest
    paint(img, seg(X, Y, 5.0, 9.2, 3.0, 14.4, 0.45), c["blaze"])              # white blaze
    paint(img, (np.abs(X - 5.6) < 0.5) & (np.abs(Y - 9.6) < 0.5), c["eye"])
    paint(img, ell(X, Y, 7.4, 5.8, 0.6, 1.2), c["coat_dark"])                 # ear
    # feathered hooves: white tufts at the foot of each leg
    for x in (8.9, 13.3, 17.5, 22.1):
        paint(img, ell(X, Y, x, 25.0, 1.4, 0.8), c["feather"])

    # harness: the collar round the neck, a back band, and the trace line to the plough
    paint(img, seg(X, Y, 10.6, 9.6, 9.4, 16.4, 0.9), c["collar"])
    paint(img, seg(X, Y, 16.4, 11.4, 16.4, 19.6, 0.5), c["strap"])
    paint(img, seg(X, Y, 10.4, 15.0, 23.4, 22.8, 0.4), c["strap"])
    return outlined(img, c["edge"])


HORSE = {
    "coat": rgba("#7a4a2a"), "coat_light": rgba("#9c6a40"), "coat_dark": rgba("#53301b"),
    "mane": rgba("#2c1b12"), "blaze": rgba("#efe8da"), "eye": rgba("#120c08"),
    "feather": rgba("#e8e2d4"),
    "collar": rgba("#1d4a8c"), "strap": rgba("#2b2219"),
    "wood": rgba("#8a6338"), "iron": rgba("#6d7178"), "iron_light": rgba("#a3a8ae"),
    "earth": rgba("#6b4a2e"), "earth_dark": rgba("#4a321f"), "turf": rgba("#4f8a3c"),
        "edge": EDGE,
}

LOGO = (plough_horse, HORSE)

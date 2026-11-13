"""Eugene Country Club logo: a mallard drake on a pond, a duck for Eugene (the developer's
call, 2026-11-13). A plain wild mallard, not any team's
mascot; an original drawing, and the club's own marks are not used.
`python3 assets-src/logos.py eugene_cc` writes game/public/sprites/logos/eugene_cc.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def mallard(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the pond
    pond = ((X - 16.0) / 15.0) ** 2 + ((Y - 26.5) / 4.0) ** 2 <= 1.0
    paint(img, pond, c["water"])
    paint(img, pond & (Y > 27.5), c["water_dark"])
    for wx, wy in ((4.5, 25.5), (27.0, 28.0), (23.0, 29.5)):
        paint(img, pond & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["water_light"])
    # body: a boat-shaped bird sitting on the water, tail up at the right
    body = poly(X, Y, [(6.0, 20.5), (9.0, 17.0), (16.0, 15.5), (23.0, 16.5), (26.5, 14.5), (25.5, 19.0),
                       (22.0, 24.5), (11.0, 25.0), (7.0, 23.5)])
    paint(img, body, c["grey"])
    shade(img, body, c["grey_light"], c["grey_dark"])
    # chestnut breast, dark wing with a blue speculum, black tail curl
    paint(img, body & (X < 11.5), c["breast"])
    wing = poly(X, Y, [(11.5, 17.5), (21.0, 16.8), (24.5, 18.0), (21.0, 21.0), (13.0, 21.0)])
    paint(img, wing, c["wing"])
    paint(img, wing & (Y > 19.6) & (X > 15.0) & (X < 20.0), c["speculum"])
    paint(img, poly(X, Y, [(23.5, 16.0), (26.5, 14.5), (25.8, 17.5)]), c["tail"])
    paint(img, (X - 26.6) ** 2 + (Y - 13.6) ** 2 <= 1.0, c["tail"])
    # white collar, green head, yellow bill
    paint(img, ((X - 8.0) / 2.6) ** 2 + ((Y - 16.2) / 0.8) ** 2 <= 1.0, c["white"])
    neck = poly(X, Y, [(6.0, 16.0), (6.5, 11.5), (9.5, 11.5), (10.0, 16.0)])
    head = ((X - 8.0) / 3.4) ** 2 + ((Y - 9.5) / 3.0) ** 2 <= 1.0
    paint(img, neck | head, c["head"])
    paint(img, head & (X < 7.5) & (Y < 9.0), c["head_light"])
    paint(img, poly(X, Y, [(4.8, 9.6), (1.0, 10.8), (1.2, 12.0), (5.4, 11.4)]), c["bill"])
    paint(img, (np.abs(X - 6.8) < 0.5) & (np.abs(Y - 8.6) < 0.5), c["eye"])
    # the waterline across the body
    paint(img, body & (Y > 23.4), c["water_dark"])
    return outlined(img, c["edge"])


LOGO = (mallard, {
    "water": rgba("#3f7a8c"), "water_dark": rgba("#2c5c6c"), "water_light": rgba("#8cc3cf"),
    "green": rgba("#78c26a"), "pole": rgba("#f2efe6"), "flag": rgba("#e8b52a"),
    "grey": rgba("#a9a8a0"), "grey_light": rgba("#cfcdc4"), "grey_dark": rgba("#7d7c75"),
    "breast": rgba("#7a3e26"), "wing": rgba("#6b5a48"), "speculum": rgba("#3a5fb0"), "tail": rgba("#22252a"),
    "white": rgba("#f4f2ec"), "head": rgba("#1f6a3a"), "head_light": rgba("#3a9a5a"),
    "bill": rgba("#e6c23a"), "eye": rgba("#15171a"),
    "edge": EDGE,
})

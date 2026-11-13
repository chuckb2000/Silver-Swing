"""Eugene Country Club logo: a giant Douglas fir towering over a small green and its flag,
for the course's famous corridors of old firs and oaks, on an emerald disc rimmed in gold
(Eugene, the Emerald City). An original drawing; the club's own marks are not used.
`python3 assets-src/logos.py eugene_cc` writes game/public/sprites/logos/eugene_cc.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def giant_fir(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    r2 = (X - 16) ** 2 + (Y - 16) ** 2
    disc = r2 <= 14.5 ** 2
    paint(img, disc, c["gold"])
    inner = r2 <= 13.2 ** 2
    paint(img, inner, c["sky"])
    paint(img, inner & (Y > 22.5), c["grass"])
    paint(img, inner & (Y > 26.5), c["grass_dark"])

    # the green and its flag, small at the foot of the tree
    green = ((X - 23.0) / 4.2) ** 2 + ((Y - 24.0) / 1.6) ** 2 <= 1
    paint(img, green, c["green"])
    paint(img, (np.abs(X - 23.5) < 0.5) & (Y > 17.0) & (Y < 24.0), c["white"])
    paint(img, poly(X, Y, [(24.0, 17.0), (27.0, 18.2), (24.0, 19.4)]), c["flag"])

    # the fir: tiers stepping out down a tall narrow crown, trunk at the foot
    fx = 12.0
    crown = np.zeros_like(disc)
    for t in range(6):
        top = 3.5 + t * 3.3
        half = 1.6 + t * 1.15
        crown |= poly(X, Y, [(fx - half, top + 4.2), (fx, top), (fx + half, top + 4.2)])
    crown &= inner
    paint(img, crown, c["fir"])
    shade(img, crown, c["fir_light"], c["fir_dark"])
    paint(img, (np.abs(X - fx) < 1.0) & (Y >= 24.5) & (Y < 27.0) & inner, c["trunk"])

    return outlined(img, c["edge"])


LOGO = (giant_fir, {
    "gold": rgba("#e0b43a"), "sky": rgba("#a9d3e8"),
    "grass": rgba("#3f9957"), "grass_dark": rgba("#2a7142"), "green": rgba("#93dba0"),
    "fir": rgba("#1a4a3a"), "fir_light": rgba("#36775a"), "fir_dark": rgba("#0f2f25"),
    "trunk": rgba("#5a3d28"), "white": rgba("#f6f6f2"), "flag": rgba("#d63c34"),
    "edge": EDGE,
})

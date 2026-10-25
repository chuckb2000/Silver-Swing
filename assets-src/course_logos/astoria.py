"""Astoria Golf & Country Club logo: a Roosevelt elk bull standing on a dune ridge,
with a shore pine bent by the onshore wind behind him (course chat, 2026-10-24, from
the scouting's idea: elk herds graze the Clatsop Plains around the course; Gearhart,
8 km south, has the shipwreck). The club's own emblem is not used.
`python3 assets-src/logos.py astoria` writes game/public/sprites/logos/astoria.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def elk_on_ridge(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the dune ridge: a tawny grass mound across the bottom, higher on the left
    ridge = (Y >= 25.6 + 0.0022 * (X - 9.0) ** 2) & (Y <= 30.5) & (X >= 1.0) & (X <= 31.0)
    paint(img, ridge, c["grass"])
    paint(img, ridge & (Y >= 28.4), c["grass_dark"])
    rng = np.random.default_rng(1923)
    blades = ridge & (Y < 28.4) & (rng.random((S, S)) < 0.22)
    paint(img, blades, c["grass_light"])

    # the shore pine on the right: a leaning trunk, flat crown pads swept east (downwind)
    trunk = seg(X, Y, 25.2, 26.4, 26.8, 17.0, 0.75) | seg(X, Y, 26.6, 17.6, 29.6, 14.6, 0.55)
    paint(img, trunk, c["bark"])
    pads = (ell(X, Y, 27.8, 14.8, 4.0, 1.5) | ell(X, Y, 29.2, 12.4, 2.8, 1.2)
            | ell(X, Y, 25.0, 16.8, 2.0, 0.9))
    paint(img, pads, c["pine"])
    paint(img, pads & (Y < 13.6 + 0.2 * (X - 25.0)) & (X < 30.0), c["pine_light"])
    shade(img, pads, None, c["pine_dark"])

    # the elk, facing left: body, a slim neck with a dark mane, head held high
    body = ell(X, Y, 16.2, 19.8, 6.2, 3.2)
    rump = ell(X, Y, 21.6, 19.2, 1.4, 2.1)
    legs = (seg(X, Y, 11.4, 21.0, 11.0, 26.6, 0.7) | seg(X, Y, 13.4, 21.8, 13.8, 26.4, 0.7)
            | seg(X, Y, 19.0, 22.0, 18.8, 26.0, 0.7) | seg(X, Y, 21.0, 21.2, 21.8, 25.8, 0.7))
    neck = seg(X, Y, 12.6, 18.2, 10.0, 12.6, 1.7)
    mane = seg(X, Y, 11.4, 19.2, 9.0, 13.6, 1.0) & neck
    head = poly(X, Y, [(5.2, 12.8), (6.4, 11.4), (9.4, 10.2), (11.2, 11.0), (10.8, 12.8), (7.4, 13.8), (5.6, 13.8)])
    paint(img, body | rump, c["coat"])
    paint(img, legs, c["leg"])
    paint(img, neck, c["coat"])
    paint(img, mane, c["mane"])
    paint(img, head, c["coat"])
    shade(img, body, c["coat_light"], c["coat_dark"])
    paint(img, rump & (X > 20.8), c["rump"])
    paint(img, ell(X, Y, 5.8, 13.2, 0.8, 0.7), c["mane"])          # dark muzzle
    paint(img, (np.abs(X - 8.6) < 0.5) & (np.abs(Y - 11.6) < 0.5), c["eye"])
    paint(img, (np.abs(X - 11.6) < 0.5) & (np.abs(Y - 10.4) < 0.9), c["coat_dark"])  # ear

    # antlers: a near beam sweeping back over the body with tines pointing up,
    # and the far beam behind it in a darker tone
    far = (seg(X, Y, 9.6, 10.2, 10.4, 6.4, 0.45) | seg(X, Y, 10.4, 6.4, 12.8, 3.2, 0.45)
           | seg(X, Y, 10.2, 7.4, 8.0, 6.0, 0.45))
    near = (seg(X, Y, 10.6, 10.0, 13.0, 6.6, 0.5) | seg(X, Y, 13.0, 6.6, 16.6, 4.4, 0.5)
            | seg(X, Y, 16.6, 4.4, 20.4, 4.0, 0.5)
            | seg(X, Y, 11.4, 8.8, 9.4, 8.6, 0.45) | seg(X, Y, 14.4, 5.8, 14.0, 2.6, 0.45)
            | seg(X, Y, 17.6, 4.2, 18.0, 1.6, 0.45))
    paint(img, far & ~near, c["antler_dark"])
    paint(img, near, c["antler"])
    return outlined(img, c["edge"])


ELK = {
    "coat": rgba("#a26b3a"), "coat_light": rgba("#c58c52"), "coat_dark": rgba("#774a26"),
    "mane": rgba("#4e3020"), "rump": rgba("#e3cf9f"), "leg": rgba("#3d2618"),
    "eye": rgba("#120c08"),
    "antler": rgba("#ece2c6"), "antler_dark": rgba("#c2b38f"),
    "grass": rgba("#bfa265"), "grass_light": rgba("#dcc489"), "grass_dark": rgba("#8f7547"),
    "pine": rgba("#26503a"), "pine_light": rgba("#3e7350"), "pine_dark": rgba("#163426"),
    "bark": rgba("#5a3a26"),
    "edge": EDGE,
}


LOGO = (elk_on_ridge, ELK)

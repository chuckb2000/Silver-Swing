"""Cypress Point logo: a sea otter floating on its back in the kelp off Fan Shell Beach
(beside the 15th and 16th), holding a golf ball on its chest (developer, 2026-10-24: "I
prefer the otter"). An original drawing: nothing of the club's crest, and not the lone
cypress on its rock (Pebble Beach Company's mark). `python3 assets-src/logos.py
cypress_point` writes game/public/sprites/logos/cypress_point.png
(assets-src/course_logos/README.md)."""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def dot(X, Y, x, y):
    return (np.abs(X - x) < 0.5) & (np.abs(Y - y) < 0.5)


def otter(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the otter, belly up: head raised at the left, hind flippers up at the right
    body = ell(X, Y, 18.0, 17.0, 10.0, 3.9) | ell(X, Y, 13.0, 15.8, 4.6, 3.6)
    head = ell(X, Y, 7.0, 12.0, 5.2, 4.8)
    ears = ell(X, Y, 3.2, 8.0, 1.3, 1.2) | ell(X, Y, 10.6, 7.8, 1.3, 1.2)
    flip = ell(X, Y, 28.2, 11.4, 1.9, 2.8) | ell(X, Y, 24.8, 11.6, 1.7, 2.6)
    tail = poly(X, Y, [(26.0, 16.0), (31.2, 15.0), (31.4, 17.4), (26.4, 18.6)])
    fur = body | head | ears | flip | tail
    paint(img, fur, c["fur"])
    paint(img, fur & ~np.roll(fur, 1, axis=0), c["fur_light"])
    paint(img, ell(X, Y, 16.6, 14.6, 7.6, 2.0) & body, c["fur_light"])     # chest catching the sun
    paint(img, flip & (Y < 10.0), c["fur_dark"])
    face = ell(X, Y, 6.8, 12.6, 4.2, 3.7)
    paint(img, face, c["face"])
    paint(img, face & (X > 9.4) | face & (Y > 15.2), c["face_dark"])
    for ex in (4.5, 8.5):
        paint(img, dot(X, Y, ex, 11.5), c["eye"])
    paint(img, dot(X, Y, 4.5, 10.5), c["glint"])
    paint(img, dot(X, Y, 8.5, 10.5), c["glint"])
    paint(img, dot(X, Y, 6.5, 13.5), c["eye"])                          # nose
    paint(img, dot(X, Y, 6.5, 14.5), c["face_dark"])
    paint(img, dot(X, Y, 3.5, 14.5) | dot(X, Y, 9.5, 14.5), c["face_dark"])   # whisker pads
    # the ball on its chest, paws either side
    ball = ell(X, Y, 16.0, 11.5, 3.0, 2.9)
    paint(img, ball, c["ball"])
    crescent = ball & ~ell(X, Y, 15.3, 10.8, 2.8, 2.7)
    paint(img, crescent, c["ball_dark"])
    paint(img, dot(X, Y, 16.5, 12.5), c["dimple"])
    paws = ell(X, Y, 12.4, 14.0, 1.4, 1.1) | ell(X, Y, 19.6, 14.0, 1.4, 1.1)
    paint(img, paws, c["fur_dark"])
    # the sea over the lower body: a lens of water with ripples and kelp
    sea = ell(X, Y, 16.0, 22.0, 15.4, 8.0) & (Y >= 18.6 + 0.7 * np.sin(X * 1.1))
    paint(img, sea, c["water"])
    paint(img, sea & (Y > 25.0), c["water_dark"])
    paint(img, sea & (((X * 0.8 + Y * 1.6) % 6.0) < 0.9) & (Y > 21.5), c["water_light"])
    surface = sea & ~np.roll(sea, 1, axis=0)
    paint(img, surface & (X > 3) & (X < 30), c["foam"])
    for x0, ph in ((4.8, 0.0), (27.0, 2.0)):
        k = sea & (np.abs(X - (x0 + 1.0 * np.sin(Y * 0.9 + ph))) < 0.7) & (Y > 21.5)
        paint(img, k, c["kelp"])
        paint(img, k & (Y > 26), c["kelp_dark"])
    return outlined(img, c["edge"])


OTTER = {
    "fur": rgba("#6b4a32"), "fur_dark": rgba("#45301f"), "fur_light": rgba("#8f6a4a"),
    "face": rgba("#ddd2bf"), "face_dark": rgba("#b8a990"), "eye": rgba("#15110e"), "glint": rgba("#ffffff"),
    "ball": rgba("#f6f6f2"), "ball_dark": rgba("#c9ccd1"), "dimple": rgba("#d9dce0"),
    "water": rgba("#1f6f8f"), "water_dark": rgba("#165570"), "water_light": rgba("#5aa7bd"), "foam": rgba("#e6f3f6"),
    "kelp": rgba("#8a7d2e"), "kelp_dark": rgba("#62581f"),
    "edge": EDGE,
}

LOGO = (otter, OTTER)

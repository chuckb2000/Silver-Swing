"""The Olympic Club logo: a laurel wreath round a golf ball, for the oldest athletic club
in the United States (1860), free-standing. An original drawing; the club's own marks
(its winged emblem) are not used. `python3 assets-src/logos.py olympic_club` writes
game/public/sprites/logos/olympic_club.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def laurel(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    disc = (X - 16.0) ** 2 + (Y - 16.0) ** 2 <= 15.9 ** 2
    # two branches curving up round the ball, leaves in pairs
    for side in (-1, 1):
        arc = disc & (np.abs(np.hypot(X - 16.0, Y - 16.5) - 11.0) < 0.6) & (Y > 6.0) & ((X - 16.0) * side > 0)
        paint(img, arc, c["leaf_dark"])
        for k in range(6):
            a = np.radians(235 - 25 * k) if side < 0 else np.radians(-55 + 25 * k)
            cx, cy = 16.0 + 11.0 * np.cos(a), 16.5 - 11.0 * np.sin(a)
            # leaf: an ellipse along the circle's tangent
            tx, ty = -np.sin(a) * side, -np.cos(a) * side
            dx, dy = X - cx, Y - cy
            u = dx * tx + dy * ty
            v = -dx * ty + dy * tx
            leaf = ((u - 0.6 * side) / 2.8) ** 2 + ((v - 1.2) / 1.5) ** 2 <= 1.0
            paint(img, leaf & disc, c["leaf"] if k % 2 else c["leaf_light"])
    paint(img, poly(X, Y, [(11.5, 25.5), (16.0, 27.6), (11.5, 29.6)]), c["ribbon"])
    paint(img, poly(X, Y, [(20.5, 25.5), (16.0, 27.6), (20.5, 29.6)]), c["ribbon"])
    paint(img, (X - 16.0) ** 2 + (Y - 27.6) ** 2 <= 1.3 ** 2, c["ribbon_dark"])
    # the ball with dimples
    ball = (X - 16.0) ** 2 + (Y - 15.5) ** 2 <= 6.6 ** 2
    paint(img, ball, c["ball"])
    shade(img, ball, c["ball_light"], c["ball_dark"])
    for bx, by in ((13.5, 13.0), (16.5, 12.0), (19.5, 14.0), (14.5, 16.5), (17.5, 17.0), (20.0, 18.5), (12.5, 19.0), (15.5, 20.0)):
        paint(img, ball & ((X - bx) ** 2 + (Y - by) ** 2 <= 0.5), c["dimple"])
    return outlined(img, c["edge"])


LOGO = (laurel, {
    "fog": rgba("#c7d1d6"), "fog_dark": rgba("#a9b6bd"),
    "leaf": rgba("#2b653b"), "leaf_light": rgba("#4ea055"), "leaf_dark": rgba("#1b3c2b"),
    "ribbon": rgba("#b8322a"), "ribbon_dark": rgba("#7a2420"),
    "dimple": rgba("#c6ccce"), "ball": rgba("#eef0ee"), "ball_light": rgba("#ffffff"), "ball_dark": rgba("#a6aeb0"),
    "edge": EDGE,
})

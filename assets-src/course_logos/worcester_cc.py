"""Worcester Country Club logo: a sugar maple in fall colour behind a New England fieldstone
wall on a green mound, Ross's hilltop parkland in central Massachusetts. An original
drawing; the club's own marks are not used. `python3 assets-src/logos.py worcester_cc`
writes game/public/sprites/logos/worcester_cc.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def maple_wall(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the mound
    mound = ((X - 16.0) / 15.0) ** 2 + ((Y - 27.0) / 4.0) ** 2 <= 1.0
    paint(img, mound, c["grass"])
    paint(img, mound & (Y > 28.0), c["grass_dark"])
    # the trunk and the maple's round crown in lobes
    paint(img, poly(X, Y, [(14.6, 26.0), (15.4, 16.0), (16.6, 16.0), (17.4, 26.0)]), c["trunk"])
    paint(img, seg(X, Y, 16.0, 18.0, 12.0, 14.5, 0.6) | seg(X, Y, 16.0, 17.0, 20.0, 13.5, 0.6), c["trunk"])
    crown = np.zeros_like(X, bool)
    for cx, cy, r in ((16.0, 8.5, 7.0), (10.0, 11.5, 5.2), (22.0, 11.5, 5.2), (13.0, 5.0, 4.0), (19.5, 5.5, 4.0), (16.0, 13.5, 4.5)):
        crown |= (X - cx) ** 2 + (Y - cy) ** 2 <= r * r
    paint(img, crown, c["leaf"])
    paint(img, crown & ((X - 12.5) ** 2 + (Y - 6.0) ** 2 <= 16.0), c["leaf_light"])
    paint(img, crown & (Y > 13.0), c["leaf_dark"])
    for lx, ly in ((9.0, 9.0), (20.0, 7.0), (24.0, 12.5), (14.0, 12.0), (18.0, 3.5)):
        paint(img, crown & (np.abs(X - lx) < 0.6) & (np.abs(Y - ly) < 0.6), c["leaf_red"])
    # the fieldstone wall across the front
    wall = (Y >= 21.5) & (Y < 25.5) & (np.abs(X - 16.0) < 12.5)
    paint(img, wall, c["stone"])
    for sx, sy in ((5.0, 22.5), (9.5, 23.5), (13.5, 22.3), (18.0, 23.6), (22.5, 22.5), (26.5, 23.6)):
        paint(img, wall & (((X - sx) / 1.8) ** 2 + ((Y - sy) / 0.9) ** 2 <= 1.0), c["stone_light"])
    paint(img, wall & (Y >= 24.6), c["stone_dark"])
    return outlined(img, c["edge"])


LOGO = (maple_wall, {
    "grass": rgba("#4f994d"), "grass_dark": rgba("#36733f"),
    "trunk": rgba("#4a3626"),
    "leaf": rgba("#d9772a"), "leaf_light": rgba("#f0b84a"), "leaf_dark": rgba("#a8441c"), "leaf_red": rgba("#c8302a"),
    "stone": rgba("#8f8b82"), "stone_light": rgba("#bdb8ac"), "stone_dark": rgba("#5f5c56"),
    "edge": EDGE,
})

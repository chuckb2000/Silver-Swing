"""The Country Club logo: a granite curling stone with its red handle, sitting on a patch of
ice with a golf ball beside it (course chat, 2026-11-13). The club, founded in 1882 around
a racecourse, has long kept a curling rink beside the golf course. An original drawing:
the club's own marks are not used. `python3 assets-src/logos.py tcc_brookline` writes
game/public/sprites/logos/tcc_brookline.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def curling_stone(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the ice: a flat oval with a faint red ring line of the house
    ice = ell(X, Y, 16.0, 27.4, 14.4, 3.6) & (Y <= 30.8)
    paint(img, ice, c["ice"])
    shade(img, ice, c["ice_light"], c["ice_dark"])
    paint(img, ice & ~ell(X, Y, 16.0, 27.4, 11.0, 2.5) & ell(X, Y, 16.0, 27.4, 11.8, 2.8), c["ring"])

    # the stone: a squat granite body, a darker band round the middle, the striking band
    body = ell(X, Y, 16.0, 20.0, 10.2, 5.6) & (Y <= 25.6)
    paint(img, body, c["granite"])
    shade(img, body, c["granite_light"], c["granite_dark"])
    rng = np.random.default_rng(1882)
    paint(img, body & (rng.random((S, S)) < 0.18), c["granite_dark"])
    paint(img, body & (rng.random((S, S)) < 0.08), c["granite_light"])
    band = body & (np.abs(Y - 20.6) < 1.0)
    paint(img, band, c["band"])
    # the top face, lighter
    top = ell(X, Y, 16.0, 16.6, 8.0, 2.4)
    paint(img, top, c["granite_light"])
    # the handle: a red bar with a bolt
    handle = seg(X, Y, 11.8, 12.6, 20.6, 12.6, 1.05) | seg(X, Y, 16.0, 13.0, 16.0, 16.2, 0.9) \
        | seg(X, Y, 20.6, 12.6, 21.4, 14.2, 0.8)
    paint(img, handle, c["red"])
    shade(img, handle, c["red_light"], c["red_dark"])
    paint(img, ell(X, Y, 16.0, 16.2, 1.0, 0.6), c["bolt"])

    ball = ell(X, Y, 27.8, 26.4, 1.25, 1.25)
    paint(img, ball, c["ball"])
    shade(img, ball, None, c["ball_dark"])
    return outlined(img, c["edge"])


LOGO = (curling_stone, {
    "ice": rgba("#d8eaf2"), "ice_light": rgba("#f2fafc"), "ice_dark": rgba("#a8c6d4"),
    "ring": rgba("#d06060"),
    "granite": rgba("#7e7a7c"), "granite_light": rgba("#aaa6a6"), "granite_dark": rgba("#504c50"),
    "band": rgba("#3e3a40"),
    "red": rgba("#c0302c"), "red_light": rgba("#e0584c"), "red_dark": rgba("#7e1e1c"),
    "bolt": rgba("#d8d4cc"),
    "ball": rgba("#f4f3ee"), "ball_dark": rgba("#b9b8b0"),
    "edge": EDGE,
})

"""Old Macdonald logo: an old farmer, head and shoulders, in a straw hat with a
white beard, red check shirt and blue overalls (developer, 2026-10-20). An original drawing; nothing of the club's own marks is
used. `python3 assets-src/logos.py old_macdonald` writes
game/public/sprites/logos/old_macdonald.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def farmer(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    cx = 16.0
    # shoulders: a red check shirt under blue overalls with straps and buttons
    body = poly(X, Y, [(3.0, 31.0), (4.0, 25.0), (9.0, 21.6), (23.0, 21.6), (28.0, 25.0), (29.0, 31.0)])
    paint(img, body, c["shirt"])
    check = body & (((np.floor(X).astype(int) // 2 + np.floor(Y).astype(int) // 2) % 2) == 0)
    paint(img, check, c["shirt_dark"])
    bib = poly(X, Y, [(10.6, 31.0), (11.2, 25.6), (20.8, 25.6), (21.4, 31.0)])
    straps = seg(X, Y, 11.6, 25.8, 9.6, 21.8, 1.1) | seg(X, Y, 20.4, 25.8, 22.4, 21.8, 1.1)
    paint(img, (bib | straps) & body, c["denim"])
    paint(img, bib & (X > 19.6), c["denim_dark"])
    paint(img, bib & (Y < 26.6), c["denim_light"])
    paint(img, bib & (np.abs(X - cx) < 1.6) & (Y > 27.6) & (Y < 30.0), c["denim_dark"])   # the bib pocket
    for bx in (11.8, 20.2):
        paint(img, ell(X, Y, bx, 26.4, 0.7, 0.7), c["brass"])
    # the beard: white, over the collar
    beard = poly(X, Y, [(10.0, 15.0), (22.0, 15.0), (21.0, 21.0), (18.0, 24.4), (14.0, 24.4), (11.0, 21.0)])
    # the face
    face = ell(X, Y, cx, 14.4, 5.6, 5.4)
    ears = ell(X, Y, 10.2, 14.4, 1.2, 1.6) | ell(X, Y, 21.8, 14.4, 1.2, 1.6)
    paint(img, face | ears, c["skin"])
    paint(img, face & (X > 19.2), c["skin_dark"])
    paint(img, beard, c["beard"])
    paint(img, beard & (X > 19.0), c["beard_dark"])
    paint(img, beard & (Y > 22.6), c["beard_dark"])
    mous = ell(X, Y, 14.2, 16.6, 2.2, 0.9) | ell(X, Y, 17.8, 16.6, 2.2, 0.9)
    paint(img, (np.abs(X - cx) < 1.6) & (np.abs(Y - 18.0) < 0.5), c["mouth"])
    paint(img, mous, c["beard_light"])
    # nose, eyes and bushy white brows
    paint(img, ell(X, Y, cx, 14.6, 1.3, 1.2), c["nose"])
    for ex in (13.6, 18.4):
        paint(img, (np.abs(X - ex) < 0.5) & (np.abs(Y - 12.5) < 0.5), c["eye"])
        paint(img, (np.abs(X - ex) < 1.4) & (np.abs(Y - 11.3) < 0.5), c["beard_light"])
    # the straw hat: a wide brim and a rounded crown with a red band
    brim = ell(X, Y, cx, 9.0, 13.6, 2.2)
    crown = poly(X, Y, [(9.6, 9.0), (10.4, 3.4), (12.6, 1.8), (19.4, 1.8), (21.6, 3.4), (22.4, 9.0)])
    paint(img, brim | crown, c["straw"])
    paint(img, crown & (Y > 6.0) & (Y < 8.0), c["band"])
    paint(img, crown & (X < 12.2) & (Y < 6.0), c["straw_light"])
    paint(img, brim & (Y > 9.6), c["straw_dark"])
    paint(img, crown & (X > 20.0) & (Y < 6.0), c["straw_dark"])
    weave = (brim | crown) & ~(crown & (Y > 6.0) & (Y < 8.0)) & (((np.floor(X).astype(int) + np.floor(Y).astype(int)) % 4) == 0)
    paint(img, weave & (Y < 9.6), c["straw_dark"])
    return outlined(img, c["edge"])


LOGO = (farmer, {
    "skin": rgba("#e8b48a"), "skin_dark": rgba("#c98d66"), "nose": rgba("#d98a6c"), "eye": rgba("#1d1a18"), "mouth": rgba("#8a3a30"),
    "beard": rgba("#ecebe6"), "beard_light": rgba("#ffffff"), "beard_dark": rgba("#bdbab2"),
    "straw": rgba("#e6c05a"), "straw_light": rgba("#f6dc86"), "straw_dark": rgba("#b98f32"), "band": rgba("#b8332a"),
    "shirt": rgba("#c8372d"), "shirt_dark": rgba("#8e2420"),
    "denim": rgba("#3a6ab0"), "denim_light": rgba("#5b8ad0"), "denim_dark": rgba("#284b80"), "brass": rgba("#f0c84a"),
    "edge": EDGE,
})

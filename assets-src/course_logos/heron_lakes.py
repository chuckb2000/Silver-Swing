"""Heron Lakes Golf Club logo (the club, both courses): a pond at the edge of the Columbia
floodplain, cattails and a lily pad in bloom against the water, on a round badge. The two
courses' logos carry their herons (heron_lakes_great_blue.py, heron_lakes_greenback.py). An
original drawing; the club's own marks are not used.
`python3 assets-src/logos.py heron_lakes` writes game/public/sprites/logos/heron_lakes.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def cattails(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    r2 = (X - 16) ** 2 + (Y - 16) ** 2
    disc = r2 <= 14.5 ** 2
    paint(img, disc, c["rim"])
    inner = r2 <= 13.2 ** 2
    paint(img, inner, c["sky"])
    water = inner & (Y >= 18.0)
    paint(img, water, c["water"])
    paint(img, water & (Y >= 25.0), c["water_dark"])
    for wx, wy in ((8.0, 21.0), (22.0, 27.0)):
        paint(img, inner & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 2.0), c["water_light"])
    # the far bank
    paint(img, inner & (Y >= 16.5) & (Y < 18.0), c["bank"])
    # cattails: stalks, leaves and brown heads
    for sx, top, lean in ((7.5, 6.0, -0.6), (10.5, 4.5, 0.2), (13.0, 7.5, 0.5)):
        paint(img, seg(X, Y, sx, 22.0, sx + lean, top, 0.45) & inner, c["stalk"])
        head = (np.abs(X - (sx + lean * 0.85)) <= 0.9) & (Y >= top + 1.2) & (Y <= top + 5.2)
        paint(img, head & inner, c["head"])
        paint(img, head & (X < sx + lean * 0.85) & inner, c["head_light"])
    for a, b2, c2, d in ((6.0, 22.0, 3.0, 12.0), (12.0, 22.0, 16.5, 11.0), (9.0, 22.0, 8.5, 14.0)):
        paint(img, seg(X, Y, a, b2, c2, d, 0.55) & inner, c["leaf"])
    # a lily pad with a pink bloom
    pad = (((X - 21.5) / 4.5) ** 2 + ((Y - 22.5) / 1.8) ** 2 <= 1) & ~((X > 21.5) & (np.abs(Y - 22.5) < 0.6) & (X < 26))
    paint(img, pad & inner, c["pad"])
    shade(img, pad & inner, c["pad_light"], None)
    bloom = poly(X, Y, [(19.5, 21.6), (20.5, 19.0), (21.5, 20.6), (22.5, 18.6), (23.5, 20.6), (24.5, 19.0), (25.5, 21.6)])
    paint(img, bloom & inner, c["bloom"])
    paint(img, bloom & inner & (Y < 20.0), c["bloom_light"])
    return outlined(img, c["edge"])


LOGO = (cattails, {
    "rim": rgba("#2f5a4a"), "sky": rgba("#cfe3dc"), "bank": rgba("#6f8a4c"),
    "water": rgba("#4f7a74"), "water_dark": rgba("#3c605b"), "water_light": rgba("#9cc4bb"),
    "stalk": rgba("#4f7a32"), "leaf": rgba("#5f9440"), "head": rgba("#6b3f22"), "head_light": rgba("#8f5a32"),
    "pad": rgba("#3f8a45"), "pad_light": rgba("#69b064"), "bloom": rgba("#e58fb0"), "bloom_light": rgba("#f8c6d8"),
    "edge": EDGE,
})

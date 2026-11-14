"""Old Course logo: the old stone footbridge over the burn on the 1st and 18th holes, drawn
side on: a single low arch of grey sandstone with a hump-backed deck and low parapets, the burn
running under it between turf banks. The developer's pick (option a, 2026-11-13). An original
drawing of the landmark, with no name on it: the St Andrews Links name marks and their own
logos are not used. `python3 assets-src/logos.py st_andrews_old` writes
game/public/sprites/logos/st_andrews_old.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def bridge(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # turf banks and the burn
    bank = (Y >= 20.0) & (Y <= 30.5) & (X >= 0.5) & (X <= 31.5)
    paint(img, bank, c["turf"])
    paint(img, bank & (Y < 21.0), c["turf_light"])
    burn = poly(X, Y, [(8.0, 22.0), (24.0, 22.0), (27.5, 30.5), (4.5, 30.5)])
    paint(img, burn, c["water"])
    paint(img, burn & (Y > 26.5), c["water_dark"])
    for wx, wy in ((12.0, 24.5), (19.0, 27.5), (15.0, 29.5)):
        paint(img, burn & (np.abs(Y - wy) < 0.5) & (np.abs(X - wx) < 1.8), c["water_light"])
    # the hump-backed deck: a gentle rise to the crown
    u = (X - 16.0) / 14.5
    top = 12.5 + 6.5 * u ** 2
    span = (np.abs(X - 16.0) <= 14.5) & (Y >= top) & (Y <= 23.5)
    # the one low arch: the far bank and the burn show through it
    arch = ((X - 16.0) / 6.2) ** 2 + ((Y - 23.5) / 6.6) ** 2 <= 1
    stone = span & ~arch
    paint(img, stone, c["stone"])
    shade(img, stone, c["stone_light"], c["stone_dark"])
    ring = stone & (((X - 16.0) / 7.8) ** 2 + ((Y - 23.5) / 8.2) ** 2 <= 1)
    paint(img, ring, c["stone_light"])
    paint(img, ring & ((np.degrees(np.arctan2(Y - 23.5, X - 16.0)).astype(int) % 20) < 4), c["stone_dark"])
    paint(img, stone & ~ring & ((Y.astype(int) % 3) == 0) & (Y > top + 1.5), c["stone_dark"])
    paint(img, arch & (Y < 20.5), c["shadow"])
    paint(img, arch & (Y >= 20.5) & (Y < 22.0), c["turf"])
    # parapet cope along the top
    cope = (np.abs(X - 16.0) <= 14.5) & (Y >= top - 1.3) & (Y < top)
    paint(img, cope, c["cope"])
    return outlined(img, c["edge"])


LOGO = (bridge, {
    "stone": rgba("#a39a8a"), "stone_light": rgba("#c4bba9"), "stone_dark": rgba("#7d7466"),
    "cope": rgba("#d8d0bd"), "shadow": rgba("#3d3a35"),
    "turf": rgba("#6f8a3e"), "turf_light": rgba("#94ad55"),
    "water": rgba("#3d6f8c"), "water_dark": rgba("#2b5168"), "water_light": rgba("#9cc4d8"),
    "edge": EDGE,
})

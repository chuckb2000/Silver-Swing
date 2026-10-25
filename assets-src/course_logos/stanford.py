"""Stanford Golf Course logo: an arcade in the style of the university's Main
Quad (buff sandstone, round Romanesque arches on squat columns, a red clay tile
roof) behind a putting green and its flag, in a round badge. Course chat's
design (developer, 2026-10-24: "something inspired by stanford's
architecture"; a first draft of the 12th-fairway oak was "a little bland").
Original drawing of a generic arcade, not a picture of any one building: no
tower, no letter "S", no redwood and no cardinal red, which belong to the
university's own marks (CLAUDE.md 14). The flag is yellow.

    python3 assets-src/course_logos/stanford.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined, paint, poly, rgba


def arcade(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    cx, cy, R = 16.0, 16.0, 15.0
    disc = np.hypot(X - cx, Y - cy) <= R
    paint(img, disc, c["sky"])
    paint(img, disc & (Y < 9.0) & (X < 14.0 - 0.8 * Y), c["sky_light"])

    # the wall: buff sandstone between the roof and the lawn
    x0, x1 = 3.2, 28.8
    wall = disc & (X >= x0) & (X <= x1) & (Y >= 10.4) & (Y <= 24.6)
    arches = []
    for ax in (9.6, 16.0, 22.4):
        hw = 2.4                           # half width of the opening
        spring = 15.4                      # where the round top starts
        opening = (((X - ax) ** 2 + (Y - spring) ** 2 <= hw * hw) | ((np.abs(X - ax) <= hw) & (Y >= spring))) & (Y <= 23.4)
        ring = (((X - ax) ** 2 + (Y - spring) ** 2 <= (hw + 1.2) ** 2) & (Y <= spring + 0.2)) & ~opening
        arches.append((ax, opening, ring))
    open_all = np.zeros(X.shape, bool)
    for _, o, _ in arches:
        open_all |= o
    paint(img, wall, c["stone"])
    for ax, o, ring in arches:
        paint(img, wall & ring, c["voussoir"])
        paint(img, wall & ring & (X < ax - 0.3), c["stone_light"])
        # the shaded walk behind the arch, its floor lit at the bottom
        paint(img, o, c["shade"])
        paint(img, o & (Y > 21.8), c["shade_floor"])
        paint(img, o & (X < ax - 1.2) & (Y > 16.0) & (Y <= 21.8), c["shade_light"])
    # squat columns with lit capitals
    for px in (6.3, 12.8, 19.2, 25.6):
        paint(img, wall & (np.abs(X - px) <= 1.4) & (np.abs(Y - 15.6) <= 0.5), c["stone_light"])
    paint(img, wall & (X > x1 - 1.2), c["stone_dark"])           # right end in shade
    paint(img, wall & (Y > 23.4), c["stone_dark"])                # plinth

    # the red clay tile roof: a low band with tile ridges
    roof = disc & poly(X, Y, [(1.6, 10.8), (5.0, 6.2), (27.0, 6.2), (30.4, 10.8)])
    paint(img, roof, c["tile"])
    paint(img, roof & (np.floor(X) % 2 == 0), c["tile_light"])
    paint(img, roof & (Y > 9.6), c["tile_dark"])
    paint(img, roof & (Y < 7.2), c["tile_ridge"])

    # lawn in front with a putting green and its yellow flag
    lawn = disc & (Y > 24.6)
    paint(img, lawn, c["lawn"])
    paint(img, lawn & (Y < 25.6), c["lawn_light"])
    putting = ((X - 21.0) / 5.6) ** 2 + ((Y - 27.6) / 1.9) ** 2 <= 1
    paint(img, disc & putting, c["green"])
    paint(img, disc & putting & (Y < 27.0) & (X < 21.0), c["green_light"])
    pole = (np.abs(X - 22.5) <= 0.5) & (Y >= 13.0) & (Y <= 27.6)
    paint(img, pole, c["pole"])
    paint(img, (np.abs(X - 22.5) <= 0.5) & (np.abs(Y - 27.9) <= 0.4), c["cup"])
    flag = poly(X, Y, [(22.9, 12.8), (27.4, 14.6), (22.9, 16.4)])
    paint(img, flag, c["flag"])
    paint(img, flag & (Y > 14.8), c["flag_dark"])

    # rim
    rim = disc & (np.hypot(X - cx, Y - cy) > R - 1.2)
    paint(img, rim, c["rim"])
    paint(img, rim & (X + Y > 34.0), c["rim_dark"])
    return outlined(img, c["edge"])


LOGO = (arcade, {
    "sky": rgba("#a9cfe6"), "sky_light": rgba("#d4e9f3"),
    "green": rgba("#8dcb5d"), "green_light": rgba("#b2de86"), "cup": rgba("#26272d"),
    "stone": rgba("#d9bf8c"), "stone_light": rgba("#efdcb2"), "stone_dark": rgba("#a8895a"),
    "voussoir": rgba("#c4a46e"), "shade": rgba("#3e3127"), "shade_light": rgba("#5a4836"), "shade_floor": rgba("#8a7456"),
    "tile": rgba("#b4502e"), "tile_light": rgba("#cf6a3e"), "tile_dark": rgba("#7e3220"), "tile_ridge": rgba("#e08a58"),
    "pole": rgba("#f6f6f2"), "flag": rgba("#f2c94c"), "flag_dark": rgba("#c99a26"),
    "lawn": rgba("#4f8a37"), "lawn_light": rgba("#7bbd50"),
    "rim": rgba("#f1e7c9"), "rim_dark": rgba("#c9b98f"),
    "edge": EDGE,
})


if __name__ == "__main__":
    import sys

    from PIL import Image
    fn, cols = LOGO
    im = Image.fromarray(fn(cols), "RGBA").resize((S * 8, S * 8), Image.NEAREST)
    bg = Image.new("RGBA", im.size, (40, 44, 52, 255))
    bg.alpha_composite(im)
    bg.save(sys.argv[1])
    print(sys.argv[1])


# ------------------------------------------------------------------ 2026-10-25
# The developer chose Concept 1 of the logo concepts, "The Arcade"
# (assets-src/logo_concepts/stanford/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("stanford", "concept1")

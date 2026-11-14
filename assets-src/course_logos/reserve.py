"""The Reserve Vineyards & Golf Club (the club: its card on the course-select screen) logo:
a round badge of a summer hillside in the Tualatin Valley, vine rows running up to a lone
Oregon white oak on the crest, with a pin flag in the foreground. Original drawing (course
chat, 2026-11-13); nothing from the club's own branding. The two courses have their own
logos (reserve_north, reserve_south).

    python3 assets-src/course_logos/reserve.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, paint, poly, seg, rgba


def hillside(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    d = np.hypot(X - 16, Y - 16)
    disc = d <= 14.6
    paint(img, d <= 15.6, c["edge"])
    paint(img, disc, c["sky"])
    # a low summer sun behind the oak's right
    paint(img, disc & (np.hypot(X - 24.5, Y - 9.0) <= 3.2), c["sun"])
    # the hill: crest a little right of centre
    crest = 14.0 + 0.018 * (X - 20.0) ** 2
    hill = disc & (Y >= crest)
    paint(img, hill, c["grass"])
    paint(img, hill & (Y < crest + 1.0), c["grass_light"])  # sunlit brow
    # vine rows: dark lines from the foot of the badge converging on the crest under the oak
    vx, vy = 20.0, 14.6
    rows = np.zeros_like(hill)
    for xb in (-6.0, 0.0, 6.0, 12.0, 18.0, 24.0, 30.0, 36.0, 42.0):
        rows |= seg(X, Y, xb, 31.5, vx + (xb - vx) * 0.5, vy + 1.6, 0.62)
    rows &= hill & (Y > crest + 1.4)
    paint(img, rows, c["vine"])
    # the leaves on the near rows: a lighter green dot every other pixel low down
    paint(img, rows & (Y > 20) & ((np.floor(X) + np.floor(Y)) % 2 == 0), c["vine_light"])
    # the oak on the crest: trunk and a broad rounded crown, lit on its upper left
    paint(img, seg(X, Y, 20.0, 15.0, 20.0, 11.0, 0.6), c["trunk"])
    crown = (np.hypot((X - 20.0) / 5.4, (Y - 9.4) / 3.9) <= 1) | (np.hypot((X - 16.6) / 2.6, (Y - 10.6) / 2.2) <= 1) \
        | (np.hypot((X - 23.4) / 2.6, (Y - 10.6) / 2.2) <= 1)
    crown &= disc
    paint(img, crown, c["oak"])
    paint(img, crown & (np.hypot(X - 18.4, Y - 8.0) <= 2.4), c["oak_light"])
    paint(img, crown & (Y > 11.4) & (X > 19.0), c["oak_dark"])
    # the pin: a white pole and a claret flag, standing in the near-left rows
    pole = (np.floor(X) == 8) & (Y >= 11.0) & (Y <= 24.0)
    paint(img, pole, c["pole"])
    flag = poly(X, Y, [(9.0, 10.8), (15.4, 13.0), (9.0, 15.4)])
    paint(img, flag, c["flag"])
    paint(img, flag & (Y < 14.0), c["flag_light"])
    paint(img, disc & (np.hypot((X - 8.5) / 1.8, (Y - 24.4) / 0.8) <= 1) & ~pole, c["cup"])
    return img


LOGO = (hillside, {
    "sky": rgba("#bcdbe4"), "sun": rgba("#f6e7a6"),
    "grass": rgba("#c9a95a"), "grass_light": rgba("#e0c577"),
    "vine": rgba("#3f6a2a"), "vine_light": rgba("#6f9a3c"),
    "trunk": rgba("#4a3322"), "oak": rgba("#3d5a24"), "oak_light": rgba("#5f8233"), "oak_dark": rgba("#29401a"),
    "pole": rgba("#f4f2ea"), "flag": rgba("#8e2a3d"), "flag_light": rgba("#b4415a"), "cup": rgba("#2b2219"),
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

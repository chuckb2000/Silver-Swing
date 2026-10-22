"""Rock Creek Park Golf logo: Joaquin Miller's log cabin on the bank of Rock
Creek under a tulip poplar in autumn gold.

Why this (course chat, 2026-10-22; the developer left the design open):
- The poet Joaquin Miller built the cabin on Meridian Hill in the 1880s; in
  1912 it was moved into Rock Creek Park, by the creek just north of Military
  Road. It stands at the course's south-west corner and is said to be the only
  log cabin left in the District (NPS administrative history; Meridian
  International Center).
- Tulip poplars are Rock Creek Park's most prominent canopy tree (NPS), and the
  tallest trees around the back nine; their autumn gold is the course theme's
  accent colour.
- The creek with its grey stones gives the name.
Original drawing; nothing from the course's own branding (its card shows a
songbird, so no bird here).

    python3 assets-src/course_logos/rock_creek.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg, shade


def cabin(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the tulip poplar behind the cabin, left: a tall oval crown on a grey trunk
    trunk = seg(X, Y, 7.4, 26.0, 7.0, 13.0, 1.1)
    paint(img, trunk, c["bark"])
    paint(img, trunk & (X > 7.6), c["bark_dark"])
    crown = (np.hypot((X - 7.6) / 6.4, (Y - 9.6) / 8.6) <= 1) & (Y >= 1.4)
    crown &= ~(np.hypot(X - 13.2, Y - 15.6) <= 2.0)                 # a notch so it reads as leaves
    paint(img, crown, c["gold"])
    # leaf clumps: light on the upper left, shade on the lower right
    for cx, cy, r in [(5.2, 5.4, 2.0), (9.0, 3.8, 1.6), (3.6, 10.0, 1.6), (8.0, 8.4, 1.8)]:
        paint(img, crown & (np.hypot(X - cx, Y - cy) <= r), c["gold_light"])
    paint(img, crown & (np.hypot((X - 10.4) / 4.0, (Y - 14.4) / 3.6) <= 1), c["gold_dark"])
    paint(img, crown & (X > 12.0) & (Y > 7.0), c["gold_dark"])
    paint(img, crown & (np.hypot(X - 3.4, Y - 15.4) <= 1.6), c["gold_dark"])
    paint(img, trunk & (Y > 16.6), c["bark"])                      # trunk below the crown
    paint(img, trunk & (Y > 16.6) & (X > 7.6), c["bark_dark"])

    # the creek bank and the water with stones
    bank = (Y >= 25.6 + 0.4 * np.sin(X * 0.9)) & (Y < 28.0) & (X >= 1.5) & (X <= 30.5)
    paint(img, bank, c["grass"])
    paint(img, bank & ~np.roll(bank, 1, axis=0), c["grass_light"])
    water = (Y >= 28.0) & (Y <= 30.6) & (X >= 1.5) & (X <= 30.5)
    paint(img, water, c["water"])
    paint(img, water & (((X.astype(int) + 2 * Y.astype(int)) % 7) == 0) & (Y < 29.6), c["water_light"])
    for cx, cy, rx in [(5.0, 29.2, 1.6), (13.6, 29.6, 1.3), (25.8, 29.0, 1.8)]:
        stone = np.hypot((X - cx) / rx, (Y - cy) / 1.1) <= 1
        paint(img, stone, c["stone"])
        paint(img, stone & (Y < cy - 0.2) & (X < cx), c["stone_light"])
        paint(img, stone & (X > cx + 0.4), c["stone_dark"])

    # stone chimney behind the right slope of the roof (drawn first, the roof covers its foot)
    chim = (X >= 23.4) & (X <= 26.8) & (Y >= 6.4) & (Y < 16.0)
    paint(img, chim, c["stone"])
    paint(img, chim & (((X.astype(int) + 2 * (Y.astype(int) // 2)) % 3) == 0), c["stone_dark"])
    paint(img, chim & (X < 24.4), c["stone_light"])
    paint(img, (X >= 23.0) & (X <= 27.2) & (Y >= 6.0) & (Y < 7.2), c["stone_dark"])   # cap

    # the cabin with its gable end to us: log walls, dark chinking, pale notched log ends
    rows = (Y.astype(int) % 2) == 0
    walls = (X >= 12.0) & (X <= 26.4) & (Y >= 17.4) & (Y < 26.6)
    gable = poly(X, Y, [(12.6, 17.6), (19.2, 11.2), (25.8, 17.6)])
    body = walls | gable
    paint(img, body, c["log"])
    paint(img, body & ~rows, c["log_dark"])                        # chinking between the logs
    paint(img, body & rows & (X < 14.0), c["log_light"])
    ends = (((X >= 10.8) & (X < 12.0)) | ((X > 26.4) & (X <= 27.6))) & (Y >= 17.4) & (Y < 26.6) & rows
    paint(img, ends, c["log_end"])
    # door in the middle and a lit window in the gable
    door = (np.abs(X - 19.2) <= 1.7) & (Y >= 20.2) & (Y < 26.6)
    paint(img, door, c["door"])
    paint(img, door & (X < 18.4), c["door_light"])
    win = (np.abs(X - 19.2) <= 1.2) & (Y >= 14.4) & (Y <= 16.6)
    paint(img, win, c["window"])
    # shake roof: two slopes meeting at the ridge, overhanging the walls
    outer = poly(X, Y, [(9.4, 18.4), (19.2, 8.4), (29.0, 18.4), (26.6, 18.4), (19.2, 11.0), (11.8, 18.4)])
    paint(img, outer, c["roof"])
    paint(img, outer & (X < 19.2), c["roof_light"])                # the slope facing the sun
    paint(img, outer & (X < 19.2) & ((X.astype(int) + Y.astype(int)) % 3 == 0), c["roof"])
    paint(img, outer & (X >= 19.2) & ((X.astype(int) - Y.astype(int)) % 3 == 0), c["roof_dark"])
    return outlined_outside(img, c["edge"])


LOGO = (cabin, {
    "gold": rgba("#e0a12a"), "gold_light": rgba("#f6cf55"), "gold_dark": rgba("#a8661c"),
    "bark": rgba("#7d7468"), "bark_dark": rgba("#544c43"),
    "log": rgba("#9a6438"), "log_light": rgba("#bf8550"), "log_dark": rgba("#5e3a20"),
    "log_end": rgba("#e3c08a"),
    "roof": rgba("#6b5848"), "roof_light": rgba("#8f7a66"), "roof_dark": rgba("#45372c"),
    "door": rgba("#3a2416"), "door_light": rgba("#57391f"), "window": rgba("#f2d77a"),
    "stone": rgba("#a7a39a"), "stone_light": rgba("#cbc8bf"), "stone_dark": rgba("#76736c"),
    "grass": rgba("#5d8a3a"), "grass_light": rgba("#84b24e"),
    "water": rgba("#3f7fb5"), "water_light": rgba("#8fc1e6"),
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

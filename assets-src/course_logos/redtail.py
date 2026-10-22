"""RedTail logo: a red fox sitting in profile, facing left, its big brush of a
tail curled round behind with a white tip, black socks, a white chin and bib
(developer, 2026-10-22: "a fox for redtail golf course"). Original drawing;
nothing from the course's own branding.

The file name is the course id the course chat is expected to use
(`redtail`); rename the file if the course is built under another id.

    python3 assets-src/course_logos/redtail.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def fox(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # grass underfoot
    grass = (Y >= 28.2 - 0.5 * np.sin(X * 1.4) - 0.3 * np.sin(X * 3.1 + 0.6)) & (Y <= 31.0) & (np.abs(X - 15.5) <= 12.5)
    paint(img, grass, c["grass"])
    paint(img, grass & ~np.roll(grass, 1, axis=0), c["grass_light"])
    paint(img, grass & (Y > 30.0), c["grass_dark"])

    # the tail: a thick brush swept round to the right and up, drawn first (behind the body)
    pts = [(19.0, 26.6), (23.0, 27.0), (26.4, 25.4), (28.4, 22.4), (28.8, 18.8), (27.8, 15.2), (26.0, 12.6)]
    rad = [2.2, 2.8, 3.1, 3.1, 2.9, 2.5, 1.8]
    tail = np.zeros(X.shape, bool)
    for k in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[k], pts[k + 1]
        for t in np.linspace(0, 1, 6):
            r = rad[k] + (rad[k + 1] - rad[k]) * t
            tail |= np.hypot(X - (x0 + (x1 - x0) * t), Y - (y0 + (y1 - y0) * t)) <= r
    paint(img, tail, c["fur"])
    paint(img, tail & (X > 28.6) & (Y > 16.0), c["fur_dark"])            # the far side, in shade
    paint(img, tail & (Y > 27.4), c["fur_dark"])
    tip = tail & (Y < 16.2)
    paint(img, tip, c["white"])
    paint(img, tip & (X > 27.6), c["white_shade"])

    # body: haunch and chest, sitting upright
    haunch = np.hypot((X - 19.0) / 5.2, (Y - 22.6) / 5.0) <= 1
    chest = np.hypot((X - 14.2) / 4.0, (Y - 18.6) / 6.0) <= 1
    neck = seg(X, Y, 11.6, 11.6, 14.0, 16.0, 2.8)
    body = haunch | chest | neck
    paint(img, body, c["fur"])
    paint(img, body & (X > 21.4) & (Y > 20.0), c["fur_dark"])            # back of the haunch in shade
    paint(img, haunch & (Y > 26.0), c["fur_dark"])
    paint(img, body & seg(X, Y, 13.4, 13.0, 18.2, 18.2, 1.0) & ~chest, c["fur_light"])  # lit back of the neck
    # white bib down the front of the chest
    bib = poly(X, Y, [(9.6, 13.2), (12.8, 14.0), (13.2, 18.0), (11.6, 22.0), (10.4, 18.0)]) & body
    paint(img, bib, c["white"])
    paint(img, bib & (X > 12.4), c["white_shade"])

    # front legs with black socks; a hind paw showing under the haunch
    legs = seg(X, Y, 11.8, 20.0, 11.4, 28.4, 0.9) | seg(X, Y, 14.6, 21.0, 14.4, 28.4, 0.9)
    paint(img, legs, c["fur"])
    paint(img, legs & (Y > 24.0), c["sock"])
    paint(img, seg(X, Y, 10.4, 28.4, 12.2, 28.4, 0.6) | seg(X, Y, 13.4, 28.4, 15.2, 28.4, 0.6), c["sock"])
    hind = seg(X, Y, 16.6, 28.2, 20.4, 28.2, 0.8)
    paint(img, hind, c["sock"])

    # head: a rounded skull, the long snout to the left, tall pointed ears
    skull = np.hypot((X - 10.8) / 4.0, (Y - 9.2) / 3.4) <= 1
    snout = poly(X, Y, [(8.0, 8.4), (2.6, 11.0), (2.8, 12.2), (8.8, 13.0)])
    ear_l = poly(X, Y, [(7.6, 7.6), (8.4, 1.8), (10.8, 6.6)])
    ear_r = poly(X, Y, [(11.0, 6.4), (13.6, 1.8), (14.4, 8.2)])
    head = skull | snout | ear_l | ear_r
    paint(img, head, c["fur"])
    paint(img, (ear_l | ear_r) & ~np.roll(ear_l | ear_r, 1, axis=1), c["fur_light"])  # lit from the upper left
    paint(img, skull & ~np.roll(skull, 1, axis=0) & (X < 12.6), c["fur_light"])
    paint(img, snout & ~np.roll(snout, 1, axis=0), c["fur_light"])
    paint(img, skull & (X > 13.6), c["fur_dark"])
    paint(img, poly(X, Y, [(8.6, 6.6), (8.9, 3.4), (10.0, 6.2)]), c["sock"])     # inside of the ears
    paint(img, poly(X, Y, [(12.0, 6.2), (13.5, 3.4), (13.6, 7.0)]), c["sock"])
    # white cheek and chin under the snout
    cheek = poly(X, Y, [(3.4, 12.2), (8.6, 11.0), (12.0, 12.2), (10.4, 13.8), (5.0, 12.8)]) & head
    paint(img, cheek, c["white"])
    paint(img, (np.abs(X - 3.0) < 0.7) & (np.abs(Y - 11.2) < 0.7), c["nose"])  # nose
    paint(img, (np.abs(X - 9.6) < 0.5) & (np.abs(Y - 9.0) < 0.5), c["eye"])    # eye
    return outlined_outside(img, c["edge"])


LOGO = (fox, {
    "fur": rgba("#d6602a"), "fur_light": rgba("#f08a3e"), "fur_dark": rgba("#9e421c"),
    "white": rgba("#f4efe4"), "white_shade": rgba("#cfc6b4"),
    "sock": rgba("#2b1b15"), "nose": rgba("#1a100c"), "eye": rgba("#1a100c"),
    "grass": rgba("#4f8a3a"), "grass_light": rgba("#78b24c"), "grass_dark": rgba("#2f5f2a"),
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

"""The Reserve North logo: a red-winged blackbird calling from a cattail, for the creek, the
wet meadow and the ponds that run through Bob Cupp's links-style North course. A round badge
like the club's (reserve). Original drawing (course chat, 2026-11-13); nothing from the
club's own branding.

    python3 assets-src/course_logos/reserve_north.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, paint, poly, seg, rgba


def blackbird(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    d = np.hypot(X - 16, Y - 16)
    disc = d <= 14.6
    paint(img, d <= 15.6, c["edge"])
    paint(img, disc, c["sky"])
    # straw-coloured marsh grass along the foot of the badge
    marsh = disc & (Y >= 25.0 + 0.8 * np.sin(X * 1.3))
    paint(img, marsh, c["reed"])
    paint(img, marsh & ((np.floor(X) % 3) == 0) & (Y < 28.5), c["reed_light"])
    # the cattail: a slightly bowed stem, a long leaf, and the brown seed head
    stem = seg(X, Y, 11.5, 31.0, 12.4, 17.0, 0.55) | seg(X, Y, 12.4, 17.0, 12.6, 4.0, 0.5)
    paint(img, stem & disc, c["stem"])
    leaf = seg(X, Y, 10.5, 31.0, 7.4, 14.0, 0.7) | seg(X, Y, 7.4, 14.0, 6.6, 10.5, 0.45)
    paint(img, leaf & disc, c["stem"])
    paint(img, seg(X, Y, 10.2, 29.0, 7.8, 16.0, 0.3) & disc, c["stem_light"])
    head = np.hypot((X - 12.6) / 1.5, (Y - 9.6) / 4.0) <= 1
    paint(img, head, c["cattail"])
    paint(img, head & (X < 12.4), c["cattail_light"])
    # the blackbird, perched on the stem facing right, bill open
    body = np.hypot((X - 17.6) / 5.0, (Y - 17.8) / 3.4) <= 1
    tail = poly(X, Y, [(13.4, 19.0), (9.6, 24.6), (11.8, 25.0), (15.6, 20.6)])
    headm = np.hypot(X - 22.0, Y - 14.2) <= 2.6
    bird = body | tail | headm
    paint(img, bird, c["black"])
    paint(img, bird & (np.hypot(X - 16.6, Y - 15.8) <= 2.6) & body, c["sheen"])  # gloss on the back
    paint(img, headm & (np.hypot(X - 21.2, Y - 13.2) <= 1.0), c["sheen"])
    # the shoulder patch: scarlet with a buff lower edge
    patch = np.hypot((X - 18.6) / 2.4, (Y - 17.0) / 1.5) <= 1
    paint(img, patch, c["red"])
    paint(img, patch & (Y < 16.4) & (X < 18.8), c["red_light"])
    paint(img, (np.hypot((X - 18.4) / 2.4, (Y - 18.6) / 0.8) <= 1) & ~patch & body, c["buff"])
    # bill (open, calling) and eye
    paint(img, poly(X, Y, [(23.9, 13.0), (27.4, 12.6), (24.2, 14.0)]), c["bill"])
    paint(img, poly(X, Y, [(24.0, 14.6), (26.8, 15.6), (23.8, 15.4)]), c["bill"])
    paint(img, (np.floor(X) == 22) & (np.floor(Y) == 13), c["eye"])
    # feet round the stem
    paint(img, seg(X, Y, 16.0, 20.8, 13.2, 21.4, 0.45), c["bill"])
    return img


LOGO = (blackbird, {
    "sky": rgba("#cfe6dc"), "reed": rgba("#c7a95c"), "reed_light": rgba("#dfc47a"),
    "stem": rgba("#55803a"), "stem_light": rgba("#7ba652"),
    "cattail": rgba("#6b3f22"), "cattail_light": rgba("#8c5a32"),
    "black": rgba("#17191f"), "sheen": rgba("#3c4458"),
    "red": rgba("#d23a2e"), "red_light": rgba("#f0624b"), "buff": rgba("#e7c46a"),
    "bill": rgba("#5a5f68"), "eye": rgba("#0b0c10"),
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

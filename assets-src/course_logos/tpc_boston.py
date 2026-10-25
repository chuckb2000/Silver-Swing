"""TPC Boston logo: a baby blue pair of lederhosen (developer, 2026-10-20) -
short, chubby baby blue shorts with braces, a chest bar with an edelweiss, horn buttons
on the front flap and navy-trimmed cuffs. Original drawing; nothing from the
club's own branding.

    python3 assets-src/course_logos/tpc_boston.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def lederhosen(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # braces: two straps from the shoulders down to the waistband
    straps = seg(X, Y, 10.2, 1.4, 11.2, 14.0, 1.0) | seg(X, Y, 21.8, 1.4, 20.8, 14.0, 1.0)
    paint(img, straps, c["strap"])
    paint(img, straps & (X < 11.0) & (X < 16), c["strap_light"])
    paint(img, straps & (X > 21.6), c["strap_dark"])

    # shorts: a rounded seat and two short, wide legs (a baby's proportions)
    body = poly(X, Y, [(7.0, 14.0), (25.0, 14.0), (26.0, 20.0), (26.6, 27.6), (17.8, 27.6),
                       (16.0, 22.0), (14.2, 27.6), (5.4, 27.6), (6.0, 20.0)])
    paint(img, body, c["leather"])
    paint(img, body & (X < 9.6), c["leather_light"])                 # lit left side
    paint(img, body & ((X > 23.0) | ((X > 17.6) & (Y > 24.6))), c["leather_dark"])  # shade right and lower right
        # side embroidery: a short pale stitch line down each leg
    paint(img, body & seg(X, Y, 7.4, 21.0, 7.0, 25.0, 0.35), c["stitch"])
    paint(img, body & seg(X, Y, 24.6, 21.0, 25.0, 25.0, 0.35), c["stitch_dark"])

    # navy-trimmed cuffs
    cuffs = body & (Y >= 25.6)
    paint(img, cuffs, c["trim"])
    paint(img, cuffs & (Y < 26.4), c["trim_light"])
    paint(img, cuffs & (X > 20.0), c["trim_dark"])

    # waistband with the brace buttons
    band = body & (Y < 15.8)
    paint(img, band, c["band"])
    paint(img, band & (Y < 14.8) & (X < 16.0), c["leather_light"])
    for bx in (11.2, 20.8):
        paint(img, np.hypot(X - bx, Y - 14.9) <= 0.75, c["button"])

    # front flap (Hosenlatz): a stitched panel with two horn buttons
    flap = (X >= 11.6) & (X <= 20.4) & (Y >= 16.2) & (Y <= 21.6)
    flap_in = (X >= 12.6) & (X <= 19.4) & (Y >= 17.2) & (Y <= 20.6)
    paint(img, flap & ~flap_in, c["stitch"])
    paint(img, flap & ~flap_in & (X > 19.6), c["stitch_dark"])
    for bx in (13.4, 18.6):
        paint(img, np.hypot(X - bx, Y - 18.6) <= 0.8, c["button"])
        paint(img, np.hypot(X - bx - 0.4, Y - 19.0) <= 0.4, c["button_dark"])

    # chest bar between the braces, with an edelweiss
    bar = (X >= 9.4) & (X <= 22.6) & (Y >= 5.6) & (Y <= 9.6)
    paint(img, bar, c["bar"])
    paint(img, bar & (Y < 6.4), c["bar_light"])
    paint(img, bar & (Y > 8.8), c["bar_dark"])
    petals = np.zeros(X.shape, bool)
    for dx, dy in ((0, -1.4), (1.4, 0), (0, 1.4), (-1.4, 0)):
        petals |= np.hypot(X - 16.0 - dx, Y - 7.6 - dy) <= 0.9
    paint(img, petals, c["flower"])
    paint(img, petals & (X > 16.6) & (Y > 8.0), c["flower_dark"])
    paint(img, np.hypot(X - 16.0, Y - 7.6) <= 0.7, c["flower_eye"])
    return outlined_outside(img, c["edge"])


LOGO = (lederhosen, {
    "leather": rgba("#8ec3ea"), "leather_light": rgba("#b8dcf6"), "leather_dark": rgba("#5f97c4"),
    "strap": rgba("#7ab2de"), "strap_light": rgba("#a6d0f0"), "strap_dark": rgba("#4f84b2"),
    "band": rgba("#6aa3d2"),
    "stitch": rgba("#f4f8fc"), "stitch_dark": rgba("#c4d8ea"),
    "trim": rgba("#2f5a92"), "trim_light": rgba("#4a78b4"), "trim_dark": rgba("#203f6c"),
    "button": rgba("#efe4c8"), "button_dark": rgba("#b9a882"),
    "bar": rgba("#5f97c4"), "bar_light": rgba("#86b8e0"), "bar_dark": rgba("#40729e"),
    "flower": rgba("#f6f3ea"), "flower_dark": rgba("#c9c4b4"), "flower_eye": rgba("#e8c040"),
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
# The developer chose Concept 1 of the logo concepts, "Lederhosen, Sunday Best"
# (assets-src/logo_concepts/tpc_boston/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("tpc_boston", "concept1")

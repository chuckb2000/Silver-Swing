"""Bandon Preserve logo: a western snowy plover on the sand (developer,
2026-10-22: the plover replaces the salal sprig). Original drawing; nothing
from the course's own branding.

A small round shorebird of the Oregon dunes: pale sandy-grey back, white face
and underparts, dark patches at the side of the breast, a dark bar on the head,
a short black bill, grey legs, standing on a strip of beach with a line of surf
behind.

    python3 assets-src/logos.py bandon_preserve
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, rgba, seg


def plover(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # beach and a line of surf
    sand = (((X - 16.0) / 14.5) ** 2 + ((Y - 30.0) / 3.4) ** 2 <= 1) & (Y <= 31.5)
    paint(img, sand, c["sand"])
    paint(img, sand & (Y > 30.3), c["sand_dark"])
    surf = (((X - 16.0) / 13.0) ** 2 + ((Y - 27.0) / 1.6) ** 2 <= 1) & (Y < 27.4) & ~sand
    paint(img, surf, c["surf"])
    paint(img, surf & (Y < 26.2), c["surf_light"])

    # legs
    legs = seg(X, Y, 14.2, 21.0, 13.6, 28.4, 0.45) | seg(X, Y, 17.6, 21.0, 18.4, 28.4, 0.45)
    paint(img, legs, c["leg"])

    # body: a plump oval, tail up to the right
    body = (((X - 16.6) / 8.6) ** 2 + ((Y - 17.0) / 5.6) ** 2 <= 1)
    tail = seg(X, Y, 22.0, 15.4, 27.6, 13.6, 1.3)
    paint(img, body | tail, c["belly"])
    back = (body | tail) & (Y < 16.2 + 0.18 * (X - 16.0))
    paint(img, back, c["back"])
    paint(img, back & (Y < 13.2 + 0.18 * (X - 16.0)), c["back_light"])   # lit from the upper left
    wing = (((X - 19.0) / 5.2) ** 2 + ((Y - 15.4) / 2.0) ** 2 <= 1)
    paint(img, wing & body, c["wing"])
    paint(img, tail & (X > 25.0), c["tip"])
    paint(img, body & (Y > 20.4), c["belly_shade"])

    # head
    head = (((X - 9.4) / 4.4) ** 2 + ((Y - 11.6) / 4.0) ** 2 <= 1)
    paint(img, head, c["belly"])
    cap = head & (Y < 10.6)
    paint(img, cap, c["back"])
    paint(img, cap & (Y < 9.0) & (X < 10.0), c["back_light"])
    paint(img, head & (Y >= 9.6) & (Y < 10.6) & (X < 9.8), c["mark"])     # dark bar over the forehead
    paint(img, head & (np.abs(Y - 12.0) < 0.6) & (X > 9.2) & (X < 12.6), c["mark"])   # dark ear patch
    paint(img, (np.abs(X - 8.6) < 0.6) & (np.abs(Y - 11.5) < 0.6), c["eye"])
    # breast patches (the partial band)
    for px in (11.4, 14.6):
        paint(img, (((X - px) / 1.6) ** 2 + ((Y - 15.6) / 1.4) ** 2 <= 1) & (body | head), c["mark"])

    # bill
    paint(img, seg(X, Y, 5.4, 12.0, 3.0, 12.6, 0.5), c["mark"])
    return outlined_outside(img, c["edge"])


LOGO = (plover, {
    "back": rgba("#b9a07a"), "back_light": rgba("#d6c29c"), "wing": rgba("#9c8460"), "tip": rgba("#5a4a38"),
    "belly": rgba("#f6f3ea"), "belly_shade": rgba("#d9d4c6"),
    "mark": rgba("#2b2622"), "eye": rgba("#0d0b0a"), "leg": rgba("#4a4a4f"),
    "sand": rgba("#e3cf98"), "sand_dark": rgba("#c4ab72"),
    "surf": rgba("#4f8fbf"), "surf_light": rgba("#bfe0f2"),
    "edge": EDGE,
})


# ------------------------------------------------------------------ 2026-10-25
# The developer chose Concept 1 of the logo concepts, "The Snowy Plover"
# (assets-src/logo_concepts/bandon_preserve/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("bandon_preserve", "concept1")

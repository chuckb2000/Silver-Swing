"""Triggs Memorial logo: a Rhode Island Red (a rooster: red comb and wattles,
dark sickle tail) standing on grass, facing left (developer, 2026-10-20: "a
Rhode Island Red, a chicken"). Original drawing; nothing from the course's own
branding.

    python3 assets-src/course_logos/triggs.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import math

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def rooster(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # grass underfoot
    grass = (Y >= 28.0 - 0.6 * np.sin(X * 1.3) - 0.4 * np.sin(X * 2.9 + 1.0)) & (Y <= 31.0) & (np.abs(X - 16) <= 13.5)
    paint(img, grass, c["grass"])
    paint(img, grass & ~np.roll(grass, 1, axis=0), c["grass_light"])
    paint(img, grass & (Y > 30.0), c["grass_dark"])

    # yellow legs with forward toes
    legs = seg(X, Y, 15.2, 21.5, 14.6, 28.6, 0.6) | seg(X, Y, 19.4, 21.5, 20.0, 28.6, 0.6)
    toes = seg(X, Y, 14.6, 28.6, 11.8, 29.2, 0.5) | seg(X, Y, 20.0, 28.6, 17.2, 29.2, 0.5)
    paint(img, legs | toes, c["leg"])
    paint(img, legs & (X > 19.6), c["leg_dark"])

    # tail: a dark fan rising behind the body, sickle feathers curling back
    tail = poly(X, Y, [(21.5, 14.0), (24.0, 5.0), (27.0, 4.2), (29.6, 6.6), (29.4, 10.6), (27.0, 15.6), (23.0, 18.0)])
    paint(img, tail, c["tail"])
    paint(img, tail & (X < 25.6) & (Y < 10.0), c["tail_sheen"])        # green sheen, lit side
    for x0, y0, x1, y1 in ((24.6, 6.0, 27.0, 13.6), (27.0, 5.4, 28.4, 12.0)):
        paint(img, seg(X, Y, x0, y0, x1, y1, 0.4) & tail, c["tail_dark"])

    # body: a tilted egg, back rising toward the tail
    a = math.radians(-14)
    U = (X - 17.0) * math.cos(a) + (Y - 16.4) * math.sin(a)
    V = -(X - 17.0) * math.sin(a) + (Y - 16.4) * math.cos(a)
    body = (U / 8.4) ** 2 + (V / 6.0) ** 2 <= 1
    # neck up to the head on the left
    neck = seg(X, Y, 10.8, 14.0, 9.6, 9.0, 2.6)
    head = np.hypot(X - 9.0, Y - 7.6) <= 3.2
    paint(img, body | neck | head, c["red"])
    paint(img, (body | neck) & (V < -2.8) & (U < 3.0), c["red_light"])  # lit back and neck, upper left
    paint(img, neck & (X < 9.4), c["red_light"])
    paint(img, head & (X < 8.6) & (Y < 7.6), c["red_light"])
    paint(img, body & (V > 3.6), c["red_dark"])                          # belly in shade
    # wing: a darker folded patch with a lit leading edge and two feather lines
    wing = ((U - 1.2) / 5.2) ** 2 + ((V - 0.4) / 3.0) ** 2 <= 1
    paint(img, body & wing, c["red_dark"])
    paint(img, body & wing & ~np.roll(wing, 1, axis=0), c["red_light"])
    for k in (0.0, 2.0):
        paint(img, body & wing & seg(X, Y, 15.0 + k, 17.2, 20.6 + k, 15.4, 0.35), c["wing_line"])

    # single red comb on top of the head, wattle under the beak
    comb = np.zeros(X.shape, bool)
    for cx, cy, r in ((6.8, 4.4, 1.2), (8.6, 3.2, 1.4), (10.6, 3.6, 1.3), (12.0, 4.8, 1.0)):
        comb |= np.hypot(X - cx, Y - cy) <= r
    comb |= (X >= 6.0) & (X <= 12.4) & (Y >= 4.4) & (Y <= 5.6)
    paint(img, comb & ~head | (comb & (Y < 5.0)), c["comb"])
    paint(img, comb & (Y < 4.2) & (X < 9.0), c["comb_light"])
    wattle = (((X - 6.4) / 1.3) ** 2 + ((Y - 11.2) / 2.0) ** 2 <= 1)
    paint(img, wattle, c["comb"])
    paint(img, wattle & (X > 6.8), c["comb_dark"])
    # pale face patch, eye and beak
    paint(img, (np.abs(X - 7.4) < 0.9) & (np.abs(Y - 8.4) < 0.9) & head, c["face"])
    paint(img, (np.abs(X - 8.0) < 0.5) & (np.abs(Y - 7.0) < 0.5), c["eye"])
    beak = poly(X, Y, [(6.2, 7.2), (6.2, 9.2), (3.2, 8.4)])
    paint(img, beak, c["beak"])
    paint(img, beak & (Y > 8.4), c["beak_dark"])
    return outlined_outside(img, c["edge"])


LOGO = (rooster, {
    "red": rgba("#9c2f1c"), "red_light": rgba("#c4502a"), "red_dark": rgba("#6a1e14"), "wing_line": rgba("#4c150f"),
    "tail": rgba("#22262a"), "tail_sheen": rgba("#2f5a48"), "tail_dark": rgba("#101316"),
    "comb": rgba("#e0302c"), "comb_light": rgba("#ff6a55"), "comb_dark": rgba("#a81c1c"),
    "face": rgba("#e86a4a"), "eye": rgba("#1a1010"),
    "beak": rgba("#f0c040"), "beak_dark": rgba("#c08c20"), "leg": rgba("#f0c040"), "leg_dark": rgba("#c08c20"),
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


# ------------------------------------------------------------------ 2026-10-25
# The developer chose Concept 1 of the logo concepts, "Reveille"
# (assets-src/logo_concepts/triggs/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("triggs", "concept1")

"""Shorty's (Bandon) logo: a spotted fawn, a young elk or deer, standing in dune
grass and facing left (developer, 2026-10-22: "some kind of baby elk or deer").
Original drawing; nothing from the course's own branding.

The file name is the course id the course chat is expected to use (`shortys`);
rename the file if the course is built under another id.

    python3 assets-src/course_logos/shortys.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, poly, rgba, seg


def fawn(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # dune grass underfoot, a few blades standing up
    ground = (Y >= 28.4 - 0.4 * np.sin(X * 1.7)) & (Y <= 31.0) & (np.abs(X - 16) <= 13.0)
    paint(img, ground, c["grass"])
    paint(img, ground & (Y > 30.0), c["grass_dark"])
    blades = np.zeros(X.shape, bool)
    for x0, x1, top in ((4.6, 3.6, 25.0), (6.4, 7.6, 24.2), (27.0, 28.2, 24.6), (25.4, 24.8, 25.6), (17.6, 18.6, 26.0)):
        blades |= seg(X, Y, x0, 28.8, x1, top, 0.45)
    paint(img, blades, c["blade"])
    paint(img, ground & ~np.roll(ground, 1, axis=0), c["blade"])

    # legs: long and thin, the far pair darker; small dark hooves
    far = seg(X, Y, 13.6, 20.0, 13.9, 28.6, 0.6) | seg(X, Y, 22.6, 19.6, 23.8, 24.2, 0.7) | seg(X, Y, 23.8, 24.2, 23.2, 28.6, 0.55)
    near = seg(X, Y, 11.4, 20.0, 11.0, 28.6, 0.65) | seg(X, Y, 20.6, 19.8, 21.6, 24.0, 0.8) | seg(X, Y, 21.6, 24.0, 20.8, 28.6, 0.6)
    paint(img, far, c["fur_dark"])
    paint(img, near, c["fur"])
    hooves = (far | near) & (Y > 27.6)
    paint(img, hooves, c["hoof"])

    # body, with a paler belly
    body = ((X - 17.0) / 7.6) ** 2 + ((Y - 16.8) / 4.2) ** 2 <= 1
    neck = seg(X, Y, 11.4, 15.6, 9.2, 10.4, 2.3)
    paint(img, body | neck, c["fur"])
    paint(img, body & (Y > 18.8), c["belly"])
    paint(img, neck & (X < 9.4) & (Y > 11.6), c["belly"])                    # pale throat
    paint(img, body & ~np.roll(body, 1, axis=0) & (X < 21.0), c["fur_light"])  # lit back, upper left
    paint(img, body & (X > 23.4) & (Y > 15.6), c["fur_dark"])                # rump in shade
    # a short tail, white underneath
    tail = seg(X, Y, 24.4, 14.0, 25.8, 12.6, 0.8)
    paint(img, tail, c["fur_dark"])
    paint(img, tail & (X > 25.4), c["spot"])

    # white spots in two rows along the back
    spots = np.zeros(X.shape, bool)
    for sx, sy in ((13.4, 14.4), (16.4, 13.8), (19.4, 14.0), (22.0, 14.8), (14.8, 16.6), (17.8, 16.2), (20.8, 16.6)):
        spots |= (np.abs(X - sx) < 0.6) & (np.abs(Y - sy) < 0.6)
    paint(img, spots & body, c["spot"])

    # head: rounded, a short muzzle to the left, big ears turned up and back
    skull = ((X - 8.6) / 2.9) ** 2 + ((Y - 8.8) / 2.5) ** 2 <= 1
    muzzle = poly(X, Y, [(7.0, 8.2), (3.6, 9.8), (3.8, 11.4), (8.4, 11.2)])
    ear_back = poly(X, Y, [(10.0, 7.6), (13.6, 3.0), (14.2, 4.6), (11.4, 8.4)])
    ear_front = poly(X, Y, [(8.4, 6.8), (10.0, 2.0), (11.2, 3.0), (10.4, 7.4)])
    paint(img, ear_back, c["fur_dark"])
    paint(img, skull | muzzle | ear_front, c["fur"])
    paint(img, ear_front & (X > 10.2) & (Y > 3.2), c["ear"])                 # inside of the near ear
    paint(img, skull & ~np.roll(skull, 1, axis=0), c["fur_light"])
    paint(img, muzzle & (Y > 10.4), c["belly"])                              # pale chin
    paint(img, (np.abs(X - 3.9) < 0.6) & (np.abs(Y - 10.0) < 0.6), c["hoof"])  # nose
    paint(img, (np.abs(X - 8.0) < 0.6) & (np.abs(Y - 8.6) < 0.6), c["eye"])    # a big dark eye
    paint(img, (np.abs(X - 7.6) < 0.4) & (np.abs(Y - 8.2) < 0.4), c["eye_glint"])
    return outlined_outside(img, c["edge"])


LOGO = (fawn, {
    "fur": rgba("#b8743a"), "fur_light": rgba("#d69a58"), "fur_dark": rgba("#86502a"),
    "belly": rgba("#ead2a6"), "spot": rgba("#f6ecd8"), "ear": rgba("#d99a86"),
    "hoof": rgba("#2b1b15"), "eye": rgba("#1a100c"), "eye_glint": rgba("#6a5a50"),
    "grass": rgba("#7c8f3c"), "grass_dark": rgba("#56682c"), "blade": rgba("#b4b25a"),
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
# The developer chose Concept 1 of the logo concepts, "The Bedded Fawn"
# (assets-src/logo_concepts/shortys/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("shortys", "concept1")

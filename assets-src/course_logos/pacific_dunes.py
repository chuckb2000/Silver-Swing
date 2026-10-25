"""Pacific Dunes logo: a grey whale's tail rising out of the Pacific (developer,
2026-10-21, from the course chat's suggestion; grey whales pass the Bandon bluffs
on their spring and winter migrations). The club's own emblem is not used.
`python3 assets-src/logos.py pacific_dunes` writes
game/public/sprites/logos/pacific_dunes.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def whale_tail(c: dict) -> np.ndarray:
    """A mottled grey fluke, notched in the middle, lifting out of a blue swell with
    foam round the tail stock and water streaming off both tips."""
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the sea: a swell across the bottom, darker below
    sea = (Y >= 22.5) & (Y <= 30.5) & (X >= 1.0) & (X <= 31.0) & ~((Y < 23.6) & ((X < 3.0) | (X > 29.0)))
    paint(img, sea, c["water"])
    paint(img, sea & (Y >= 27.0), c["water_dark"])
    paint(img, sea & (Y >= 25.0) & (Y < 26.0) & (((X + 2.0) % 7.0) < 3.0), c["water_light"])
    # the fluke: two wide lobes swept up from a narrow tail stock, a notch at the centre
    fluke = poly(X, Y, [
        (13.6, 24.6), (14.2, 19.0), (12.6, 15.2), (8.6, 12.6), (4.4, 11.0), (1.8, 8.4),
        (4.8, 6.6), (9.4, 6.8), (13.4, 8.4), (16.0, 10.6),
        (18.6, 8.4), (22.6, 6.8), (27.2, 6.6), (30.2, 8.4),
        (27.6, 11.0), (23.4, 12.6), (19.4, 15.2), (17.8, 19.0), (18.4, 24.6)])
    paint(img, fluke, c["skin"])
    # light from the upper left: the left lobe's upper surface and the stock's left side
    paint(img, fluke & (X < 15.0) & (Y < 11.2) & (Y > 6.0 + 0.0 * X), c["skin_light"])
    paint(img, fluke & (X > 13.6) & (X < 15.0) & (Y > 15.0), c["skin_light"])
    paint(img, fluke & (X > 17.0) & (Y > 11.0), c["skin_dark"])
    paint(img, fluke & (X > 22.0) & (Y > 9.8), c["skin_dark"])
    # barnacle and scar patches, seeded
    rng = np.random.default_rng(2001)
    spots = fluke & (rng.random((S, S)) < 0.09) & (Y > 7.4) & (Y < 21.0)
    paint(img, spots, c["patch"])
    # foam round the tail stock at the waterline
    foam = ell(X, Y, 16.0, 23.4, 5.6, 1.3) & ~fluke
    paint(img, foam, c["foam"])
    paint(img, ell(X, Y, 10.0, 23.0, 1.6, 0.6) | ell(X, Y, 22.2, 23.0, 1.6, 0.6), c["foam"])
    # water streaming off the tips
    for dx, dy in ((3.0, 11.0), (3.5, 13.5), (4.2, 16.4), (2.5, 18.4),
                   (29.0, 11.0), (28.5, 13.5), (27.8, 16.4), (29.5, 18.4)):
        paint(img, (np.abs(X - dx) < 0.5) & (np.abs(Y - dy) < 0.5), c["drop"])
    return outlined(img, c["edge"])


WHALE = {
    "skin": rgba("#6f7880"), "skin_light": rgba("#98a1a9"), "skin_dark": rgba("#4c545c"),
    "patch": rgba("#c9ced3"),
    "water": rgba("#2c6ea0"), "water_dark": rgba("#1e527c"), "water_light": rgba("#4f93c4"),
    "foam": rgba("#eef5f8"), "drop": rgba("#bfe0f2"),
    "edge": EDGE,
}


LOGO = (whale_tail, WHALE)


# ------------------------------------------------------------------ 2026-10-25
# The developer chose Concept 1 of the logo concepts, "The Fluke"
# (assets-src/logo_concepts/pacific_dunes/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("pacific_dunes", "concept1")

"""Old Macdonald logo: a tweed flat cap and a briar pipe, for Charles Blair
Macdonald, whose template holes the course follows (developer, 2026-10-21, from
the course chat's suggestion). The club's own emblem is not used.
`python3 assets-src/logos.py old_macdonald` writes
game/public/sprites/logos/old_macdonald.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def cap_and_pipe(c: dict) -> np.ndarray:
    """A brown tweed flat cap seen from the side, peak to the right, with a lit
    briar pipe below it."""
    X, Y0 = grid()
    img = np.zeros((S, S, 4), np.uint8)
    Y = Y0 + 2.0          # the cap sits 2 px higher than its outline numbers
    # the cap: a low, flat crown pulled forward over a short peak
    crown = poly(X, Y, [(2.4, 18.8), (2.6, 15.6), (5.0, 11.6), (9.6, 9.4), (16.0, 8.8), (21.6, 9.6),
                        (25.2, 12.0), (26.8, 15.6), (25.6, 18.8)])
    peak = poly(X, Y, [(21.0, 16.6), (26.8, 15.2), (30.6, 16.6), (30.8, 17.8), (26.6, 19.0), (21.0, 19.0)])
    band = (Y >= 17.6) & (Y < 19.0) & (X > 2.0) & (X < 25.8)
    cap = crown | peak
    # tweed: a fine two-tone weave with light flecks
    paint(img, cap, c["tweed"])
    weave = cap & ((np.floor(X) + np.floor(Y)) % 2 == 0)
    paint(img, weave, c["thread"])
    rng = np.random.default_rng(2010)
    paint(img, cap & ~band & (rng.random((S, S)) < 0.07), c["fleck"])
    # light from the upper left; the crown's front and the peak's underside in shade
    top = crown & ~np.roll(crown, 1, axis=0)
    paint(img, top | (crown & ~np.roll(crown, 1, axis=1)), c["tweed_light"])
    paint(img, crown & ~top & (X > 22.6) & (Y > 11.6), c["tweed_dark"])
    paint(img, crown & (np.abs(Y - (9.4 + (X - 16.0) * 0.62)) < 0.5) & (X > 16.6) & (X < 24.0), c["band"])  # front seam
    paint(img, band & crown, c["band"])
    paint(img, peak & ~crown & (Y > 17.8), c["tweed_dark"])
    paint(img, peak & ~crown & (Y <= 16.6), c["tweed_light"])
    paint(img, (np.abs(X - 16.0) < 1.0) & (np.abs(Y - 8.8) < 0.6), c["button"])   # the button on top
    Y = Y0
    # the pipe: a tall briar bowl at the left, the stem curving up to the right
    bowl = poly(X, Y, [(4.0, 21.2), (9.8, 21.2), (9.4, 27.8), (8.0, 29.6), (5.6, 29.6), (4.4, 27.8)])
    paint(img, bowl, c["briar"])
    paint(img, bowl & (X < 5.8), c["briar_light"])
    paint(img, bowl & (X > 8.2), c["briar_dark"])
    paint(img, (Y >= 21.2) & (Y < 22.4) & (X > 4.6) & (X < 9.2), c["ember"])     # the lit tobacco
    stem = poly(X, Y, [(9.2, 25.6), (14.0, 25.4), (19.6, 24.2), (23.8, 22.6), (24.6, 24.0),
                       (20.4, 25.8), (14.4, 27.2), (9.0, 27.8)])
    paint(img, stem, c["briar"])
    mouth = poly(X, Y, [(23.8, 22.6), (28.6, 20.8), (29.4, 22.2), (24.6, 24.0)])
    paint(img, mouth, c["bit"])
    paint(img, stem & ~mouth & (Y < 25.6 - (X - 14.0) * 0.32), c["briar_light"])
    paint(img, stem & ~mouth & (Y > 26.6), c["briar_dark"])
    return outlined(img, c["edge"])


CAP = {
    "tweed": rgba("#8a6c4e"), "tweed_light": rgba("#ad8d6b"), "tweed_dark": rgba("#65503a"),
    "thread": rgba("#7a5f45"), "fleck": rgba("#c2a985"), "band": rgba("#4f3e2e"), "button": rgba("#6b5440"),
    "briar": rgba("#7a3e1e"), "briar_light": rgba("#a35a30"), "briar_dark": rgba("#4f2711"),
    "bit": rgba("#1d1d1f"), "ember": rgba("#e0702a"),
    "edge": EDGE,
}


LOGO = (cap_and_pipe, CAP)


# ------------------------------------------------------------------ 2026-10-25
# The developer chose Concept 1 of the logo concepts, "The Founder's Cap"
# (assets-src/logo_concepts/old_macdonald/concept1.src.svg; DECISIONS.md "Logos from the logo
# concepts"). The drawing above is kept as PREVIOUS; the game uses the concept's sprite.
from logos import concept_logo  # noqa: E402

PREVIOUS = LOGO
LOGO = concept_logo("old_macdonald", "concept1")

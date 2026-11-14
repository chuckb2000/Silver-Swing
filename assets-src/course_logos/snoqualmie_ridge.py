"""Snoqualmie Ridge logo: a felling axe sunk in an old-growth stump, a golf ball on the moss
at its foot (course chat, 2026-11-13). The ridge was logged for a century before the course
was cut through its second-growth firs, and the club names its tees for the woods (Single
Tree, Saw, Axe, Three Trees). An original drawing: the club's own marks are not used.
`python3 assets-src/logos.py snoqualmie_ridge` writes
game/public/sprites/logos/snoqualmie_ridge.png (assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def axe_in_stump(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # mossy ground under the stump
    moss = ell(X, Y, 16.0, 28.6, 13.4, 2.6) & (Y <= 30.6)
    paint(img, moss, c["moss"])
    shade(img, moss, c["moss_light"], c["moss_dark"])

    # the stump: bark sides with flared roots, a cut top with rings
    side = poly(X, Y, [(5.4, 28.4), (7.2, 25.6), (7.6, 18.6), (24.4, 18.6), (24.8, 25.6), (26.6, 28.4)])
    paint(img, side, c["bark"])
    shade(img, side, c["bark_light"], c["bark_dark"])
    for x0 in (10.0, 13.6, 17.4, 21.0):
        paint(img, seg(X, Y, x0, 20.0, x0 + 0.4, 27.0, 0.3) & side, c["bark_dark"])
    top = ell(X, Y, 16.0, 18.6, 8.6, 2.8)
    paint(img, top, c["wood"])
    for r in (2.2, 4.4, 6.6):
        ring = top & ~ell(X, Y, 16.0, 18.6, r, r * 0.33) & ell(X, Y, 16.0, 18.6, r + 0.55, (r + 0.55) * 0.33)
        paint(img, ring, c["wood_dark"])

    # the axe: head buried in the cut, the handle angled up and right
    handle = seg(X, Y, 15.0, 17.4, 24.8, 4.2, 0.95)
    paint(img, handle, c["handle"])
    shade(img, handle, c["handle_light"], c["handle_dark"])
    paint(img, seg(X, Y, 24.0, 5.2, 25.4, 3.4, 0.95), c["handle_dark"])   # the knob
    head = poly(X, Y, [(11.2, 14.4), (14.4, 12.6), (17.4, 16.0), (15.6, 18.2), (12.0, 18.0)])
    paint(img, head, c["steel"])
    shade(img, head, c["steel_light"], c["steel_dark"])
    paint(img, seg(X, Y, 13.6, 13.6, 16.6, 16.8, 0.35), c["steel_light"])
    # the split in the wood under the blade
    paint(img, seg(X, Y, 12.6, 18.6, 11.4, 20.6, 0.35) & side, c["bark_dark"])

    ball = ell(X, Y, 27.6, 27.0, 1.25, 1.25)
    paint(img, ball, c["ball"])
    shade(img, ball, None, c["ball_dark"])
    return outlined(img, c["edge"])


LOGO = (axe_in_stump, {
    "moss": rgba("#4f7f36"), "moss_light": rgba("#74a84c"), "moss_dark": rgba("#2f5222"),
    "bark": rgba("#6e4630"), "bark_light": rgba("#94643f"), "bark_dark": rgba("#45291b"),
    "wood": rgba("#e0b67a"), "wood_dark": rgba("#b48450"),
    "handle": rgba("#c08a4a"), "handle_light": rgba("#e2b070"), "handle_dark": rgba("#7e5228"),
    "steel": rgba("#8e98a2"), "steel_light": rgba("#d4dce2"), "steel_dark": rgba("#555d66"),
    "ball": rgba("#f4f3ee"), "ball_dark": rgba("#b9b8b0"),
    "edge": EDGE,
})

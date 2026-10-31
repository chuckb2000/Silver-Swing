"""The Course at Aberdeen logo: a sandhill crane in flight over a cattail marsh at sundown.

Why: the course is laid out round preserved wetlands on the Valparaiso Moraine (the club's
site, golfataberdeen.com/course: "tree-lined fairways, preserved wetlands, and rolling
countryside"), and northwest Indiana's marshes are the great autumn stopover of the eastern
sandhill crane, tens of thousands at Jasper-Pulaski Fish and Wildlife Area, flocks passing over
Porter County every fall (WFYI, ABC7 Chicago, Lakeshore Public Media). The crane flies with its
neck straight out and legs trailing (unlike a heron's folded neck), grey with a red crown.
Original drawing by the course chat, 2026-10-31; nothing from the club's own branding.

    python3 assets-src/logos.py aberdeen        # -> game/public/sprites/logos/aberdeen.png
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg


def crane(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the setting sun behind, lit rim upper left, a deeper band low down
    d = np.hypot(X - 16.5, Y - 15.5)
    sun = d <= 12.6
    paint(img, sun, c["sun"])
    paint(img, sun & (Y > 18.5), c["sun_low"])
    paint(img, sun & (d > 11.6) & (X + Y < 30), c["sun_rim"])

    # marsh: dark water across the bottom of the disc, cattails standing out of it (kept in the disc)
    water = sun & (Y > 23.0)
    paint(img, water, c["water"])
    paint(img, water & (Y < 24.2) & (np.sin(X * 1.7) > 0.2), c["water_hi"])
    for x0, top, lean in ((6.2, 17.0, -0.5), (9.0, 19.6, 0.3), (24.6, 18.6, 0.5), (27.0, 21.0, -0.2)):
        stem = seg(X, Y, x0, 29.0, x0 + lean, top, 0.5) & sun
        paint(img, stem, c["reed"])
        head = seg(X, Y, x0 + lean * 0.8, top + 1.6, x0 + lean * 0.9, top + 4.0, 0.95) & sun
        paint(img, head, c["cattail"])
        paint(img, head & (X < x0 + lean * 0.85), c["cattail_hi"])
    paint(img, seg(X, Y, 12.0, 29.0, 13.6, 23.0, 0.45) & sun, c["reed"])
    paint(img, seg(X, Y, 21.4, 29.0, 20.6, 23.4, 0.45) & sun, c["reed"])

    # the crane, flying left with its wings raised in a V: far wing behind, body, near wing in front
    far_wing = poly(X, Y, [(13.8, 14.4), (16.4, 13.8), (12.6, 6.0), (10.0, 2.4), (10.8, 6.6)])
    paint(img, far_wing, c["grey_dark"])
    paint(img, far_wing & (Y < 6.0), c["primaries"])

    body = np.hypot((X - 17.4) / 4.2, (Y - 15.0) / 1.7) <= 1
    tail = poly(X, Y, [(20.4, 14.0), (23.4, 14.6), (23.0, 16.4), (20.2, 16.2)])
    paint(img, body | tail, c["grey"])
    paint(img, (body | tail) & (Y > 15.8), c["grey_dark"])
    paint(img, body & (Y < 14.2) & (X < 18.0), c["grey_light"])
    paint(img, tail & (X > 22.2), c["grey_dark"])

    legs = seg(X, Y, 21.4, 15.8, 30.0, 17.0, 0.5)
    paint(img, legs & ~(body | tail), c["leg"])

    neck = seg(X, Y, 13.6, 14.6, 6.8, 13.4, 0.9)
    paint(img, neck, c["grey"])
    paint(img, neck & (Y < 13.8) & (X < 12.4), c["grey_light"])
    head = np.hypot(X - 5.8, Y - 13.2) <= 1.5
    paint(img, head, c["grey_light"])
    paint(img, head & (X > 6.0) & (Y > 13.4), c["cheek"])
    paint(img, (np.hypot(X - 5.4, Y - 12.4) <= 1.0) & head, c["crown"])
    paint(img, seg(X, Y, 4.2, 13.8, 1.2, 14.6, 0.45), c["bill"])

    near_wing = poly(X, Y, [(15.6, 14.6), (19.4, 14.2), (23.0, 6.4), (25.6, 1.6), (21.2, 4.2), (17.2, 8.8)])
    paint(img, near_wing, c["grey"])
    paint(img, near_wing & (Y < 6.4), c["primaries"])
    lit = near_wing & ~np.roll(near_wing, 1, axis=1)
    paint(img, lit & (Y >= 6.4), c["grey_light"])
    paint(img, near_wing & ~np.roll(near_wing, -1, axis=1) & (Y >= 6.4), c["grey_dark"])
    return outlined(img, c["edge"])


LOGO = (crane, {
    "sun": rgba("#eba24a"),
    "sun_low": rgba("#d9773a"),
    "sun_rim": rgba("#f6c66e"),
    "water": rgba("#2f4f5a"),
    "water_hi": rgba("#5d8590"),
    "reed": rgba("#3d6a35"),
    "cattail": rgba("#6a3f22"),
    "cattail_hi": rgba("#94603a"),
    "grey": rgba("#9aa4ab"),
    "grey_light": rgba("#d3d9dc"),
    "grey_dark": rgba("#68737b"),
    "primaries": rgba("#3c4248"),
    "leg": rgba("#2f3236"),
    "cheek": rgba("#f2f2ee"),
    "crown": rgba("#d6302a"),
    "bill": rgba("#2f3236"),
    "edge": EDGE,
})

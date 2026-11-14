"""The Olympic Club logo: a San Francisco cable car on its rails, for the city athletic
club (1860) whose downtown clubhouse stands on the Powell Street cable car line. An
original drawing; the club's own marks (its winged emblem) are not used.
`python3 assets-src/logos.py olympic_club` writes game/public/sprites/logos/olympic_club.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def cable_car(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # the street: a short slab of paving with the two rails and the cable slot
    street = poly(X, Y, [(2.0, 25.5), (30.0, 25.5), (30.0, 29.5), (2.0, 29.5)])
    paint(img, street, c["paving"])
    paint(img, street & (Y >= 28.0), c["paving_dark"])
    paint(img, street & (np.abs(Y - 26.5) < 0.5), c["rail"])
    paint(img, street & (np.abs(Y - 27.6) < 0.4) & ((X.astype(int) % 4) < 2), c["slot"])
    # the body: cream lower panels, red belt, open bench ends, a clerestory roof
    body = poly(X, Y, [(4.0, 12.0), (28.0, 12.0), (28.0, 23.0), (4.0, 23.0)])
    paint(img, body, c["cream"])
    shade(img, body, c["cream_light"], c["cream_dark"])
    paint(img, body & (Y >= 19.0) & (Y < 21.0), c["red"])
    paint(img, body & (Y >= 21.0), c["red_dark"])
    # windows of the closed middle section and the open ends with their posts
    for x0 in (10.0, 13.5, 17.0, 20.5):
        paint(img, (X >= x0) & (X < x0 + 2.5) & (Y >= 13.5) & (Y < 17.5), c["glass"])
        paint(img, (X >= x0) & (X < x0 + 1.0) & (Y >= 13.5) & (Y < 15.0), c["glass_light"])
    for x0, x1 in ((4.5, 8.5), (23.5, 27.5)):
        paint(img, (X >= x0) & (X < x1) & (Y >= 13.5) & (Y < 18.5), c["open"])
        paint(img, (X >= x0 + 1.5) & (X < x0 + 2.5) & (Y >= 13.5) & (Y < 18.5), c["cream_dark"])
    roof = poly(X, Y, [(3.0, 10.0), (29.0, 10.0), (29.0, 12.2), (3.0, 12.2)])
    paint(img, roof, c["roof"])
    clere = poly(X, Y, [(8.0, 7.6), (24.0, 7.6), (24.0, 10.0), (8.0, 10.0)])
    paint(img, clere, c["roof_light"])
    paint(img, clere & (Y >= 8.4) & (Y < 9.4) & ((X.astype(int) % 3) == 1), c["glass"])
    # the destination sign over one end and the headlamp
    paint(img, (X >= 12.0) & (X < 20.0) & (Y >= 5.0) & (Y < 7.6), c["sign"])
    paint(img, (X >= 13.0) & (X < 19.0) & (Y >= 6.0) & (Y < 6.8), c["sign_text"])
    paint(img, (X - 28.6) ** 2 + (Y - 15.0) ** 2 <= 0.9, c["lamp"])
    # wheels on the rails
    for wx in (8.5, 23.5):
        w = (X - wx) ** 2 + (Y - 24.4) ** 2 <= 2.0 ** 2
        paint(img, w, c["wheel"])
        paint(img, (X - wx) ** 2 + (Y - 24.4) ** 2 <= 0.6, c["hub"])
    paint(img, seg(X, Y, 5.0, 23.2, 27.0, 23.2, 0.4), c["wheel"])
    return outlined(img, c["edge"])


LOGO = (cable_car, {
    "paving": rgba("#8d8a84"), "paving_dark": rgba("#6b6863"), "rail": rgba("#c9ccd0"), "slot": rgba("#3c3b3a"),
    "cream": rgba("#efe3c3"), "cream_light": rgba("#fbf4e0"), "cream_dark": rgba("#c9b993"),
    "red": rgba("#b8322a"), "red_dark": rgba("#7a2420"),
    "glass": rgba("#4c6f86"), "glass_light": rgba("#a9c6d6"), "open": rgba("#5b3a2a"),
    "roof": rgba("#7a2420"), "roof_light": rgba("#b8322a"),
    "sign": rgba("#2a2a2a"), "sign_text": rgba("#f2c94c"), "lamp": rgba("#f8e7a0"),
    "wheel": rgba("#2b2b2b"), "hub": rgba("#9a9a9a"),
    "edge": EDGE,
})

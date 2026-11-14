"""Rose City Golf Course logo: a 1920s board-track racer in rose red, for the Rose City
Speedway the course was laid out on in 1922 (the city's history of the course; a
banked dirt oval before golf). Side on, running to the left over a strip of banked
track, with a white racing roundel on the tail, in the rose red of the City of Roses. An original drawing; the course's own marks are not used.
`python3 assets-src/logos.py rose_city` writes game/public/sprites/logos/rose_city.png
(assets-src/course_logos/README.md).
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, seg, shade


def racer(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # banked track under the car: a tilted strip with a white rail line
    track = poly(X, Y, [(0.0, 24.2), (32.0, 22.6), (32.0, 28.5), (0.0, 29.5)])
    paint(img, track, c["dirt"])
    paint(img, track & (Y > 27.2), c["dirt_dark"])
    paint(img, track & (np.abs(Y - (24.8 - 1.6 * X / 32.0)) < 0.5), c["rail"])
    # speed lines behind the car (it runs left)
    for yy, x0, x1 in ((13.0, 27.0, 31.5), (16.0, 29.0, 31.8), (19.5, 28.5, 31.8)):
        paint(img, (np.abs(Y - yy) < 0.5) & (X > x0) & (X < x1), c["line"])

    # body: radiator nose at the left, a long hood, the cockpit, a pointed boat tail
    body = poly(X, Y, [(2.5, 15.0), (4.0, 13.2), (14.0, 12.8), (16.0, 11.6), (20.0, 11.6), (21.5, 12.8),
                       (27.0, 14.2), (28.5, 16.6), (26.5, 19.4), (3.0, 19.6)])
    paint(img, body, c["red"])
    shade(img, body, c["red_light"], c["red_dark"])
    paint(img, body & (Y < 14.2) & (X > 5) & (X < 13.5), c["red_light"])
    # radiator grille
    grille = (X >= 2.5) & (X <= 4.2) & (Y >= 13.6) & (Y <= 19.2)
    paint(img, grille, c["chrome"])
    paint(img, grille & (np.round(Y) % 2 == 0), c["chrome_dark"])
    # louvres on the hood
    for lx in (7.0, 9.0, 11.0):
        paint(img, (np.abs(X - lx) < 0.5) & (Y > 14.6) & (Y < 17.2), c["red_dark"])
    # exhaust pipe along the side
    paint(img, seg(X, Y, 6.0, 18.4, 18.0, 18.4, 0.55), c["chrome_dark"])
    # racing roundel on the tail: a white disc with a dark number 1
    rd = (X - 22.5) ** 2 + (Y - 15.6) ** 2 <= 2.4 ** 2
    paint(img, rd, c["white"])
    paint(img, (np.abs(X - 22.8) < 0.5) & (Y > 13.8) & (Y < 17.6), c["dark"])
    paint(img, (np.abs(X - 21.8) < 0.5) & (np.abs(Y - 14.6) < 0.5), c["dark"])

    # driver: leather helmet and goggles, over the cockpit
    head = (X - 17.6) ** 2 + (Y - 9.6) ** 2 <= 2.4 ** 2
    paint(img, head & (Y < 11.9), c["helmet"])
    shade(img, head & (Y < 11.9), c["helmet_light"], c["helmet_dark"])
    paint(img, (np.abs(Y - 9.6) < 0.6) & (X > 15.0) & (X < 17.6), c["goggle"])
    paint(img, (np.abs(Y - 9.6) < 0.6) & (X > 15.0) & (X < 16.0), c["glass"])
    # scarf streaming back
    paint(img, poly(X, Y, [(19.2, 10.6), (23.0, 9.4), (22.4, 10.8), (19.6, 11.8)]), c["white"])
    # steering wheel rim
    paint(img, seg(X, Y, 14.6, 10.8, 15.4, 12.6, 0.5), c["dark"])

    # wire wheels
    for wx in (7.5, 23.5):
        r2 = (X - wx) ** 2 + (Y - 19.9) ** 2
        tyre = r2 <= 3.7 ** 2
        paint(img, tyre, c["tyre"])
        hub = r2 <= 2.3 ** 2
        paint(img, hub, c["spoke_bg"])
        spokes = hub & ((np.abs(X - wx) < 0.5) | (np.abs(Y - 19.9) < 0.5))
        paint(img, spokes, c["chrome"])
        paint(img, r2 <= 0.9 ** 2, c["chrome_dark"])
        paint(img, tyre & ~hub & (X < wx - 1.2) & (Y < 19.3), c["tyre_light"])

    return outlined(img, c["edge"])


LOGO = (racer, {
    "red": rgba("#c8324a"), "red_light": rgba("#e8566a"), "red_dark": rgba("#8e1f33"),
    "white": rgba("#f6f1e6"), "rose": rgba("#d42a48"), "rose_light": rgba("#f27d8e"), "leaf": rgba("#3f8a45"),
    "chrome": rgba("#d9dde3"), "chrome_dark": rgba("#8d939c"),
    "tyre": rgba("#26262b"), "tyre_light": rgba("#4a4a52"), "spoke_bg": rgba("#3b3b42"),
    "helmet": rgba("#7a4a2a"), "helmet_light": rgba("#a26a40"), "helmet_dark": rgba("#53311b"),
    "goggle": rgba("#2b2b30"), "glass": rgba("#9fd3f0"), "dark": rgba("#1b1d22"),
    "dirt": rgba("#b08a5a"), "dirt_dark": rgba("#8a6a42"), "rail": rgba("#efe8d8"), "line": rgba("#d8d2c4"),
    "edge": EDGE,
})

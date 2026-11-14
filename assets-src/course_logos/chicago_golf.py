"""Chicago Golf Club logo: the brick interurban station of the Chicago, Aurora and Elgin
Railroad that stood just past the club's gate (the Aurora branch from Wheaton), drawn side on:
a red-brick hall under a hipped slate roof with deep eaves on brackets, arched windows and a
chimney, on its platform beside the track. The developer's pick (option b, 2026-11-13). An
original drawing; the club has no logo of its own in the game. `python3 assets-src/logos.py
chicago_golf` writes game/public/sprites/logos/chicago_golf.png.
"""
import numpy as np
from logos import EDGE, S, grid, outlined, paint, poly, rgba, shade


def station(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)
    # track: ballast, sleepers and the rail along the bottom
    ballast = (Y >= 28.0) & (Y <= 30.5) & (X >= 0.5) & (X <= 31.5)
    paint(img, ballast, c["ballast"])
    paint(img, ballast & ((X.astype(int) % 3) == 0) & (Y >= 28.6), c["sleeper"])
    paint(img, (Y >= 28.0) & (Y < 28.8) & (X >= 0.5) & (X <= 31.5), c["rail"])
    # platform
    plat = (Y >= 25.5) & (Y < 28.0) & (X >= 1.5) & (X <= 30.5)
    paint(img, plat, c["stone"])
    paint(img, plat & (Y < 26.2), c["stone_light"])
    # brick hall
    hall = (X >= 6.0) & (X <= 26.0) & (Y >= 13.5) & (Y < 25.5)
    paint(img, hall, c["brick"])
    paint(img, hall & ((Y.astype(int) % 2) == 0) & (((X + (Y.astype(int) // 2 % 2) * 1.5).astype(int) % 3) == 0), c["brick_dark"])
    paint(img, hall & (X < 7.0), c["brick_light"])
    # arched windows and a door
    for wx in (9.5, 13.5, 22.5):
        win = (np.abs(X - wx) <= 1.3) & (Y >= 17.0) & (Y <= 21.5)
        arch = (X - wx) ** 2 + (Y - 17.0) ** 2 <= 1.3 ** 2
        paint(img, win | arch, c["window"])
        paint(img, (win | arch) & (X < wx - 0.3) & (Y < 19.0), c["window_light"])
        paint(img, (np.abs(Y - 21.9) < 0.45) & (np.abs(X - wx) <= 1.7), c["stone_light"])
    door = (np.abs(X - 18.0) <= 1.6) & (Y >= 18.0) & (Y < 25.5)
    paint(img, door | ((X - 18.0) ** 2 + (Y - 18.0) ** 2 <= 1.6 ** 2), c["door"])
    # hipped roof with deep eaves on brackets
    roof = poly(X, Y, [(3.0, 13.8), (9.5, 7.0), (22.5, 7.0), (29.0, 13.8)])
    paint(img, roof, c["slate"])
    shade(img, roof, c["slate_light"], c["slate_dark"])
    paint(img, roof & (Y >= 12.8), c["eave"])
    for bx in (7.0, 12.0, 17.0, 21.5, 25.0):
        paint(img, (np.abs(X - bx) < 0.5) & (Y >= 13.8) & (Y < 15.0), c["eave"])
    chim = (X >= 20.0) & (X <= 22.0) & (Y >= 3.5) & (Y < 8.5)
    paint(img, chim, c["brick"])
    paint(img, chim & (Y < 4.5), c["stone_light"])
    return outlined(img, c["edge"])


LOGO = (station, {
    "brick": rgba("#a8432e"), "brick_dark": rgba("#86321f"), "brick_light": rgba("#c45a3f"),
    "stone": rgba("#b9b2a2"), "stone_light": rgba("#ddd6c4"),
    "window": rgba("#2f4a5c"), "window_light": rgba("#7fa7bd"), "door": rgba("#4b3020"),
    "slate": rgba("#4f5866"), "slate_light": rgba("#6e7888"), "slate_dark": rgba("#3a414c"), "eave": rgba("#2e333b"),
    "ballast": rgba("#8a8276"), "sleeper": rgba("#5c4532"), "rail": rgba("#9aa0a8"),
    "edge": EDGE,
})

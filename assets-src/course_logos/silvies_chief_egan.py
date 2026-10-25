"""Silvies Valley Ranch, Chief Egan course logo: the short course's spring-fed pond, a
small green with its flag on the far bank, cattails in front and the high-desert sun
behind. The course has "water on every hole", is fed by gravity from a spring about a
mile away and runs off the grid on solar panels (Visit Central Oregon). It is named for
Egan, the Paiute war chief; the logo shows the place rather than a picture of him, so no
headdress or other borrowed imagery. An original drawing (course chat, 2026-10-25); the
club's own emblem is not used. The file name is the layout id; the ranch's card shows
`silvies.png` (the goat caddie).

    python3 assets-src/logos.py silvies_chief_egan          # writes game/public/sprites/logos/silvies_chief_egan.png
    python3 assets-src/course_logos/silvies_chief_egan.py out.png   # an 8x preview
"""
from __future__ import annotations

import numpy as np

from logos import EDGE, S, grid, outlined_outside, paint, rgba, seg


def ell(X, Y, cx, cy, rx, ry):
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1


def pond(c: dict) -> np.ndarray:
    X, Y = grid()
    img = np.zeros((S, S, 4), np.uint8)

    # the sun, low behind the far bank, with short rays
    d = np.hypot(X - 21.0, Y - 10.6)
    a = np.arctan2(Y - 10.6, X - 21.0)
    rays = (d > 6.6) & (d < 9.4) & (np.cos(8 * a) > 0.82) & (Y < 13.0)
    paint(img, rays, c["sun_dark"])
    sun = (d <= 5.8) & (Y < 13.0)
    paint(img, sun, c["sun"])
    paint(img, sun & ((X - 21.0) + (Y - 10.6) < -4.0), c["sun_light"])

    # the far bank: tawny hills, then the green with its flag
    hills = (Y >= 12.4 + 1.4 * np.sin(X * 0.32 + 0.6)) & (Y <= 17.0) & (X >= 1.0) & (X <= 31.0)
    paint(img, hills, c["hill"])
    paint(img, hills & (Y < 13.8 + 1.4 * np.sin(X * 0.32 + 0.6)), c["hill_light"])
    green = ell(X, Y, 8.6, 15.6, 5.0, 1.7)
    paint(img, green, c["green"])
    paint(img, green & (Y < 15.0), c["green_light"])
    paint(img, seg(X, Y, 8.5, 15.4, 8.5, 5.6, 0.5), c["pin"])
    flag = (X >= 9.0) & (X <= 12.6) & (Y >= 5.6) & (Y <= 8.4) & (X - 9.0 <= 3.6 - 1.0 * np.abs(Y - 7.0))
    paint(img, flag, c["flag"])

    # the pond, with a few light ripples
    water = (Y >= 16.8) & (Y <= 27.4 - 0.6 * np.sin(X * 0.7)) & (X >= 1.0) & (X <= 31.0)
    water &= ell(X, Y, 16.0, 21.6, 15.4, 6.6)
    paint(img, water, c["water"])
    paint(img, water & (Y > 23.6), c["water_dark"])
    for rx, ry, w in ((8.0, 19.2, 2.4), (20.0, 18.6, 3.0), (24.4, 21.6, 2.0), (13.6, 22.4, 2.2)):
        paint(img, water & (np.abs(Y - ry) < 0.4) & (np.abs(X - rx) < w), c["ripple"])

    # cattails on the near bank, lower right, with a little bank of grass
    bank = ell(X, Y, 26.0, 29.6, 6.6, 2.4) & (Y <= 30.6)
    paint(img, bank, c["reed_dark"])
    for x0, x1, top in ((23.6, 22.8, 17.6), (26.2, 26.6, 15.6), (28.6, 29.8, 18.6)):
        paint(img, seg(X, Y, x0, 29.0, x1, top, 0.45), c["reed"])
        paint(img, ell(X, Y, x1 + 0.1 * (x1 - x0), top + 2.2, 0.85, 1.7), c["cattail"])
    paint(img, seg(X, Y, 25.0, 29.0, 21.4, 22.4, 0.4) | seg(X, Y, 27.4, 29.0, 31.0, 23.0, 0.4), c["reed"])
    return outlined_outside(img, c["edge"])


LOGO = (pond, {
    "sun": rgba("#f4c64a"), "sun_light": rgba("#ffe28c"), "sun_dark": rgba("#e09a2c"),
    "hill": rgba("#bfa265"), "hill_light": rgba("#dcc489"),
    "green": rgba("#5fa847"), "green_light": rgba("#86c463"),
    "pin": rgba("#e8e8e8"), "flag": rgba("#d63a2c"),
    "water": rgba("#3f78b0"), "water_dark": rgba("#2b5a8a"), "ripple": rgba("#8db8de"),
    "reed": rgba("#6f8a3c"), "reed_dark": rgba("#4f6a2c"), "cattail": rgba("#6a4126"),
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

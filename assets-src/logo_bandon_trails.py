"""Bandon Trails logo: a wooden trail-marker post with a spruce behind it,
in golden dune grass (developer, 2026-10-20). Original drawing; not the
resort's swallowtail mark. Registered in logos.py LOGOS as "bandon_trails".

    python3 assets-src/logo_bandon_trails.py out.png   # an 8x preview to look at
"""
from __future__ import annotations

import numpy as np

S = 32


def _grid():
    y, x = np.mgrid[0:S, 0:S]
    return x + 0.5, y + 0.5


def _ring(mask):
    m = np.zeros_like(mask)
    m[1:, :] |= mask[:-1, :]
    m[:-1, :] |= mask[1:, :]
    m[:, 1:] |= mask[:, :-1]
    m[:, :-1] |= mask[:, 1:]
    return m & ~mask


def trail_post(c: dict) -> np.ndarray:
    X, Y = _grid()
    img = np.zeros((S, S, 4), np.uint8)

    def paint(m, col):
        img[m] = col

    # spruce behind, right of centre: tiered, drooping, tip at the top
    sx, top, bot = 21.0, 1.5, 26.5
    spruce = np.zeros(X.shape, bool)
    tiers = 6
    edges = np.linspace(top, bot, tiers + 1)
    for k in range(tiers):
        y0, y1 = edges[k], edges[k + 1]
        f = (Y - y0) / (y1 - y0)
        w_top = 0.6 + 6.0 * (k / tiers)
        w_bot = 2.6 + 8.6 * ((k + 1) / tiers)
        half = w_top + (w_bot - w_top) * f
        spruce |= (Y >= y0) & (Y < y1) & (np.abs(X - sx) <= half)
    paint(spruce, c["spruce"])
    rel = (X - sx)
    paint(spruce & (rel < -1.5), c["spruce_light"])
    paint(spruce & (rel > 2.0), c["spruce_dark"])
    for k in range(1, tiers):  # shadow under each tier
        paint(spruce & (Y >= edges[k] - 0.9) & (Y < edges[k]) & (rel > -2.5), c["spruce_dark"])
    trunk = (np.abs(X - sx) <= 1.0) & (Y >= bot) & (Y < 29.0)
    paint(trunk, c["bark"])

    # golden dune grass along the bottom
    grass = Y >= 27.0 - 0.9 * np.sin(X * 0.9) - 0.5 * np.sin(X * 2.3 + 1.0)
    grass &= (Y <= 31.0) & (np.abs(X - 16) <= 15.0)
    paint(grass, c["grass"])
    paint(grass & ~np.roll(grass, 1, axis=0), c["grass_light"])
    blades = np.zeros(X.shape, bool)
    for bx, h in ((3.5, 4), (6.5, 5), (24.5, 4), (27.5, 5), (29.5, 3)):
        blades |= (np.abs(X - bx) <= 0.5) & (Y >= 27.0 - h) & (Y < 28.0)
    paint(blades, c["grass_light"])

    # the trail-marker post, left of centre, in front of the tree
    px0, px1, ptop, pbot = 7.0, 14.0, 8.0, 30.0
    post = (X >= px0) & (X < px1) & (Y >= ptop) & (Y < pbot)
    cap = (X >= px0) & (X < px1) & (Y >= ptop - 1.5) & (Y < ptop) & (np.abs(X - (px0 + px1) / 2) <= 2.9 - (ptop - Y) * 1.2)
    post |= cap
    paint(post, c["wood"])
    paint(post & (X < px0 + 1.5), c["wood_light"])
    paint(post & (X >= px1 - 1.5), c["wood_dark"])
    # grain lines
    for gy in (15.5, 21.5, 26.5):
        paint(post & (np.abs(Y - gy) < 0.5) & (X >= px0 + 2) & (X < px1 - 2), c["wood_dark"])
    # carved arrow pointing right (the way along the trail), painted white
    ay = 11.5
    xi, yi = np.floor(X).astype(int), np.floor(Y).astype(int)
    a0, a1, ar = int(px0) + 1, int(px1) - 2, int(ay)      # shaft from a0 to the tip a1, on row ar
    arrow = (yi == ar) & (xi >= a0) & (xi <= a1)
    for d in (1, 2):                                         # the head: two diagonals back from the tip
        arrow |= (xi == a1 - d) & (np.abs(yi - ar) == d)
    paint(post & arrow, c["blaze"])
    # a coloured band below the arrow (a trail blaze)
    paint(post & (Y >= 17.0) & (Y < 19.0), c["band"])
    paint(post & (Y >= 17.0) & (Y < 19.0) & (X >= px1 - 1.5), c["band_dark"])

    solid = img[..., 3] > 0
    # outline the outside only
    out = np.zeros_like(solid)
    out[0, :] = out[-1, :] = out[:, 0] = out[:, -1] = True
    out &= ~solid
    while True:
        grown = out | ((np.roll(out, 1, 0) | np.roll(out, -1, 0) | np.roll(out, 1, 1) | np.roll(out, -1, 1)) & ~solid)
        if (grown == out).all():
            break
        out = grown
    img[_ring(solid) & out] = c["edge"]
    # and a dark line between the post and the tree behind it
    img[_ring(post) & spruce & ~post] = c["edge"]
    return img


if __name__ == "__main__":
    from PIL import Image

    from logos import LOGOS
    fn, cols = LOGOS["bandon_trails"]
    im = Image.fromarray(fn(cols), "RGBA").resize((S * 8, S * 8), Image.NEAREST)
    bg = Image.new("RGBA", im.size, (40, 44, 52, 255))
    bg.alpha_composite(im)
    import sys
    bg.save(sys.argv[1])
    print(sys.argv[1])

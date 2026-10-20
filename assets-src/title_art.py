"""The game's logo: a silver trophy (sprites/trophy.png, on the title screen).

    python3 assets-src/title_art.py          (also run by `make assets`)

Everything is drawn here with numpy masks: flat colour bands, 1-px outlines,
light from the upper left, no gradients (dithered steps only).
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent


def rgba(h: str, a: int = 255) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [a], np.uint8)


def grid(w: int, h: int):
    y, x = np.mgrid[0:h, 0:w]
    return x + 0.5, y + 0.5


def ring_of(m: np.ndarray) -> np.ndarray:
    r = np.zeros_like(m)
    r[1:, :] |= m[:-1, :]
    r[:-1, :] |= m[1:, :]
    r[:, 1:] |= m[:, :-1]
    r[:, :-1] |= m[:, 1:]
    return r & ~m


def paint(img, m, col):
    img[m] = col


# ------------------------------------------------------------------ trophy
SILVER = {
    "hi": rgba("#ffffff"), "light": rgba("#e3e8ee"), "mid": rgba("#b9c1cb"), "dark": rgba("#8a939f"),
    "deep": rgba("#5c6470"), "edge": rgba("#141820"), "wood": rgba("#3a2618"), "wood_l": rgba("#5a3c26"),
    "plate": rgba("#d8b25a"), "plate_d": rgba("#a8843a"),
}


def trophy(W: int = 56, H: int = 72) -> np.ndarray:
    """A large silver loving cup: lidded bowl, two tall handles, stem, stepped foot, wooden plinth."""
    c = SILVER
    X, Y = grid(W, H)
    cx = W / 2
    img = np.zeros((H, W, 4), np.uint8)
    # handles first (behind the bowl): tall loops from the rim down to the bowl's waist
    handles = np.zeros(X.shape, bool)
    for s in (-1, 1):
        hx, hy = cx + s * 15.5, 24.0
        d = ((X - hx) / 9.0) ** 2 + ((Y - hy) / 12.0) ** 2
        loop = (d <= 1.0) & (d >= 0.45) & ((X - cx) * s > 10)
        handles |= loop
    paint(img, handles, c["mid"])
    paint(img, handles & (Y < 20), c["light"])
    paint(img, handles & (Y > 28), c["dark"])
    # bowl: a wide cup from the rim (y 14) narrowing to the stem (y 40)
    t = np.clip((Y - 14) / 26.0, 0, 1)
    half = 15.5 - 9.5 * t ** 1.6
    bowl = (Y >= 14) & (Y <= 40) & (np.abs(X - cx) <= half)
    rim = (Y >= 12.5) & (Y < 15.5) & (np.abs(X - cx) <= 17.0)
    lid = (((X - cx) / 14.0) ** 2 + ((Y - 13.0) / 6.0) ** 2 <= 1) & (Y < 13.0)
    knob_stem = (np.abs(X - cx) <= 1.2) & (Y >= 3.5) & (Y < 7.5)
    ball = np.hypot(X - cx, Y - 3.5) <= 3.0          # a golf ball on top
    stem = (np.abs(X - cx) <= 2.6 - 0.6 * np.clip((Y - 40) / 6, 0, 1)) & (Y > 40) & (Y <= 47)
    knot = (((X - cx) / 5.0) ** 2 + ((Y - 43.5) / 1.6) ** 2 <= 1)
    foot = ((Y > 47) & (Y <= 50) & (np.abs(X - cx) <= 8 + (Y - 47) * 1.5)) | ((Y > 50) & (Y <= 53) & (np.abs(X - cx) <= 13.5))
    body = bowl | rim | lid | knob_stem | stem | knot | foot
    paint(img, body, c["mid"])
    # light from the upper left: a bright streak and a lit left side, shade on the right
    rel = (X - cx) / np.maximum(half, 1)
    paint(img, bowl & (rel < -0.35), c["light"])
    paint(img, bowl & (rel > -0.62) & (rel < -0.45), c["hi"])
    paint(img, bowl & (rel > 0.45), c["dark"])
    paint(img, bowl & (rel > 0.78), c["deep"])
    paint(img, bowl & (np.abs(Y - 27.5) <= 0.5) & (np.abs(rel) < 0.95), c["dark"])   # a band round the bowl
    paint(img, rim, c["light"])
    paint(img, rim & (X > cx + 9), c["mid"])
    paint(img, rim & (Y >= 14.5), c["dark"])
    paint(img, lid, c["light"])
    paint(img, lid & (X > cx + 4), c["mid"])
    paint(img, lid & (X < cx - 6) & (Y < 11), c["hi"])
    paint(img, ball, c["hi"])
    paint(img, ball & ((X - cx) + (Y - 3.5) > 1.5), c["mid"])
    for bx, by in ((cx - 1, 2.5), (cx + 1, 4.5), (cx - 1.2, 5.0)):
        paint(img, np.hypot(X - bx, Y - by) <= 0.5, c["mid"])                         # dimples
    paint(img, knob_stem | stem, c["mid"])
    paint(img, (knob_stem | stem) & (X < cx - 0.2), c["light"])
    paint(img, knot, c["light"])
    paint(img, knot & (X > cx + 2), c["dark"])
    paint(img, foot, c["mid"])
    paint(img, foot & (X < cx - 4), c["light"])
    paint(img, foot & (X > cx + 7), c["dark"])
    # wooden plinth with a small gold plate
    plinth = (Y > 53) & (Y <= 66) & (np.abs(X - cx) <= 16.5 - 1.0 * (Y > 63))
    paint(img, plinth, c["wood"])
    paint(img, plinth & (Y <= 55), c["wood_l"])
    plate = (Y >= 57.5) & (Y <= 62.5) & (np.abs(X - cx) <= 8.5)
    paint(img, plate, c["plate"])
    paint(img, plate & ((Y > 61.5) | (X > cx + 7.5)), c["plate_d"])
    solid = img[..., 3] > 0
    paint(img, ring_of(solid), c["edge"])
    return img


def app_icon(size: int, scale: int) -> Image.Image:
    """The home-screen icon: the trophy on a putting green, pixel for pixel (player improvements, item 3)."""
    bg = Image.new("RGBA", (size, size), (20, 32, 42, 255))
    yy, xx = np.mgrid[0:size, 0:size]
    green = np.zeros((size, size, 4), np.uint8)
    r = size * 0.42
    d = np.hypot(xx + 0.5 - size / 2, yy + 0.5 - size / 2)
    green[d <= r] = (58, 122, 64, 255)
    green[(d <= r) & (d > r - max(2, size // 48))] = (40, 92, 48, 255)
    bg.alpha_composite(Image.fromarray(green, "RGBA"))
    t = Image.fromarray(trophy(), "RGBA")
    t = t.resize((t.width * scale, t.height * scale), Image.NEAREST)
    bg.alpha_composite(t, ((size - t.width) // 2, (size - t.height) // 2))
    return bg


def write_icons(out: Path = HERE.parent / "game" / "public" / "icons"):
    out.mkdir(parents=True, exist_ok=True)
    for size, scale, name in ((192, 2, "icon-192.png"), (512, 5, "icon-512.png"), (180, 2, "apple-touch-icon.png")):
        app_icon(size, scale).convert("RGB").save(out / name, optimize=True)
    print(f"[title] app icons -> {out}")


def write_sprites(out: Path = HERE.parent / "game" / "public" / "sprites"):
    """The game's logo: sprites/trophy.png, and the home-screen icons (icons/)."""
    Image.fromarray(trophy(), "RGBA").save(out / "trophy.png", optimize=True)
    print(f"[title] trophy.png -> {out}")
    write_icons(out.parent / "icons")


def main():
    write_sprites(Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "game" / "public" / "sprites")


if __name__ == "__main__":
    main()

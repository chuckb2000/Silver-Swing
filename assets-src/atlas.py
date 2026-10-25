"""Tiny sprite-atlas builder: shelf-pack RGBA frames, write PNG + Phaser JSON (hash)."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

try:  # the course pipeline's cached save (pipeline/pngcache.py); a plain save elsewhere
    from pngcache import save_png as _save
except ImportError:
    def _save(img, path, **kw):
        img.save(path, **kw)


class Atlas:
    def __init__(self, name: str, max_w: int = 1024, pad: int = 1):
        self.name = name
        self.max_w = max_w
        self.pad = pad
        self.frames: list[tuple[str, np.ndarray, dict]] = []

    def add(self, key: str, img: np.ndarray | Image.Image, **meta):
        if isinstance(img, Image.Image):
            img = np.array(img.convert("RGBA"))
        assert img.ndim == 3 and img.shape[2] == 4, key
        self.frames.append((key, img, meta))

    def write(self, out_dir: Path):
        out_dir.mkdir(parents=True, exist_ok=True)
        # sort tall-first for better shelves
        order = sorted(range(len(self.frames)), key=lambda i: -self.frames[i][1].shape[0])
        x = y = shelf_h = 0
        pos = {}
        for i in order:
            h, w = self.frames[i][1].shape[:2]
            if x + w + self.pad > self.max_w:
                x = 0
                y += shelf_h + self.pad
                shelf_h = 0
            pos[i] = (x, y)
            x += w + self.pad
            shelf_h = max(shelf_h, h)
        H = y + shelf_h
        H2 = 1
        while H2 < H:
            H2 *= 2
        sheet = np.zeros((H2, self.max_w, 4), np.uint8)
        frames = {}
        for i, (key, img, meta) in enumerate(self.frames):
            px, py = pos[i]
            h, w = img.shape[:2]
            sheet[py:py + h, px:px + w] = img
            fr = {"frame": {"x": px, "y": py, "w": w, "h": h}, "rotated": False, "trimmed": False,
                  "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
            if meta:
                fr["anchor"] = meta.get("anchor", {"x": 0.5, "y": 1.0})
            frames[key] = fr
        _save(Image.fromarray(sheet, "RGBA"), out_dir / f"{self.name}.png", optimize=True)
        with open(out_dir / f"{self.name}.json", "w") as f:
            json.dump({"frames": frames, "meta": {"image": f"{self.name}.png", "size": {"w": self.max_w, "h": H2}, "scale": "1"}}, f, separators=(",", ":"))
        return self.max_w, H2


def hex2rgba(h: str, a: int = 255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def from_template(rows: list[str], colors: dict[str, str | tuple]) -> np.ndarray:
    """Pixel template -> RGBA. '.' (or ' ') is transparent."""
    h = len(rows)
    w = max(len(r) for r in rows)
    img = np.zeros((h, w, 4), np.uint8)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in ". ":
                continue
            c = colors[ch]
            img[y, x] = hex2rgba(c) if isinstance(c, str) else c
    return img


def outline(img: np.ndarray, color=(18, 22, 26, 255), diag=False) -> np.ndarray:
    """Add a 1 px outline around opaque pixels (grows the image by 1 px each side)."""
    h, w = img.shape[:2]
    out = np.zeros((h + 2, w + 2, 4), np.uint8)
    out[1:-1, 1:-1] = img
    a = out[..., 3] > 0
    ring = np.zeros_like(a)
    offs = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    if diag:
        offs += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    for dy, dx in offs:
        ring |= np.roll(np.roll(a, dy, 0), dx, 1)
    ring &= ~a
    out[ring] = color
    return out

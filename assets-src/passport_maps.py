"""Passport maps (developer, 2026-11-13: the passport's pictures "don't look great... maybe it
could be like a zoomed out view of a few holes"): for every course on offer, a small schematic
map of the stretch of the course with the most golf in it, drawn like the overview map (pipeline
s10's render_map: flat surface colours, a light hillshade, trees as canopy blobs) but further out,
at M_PER_PX metres a pixel. Written to game/public/sprites/passport/<id>.png, W x H pixels, the
size of a passport tile (MyGolfScene), drawn 1:1.

Made from the course's own game files (course.json, surface.png, height.png, trees.json), so it
needs no build folder and changes no course.

    python3 assets-src/passport_maps.py            # every course on offer
    python3 assets-src/passport_maps.py <id> ...   # some
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "pipeline"))
import s10_export as S  # noqa: E402  (render_map, MINIMAP, MINIMAP_TREES)

COURSES = ROOT / "game" / "public" / "courses"
OUT = ROOT / "game" / "public" / "sprites" / "passport"
W, H = 104, 52          # a passport tile, in game pixels
M_PER_PX = 5            # metres a map pixel: about 520 x 260 m, a few holes
PX_PER_M = 2            # the surface map's art pixels a metre
TREE_TYPES = {0: "deciduous", 1: "conifer", 2: "cherry", 3: "shrub"}


def _png(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path))


def heights(cdir: Path, j: dict, shape: tuple[int, int]) -> np.ndarray:
    """Ground height at every art pixel (rows north->south), from height.png (1 m, R*256+G)."""
    meta = json.load(open(cdir / j["height"]["meta"]))
    rgb = _png(cdir / j["height"]["file"]).astype(np.float64)
    z = meta["min"] + (rgb[..., 0] * 256 + rgb[..., 1]) * (meta["max"] - meta["min"]) / 65535
    z = np.repeat(np.repeat(z, PX_PER_M, axis=0), PX_PER_M, axis=1)  # 1 m -> 0.5 m
    out = np.zeros(shape)
    h, w = min(shape[0], z.shape[0]), min(shape[1], z.shape[1])
    out[:h, :w] = z[:h, :w]
    return out


def window(j: dict) -> tuple[float, float]:
    """Top-left corner (x0, y1 in metres) of the W x H map window with the most golf in it: the
    holes' lines sampled every 5 m (tees and greens count three times over)."""
    pts = []
    tee = j["defaultTee"]
    for h in j["holes"]:
        t = h["tees"].get(tee) or next(iter(h["tees"].values()))
        line = t["centerline"]
        for (ax, ay), (bx, by) in zip(line[:-1], line[1:]):
            n = max(1, int(np.hypot(bx - ax, by - ay) / 5))
            pts += [(ax + (bx - ax) * k / n, ay + (by - ay) * k / n) for k in range(n)]
        pts += [(t["x"], t["y"])] * 3 + [tuple(h["greenCenter"])] * 3
    p = np.array(pts)
    ww, wh = W * M_PER_PX, H * M_PER_PX
    Wm, Hm = j["world"]["width"], j["world"]["height"]
    best, at = -1, (0.0, Hm)
    for x0 in np.arange(0, max(1, Wm - ww) + 1, 10):
        for y1 in np.arange(min(Hm, wh), Hm + 1, 10):
            inside = (p[:, 0] >= x0 + 8) & (p[:, 0] <= x0 + ww - 8) & (p[:, 1] <= y1 - 8) & (p[:, 1] >= y1 - wh + 8)
            n = int(inside.sum())
            if n > best:
                best, at = n, (float(x0), float(y1))
    return at


def draw(surf: np.ndarray, z: np.ndarray, trees: list, f: int) -> np.ndarray:
    """The overview map's look (pipeline s10 render_map: surface colours of each f x f block, a
    hillshade, trees as canopy blobs lit from the upper left), with the hillshade in three flat
    bands instead of a smooth one: pixel art, no gradients (CLAUDE.md 4)."""
    mode = S.block_mode(surf, f)
    rgb = S.schematic(mode, None).astype(np.float32)
    Hm, Wm = mode.shape
    zb = z[: Hm * f, : Wm * f].reshape(Hm, f, Wm, f).mean((1, 3))
    gy, gx = np.gradient(zb, f / PX_PER_M)
    shade = np.clip((-gx + gy) * 1.2, -0.25, 0.25)
    shade = np.where(shade > 0.05, 0.12, np.where(shade < -0.05, -0.12, 0.0))  # lit, flat, in shadow
    img = np.clip(rgb * (1 + shade[..., None] * 0.6), 0, 255).astype(np.uint8)
    m_per = f / PX_PER_M
    for t in trees:
        cx, cy = t["x"] / m_per, (Hm * m_per - t["y"]) / m_per
        r = max(0.8, t["r"] / m_per)
        x0, x1, y0, y1 = int(cx - r - 1), int(cx + r + 2), int(cy - r - 1), int(cy + r + 2)
        if x1 < 0 or y1 < 0 or x0 >= Wm or y0 >= Hm:
            continue
        yy, xx = np.mgrid[max(0, y0):min(Hm, y1), max(0, x0):min(Wm, x1)]
        inside = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) <= r
        if t["type"] in S.MINIMAP_TREES:
            dark, lite = (np.array(S.hex_rgb(c)) for c in S.MINIMAP_TREES[t["type"]])
        else:
            dark, lite = (np.array(c) for c in S.MAP_TREE_COLOURS.get(t["type"], S.MAP_TREE_COLOURS["deciduous"]))
        hl = (xx + 0.5 - cx + yy + 0.5 - cy) < -r * 0.35
        sub = img[yy, xx]
        sub[inside] = dark
        sub[inside & hl] = lite
        img[yy, xx] = sub
    return img


def render(cid: str) -> Path:
    cdir = COURSES / cid
    j = json.load(open(cdir / "course.json"))
    theme = json.load(open(HERE / "palettes" / f"{j['theme']}.json"))
    S.MINIMAP.clear(); S.MINIMAP.update(theme.get("minimap", {}))
    S.MINIMAP_TREES.clear(); S.MINIMAP_TREES.update(theme.get("minimap_trees", {}))
    surf = _png(cdir / j["surface"]["file"])
    if surf.ndim == 3:
        surf = surf[..., 0]
    surf = surf.astype(np.uint8)
    f = M_PER_PX * PX_PER_M
    x0, y1 = window(j)
    # the window in art pixels (rows north->south), a block of f art pixels per map pixel
    c0 = int(round(x0 * PX_PER_M)) // f * f
    r0 = int(round((j["world"]["height"] - y1) * PX_PER_M)) // f * f
    # (a course smaller than the window: out of bounds around it)
    big = np.full((max(surf.shape[0], r0 + H * f), max(surf.shape[1], c0 + W * f)), S.SURF["ob"], np.uint8)
    big[: surf.shape[0], : surf.shape[1]] = surf
    sub = big[r0:r0 + H * f, c0:c0 + W * f]
    z = heights(cdir, j, big.shape)[r0:r0 + H * f, c0:c0 + W * f]
    tj = json.load(open(cdir / j["trees"]["file"]))
    ox, oy = c0 / PX_PER_M, j["world"]["height"] - r0 / PX_PER_M  # the window's top-left in metres
    trees = [{"x": x - ox, "y": y - (oy - H * M_PER_PX), "r": r, "type": TREE_TYPES.get(c, "deciduous")}
             for x, y, r, c in zip(tj["x"], tj["y"], tj["r"], tj["c"])
             if ox - 20 <= x <= ox + W * M_PER_PX + 20 and oy - H * M_PER_PX - 20 <= y <= oy + 20]
    img = draw(sub, z, trees, f)
    # a small flag on each green in the window (its pin): it reads as golf at a glance
    for h in j["holes"]:
        px, py = h["pin"]
        cx, cy = int((px - ox) / M_PER_PX), int((oy - py) / M_PER_PX)
        if 1 <= cx < W - 3 and 4 <= cy < H:
            img[cy - 4:cy, cx] = (240, 240, 236)          # the pole
            img[cy - 4:cy - 2, cx + 1:cx + 3] = (226, 56, 47)  # the flag
            img[cy, cx] = (30, 34, 30)                    # the hole
    out = img[:H, :W]
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{cid}.png"
    S.to_palette_png(out, path)
    return path


def main(argv: list[str]) -> None:
    ids = argv or [c["id"] for c in json.load(open(COURSES / "index.json"))["courses"]]
    for cid in ids:
        print(f"[passport] {render(cid).relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1:])

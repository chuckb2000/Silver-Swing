"""Course cards for the course-select screen: a close crop of each course's
own art around a signature green (terrain, trees and the flag, exactly as
drawn in the game at 2 px/m), written to game/public/sprites/cards/<id>.png.

    python3 assets-src/course_cards.py                 # every course in courses/index.json
    python3 assets-src/course_cards.py oswego_lake     # one course
    python3 assets-src/course_cards.py oswego_lake --sheet   # contact sheet of every green (to pick one)

The green is set per course in assets-src/course_cards.json ({"<id>": {"hole": n}});
without an entry the green with the most sand and water around it is used.
Reads only the exported game files (game/public/...), so it works on any
course that has been built.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PUBLIC = ROOT / "game" / "public"
OUT = PUBLIC / "sprites" / "cards"
CONFIG = HERE / "course_cards.json"

PX_PER_M = 2
HEIGHT_PX = PX_PER_M * 0.7
CARD_W, CARD_H = 208, 128   # the card shows the middle of this (see CourseSelectScene)
SURF_BUNKER, SURF_WATER = 6, 7


class Atlas:
    def __init__(self, png: Path, js: Path):
        self.img = Image.open(png).convert("RGBA")
        self.frames = json.load(open(js))["frames"]

    def get(self, key: str) -> Image.Image:
        f = self.frames[key]["frame"]
        return self.img.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))

    def has(self, key: str) -> bool:
        return key in self.frames


def tree_key(i: int, conifer: bool, r: float, h: float, meta: dict, atlas: Atlas) -> str:
    """Same sprite choice as the game (game/src/ui/courseView.ts)."""
    W, H = meta["widths"], meta["heights"]
    q = lambda vals, v: min(vals, key=lambda b: abs(b - v))  # noqa: E731
    w = q(W, max(10, min(42, r * 2 * PX_PER_M)))
    hh = q(H, max(14, min(86, h * HEIGHT_PX)))
    t = "c" if conifer else "d"
    if conifer:
        while hh < 1.15 * w and hh < H[-1]:
            hh = H[H.index(hh) + 1]
        while hh < 1.15 * w:
            w = W[max(0, W.index(w) - 1)]
    else:
        while hh < 0.9 * w and H.index(hh) < len(H) - 1:
            hh = H[H.index(hh) + 1]
        while hh > 2.6 * w + 6 and H.index(hh) > 0:
            hh = H[H.index(hh) - 1]
    key = f"{t}_{w}_{hh}_{i % 3}"
    if not atlas.has(key):
        key = "c_22_44_0" if conifer else "d_22_32_0"
    return key


class Course:
    def __init__(self, cid: str):
        self.id = cid
        self.dir = PUBLIC / "courses" / cid
        self.json = json.load(open(self.dir / "course.json"))
        self.H = self.json["world"]["height"]
        t = self.json["terrain"]
        self.chunk = t["chunk"]
        self.cols, self.rows, self.pattern = t["cols"], t["rows"], t["pattern"]
        self.trees = json.load(open(self.dir / "trees.json"))
        theme = self.json.get("theme", "pnw")
        sheet = "trees" if theme == "pnw" else f"trees_{theme}"
        if not (PUBLIC / "sprites" / f"{sheet}.png").exists():
            sheet = "trees"
        self.tree_atlas = Atlas(PUBLIC / "sprites" / f"{sheet}.png", PUBLIC / "sprites" / f"{sheet}.json")
        self.tree_meta = json.load(open(PUBLIC / "sprites" / f"{sheet}_meta.json"))
        self.ui = Atlas(PUBLIC / "sprites" / "sprites.png", PUBLIC / "sprites" / "sprites.json")
        bl = PUBLIC / "sprites" / "blossom.png"
        self.blossom = Atlas(bl, PUBLIC / "sprites" / "blossom.json") if bl.exists() else None  # flowering trees (c: 2)
        self.surface = np.array(Image.open(self.dir / self.json["surface"]["file"]))
        self._chunks: dict = {}

    def chunk_img(self, i: int, j: int) -> Image.Image:
        if (i, j) not in self._chunks:
            p = self.dir / self.pattern.replace("{i}", str(i)).replace("{j}", str(j))
            self._chunks[(i, j)] = Image.open(p).convert("RGBA")
        return self._chunks[(i, j)]

    def pin_px(self, hole: int) -> tuple[int, int]:
        h = next(x for x in self.json["holes"] if x["number"] == hole)
        return round(h["pin"][0] * PX_PER_M), round((self.H - h["pin"][1]) * PX_PER_M)

    def render(self, hole: int, w: int = CARD_W, h: int = CARD_H) -> Image.Image:
        """The game's view of the area around a hole's pin, w x h art pixels."""
        px, py = self.pin_px(hole)
        x0 = int(np.clip(px - w // 2, 0, self.cols * self.chunk - w))
        y0 = int(np.clip(py - h // 2 + 8, 0, self.rows * self.chunk - h))  # pin a little above centre
        img = Image.new("RGBA", (w, h))
        for j in range(y0 // self.chunk, (y0 + h - 1) // self.chunk + 1):
            for i in range(x0 // self.chunk, (x0 + w - 1) // self.chunk + 1):
                img.paste(self.chunk_img(i, j), (i * self.chunk - x0, j * self.chunk - y0))
        # objects depth-sorted by their base: trees, then the cup and flag at the pin
        objs = []
        T = self.trees
        for k in range(len(T["x"])):
            tx = round(T["x"][k] * PX_PER_M)
            ty = round((self.H - T["y"][k]) * PX_PER_M)
            if tx < x0 - 30 or tx > x0 + w + 30 or ty < y0 or ty > y0 + h + 100:
                continue
            key = tree_key(k, T["c"][k] == 1, T["r"][k], T["h"][k], self.tree_meta, self.tree_atlas)
            bkey = "b" + key[1:]
            if T["c"][k] == 2 and self.blossom is not None and self.blossom.has(bkey) and key.startswith("d_"):
                spr = self.blossom.get(bkey)     # same choice as the game (courseView.ts)
            else:
                spr = self.tree_atlas.get(key)
            objs.append((ty, tx - spr.width // 2, ty + 1 - spr.height, spr))
        cup = self.ui.get("cup")
        flag = self.ui.get("flag_0")
        objs.append((py - 0.5, px - cup.width // 2, py - cup.height // 2, cup))
        objs.append((py, px - round(flag.width * 0.25), py - flag.height, flag))
        for _, ox, oy, spr in sorted(objs, key=lambda o: o[0]):
            img.alpha_composite(spr, (ox - x0, oy - y0)) if 0 <= ox - x0 and 0 <= oy - y0 and ox - x0 + spr.width <= w and oy - y0 + spr.height <= h \
                else _paste_clipped(img, spr, ox - x0, oy - y0)
        return img

    def interest(self, hole: int) -> float:
        """Sand and water near the green: the more, the better a card it makes."""
        px, py = self.pin_px(hole)
        s = self.surface[max(0, py - 60):py + 60, max(0, px - 100):px + 100]
        return float((s == SURF_BUNKER).sum() + 1.5 * (s == SURF_WATER).sum())


def _paste_clipped(img: Image.Image, spr: Image.Image, x: int, y: int):
    """alpha_composite with clipping at the image edges."""
    W, H = img.size
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1, sy1 = min(spr.width, W - x), min(spr.height, H - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    img.alpha_composite(spr.crop((sx0, sy0, sx1, sy1)), (x + sx0, y + sy0))


def config() -> dict:
    return json.load(open(CONFIG)) if CONFIG.exists() else {}


def card_hole(c: Course, cfg: dict) -> int:
    if c.id in cfg and "hole" in cfg[c.id]:
        return int(cfg[c.id]["hole"])
    return max((h["number"] for h in c.json["holes"]), key=c.interest)


def contact_sheet(c: Course) -> Path:
    tiles = [(h["number"], c.render(h["number"])) for h in c.json["holes"]]
    cols = 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * (CARD_W + 4), rows * (CARD_H + 4)), (10, 14, 18, 255))
    for k, (_, t) in enumerate(tiles):
        sheet.paste(t, ((k % cols) * (CARD_W + 4), (k // cols) * (CARD_H + 4)))
    p = OUT / f"_{c.id}_greens.png"
    sheet.save(p)
    print(f"[cards] contact sheet (holes in order, {cols} per row) -> {p}")
    return p


def main(argv: list[str]):
    OUT.mkdir(parents=True, exist_ok=True)
    ids = [a for a in argv if not a.startswith("--")]
    if not ids:
        ids = [c["id"] for c in json.load(open(PUBLIC / "courses" / "index.json"))["courses"]]
    cfg = config()
    for cid in ids:
        c = Course(cid)
        if "--sheet" in argv:
            contact_sheet(c)
            continue
        hole = card_hole(c, cfg)
        c.render(hole).convert("RGB").save(OUT / f"{cid}.png", optimize=True)
        print(f"[cards] {cid}: hole {hole} green -> sprites/cards/{cid}.png")


if __name__ == "__main__":
    main(sys.argv[1:])

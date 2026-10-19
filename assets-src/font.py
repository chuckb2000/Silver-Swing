"""Original rounded lowercase pixel font with a 1 px dark outline.

Glyphs are drawn on a 9-row grid: rows 0-1 ascender, 2-6 x-height,
7-8 descender; digits and capitals-as-lowercase use rows 0-6.
Writes a BMFont (XML) + PNG pair that Phaser loads with load.bitmapFont.
Uppercase input is mapped to the lowercase glyphs at runtime.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

INK = (246, 246, 242, 255)
EDGE = (22, 24, 30, 255)

# glyph rows top->bottom; widths are the string lengths (proportional font)
X = {  # x-height letters occupy rows 2-6 unless they have 7 or 9 rows
    "a": [".###", "#..#", "#..#", "#..#", ".###"],
    "c": [".###", "#...", "#...", "#...", ".###"],
    "e": [".##.", "#..#", "####", "#...", ".###"],
    "m": ["##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
    "n": ["###.", "#..#", "#..#", "#..#", "#..#"],
    "o": [".##.", "#..#", "#..#", "#..#", ".##."],
    "r": ["#.##", "##..", "#...", "#...", "#..."],
    "s": [".###", "#...", ".##.", "...#", "###."],
    "u": ["#..#", "#..#", "#..#", "#..#", ".###"],
    "v": ["#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
    "w": ["#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
    "x": ["#..#", "#..#", ".##.", "#..#", "#..#"],
    "z": ["####", "...#", ".##.", "#...", "####"],
}
TALL = {  # rows 0-6
    "b": ["#...", "#...", "###.", "#..#", "#..#", "#..#", "###."],
    "d": ["...#", "...#", ".###", "#..#", "#..#", "#..#", ".###"],
    "f": [".##", "#..", "###", "#..", "#..", "#..", "#.."],
    "h": ["#...", "#...", "###.", "#..#", "#..#", "#..#", "#..#"],
    "i": ["#", ".", "#", "#", "#", "#", "#"],
    "k": ["#...", "#...", "#..#", "#.#.", "##..", "#.#.", "#..#"],
    "l": ["#.", "#.", "#.", "#.", "#.", "#.", ".#"],
    "t": ["#..", "#..", "###", "#..", "#..", "#..", ".##"],
    "0": [".##.", "#..#", "#..#", "#..#", "#..#", "#..#", ".##."],
    "1": [".#.", "##.", ".#.", ".#.", ".#.", ".#.", "###"],
    "2": [".##.", "#..#", "...#", "..#.", ".#..", "#...", "####"],
    "3": ["###.", "...#", "...#", ".##.", "...#", "...#", "###."],
    "4": ["#..#", "#..#", "#..#", "####", "...#", "...#", "...#"],
    "5": ["####", "#...", "###.", "...#", "...#", "#..#", ".##."],
    "6": [".##.", "#...", "#...", "###.", "#..#", "#..#", ".##."],
    "7": ["####", "...#", "..#.", "..#.", ".#..", ".#..", ".#.."],
    "8": [".##.", "#..#", "#..#", ".##.", "#..#", "#..#", ".##."],
    "9": [".##.", "#..#", "#..#", ".###", "...#", "...#", ".##."],
    "!": ["#", "#", "#", "#", "#", ".", "#"],
    "?": [".##.", "#..#", "...#", "..#.", ".#..", "....", ".#.."],
    "/": ["..#", "..#", ".#.", ".#.", ".#.", "#..", "#.."],
    "(": [".#", "#.", "#.", "#.", "#.", "#.", ".#"],
    ")": ["#.", ".#", ".#", ".#", ".#", ".#", "#."],
    "%": ["##...", "##..#", "...#.", "..#..", ".#...", "#..##", "...##"],
    "&": [".#..", "#.#.", "#.#.", ".#..", "#.##", "#..#", ".##."],
    "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
    "'": ["#", "#", ".", ".", ".", ".", "."],
    '"': ["#.#", "#.#", "...", "...", "...", "...", "..."],
    "°": [".#.", "#.#", ".#.", "...", "...", "...", "..."],
    "©": [".####.", "#....#", "#.##.#", "#.#..#", "#.##.#", "#....#", ".####."],
    "[": ["##", "#.", "#.", "#.", "#.", "#.", "##"],
    "]": ["##", ".#", ".#", ".#", ".#", ".#", "##"],
}
DESC = {  # rows 2-8
    "g": [".###", "#..#", "#..#", "#..#", ".###", "...#", "###."],
    "j": [".#", ".#", ".#", ".#", ".#", ".#", "#."],
    "p": ["###.", "#..#", "#..#", "#..#", "###.", "#...", "#..."],
    "q": [".###", "#..#", "#..#", "#..#", ".###", "...#", "...#"],
    "y": ["#..#", "#..#", "#..#", "#..#", ".###", "...#", "###."],
}
SMALL = {  # explicit row placement: (top_row, rows)
    ".": (6, ["#"]),
    ",": (6, [".#", "#."]),
    ":": (3, ["#", ".", ".", "#"]),
    ";": (3, [".#", "..", "..", ".#", "#."]),
    "-": (4, ["###"]),
    "+": (3, [".#.", "###", ".#."]),
    "=": (3, ["###", "...", "###"]),
    "<": (2, ["..#", ".#.", "#..", ".#.", "..#"]),
    ">": (2, ["#..", ".#.", "..#", ".#.", "#.."]),
    "_": (7, ["####"]),
    "*": (2, ["#.#", ".#.", "#.#"]),
    "·": (4, ["#"]),
    "j0": (0, ["#"]),
}
EXTRA_DOTS = {"i": True}


def glyph_bitmap(ch: str) -> np.ndarray | None:
    grid = np.zeros((9, 6), bool)
    rows, top = None, 0
    if ch in X:
        rows, top = X[ch], 2
    elif ch in TALL:
        rows, top = TALL[ch], 0
    elif ch in DESC:
        rows, top = DESC[ch], 2
    elif ch in SMALL and ch != "j0":
        top, rows = SMALL[ch]
    if rows is None:
        return None
    w = max(len(r) for r in rows)
    grid = np.zeros((9, w), bool)
    for i, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == "#":
                grid[top + i, x] = True
    if ch == "j":
        grid[0, w - 1] = True
    return grid


def build_font(out_dir: Path, name: str = "pxfont"):
    chars = sorted(set(list(X) + list(TALL) + list(DESC) + [k for k in SMALL if k != "j0"]))
    cells = []
    for ch in chars:
        g = glyph_bitmap(ch)
        h, w = g.shape
        img = np.zeros((h + 2, w + 2, 4), np.uint8)
        ink = np.zeros((h + 2, w + 2), bool)
        ink[1:-1, 1:-1] = g
        ring = np.zeros_like(ink)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ring |= np.roll(np.roll(ink, dy, 0), dx, 1)
        ring &= ~ink
        img[ring] = EDGE
        img[ink] = INK
        cells.append((ch, img, w))
    # pack in one row-wrapped sheet
    sheet_w = 256
    x = y = 0
    row_h = 11
    placed = []
    for ch, img, w in cells:
        if x + img.shape[1] > sheet_w:
            x = 0
            y += row_h + 1
        placed.append((ch, x, y, img, w))
        x += img.shape[1] + 1
    sheet_h = y + row_h + 1
    H2 = 16
    while H2 < sheet_h:
        H2 *= 2
    sheet = np.zeros((H2, sheet_w, 4), np.uint8)
    lines = []
    for ch, px, py, img, w in placed:
        sheet[py:py + img.shape[0], px:px + img.shape[1]] = img
        lines.append(f'  <char id="{ord(ch)}" x="{px}" y="{py}" width="{img.shape[1]}" height="{img.shape[0]}" '
                     f'xoffset="0" yoffset="0" xadvance="{w + 1}" page="0" chnl="15"/>')
    # space
    lines.append('  <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="3" page="0" chnl="15"/>')
    Image.fromarray(sheet, "RGBA").save(out_dir / f"{name}.png", optimize=True)
    xml = [
        '<?xml version="1.0"?>',
        "<font>",
        f'  <info face="{name}" size="9" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="1" padding="0,0,0,0" spacing="0,0"/>',
        f'  <common lineHeight="11" base="8" scaleW="{sheet_w}" scaleH="{H2}" pages="1" packed="0"/>',
        f'  <pages><page id="0" file="{name}.png"/></pages>',
        f'  <chars count="{len(lines)}">',
        *lines,
        "  </chars>",
        "</font>",
    ]
    (out_dir / f"{name}.xml").write_text("\n".join(xml) + "\n")
    return len(lines)

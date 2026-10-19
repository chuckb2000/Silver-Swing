"""Generate every sprite sheet, the UI icons and the bitmap font.

    python3 assets-src/build_assets.py      (or: make assets)

Outputs to game/public/sprites/: trees.png/json, sprites.png/json,
pxfont.png/xml. Everything is drawn in code - no external art.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from atlas import Atlas  # noqa: E402
from font import build_font  # noqa: E402
from sprites import all_sprites  # noqa: E402
from trees import TREE_HEIGHTS, TREE_WIDTHS, tree_frames  # noqa: E402

OUT = HERE.parent / "game" / "public" / "sprites"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    t = Atlas("trees", max_w=1024)
    frames = tree_frames()
    for key, img in frames:
        t.add(key, img)
    tw, th = t.write(OUT)
    s = Atlas("sprites", max_w=512)
    for key, img in all_sprites():
        s.add(key, img)
    sw, sh = s.write(OUT)
    n = build_font(OUT)
    (OUT / "trees_meta.json").write_text(
        '{"widths":%s,"heights":%s}' % (TREE_WIDTHS, TREE_HEIGHTS))
    print(f"[assets] trees {len(frames)} frames ({tw}x{th}), sprites ({sw}x{sh}), font {n} glyphs -> {OUT}")


if __name__ == "__main__":
    main()

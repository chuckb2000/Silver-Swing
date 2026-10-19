"""Tree sprite sheets for course themes other than the original `pnw` set.

    python3 assets-src/build_theme_trees.py potomac     (or: make theme-trees THEME=potomac)

Writes game/public/sprites/trees_<theme>.png/json and trees_<theme>_meta.json,
which the game loads for a course whose theme is <theme> (src/data/registry.ts
treeSheet). A theme's sprites live in assets-src/trees_<theme>.py and expose
tree_frames(); the pnw sheet (build_assets.py) is not touched.
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from atlas import Atlas  # noqa: E402
from trees import TREE_HEIGHTS, TREE_WIDTHS  # noqa: E402

OUT = HERE.parent / "game" / "public" / "sprites"


def main():
    theme = sys.argv[1] if len(sys.argv) > 1 else "potomac"
    mod = importlib.import_module(f"trees_{theme}")
    t = Atlas(f"trees_{theme}", max_w=1024)
    frames = mod.tree_frames()
    for key, img in frames:
        t.add(key, img)
    tw, th = t.write(OUT)
    (OUT / f"trees_{theme}_meta.json").write_text('{"widths":%s,"heights":%s}' % (TREE_WIDTHS, TREE_HEIGHTS))
    print(f"[theme-trees] {theme}: {len(frames)} frames ({tw}x{th}) -> {OUT}/trees_{theme}.png")


if __name__ == "__main__":
    main()

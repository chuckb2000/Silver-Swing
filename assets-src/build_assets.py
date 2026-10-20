"""Generate every sprite sheet, the UI icons and the bitmap font.

    python3 assets-src/build_assets.py      (or: make assets)

Outputs to game/public/sprites/: trees.png/json, sprites.png/json,
pxfont.png/xml, and every theme's sheets.

    python3 assets-src/build_assets.py --theme <name>

writes one theme's sheets only (trees_<name>, shrubs_<name>), for a course
chat adding a theme: nothing shared is rewritten. Everything is drawn in code - no external art.
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
import title_art  # noqa: E402
import blossom  # noqa: E402
import shrubs  # noqa: E402

OUT = HERE.parent / "game" / "public" / "sprites"


def theme_trees(theme: str):
    """trees_<theme>.png/json/_meta.json for a theme with its own tree painters."""
    t = Atlas(f"trees_{theme}", max_w=1024)
    frames = tree_frames(theme)
    for key, img in frames:
        t.add(key, img)
    tw, th = t.write(OUT)
    (OUT / f"trees_{theme}_meta.json").write_text(
        '{"widths":%s,"heights":%s}' % (TREE_WIDTHS, TREE_HEIGHTS))
    print(f"[assets] trees_{theme} {len(frames)} frames ({tw}x{th})")


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--theme":
        # one course theme's sheets only (a course chat's new theme): nothing shared is rewritten
        import json
        theme = sys.argv[2]
        OUT.mkdir(parents=True, exist_ok=True)
        if "trees" in json.load(open(HERE / "palettes" / f"{theme}.json")) and theme != "pnw":
            theme_trees(theme)
        shrubs.theme_sheets(theme)
        return
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
    title_art.write_sprites(OUT)  # the title screen's panorama and trophy
    # tree sets of the other course themes (palettes/<theme>.json with a "trees" entry)
    import json
    for pal in sorted((HERE / "palettes").glob("*.json")):
        theme = pal.stem
        if theme == "pnw" or "trees" not in json.load(open(pal)):
            continue
        theme_trees(theme)
    blossom.main()  # flowering trees (trees.json c: 2), any theme
    shrubs.main()   # flowering shrubs (trees.json c: 3), any theme, and themes' own bushes (shrubs_<theme>)


if __name__ == "__main__":
    main()

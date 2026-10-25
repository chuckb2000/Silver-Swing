"""Logo concepts: vector sources -> game sprites, vector masters and review sheets.

Each course folder holds hand-written SVG sources drawn on the game's 32 x 32
logo grid (no outline; the house outline is added here):

    assets-src/logo_concepts/<id>/concept1.src.svg   # Concept 1: the existing logo, elevated
    assets-src/logo_concepts/<id>/concept2.src.svg   # Concept 2: an original logo from the course itself
    assets-src/logo_concepts/<id>/concept1.fix       # optional pixel touch-ups (see FIXES below)
    assets-src/logo_concepts/<id>/notes.json         # rationale, facts and sources

    python3 assets-src/logo_concepts/lc.py build <id> [<id> ...]   # write the outputs below
    python3 assets-src/logo_concepts/lc.py sheet <id> out.png      # current | concept 1 | concept 2, for review
    python3 assets-src/logo_concepts/lc.py all                      # build every course folder

Outputs per source `<name>.src.svg` (originals in game/public/sprites/logos/ are never touched):

    <name>.svg       vector master: the art over a 1-unit dark outline (scales to any size)
    <name>_32.png    the game sprite: 32 x 32, transparent, pixel art, house outline
                     (drop-in for game/public/sprites/logos/<id>.png)
    <name>_512.png   smooth 512 px render of the vector master

Pixel conversion: the SVG is rendered at 16x, each logo pixel takes the colour at
its centre (the same rule as assets-src/logos.py, whose shapes are tested at pixel
centres), snapped to the nearest colour the SVG declares, then the house outline
(#0d1620 at alpha 220, 4-neighbourhood) is drawn round everything.

FIXES (`<name>.fix`, one per line, `#` comments): `x y #rrggbb` or `x y clear`
sets a pixel before the outline is drawn; a leading `!` sets it after.

Root attribute `data-outline="outside"` on the <svg> keeps holes inside the
drawing open (only the outer silhouette gets the outline), like `outlined_outside`.
"""
from __future__ import annotations

import copy
import io
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SPRITES = REPO / "game" / "public" / "sprites"
COURSES = REPO / "game" / "public" / "courses"
S = 32
K = 16  # supersampling for the pixel conversion
EDGE = (13, 22, 32, 220)
EDGE_HEX = "#0d1620"
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


# ---------------------------------------------------------------- rendering
def render(svg: str, px: int) -> Image.Image:
    import cairosvg
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def declared_colours(svg: str) -> list[tuple[int, int, int]]:
    out = []
    for h in re.findall(r"#([0-9a-fA-F]{6})\b", svg):
        c = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
        if c not in out:
            out.append(c)
    for h in re.findall(r"#([0-9a-fA-F]{3})\b(?![0-9a-fA-F])", svg):
        c = tuple(int(ch * 2, 16) for ch in h)
        if c not in out:
            out.append(c)
    return out


def ring_of(mask: np.ndarray) -> np.ndarray:
    m = np.zeros_like(mask)
    m[1:, :] |= mask[:-1, :]
    m[:-1, :] |= mask[1:, :]
    m[:, 1:] |= mask[:, :-1]
    m[:, :-1] |= mask[:, 1:]
    return m & ~mask


def exterior(solid: np.ndarray) -> np.ndarray:
    """Transparent pixels connected to the border (4-neighbourhood)."""
    from collections import deque
    h, w = solid.shape
    ext = np.zeros_like(solid)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not solid[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not solid[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not solid[ny, nx] and not ext[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))
    return ext


def parse_fixes(path: Path):
    pre, post = [], []
    if not path.exists():
        return pre, post
    for line in path.read_text().splitlines():
        line = line.split("#", 1)[0] if not re.search(r"#[0-9a-fA-F]{6}", line) else re.sub(r"\s#\s.*$", "", line)
        line = line.strip()
        if not line:
            continue
        after = line.startswith("!")
        parts = line.lstrip("!").split()
        x, y, v = int(parts[0]), int(parts[1]), parts[2]
        col = None if v == "clear" else (*(int(v.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)), 255)
        (post if after else pre).append((x, y, col))
    return pre, post


def pixelize(svg: str, fixes: Path | None = None) -> np.ndarray:
    hi = np.asarray(render(svg, S * K)).astype(np.float32)
    # the 2 x 2 subpixels round each logo pixel's centre
    c0, c1 = K // 2 - 1, K // 2 + 1
    blk = hi.reshape(S, K, S, K, 4)[:, c0:c1, :, c0:c1, :]
    a = blk[..., 3].mean(axis=(1, 3))
    # premultiplied average colour
    w = blk[..., 3:4] / 255.0
    rgb = (blk[..., :3] * w).sum(axis=(1, 3)) / np.maximum(w.sum(axis=(1, 3)), 1e-6)
    pal = np.array(declared_colours(svg) or [(255, 255, 255)], np.float32)
    d = ((rgb[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    snapped = pal[d.argmin(-1)].astype(np.uint8)
    img = np.zeros((S, S, 4), np.uint8)
    solid = a >= 127.5
    img[solid, :3] = snapped[solid]
    img[solid, 3] = 255
    pre, post = parse_fixes(fixes) if fixes else ([], [])
    for x, y, col in pre:
        img[y, x] = col if col else (0, 0, 0, 0)
    solid = img[..., 3] > 0
    ring = ring_of(solid)
    if 'data-outline="outside"' in svg:
        ring &= exterior(solid)
    img[ring] = EDGE
    for x, y, col in post:
        img[y, x] = col if col else (0, 0, 0, 0)
    return img


def master_svg(svg: str) -> str:
    """The source art over a dark outline: a copy of every shape, filled and stroked
    1 unit wider in the edge colour, underneath the art."""
    root = ET.fromstring(svg)
    tag = lambda e: e.tag.split("}")[-1]
    kids = [k for k in list(root) if tag(k) not in ("title", "desc", "metadata", "defs", "style")]
    under = ET.Element(f"{{{SVG_NS}}}g", {"id": "outline"})
    for k in kids:
        c = copy.deepcopy(k)
        for e in c.iter():
            if tag(e) == "g":
                for a in ("fill", "stroke", "stroke-width", "opacity"):
                    e.attrib.pop(a, None)
                continue
            fill = e.get("fill")
            stroke = e.get("stroke")
            sw = float(e.get("stroke-width", "1")) if stroke and stroke != "none" else 0.0
            e.attrib.pop("style", None)
            e.attrib.pop("opacity", None)
            e.set("fill", "none" if fill == "none" else EDGE_HEX)
            e.set("stroke", EDGE_HEX)
            e.set("stroke-width", f"{sw + 2:g}")
            e.set("stroke-linejoin", "round")
            if not e.get("stroke-linecap"):
                e.set("stroke-linecap", "round")
        under.append(c)
    # put the outline straight after <defs>/<style>, before the art
    idx = 0
    for i, k in enumerate(list(root)):
        if tag(k) in ("title", "desc", "metadata", "defs", "style"):
            idx = i + 1
    root.insert(idx, under)
    root.set("width", "512")
    root.set("height", "512")
    root.attrib.pop("data-outline", None)
    return ET.tostring(root, encoding="unicode")


def build_one(src: Path) -> dict:
    svg = src.read_text()
    name = src.name[: -len(".src.svg")]
    out = src.parent
    img = pixelize(svg, out / f"{name}.fix")
    Image.fromarray(img, "RGBA").save(out / f"{name}_32.png", optimize=True)
    m = master_svg(svg)
    (out / f"{name}.svg").write_text(m)
    render(m, 512).save(out / f"{name}_512.png", optimize=True)
    return {"name": name, "colours": len(declared_colours(svg)), "check": check(svg, img)}


def check(svg: str, img: np.ndarray) -> list[str]:
    msgs = []
    a = np.asarray(render(svg, S * 4))[..., 3]
    if a[:4, :].any() or a[-4:, :].any() or a[:, :4].any() or a[:, -4:].any():
        msgs.append("art touches the outer 1-unit margin (the outline will be cut off)")
    if "gradient" in svg.lower() or "filter" in svg.lower():
        msgs.append("gradients/filters are not allowed")
    n = len(declared_colours(svg))
    if n > 14:
        msgs.append(f"{n} colours declared (aim for <= 12)")
    solid = img[..., 3] > 0
    if solid.sum() < 200:
        msgs.append(f"only {solid.sum()} opaque pixels: the mark may read too small at 32 px")
    return msgs


# ---------------------------------------------------------------- course info
def course_info(cid: str) -> dict:
    p = COURSES / cid / "course.json"
    if p.exists():
        c = json.loads(p.read_text())
        return {"name": c.get("name", cid), "location": c.get("location", "")}
    if cid == "east_potomac":
        return {"name": "East Potomac Golf Links", "location": "East Potomac Park, Washington, District of Columbia"}
    return {"name": cid, "location": ""}


def current_logo(cid: str) -> Image.Image | None:
    p = SPRITES / "logos" / f"{cid}.png"
    return Image.open(p).convert("RGBA") if p.exists() else None


# ---------------------------------------------------------------- pixel font
class PxFont:
    def __init__(self):
        root = ET.parse(SPRITES / "pxfont.xml").getroot()
        self.sheet = Image.open(SPRITES / "pxfont.png").convert("RGBA")
        self.chars = {}
        for ch in root.iter("char"):
            a = {k: int(v) for k, v in ch.attrib.items() if k != "page" and k != "chnl"}
            self.chars[a["id"]] = a
        self.base = int(root.find("common").get("base"))

    def width(self, s: str) -> int:
        return sum(self.chars.get(ord(c), self.chars.get(32, {"xadvance": 3}))["xadvance"] for c in s)

    def draw(self, im: Image.Image, x: int, y: int, s: str, tint=(255, 255, 255)):
        s = s.lower()
        for ch in s:
            g = self.chars.get(ord(ch))
            if g is None:
                x += 3
                continue
            glyph = self.sheet.crop((g["x"], g["y"], g["x"] + g["width"], g["y"] + g["height"]))
            if tint != (255, 255, 255):
                arr = np.asarray(glyph).astype(np.float32)
                arr[..., :3] *= np.array(tint, np.float32) / 255.0
                glyph = Image.fromarray(arr.astype(np.uint8), "RGBA")
            im.alpha_composite(glyph, (x + g["xoffset"], y + g["yoffset"]))
            x += g["xadvance"]


_FONT = None


def card_mock(cid: str, logo: Image.Image | None, w: int = 176, h: int = 116, group_name: str | None = None) -> Image.Image:
    """The course-select card as the game draws it: art crop, logo at (3, 3), name strip."""
    global _FONT
    if _FONT is None:
        _FONT = PxFont()
    info = course_info(cid)
    im = Image.new("RGBA", (w + 4, h + 4), (57, 64, 73, 255))
    art_id = cid if (SPRITES / "cards" / f"{cid}.png").exists() else {"east_potomac": "east_potomac_blue"}.get(cid, cid)
    p = SPRITES / "cards" / f"{art_id}.png"
    inner = Image.new("RGBA", (w, h), (29, 42, 34, 255))
    if p.exists():
        src = Image.open(p).convert("RGBA")
        fw = 208 if src.width >= 312 else src.width
        cx = max(0, (fw - w) // 2)
        cy = max(0, (src.height - h) // 2 - 6)
        inner.alpha_composite(src.crop((cx, cy, cx + min(w, fw), cy + min(h, src.height))))
    strip = Image.new("RGBA", (w, 22), (11, 17, 22, 199))
    inner.alpha_composite(strip, (0, h - 22))
    name = group_name or info["name"]
    while _FONT.width(name.lower()) > w - 8 and len(name) > 4:
        name = name[:-1]
    _FONT.draw(inner, 4, h - 22 + 2, name)
    loc = info["location"].split(",")[0]
    _FONT.draw(inner, 4, h - 22 + 12, loc, tint=(169, 179, 189))
    if logo is not None:
        inner.alpha_composite(logo, (3, 3))
    im.alpha_composite(inner, (2, 2))
    return im


# ---------------------------------------------------------------- review sheet
def up(im: Image.Image, k: int) -> Image.Image:
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def sheet(cid: str) -> Image.Image:
    """Current | Concept 1 | Concept 2 for one course: 8x pixel, 1x on dark / light /
    card art (each shown 2x), the card at 1x and the smooth vector master."""
    folder = HERE / cid
    cols = [("current", current_logo(cid), None)]
    for n in (1, 2):
        png = folder / f"concept{n}_32.png"
        big = folder / f"concept{n}_512.png"
        cols.append((f"concept {n}", Image.open(png).convert("RGBA") if png.exists() else None,
                     Image.open(big).convert("RGBA") if big.exists() else None))
    cw, pad = 380, 14
    H = 900
    out = Image.new("RGBA", (cw * 3 + pad * 2, H), (210, 212, 214, 255))
    d = ImageDraw.Draw(out)
    for i, (label, px, vec) in enumerate(cols):
        x0 = pad + i * cw
        d.text((x0, 6), f"{cid}  -  {label}", fill=(0, 0, 0))
        if px is None:
            d.text((x0, 40), "(missing)", fill=(160, 0, 0))
            continue
        out.alpha_composite(up(px, 8), (x0, 24))                      # 256 x 256
        # 1x on dark, light and mid, shown at 2x, plus a true 1x strip
        y = 290
        for j, bg in enumerate([(18, 26, 32), (246, 246, 242), (47, 111, 74)]):
            tile = Image.new("RGBA", (40, 40), (*bg, 255))
            tile.alpha_composite(px, (4, 4))
            out.alpha_composite(up(tile, 2), (x0 + j * 88, y))
        strip = Image.new("RGBA", (120, 40), (18, 26, 32, 255))
        strip.alpha_composite(px, (4, 4))
        light = Image.new("RGBA", (40, 40), (246, 246, 242, 255))
        light.alpha_composite(px, (4, 4))
        strip.alpha_composite(light, (44, 0))
        half = px.resize((16, 16), Image.LANCZOS)
        strip.alpha_composite(half, (92, 12))
        out.alpha_composite(strip, (x0 + 264, y + 22))
        d.text((x0 + 264, y + 64), "1x  1x  16px", fill=(0, 0, 0))
        # the card, 1x and 2x
        card = card_mock(cid, px)
        out.alpha_composite(card, (x0 + 190, y + 90))
        out.alpha_composite(up(card.crop((0, 0, 92, 60)), 2), (x0, y + 90))
        # smooth vector master
        if vec is not None:
            out.alpha_composite(vec.resize((200, 200), Image.LANCZOS), (x0 + 10, y + 330))
            dk = Image.new("RGBA", (130, 130), (18, 26, 32, 255))
            dk.alpha_composite(vec.resize((110, 110), Image.LANCZOS), (10, 10))
            out.alpha_composite(dk, (x0 + 230, y + 330))
    return out


def grid(ids: list[str]) -> Image.Image:
    """Several courses, one row each: current | concept 1 | concept 2, each at 5x,
    then all three at 1x on dark, light and on the card art (shown 2x)."""
    rows = []
    for cid in ids:
        folder = HERE / cid
        logos = [current_logo(cid)]
        for n in (1, 2):
            p = folder / f"concept{n}_32.png"
            logos.append(Image.open(p).convert("RGBA") if p.exists() else None)
        row = Image.new("RGBA", (3 * 170 + 3 * 92 * 2 + 40, 214), (210, 212, 214, 255))
        d = ImageDraw.Draw(row)
        d.text((4, 2), cid, fill=(0, 0, 0))
        for i, lg in enumerate(logos):
            if lg is None:
                continue
            row.alpha_composite(up(lg, 5), (4 + i * 170, 16))
            # a true 1x copy on dark under the 5x view
            t = Image.new("RGBA", (36, 36), (18, 26, 32, 255))
            t.alpha_composite(lg, (2, 2))
            row.alpha_composite(t, (4 + i * 170 + 164 - 36, 176))
            card = card_mock(cid, lg, w=92, h=60)
            row.alpha_composite(up(card, 2), (530 + i * 190, 16))
        rows.append(row)
    W = max(r.width for r in rows)
    out = Image.new("RGBA", (W, sum(r.height for r in rows)), (210, 212, 214, 255))
    y = 0
    for r in rows:
        out.alpha_composite(r, (0, y))
        y += r.height
    return out


def course_ids() -> list[str]:
    return sorted(p.name for p in HERE.iterdir() if p.is_dir() and not p.name.startswith(("_", ".")))


def main(argv: list[str]):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return
    cmd, rest = argv[0], argv[1:]
    if cmd in ("build", "all"):
        ids = course_ids() if cmd == "all" else rest
        for cid in ids:
            for src in sorted((HERE / cid).glob("*.src.svg")):
                r = build_one(src)
                flag = "" if not r["check"] else "  ! " + "; ".join(r["check"])
                print(f"[logo_concepts] {cid}/{r['name']}: {r['colours']} colours{flag}")
    elif cmd == "grid":
        path, ids = rest[-1], rest[:-1]
        grid(ids).convert("RGB").save(path)
        print(path)
    elif cmd == "sheet":
        cid, path = rest[0], rest[1]
        sheet(cid).convert("RGB").save(path)
        print(path)
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])

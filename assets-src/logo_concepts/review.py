"""Builds the course-marks review page: every course's current logo next to its two concepts.

    python3 assets-src/logo_concepts/review.py out.html

Reads each course folder's notes.json and built PNG/SVG files (run `lc.py all` first).
Everything is embedded, so the page is a single self-contained HTML file.
"""
from __future__ import annotations

import base64
import html
import io
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

import lc

HERE = Path(__file__).resolve().parent

STATE_NAMES = {"CA": "California", "DC": "District of Columbia", "MA": "Massachusetts", "NY": "New York",
               "OR": "Oregon", "RI": "Rhode Island", "WA": "Washington"}

# Google Fonts weights each family actually has (a css2 request for a missing weight fails)
FONTS = {
    "Josefin Sans": ([400, 600, 700], True), "IM Fell English": ([400], True),
    "Cormorant Garamond": ([500, 600, 700], True), "Fraunces": ([500, 600, 700], True),
    "Rokkitt": ([600, 700], False), "Libre Baskerville": ([400, 700], True),
    "Playfair Display SC": ([400, 700], False), "Playfair Display": ([500, 700], True),
    "Bitter": ([600, 700], False), "Alegreya Sans SC": ([500, 700], False),
    "Alegreya SC": ([500, 700], False), "Spectral": ([500, 600], True), "Nunito": ([800, 900], False),
    "Rye": ([400], False), "Old Standard TT": ([400, 700], False), "Poiret One": ([400], False),
    "Barlow Condensed": ([600], False), "Zilla Slab": ([600, 700], False), "Arvo": ([400, 700], False),
    "Archivo Black": ([400], False), "Oswald": ([600, 700], False), "Lora": ([600], True),
    "Libre Franklin": ([600, 700], False), "Bebas Neue": ([400], False), "Cinzel": ([600, 700], False),
    "Space Grotesk": ([500], False),
}
SERIF = {"IM Fell English", "Cormorant Garamond", "Fraunces", "Libre Baskerville", "Playfair Display SC",
         "Playfair Display", "Bitter", "Alegreya SC", "Spectral", "Rye", "Old Standard TT", "Zilla Slab",
         "Arvo", "Lora", "Cinzel", "Rokkitt"}


def b64(data: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


def png_uri(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return b64(buf.getvalue(), "image/png")


def palette(im: Image.Image, n: int = 6) -> list[str]:
    a = np.asarray(im.convert("RGBA"))
    px = [tuple(p[:3]) for p in a.reshape(-1, 4) if p[3] == 255]
    cnt = Counter(px)
    return ["#%02x%02x%02x" % c for c, _ in cnt.most_common(n)]


def esc(s: str) -> str:
    return html.escape(s or "", quote=True)


def course_meta(cid: str) -> dict:
    p = lc.COURSES / cid / "course.json"
    if cid == "east_potomac":
        p = lc.COURSES / "east_potomac_blue" / "course.json"
    c = json.loads(p.read_text())
    if cid == "east_potomac":
        return {"state": "DC", "line": "Blue 18 · White 9 · Red 9", "town": "East Potomac Park"}
    tee = next((t for t in c["teeSets"] if (t["name"] if isinstance(t, dict) else t) == c["defaultTee"]), c["teeSets"][0])
    yd = tee.get("totalYd") if isinstance(tee, dict) else None
    holes = len(c["holes"])
    bits = [f"{holes} holes", f"par {c['par']}"]
    if yd:
        bits.append(f"{yd:,} yd ({c['defaultTee']})")
    return {"state": c.get("state", ""), "line": " · ".join(bits), "town": c["location"].split(",")[0]}


def weight_for(font: str, want: int) -> int:
    ws = FONTS.get(font, ([400], False))[0]
    return min(ws, key=lambda w: abs(w - want))


def font_links(used: set[str]) -> str:
    out = []
    for f in sorted(used):
        ws, ital = FONTS.get(f, ([400], False))
        fam = f.replace(" ", "+")
        if ital:
            axes = ";".join([f"0,{w}" for w in ws] + [f"1,{ws[0]}"])
            q = f"family={fam}:ital,wght@{axes}"
        elif ws != [400]:
            q = f"family={fam}:wght@{';'.join(map(str, ws))}"
        else:
            q = f"family={fam}"
        out.append(f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{q}&amp;display=swap">')
    return "\n".join(out)


def tile_logo(img: Image.Image, alt: str) -> str:
    return (f'<div class="stage"><img class="px big" src="{png_uri(img)}" width="128" height="128" alt="{esc(alt)}">'
            f'<div class="actual"><span class="chip dark"><img class="px" src="{png_uri(img)}" width="32" height="32" alt=""></span>'
            f'<span class="chip light"><img class="px" src="{png_uri(img)}" width="32" height="32" alt=""></span>'
            f'<span class="cap">actual size</span></div></div>')


def card_img(cid: str, img: Image.Image, alt: str) -> str:
    art = "east_potomac_blue" if cid == "east_potomac" else cid
    card = lc.card_mock(art, img, w=120, h=78)
    return f'<img class="px card" src="{png_uri(card)}" width="{card.width*2}" height="{card.height*2}" alt="{esc(alt)}">'


def build(out: Path):
    ids = [p.parent.name for p in sorted(HERE.glob("*/notes.json"))]
    courses = []
    used = {"Pixelify Sans", "Public Sans", "IBM Plex Mono"}
    for cid in ids:
        n = json.loads((HERE / cid / "notes.json").read_text())
        m = course_meta(cid)
        n["meta"] = m
        for c in n["concepts"]:
            used.add(c["lockup"]["font"])
        courses.append(n)
    order = sorted(courses, key=lambda n: (STATE_NAMES.get(n["meta"]["state"], "Z"), n["course"].lower()))
    states = []
    for n in order:
        s = n["meta"]["state"]
        if s not in states:
            states.append(s)

    # ------------------------------------------------------------- at a glance
    glance = []
    for n in order:
        cid = n["id"]
        imgs = [lc.current_logo(cid)] + [Image.open(HERE / cid / f"concept{k}_32.png").convert("RGBA") for k in (1, 2)]
        cells = []
        for k, im in enumerate(imgs):
            label = ["now", "1", "2"][k]
            pick = ' class="pick"' if k == n.get("pick") else ""
            cells.append(f'<figure{pick}><img class="px" src="{png_uri(im)}" width="64" height="64" alt="{esc(n["course"])} {label}"><figcaption>{label}</figcaption></figure>')
        glance.append(f'<a class="g" href="#{cid}"><span class="gname">{esc(n["course"])}</span><span class="gmarks">{"".join(cells)}</span></a>')

    # ------------------------------------------------------------- course sections
    sections = []
    for n in order:
        cid = n["id"]
        cur = lc.current_logo(cid)
        cols = []
        # current
        cols.append(f'''<article class="col current">
  <p class="kicker">Current logo</p>
  <h3>{esc(n["current"]["subject"])}</h3>
  {tile_logo(cur, n["course"] + " current logo")}
  {card_img(cid, cur, "current logo on the course card")}
  <dl class="notes">
    <dt>Keep</dt><dd>{esc(n["current"]["keep"])}</dd>
    <dt>Weak at card size</dt><dd>{esc(n["current"]["weaknesses"])}</dd>
  </dl>
</article>''')
        for c in n["concepts"]:
            k = c["n"]
            im = Image.open(HERE / cid / f"concept{k}_32.png").convert("RGBA")
            svg = (HERE / cid / f"concept{k}.svg").read_bytes()
            lk = c["lockup"]
            font = lk["font"]
            ital = "Italic" in c["typography"] and FONTS.get(font, ([400], False))[1]
            w = weight_for(font, lk.get("weight", 600))
            fam = f"'{font}', {'Georgia, serif' if font in SERIF else 'system-ui, sans-serif'}"
            case = "uppercase" if lk.get("case", "upper") == "upper" else "none"
            sw = "".join(f'<span class="sw" style="background:{h}" title="{h}"></span>' for h in palette(im))
            pick = n.get("pick") == k
            kicker = "Concept 1 · the existing idea, elevated" if k == 1 else "Concept 2 · new, from the course"
            interp = f'<p class="interp">{esc(c["interpretation"])}</p>' if c.get("interpretation") else ""
            refs = "".join(f"<li>{esc(r)}</li>" for r in c["references"])
            variants = ""
            if cid == "east_potomac":
                vs = []
                for v in ("blue", "white", "red"):
                    vim = Image.open(HERE / cid / f"concept{k}_{v}_32.png").convert("RGBA")
                    vs.append(f'<figure><img class="px" src="{png_uri(vim)}" width="64" height="64" alt="{v} course"><figcaption>{v.title()}</figcaption></figure>')
                variants = f'<div class="variants" aria-label="the three courses">{"".join(vs)}</div>'
            cols.append(f'''<article class="col{' picked' if pick else ''}">
  <p class="kicker">{kicker}{'<span class="badge">Recommended</span>' if pick else ''}</p>
  <h3>{esc(c["name"])}</h3>
  {tile_logo(im, n["course"] + " " + c["name"])}
  {variants}
  {card_img(cid, im, c["name"] + " on the course card")}
  <div class="lockup"><img src="{b64(svg, 'image/svg+xml')}" width="56" height="56" alt="">
    <span class="lk" style="font-family:{esc(fam)};font-weight:{w};font-style:{'italic' if ital else 'normal'};text-transform:{case};letter-spacing:{esc(lk.get('tracking', '0.1em'))}">{esc(n["course"])}</span></div>
  <p class="why">{esc(c["rationale"])}</p>
  {interp}
  <dl class="notes">
    <dt>Says</dt><dd>{esc(c["symbolism"])}</dd>
    <dt>Drawn from</dt><dd><ul>{refs}</ul></dd>
    <dt>Type</dt><dd>{esc(c["typography"])}</dd>
    <dt>Colour</dt><dd class="swatches">{sw}</dd>
    <dt>Strength</dt><dd>{esc(c["strengths"])}</dd>
    <dt>Trade-off</dt><dd>{esc(c["tradeoffs"])}</dd>
  </dl>
</article>''')
        cur_variants = ""
        if cid == "east_potomac":
            vs = "".join(f'<figure><img class="px" src="{png_uri(lc.current_logo("east_potomac_" + v))}" width="64" height="64" alt="current {v}"><figcaption>{v.title()}</figcaption></figure>' for v in ("blue", "white", "red"))
            cols[0] = cols[0].replace("</h3>", f'</h3>', 1).replace('<dl class="notes">', f'<div class="variants">{vs}</div>\n  <dl class="notes">', 1)
        facts = "".join(
            f'<li>{esc(f["fact"])} <a href="{esc(f["source"])}" target="_blank" rel="noopener">source</a></li>' if f["source"].startswith("http")
            else f'<li>{esc(f["fact"])} <span class="src">({esc(f["source"])})</span></li>' for f in n["facts"])
        m = n["meta"]
        sections.append(f'''<section class="course" id="{cid}" aria-labelledby="h-{cid}">
  <header class="chead">
    <div><p class="where">{esc(STATE_NAMES.get(m["state"], m["state"]))} · {esc(n["place"])}</p>
    <h2 id="h-{cid}">{esc(n["course"])}</h2></div>
    <p class="card-line">{esc(m["line"])}</p>
  </header>
  <div class="cols">{''.join(cols)}</div>
  <p class="rec"><strong>Pick:</strong> {esc(n["recommendation"])}</p>
  <details class="facts"><summary>Facts behind the designs ({len(n["facts"])})</summary><ul>{facts}</ul></details>
</section>''')

    nav = "".join(f'<a href="#st-{s}">{esc(STATE_NAMES.get(s, s))}</a>' for s in states)
    # state headings before the first course of each state
    body = []
    seen = set()
    for n, sec in zip(order, sections):
        s = n["meta"]["state"]
        if s not in seen:
            seen.add(s)
            cnt = sum(1 for x in order if x["meta"]["state"] == s)
            body.append(f'<h2 class="state" id="st-{s}">{esc(STATE_NAMES.get(s, s))} <span>{cnt} course{"s" if cnt > 1 else ""}</span></h2>')
        body.append(sec)

    n_courses = len(order)
    page = TEMPLATE.replace("%FONTS%", font_links(used)).replace("%GLANCE%", "".join(glance)).replace(
        "%NAV%", nav).replace("%BODY%", "\n".join(body)).replace("%N%", str(n_courses)).replace("%M%", str(n_courses * 2))
    out.write_text(page)
    print(out, f"{out.stat().st_size/1024:.0f} KB")


TEMPLATE = r"""<title>Silver Swings Course Marks</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&amp;family=Public+Sans:ital,wght@0,400;0,600;1,400&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap">
%FONTS%
<style>
/* Layout: a long scorecard. Summary sheet first, then one hole-by-hole section per course, three columns: now / 1 / 2. */
:root{
  --bg:#e9eee8; --panel:#f7f9f5; --ink:#17201b; --dim:#56645b; --rule:#c9d3c9;
  --accent:#b4501a; --accent-ink:#ffffff; --hatch:#dfe6de; --stage:#26342c; --stage-line:#2f3f35;
  --chip-dark:#121a20; --chip-light:#f6f6f2; --pick:#e8681e;
  --f-display:'Pixelify Sans', 'Courier New', monospace;
  --f-body:'Public Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --f-data:'IBM Plex Mono', ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#0f161b; --panel:#162027; --ink:#e8eee9; --dim:#9fb0a6; --rule:#2a3a43;
  --accent:#f08a3a; --accent-ink:#1a0f06; --hatch:#1b2830; --stage:#0b1116; --stage-line:#16222a;
  --chip-dark:#0b1116; --chip-light:#f6f6f2; --pick:#f59a4e; color-scheme:dark }}
:root[data-theme="dark"]{
  --bg:#0f161b; --panel:#162027; --ink:#e8eee9; --dim:#9fb0a6; --rule:#2a3a43;
  --accent:#f08a3a; --accent-ink:#1a0f06; --hatch:#1b2830; --stage:#0b1116; --stage-line:#16222a;
  --chip-dark:#0b1116; --chip-light:#f6f6f2; --pick:#f59a4e; color-scheme:dark }
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.55 var(--f-body);margin:0}
.wrap{max-width:1240px;margin:0 auto;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px));padding-block:40px 80px}
h1,h2,h3{text-wrap:balance;margin:0}
a{color:var(--accent)}
a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:2px}
.px{image-rendering:pixelated;image-rendering:crisp-edges;display:block;max-width:100%;height:auto}
/* masthead */
.mast{display:grid;gap:18px;padding-bottom:28px;border-bottom:2px solid var(--ink)}
.eyebrow{font:500 13px/1 var(--f-data);letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0}
h1{font:700 clamp(40px,7vw,76px)/.95 var(--f-display);letter-spacing:-.01em}
.lede{max-width:68ch;margin:0;font-size:17px}
.lede b{font-weight:600}
.counts{display:flex;flex-wrap:wrap;gap:8px 22px;font:500 14px/1.3 var(--f-data);color:var(--dim);margin:0;padding:0;list-style:none}
.counts b{color:var(--ink);font-size:20px;font-weight:500;margin-right:6px}
/* how to read */
.legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:28px 0 8px}
.legend div{border-top:3px solid var(--rule);padding-top:10px}
.legend div.c2{border-top-color:var(--accent)}
.legend h4{margin:0 0 4px;font:700 18px/1.2 var(--f-display)}
.legend p{margin:0;color:var(--dim);font-size:14.5px}
/* at a glance */
.sheet{margin:40px 0 12px}
.sheet h2,.state{font:700 30px/1.1 var(--f-display)}
.sheet>p{color:var(--dim);margin:6px 0 18px;max-width:70ch}
.glance{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.g{display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;background:var(--panel);border:1px solid var(--rule);border-radius:6px;text-decoration:none;color:var(--ink)}
.g:hover{border-color:var(--accent)}
.gname{font-weight:600;font-size:14.5px;line-height:1.25}
.gmarks{display:flex;gap:10px}
.gmarks figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border-radius:4px;background:repeating-linear-gradient(135deg,var(--stage) 0 4px,var(--stage-line) 4px 8px)}
.gmarks figure.pick{outline:3px solid var(--pick);outline-offset:-1px}
.gmarks figcaption{font:500 11px/1 var(--f-data);color:#cfd8d2;letter-spacing:.06em}
/* state nav */
.statenav{position:sticky;top:env(safe-area-inset-top, 0px);z-index:5;background:var(--bg);display:flex;flex-wrap:wrap;gap:6px 14px;padding-block:12px;border-bottom:1px solid var(--rule);margin-top:36px;font:500 14px/1.3 var(--f-data)}
.statenav a{color:var(--ink);text-decoration:none;padding:4px 0;border-bottom:2px solid transparent}
.statenav a:hover{border-bottom-color:var(--accent)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top, 0px);z-index:10;background:var(--bg)}
.state{margin:56px 0 0;padding-top:14px;border-top:2px solid var(--ink);display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;scroll-margin-top:60px}
.state span{font:500 14px var(--f-data);color:var(--dim)}
/* a course */
.course{padding:30px 0 34px;border-bottom:1px solid var(--rule);scroll-margin-top:60px}
.chead{display:flex;justify-content:space-between;align-items:flex-end;gap:8px 24px;flex-wrap:wrap;margin-bottom:18px}
.where{margin:0 0 4px;font:500 13px/1.2 var(--f-data);letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.chead h2{font:700 clamp(26px,3.6vw,36px)/1.05 var(--f-display)}
.card-line{margin:0;font:500 14px/1.3 var(--f-data);color:var(--dim);font-variant-numeric:tabular-nums}
.cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
@media (max-width:980px){.cols{grid-template-columns:minmax(0,1fr)}}
.col{min-width:0;display:flex;flex-direction:column;gap:12px;background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:16px}
.col.current{background:transparent;border-style:dashed}
.col.picked{border:2px solid var(--pick)}
.kicker{margin:0;display:flex;justify-content:space-between;gap:8px;align-items:center;font:500 12px/1.3 var(--f-data);letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.badge{background:var(--pick);color:#1a0f06;padding:3px 8px;border-radius:3px;letter-spacing:.06em;white-space:nowrap}
.col h3{font:700 22px/1.15 var(--f-display)}
.current h3{font:600 16px/1.35 var(--f-body)}
.stage{display:flex;align-items:center;gap:16px;padding:16px;border-radius:6px;background:repeating-linear-gradient(135deg,var(--stage) 0 6px,var(--stage-line) 6px 12px)}
.stage .big{width:128px;height:128px;flex:none}
.actual{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.chip{display:inline-block;padding:6px;border-radius:4px}
.chip.dark{background:var(--chip-dark)}
.chip.light{background:var(--chip-light)}
.chip img{width:32px;height:32px}
.cap{font:500 11px/1.2 var(--f-data);color:#cfd8d2;letter-spacing:.06em;text-transform:uppercase}
.card{width:248px;max-width:100%;border-radius:3px}
.variants{display:flex;gap:10px;flex-wrap:wrap}
.variants figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;font:500 11px/1 var(--f-data);color:var(--dim)}
.variants img{width:64px;height:64px}
.lockup{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f6f6f2;color:#17201b;border-radius:6px;min-height:80px}
.lockup img{flex:none}
.lk{font-size:21px;line-height:1.15;min-width:0;overflow-wrap:anywhere}
.why{margin:0}
.interp{margin:0;font-style:italic;color:var(--dim);font-size:14.5px}
.notes{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:6px 12px;margin:0;font-size:14.5px}
.notes dt{font:500 12px/1.9 var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}
.notes dd{margin:0}
.notes ul{margin:0;padding-left:18px}
.swatches{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
.sw{width:22px;height:22px;border-radius:3px;border:1px solid var(--rule)}
.rec{margin:18px 0 0;max-width:80ch}
.rec strong{font:700 16px var(--f-display);color:var(--accent);margin-right:4px}
.facts{margin-top:12px;font-size:14.5px;color:var(--dim)}
.facts summary{cursor:pointer;font:500 13px/1.6 var(--f-data);letter-spacing:.04em}
.facts ul{margin:8px 0 0;padding-left:18px;display:grid;gap:4px}
.src{font-family:var(--f-data);font-size:12.5px}
/* footer */
.foot{margin-top:56px;padding-top:18px;border-top:2px solid var(--ink);display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;font-size:15px}
.foot h4{font:700 18px var(--f-display);margin:0 0 6px}
.foot p,.foot ul{margin:0;color:var(--dim)}
.foot code{font-family:var(--f-data);font-size:13.5px;color:var(--ink);overflow-wrap:anywhere}
@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto}}
html{scroll-behavior:smooth}
</style>
<div class="wrap">
<header class="mast">
  <p class="eyebrow">Silver Swings Golf · course identity</p>
  <h1>Course Marks</h1>
  <p class="lede">Every course in the game, its logo today, and two new directions. <b>Concept 1</b> keeps the subject the course already has and makes it as good as it can be. <b>Concept 2</b> starts again from the course's own history, landscape or town. Each mark is drawn on the game's 32 × 32 grid, shown large, at actual size, on its course card, and as the vector master with a type lockup.</p>
  <ul class="counts"><li><b>%N%</b>courses</li><li><b>%M%</b>new marks</li><li><b>+6</b>East Potomac course variants</li></ul>
</header>
<div class="legend">
  <div><h4>Now</h4><p>The logo in the game today, with what to keep and what fails at card size.</p></div>
  <div><h4>Concept 1</h4><p>The existing idea, elevated: same subject, better silhouette, colour and composition.</p></div>
  <div class="c2"><h4>Concept 2</h4><p>A new mark from the course itself. Facts behind it are listed with sources under each course.</p></div>
</div>
<section class="sheet" aria-labelledby="h-sheet">
  <h2 id="h-sheet">The set at a glance</h2>
  <p>Shown at twice actual size, as on a phone. The orange ring marks the recommended mark for each course. Select a course to see its full comparison.</p>
  <div class="glance">%GLANCE%</div>
</section>
<nav class="statenav" aria-label="States">%NAV%</nav>
%BODY%
<footer class="foot">
  <div><h4>Using a mark in the game</h4><p>Each concept's sprite is a drop-in for the game's logo: copy <code>assets-src/logo_concepts/&lt;course&gt;/concept1_32.png</code> (or <code>concept2_32.png</code>) over <code>game/public/sprites/logos/&lt;course&gt;.png</code>. The shipped logos and their drawing scripts have not been changed.</p></div>
  <div><h4>Files</h4><p><code>conceptN.src.svg</code> is the drawing on the 32 grid; <code>conceptN.svg</code> is the vector master with the outline, for print and merchandise; <code>conceptN_512.png</code> is a smooth render; <code>notes.json</code> holds the rationale and sources. Rebuild with <code>python3 assets-src/logo_concepts/lc.py all</code>.</p></div>
  <div><h4>House rules kept</h4><p>Original drawings, never a club's logo or trademark (each club's real mark was checked and avoided where found). Light from the upper left, the game's dark 1 px outline, at most 12 colours, and readable at 32 px on the card.</p></div>
</footer>
</div>
"""

if __name__ == "__main__":
    build(Path(sys.argv[1]))

"""Gearhart: find the lidar trees on the course that are gone in the 2024 photo.

The DOGAMI canopy model here predates the 2013-15 renovation, which took out most
of the trees between the holes. The developer agreed on 2026-10-20 (intake
question 3) to drop every on-course lidar tree that no longer stands in the
OSIP 2024 orthophoto (raw/osip2024_05m.jpg, 0.5 m, placed by the bbox of its
exportImage request: x 428161-429385, y 5097099-5099091, EPSG:32610).

Score per tree: the share of "canopy" pixels (mean RGB < 90 and green >= red:
dark foliage; lit grass, sand and dune rough are brighter) in a disk of radius
max(1.5 m, 0.6 x crown radius) at the lidar position, the best of positions within
2.5 m (the photo leans tall crowns away from the camera). Trees inside the course
boundary scoring under 0.15 are listed as gone; trees between 0.15 and 0.4 are kept
(proposed/trees_photo_check.png marks them yellow).

Run s05 with "drop_trees" empty first: this reads build/trees.json (the tree list
s05 hands to drop_trees). Writes proposed/trees_gone.json and the picture;
--write-config replaces drop_trees in course_config.json.

    python3 data/gearhart/check_trees.py [--write-config]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
X0, Y1, RES = 428161, 5099091, 0.5    # photo: west and north edges (m), metres per pixel
GONE, UNSURE = 0.15, 0.40
REASON = "not standing in the OSIP 2024 photo (2013-15 tree removal; check_trees.py, score {s})"


def main(write_config: bool):
    cfg_path = HERE / "course_config.json"
    cfg = json.load(open(cfg_path))
    wx, wy = cfg["world"]["x0"], cfg["world"]["y0"]
    img = Image.open(HERE / "raw" / "osip2024_05m.jpg").convert("RGB")
    im = np.asarray(img).astype(float)
    dark = ((im.mean(2) < 90) & (im[:, :, 1] >= im[:, :, 0])).astype(float)
    trees = json.load(open(HERE / "build" / "trees.json"))
    if any(d for d in cfg.get("drop_trees") or []) and not write_config:
        print("[trees] note: course_config.json already has drop_trees; build/trees.json may lack them")
    sh = int(2.5 / RES)
    rows = []
    for t in trees:
        if not t["in"]:
            continue
        cx, cy = (t["x"] + wx - X0) / RES, (Y1 - (t["y"] + wy)) / RES
        rr = max(1.5, 0.6 * t["r"]) / RES
        best = 0.0
        for dy in range(-sh, sh + 1, 2):
            for dx in range(-sh, sh + 1, 2):
                if dx * dx + dy * dy > sh * sh:
                    continue
                x, y = cx + dx, cy + dy
                x0, x1, y0, y1 = int(x - rr), int(x + rr) + 1, int(y - rr), int(y + rr) + 1
                yy, xx = np.mgrid[y0:y1, x0:x1]
                m = (xx - x) ** 2 + (yy - y) ** 2 <= rr * rr
                best = max(best, float(dark[y0:y1, x0:x1][m].mean()))
        rows.append({**t, "score": round(best, 3), "px": (cx, cy)})
    gone = [r for r in rows if r["score"] < GONE]
    unsure = [r for r in rows if GONE <= r["score"] < UNSURE]
    print(f"[trees] {len(rows)} lidar trees inside the boundary: {len(gone)} gone, "
          f"{len(unsure)} kept as uncertain, {len(rows) - len(gone) - len(unsure)} standing")
    d = ImageDraw.Draw(img)
    for r in rows:
        cx, cy = r["px"]
        rad = r["r"] / RES
        c = (255, 0, 0) if r["score"] < GONE else (255, 255, 0) if r["score"] < UNSURE else (0, 255, 0)
        d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=c, width=2)
    img.crop((500, 900, 1450, 3600)).save(HERE / "proposed" / "trees_photo_check.png")
    out = [{"x": r["x"], "y": r["y"], "h": r["h"], "r": r["r"], "score": r["score"]} for r in gone]
    json.dump(out, open(HERE / "proposed" / "trees_gone.json", "w"), indent=0)
    if write_config:
        cfg["drop_trees"] = [{"x": r["x"], "y": r["y"], "reason": REASON.format(s=r["score"])} for r in gone]
        txt = json.dumps(cfg, indent=2, ensure_ascii=False)
        # one line per dropped tree keeps the config readable
        lines, out_lines, inside = txt.split("\n"), [], False
        buf = []
        for ln in lines:
            if ln.strip().startswith('"drop_trees"'):
                inside = True
                out_lines.append(ln)
                continue
            if inside:
                if ln.strip() in ("]", "],"):
                    out_lines.append(ln)
                    inside = False
                    continue
                buf.append(ln.strip())
                if ln.strip().startswith("}"):
                    out_lines.append("    " + " ".join(buf).replace("{ ", "{").replace(" }", "}"))
                    buf = []
                continue
            out_lines.append(ln)
        open(cfg_path, "w").write("\n".join(out_lines) + "\n")
        json.load(open(cfg_path))  # still valid JSON
        print(f"[trees] wrote {len(gone)} drop_trees entries to course_config.json")


if __name__ == "__main__":
    main("--write-config" in sys.argv[1:])

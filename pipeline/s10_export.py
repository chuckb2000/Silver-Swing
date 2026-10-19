"""Step 11: export engine-ready files to game/public/courses/<course>/ and
write data/<course>/validation_report.md (yardages + open items).

Engine encodings (all images are plain 8-bit PNGs so browsers decode them
exactly; the game reads them with colorSpaceConversion 'none'):
  surface.png  greyscale, value = surface id, 0.5 m/px, row 0 = north
  height.png   RGB, R*256+G = uint16 height (min..max), 1 m vertices, row 0 = north
  terrain/c_<col>_<row>.png  512 px art chunks (palette PNG)
"""
from __future__ import annotations

import json
import math
import shutil
import warnings
from datetime import date

import geopandas as gpd
import numpy as np
from PIL import Image
from shapely.geometry import MultiPolygon, Polygon

from common import PX_PER_M, ROOT, SURF, World, build_dir, course_dir, course_name_from_argv, load_config, out_dir, rnd, write_json

warnings.filterwarnings("ignore")

CHUNK = 512


def to_palette_png(arr: np.ndarray, path):
    """Save an RGB(A) array as an exact palette PNG when it has <= 256 colours."""
    img = Image.fromarray(arr)
    flat = arr.reshape(-1, arr.shape[-1])
    uniq = np.unique(flat, axis=0)
    if len(uniq) <= 256 and arr.shape[-1] == 3:
        pal_img = img.quantize(colors=len(uniq), method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE)
        # verify exactness, fall back to RGB if quantisation changed a colour
        if np.array_equal(np.array(pal_img.convert("RGB")), arr):
            pal_img.save(path, optimize=True)
            return
    img.save(path, optimize=True)


def schematic(surf_blocks_mode, P):
    col = {
        SURF["ob"]: "#5f8a45", SURF["rough"]: "#3f8a3c", SURF["fairway"]: "#62b64c", SURF["fringe"]: "#6cc052",
        SURF["green"]: "#86d667", SURF["tee"]: "#79c95c", SURF["bunker"]: "#eadcb3", SURF["water"]: "#3e72a3",
        SURF["cartpath"]: "#a79f8e", SURF["woods"]: "#2c5a33", SURF["ob_road"]: "#6a6b72", SURF["ob_water"]: "#3e72a3",
        SURF["ob_woods"]: "#294c2f", SURF["ob_building"]: "#8a6a58", SURF["building"]: "#9a5a48", SURF["range"]: "#73b15a",
    }
    lut = np.zeros((32, 3), np.uint8)
    for k, v in col.items():
        v = v.lstrip("#")
        lut[k] = [int(v[i:i + 2], 16) for i in (0, 2, 4)]
    return lut[surf_blocks_mode]


def block_mode(surf, f):
    H, W = surf.shape
    Hb, Wb = H // f, W // f
    blocks = surf[:Hb * f, :Wb * f].reshape(Hb, f, Wb, f).transpose(0, 2, 1, 3).reshape(Hb, Wb, f * f)
    counts = np.stack([(blocks == c).sum(-1) for c in range(16)], -1)
    # prefer small but important features (bunker, water, green) when present in >= 30% of the block
    for c, wgt in ((SURF["bunker"], 1.8), (SURF["water"], 1.6), (SURF["green"], 1.6), (SURF["cartpath"], 0.8)):
        counts[..., c] = counts[..., c] * wgt
    return counts.argmax(-1).astype(np.uint8)


def render_map(surf, z_px, trees, world, f, region=None):
    """Schematic map at f art-pixels per map pixel (f=4 -> 2 m/px)."""
    mode = block_mode(surf, f)
    rgb = schematic(mode, None).astype(np.float32)
    # light hillshade
    zb = z_px[: mode.shape[0] * f, : mode.shape[1] * f].reshape(mode.shape[0], f, mode.shape[1], f).mean((1, 3))
    m_per = f / PX_PER_M
    gy, gx = np.gradient(zb, m_per)
    shade = (-gx * -1 + gy * -1) * -1  # NW light
    shade = np.clip((-gx + gy) * 1.2, -0.25, 0.25)  # x east, rows go south => gy is -dz/dnorth
    rgb *= (1 + shade[..., None] * 0.6)
    img = np.clip(rgb, 0, 255).astype(np.uint8)
    # trees as top-down canopy blobs
    Hm, Wm = mode.shape
    for t in trees:
        cx = t["x"] / m_per
        cy = (world.height - t["y"]) / m_per
        r = max(0.8, t["r"] / m_per)
        x0, x1 = int(cx - r - 1), int(cx + r + 2)
        y0, y1 = int(cy - r - 1), int(cy + r + 2)
        if x1 < 0 or y1 < 0 or x0 >= Wm or y0 >= Hm:
            continue
        yy, xx = np.mgrid[max(0, y0):min(Hm, y1), max(0, x0):min(Wm, x1)]
        d = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy)
        inside = d <= r
        dark = np.array([31, 74, 50] if t["type"] == "conifer" else [47, 96, 44])
        lite = np.array([58, 112, 74] if t["type"] == "conifer" else [80, 140, 66])
        hl = (xx + 0.5 - cx + yy + 0.5 - cy) < -r * 0.35
        sub = img[yy, xx]
        sub[inside] = dark
        sub[inside & hl] = lite
        img[yy, xx] = sub
    return img


def update_registry(course: dict):
    """Add or update this course in game/public/courses/index.json (the list the game offers)."""
    path = ROOT / "game" / "public" / "courses" / "index.json"
    reg = json.load(open(path)) if path.exists() else {"courses": []}
    default = next(t for t in course["teeSets"] if t["name"] == course["defaultTee"])
    entry = {
        "id": course["id"], "name": course["name"], "location": course["location"], "theme": course["theme"],
        "holes": len(course["holes"]), "par": course["par"], "defaultTee": course["defaultTee"],
        "totalYd": default["totalYd"], "teeSets": [t["name"] for t in course["teeSets"]],
    }
    reg["courses"] = [c for c in reg["courses"] if c["id"] != entry["id"]] + [entry]
    reg["courses"].sort(key=lambda c: c["name"].lower())
    write_json(path, reg, indent=1)


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    cdir = course_dir(name)
    bdir = build_dir(name)
    out = out_dir(name)
    if (out / "terrain").exists():
        shutil.rmtree(out / "terrain")
    (out / "terrain").mkdir(parents=True)
    (out / "maps").mkdir(exist_ok=True)

    # terrain chunks ----------------------------------------------------------
    art = np.array(Image.open(bdir / "art" / "terrain.png").convert("RGB"))
    H, W = art.shape[:2]
    cols, rows = math.ceil(W / CHUNK), math.ceil(H / CHUNK)
    for j in range(rows):
        for i in range(cols):
            to_palette_png(art[j * CHUNK:(j + 1) * CHUNK, i * CHUNK:(i + 1) * CHUNK], out / "terrain" / f"c_{i}_{j}.png")
    # putting views (s09b): high-resolution green art and tree atlases
    if (out / "greens").exists():
        shutil.rmtree(out / "greens")
    (out / "greens").mkdir()
    gv_path = bdir / "greens" / "green_views.json"
    green_views = json.load(open(gv_path)) if gv_path.exists() else []
    for v in green_views:
        for layer in ("far", "near", "close"):
            for key in ("file", "trees", "treesImage"):
                src = bdir / v[layer][key]
                if key == "file":
                    to_palette_png(np.array(Image.open(src).convert("RGB")), out / v[layer][key])
                else:
                    shutil.copy(src, out / v[layer][key])

    # surface map -------------------------------------------------------------
    surf = np.load(bdir / "surface.npy")
    Image.fromarray(surf, "L").save(out / "surface.png", optimize=True)
    shutil.copy(bdir / "surface_legend.json", out / "surface_legend.json")

    # heightmap ------------------------------------------------------------------
    hb = np.load(bdir / "height_base.npy").astype(np.float64)
    zmin, zmax = float(hb.min()), float(hb.max())
    q = np.round((hb - zmin) / (zmax - zmin) * 65535).astype(np.uint16)
    q = np.flipud(q)  # row 0 = north
    rgb = np.zeros(q.shape + (3,), np.uint8)
    rgb[..., 0] = q >> 8
    rgb[..., 1] = q & 255
    Image.fromarray(rgb, "RGB").save(out / "height.png", optimize=True)
    write_json(out / "height.json", {"cols": int(q.shape[1]), "rows": int(q.shape[0]), "res": 1.0,
                                      "min": round(zmin, 4), "max": round(zmax, 4), "encoding": "R*256+G, row0=north",
                                      "samples": [[i, j, round(float(hb[j, i]), 4)] for i, j in ((100, 100), (700, 500), (1200, 800))]})
    shutil.copy(bdir / "heightmap.png", out / "height16.png") if False else None

    # trees -------------------------------------------------------------------
    trees = json.load(open(bdir / "trees.json"))
    write_json(out / "trees.json", {
        "x": [t["x"] for t in trees], "y": [t["y"] for t in trees], "h": [t["h"] for t in trees],
        "r": [t["r"] for t in trees], "c": [1 if t["type"] == "conifer" else 0 for t in trees],
    })

    # maps --------------------------------------------------------------------
    z_px = np.load(bdir / "z_px.npy")
    overview = render_map(surf, z_px, trees, world, 4)
    to_palette_png(overview, out / "maps" / "overview_2m.png") if False else Image.fromarray(overview).save(out / "maps" / "overview_2m.png", optimize=True)

    g = gpd.read_file(bdir / "course_local.geojson")
    holes = json.load(open(bdir / "holes.json"))
    greens = json.load(open(bdir / "greens.json"))
    green_by_osm = {gm["id"]: gm for gm in greens}
    minimaps = []
    for h in holes:
        t = h["tees"][cfg["default_tee"]]
        pts = np.array(t["centerline"] + [h["pin"]])
        gpoly = Polygon(green_by_osm[h["green_osm"]]["poly"])
        gb = gpoly.bounds
        x0, y0 = min(pts[:, 0].min(), gb[0]) - 28, min(pts[:, 1].min(), gb[1]) - 28
        x1, y1 = max(pts[:, 0].max(), gb[2]) + 28, max(pts[:, 1].max(), gb[3]) + 28
        bw, bh = x1 - x0, y1 - y0
        # keep at least a 1:1.6 aspect so straight holes still show their surroundings
        if bh < bw / 1.6:
            pad = (bw / 1.6 - bh) / 2
            y0, y1 = y0 - pad, y1 + pad
        elif bw < bh / 1.6:
            pad = (bh / 1.6 - bw) / 2
            x0, x1 = x0 - pad, x1 + pad
        bw, bh = x1 - x0, y1 - y0
        box = (72, 104) if bh >= bw else (104, 72)
        mpp = max(2, math.ceil(max(bw / box[0], bh / box[1])))
        f = int(mpp * PX_PER_M)
        wpx, hpx = int(math.ceil(bw / mpp)), int(math.ceil(bh / mpp))
        # crop surface block aligned to f
        c0 = int(x0 * PX_PER_M) // f * f
        r0 = int((world.height - y1) * PX_PER_M) // f * f
        c0 = max(0, c0); r0 = max(0, r0)
        sub = surf[r0:r0 + hpx * f, c0:c0 + wpx * f]
        zsub = z_px[r0:r0 + hpx * f, c0:c0 + wpx * f]
        local_world = World({"world": {"x0": 0, "y0": 0, "width": world.width, "height": world.height}, "epsg": world.epsg})
        # shift trees into the crop frame
        mx0 = c0 / PX_PER_M
        my1 = world.height - r0 / PX_PER_M
        tr_sub = [dict(tt, x=tt["x"] - mx0, y=tt["y"] - (my1 - sub.shape[0] / PX_PER_M)) for tt in trees
                  if mx0 - 10 <= tt["x"] <= mx0 + sub.shape[1] / PX_PER_M + 10 and my1 - sub.shape[0] / PX_PER_M - 10 <= tt["y"] <= my1 + 10]
        local_world.height = sub.shape[0] / PX_PER_M
        img = render_map(sub, zsub, tr_sub, local_world, f)
        fname = f"hole{h['number']:02d}.png"
        Image.fromarray(img).save(out / "maps" / fname, optimize=True)
        minimaps.append({"hole": h["number"], "file": f"maps/{fname}", "x0": rnd(mx0, 3), "y1": rnd(my1, 3), "mPerPx": mpp,
                         "w": int(img.shape[1]), "h": int(img.shape[0])})

    # course.json -------------------------------------------------------------
    boundary = g[g.kind == "boundary"].geometry.iloc[0]
    if isinstance(boundary, MultiPolygon):
        boundary = max(boundary.geoms, key=lambda p: p.area)
    water = []
    for _, r in g[g.kind.isin(["lateral_water_hazard", "water_hazard"])].iterrows():
        kind = "red" if r.kind == "lateral_water_hazard" else "yellow"
        pen = r.tags.get("penalty")
        if pen in ("red", "yellow"):
            kind = pen
        geom = r.geometry
        poly = max(geom.geoms, key=lambda p: p.area) if isinstance(geom, MultiPolygon) else geom
        water.append({"id": r.osm, "penalty": kind, "poly": [[rnd(x), rnd(y)] for x, y in poly.exterior.coords]})
    meta = json.load(open(bdir / "art" / "render_meta.json"))
    bh_by_osm = {b["osm"]: b["h"] for b in meta["buildings"]}
    buildings = []
    for _, r in g[g.kind == "building"].iterrows():
        geom = r.geometry
        polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        for poly in polys:
            if poly.area < 4:
                continue
            if not boundary.buffer(40).intersects(poly):
                continue
            buildings.append({"id": r.osm, "h": bh_by_osm.get(r.osm, 6.0), "inside": bool(boundary.intersects(poly)),
                              "poly": [[rnd(x, 1), rnd(y, 1)] for x, y in poly.simplify(0.3).exterior.coords]})
    hole_out = []
    for h in holes:
        t = h["tees"][cfg["default_tee"]]
        gm = green_by_osm[h["green_osm"]]
        hole_out.append({
            "number": h["number"], "par": h["par"], "handicap": h["handicap"],
            "tees": {ts: {"x": tv["x"], "y": tv["y"], "yd": round(tv["adjusted_yd"]), "adjYd": tv["adjusted_yd"], "realYd": tv["real_yd"], "cardYd": tv["card_yd"],
                          "centerline": tv["centerline"]} for ts, tv in h["tees"].items()},
            "greenId": h["green_osm"], "greenCenter": h["green_center"], "pin": h["pin"],
        })
    course = {
        "id": cfg["id"], "name": cfg["name"], "location": cfg["location"], "architects": cfg["architects"],
        "theme": cfg["theme"],
        "attribution": [
            "Map data © OpenStreetMap contributors (ODbL)",
            "Elevation and canopy height: Oregon Department of Geology and Mineral Industries (DOGAMI) lidar",
            "Scorecard: GolfPass (third-party listing)",
        ],
        "world": {"width": world.width, "height": world.height, "pxPerM": PX_PER_M, "utmOrigin": [world.x0, world.y0], "epsg": world.epsg},
        "teeSets": [{"name": t["name"], "rating": t["rating"], "slope": t["slope"], "totalYd": t["total_yd"]} for t in cfg["tee_sets"] if t.get("playable")],
        "defaultTee": cfg["default_tee"],
        "par": sum(h["par"] for h in holes),
        "holes": hole_out,
        "greens": [{k: v for k, v in gm.items() if k != "check"} for gm in greens],
        "water": water,
        "boundary": [[rnd(x), rnd(y)] for x, y in boundary.exterior.coords],
        "buildings": buildings,
        "terrain": {"chunk": CHUNK, "cols": cols, "rows": rows, "pattern": "terrain/c_{i}_{j}.png"},
        "waterFrames": [],  # water is drawn still (playtest: no animation needed)
        "greenViews": green_views,
        "wind": cfg.get("wind_mph", {"minMph": 1, "maxMph": 7}),
        "height": {"file": "height.png", "meta": "height.json"},
        "surface": {"file": "surface.png", "ids": SURF, "obIds": [v for k, v in SURF.items() if k.startswith("ob") or k == "range"]},
        "trees": {"file": "trees.json"},
        "maps": {"overview": "maps/overview_2m.png", "overviewMPerPx": 2, "holes": minimaps},
    }
    write_json(out / "course.json", course)
    update_registry(course)

    # validation report -------------------------------------------------------
    table = (bdir / "validation_table.md").read_text()
    audit = (bdir / "audit.md").read_text()
    trees_rep = json.load(open(bdir / "trees_report.json"))
    greens_rep = (bdir / "greens_report.md").read_text()
    adjustments = json.load(open(cdir / "adjustments.json"))
    spec_items = [
        "", "## Other open items (spec 11.4)", "",
        "1. **Scorecard not verified against the club's printed card.** Yardages, pars and stroke indexes come from GolfPass. golfingrecord.com lists a different stroke-index order (e.g. hole 5 = 1, hole 6 = 9) and Blue 70.4/132; OSM tags hole 18 with handicap 5. The game uses GolfPass.",
        "2. **Red tee par** (73 vs 71 on GolfPass) - not relevant yet: only the Blue tees are built.",
        "3. **OSM coverage** - complete: all 18 holes have a hole line, green, pin and fairway; 46 tee boxes, 65 bunkers, 4 water hazards and 32 cart paths are mapped (see the audit below). Two extra greens are practice greens and count as wrong greens.",
        "4. **Water** - the four ponds are mapped as `golf=lateral_water_hazard` and play as red penalty areas. Oswego Lake lies outside the course boundary (out of bounds); no hole plays along it.",
        "5. **Imagery** - the NAIP download did not come through, so tree species are inferred from lidar crown shape only.",
    ]
    lines = [table.strip(), *spec_items, "", "## Playability adjustments", ""]
    if adjustments:
        for a in adjustments:
            lines.append(f"- Hole {a['hole']} ({a['tee_set']}): {a['reason']} -> {a['adjusted_yd']} yd (real {a['real_yd']} yd).")
    else:
        lines.append("- none")
    lines += ["", "## Tree detection (DOGAMI canopy height model)", "",
              f"- {trees_rep['detected']} trees detected in the world extent ({trees_rep['inside_course']} inside the course), "
              f"{trees_rep['conifer']} conifers / {trees_rep['deciduous']} deciduous; median height {trees_rep['height_p50_m']:.1f} m, max {trees_rep['height_max_m']:.1f} m.",
              f"- Dropped: {trees_rep['dropped']['building']} tops on building footprints, {trees_rep['dropped']['lake']} over the lake, {trees_rep['dropped']['tiny']} tiny crowns.",
              f"- Dropped on playing surfaces (spec 5.4): {len(trees_rep['dropped_on_playing_surfaces'])} -> " + ", ".join(f"{d['on']} {d['osm']} ({d['h']} m)" for d in trees_rep['dropped_on_playing_surfaces']),
              f"- OSM natural=tree points matched by a detected tree within 4 m: {trees_rep['osm_tree_points_matched_within_4m']} of {trees_rep['osm_tree_points']}.",
              "- Conifer vs deciduous is inferred from crown shape only (no leaf-off imagery); see build/trees_preview.png.",
              "", greens_rep.strip(), "", audit.strip(), ""]
    (cdir / "validation_report.md").write_text("\n".join(lines) + "\n")
    sizes = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"[s10] exported to {out.relative_to(ROOT)}: {cols}x{rows} chunks, {len(trees)} trees, {len(buildings)} buildings, {sizes / 1e6:.1f} MB total")


if __name__ == "__main__":
    main()

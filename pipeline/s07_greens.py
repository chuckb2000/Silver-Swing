"""Step 8 (5.6 item 4): shape the greens by script.

Lidar is too coarse for real green breaks, so each green gets an analytic
model: a plane fitted to the bare-earth DEM over the green (tilt clamped to
1-3%), plus 1-2 low-frequency undulations (<= 1.5% local slope), a flat zone
(<= 2%) of 3 m radius around the pin, blended into the surrounding terrain
over 3 m. The same model is evaluated by the game at runtime.
Writes build/greens.json and appends the checks to build/greens_report.md.
"""
from __future__ import annotations

import json
import math
import warnings

import geopandas as gpd
import numpy as np
from shapely.geometry import Point

from common import build_dir, course_name_from_argv, load_config, rnd, write_json
from terrain import GreenModel, Terrain

warnings.filterwarnings("ignore")

BLEND = 3.0
PIN_R0, PIN_R1 = 3.0, 9.0
MAX_BUMP_SLOPE = 0.015
MAX_TILT = 0.025


def tier_for(spec, hole, green_c, tee):
    """A tier line through the green centre along the line of play (config `green_tiers`):
    `low_side` left/right as seen from the tee; `drop_m` between the tiers; `width_m` of the step."""
    pts = hole["tees"][tee]["centerline"]
    (ax, ay), (bx, by) = pts[-2], pts[-1]
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    nx, ny = (uy, -ux) if spec.get("low_side", "left") == "left" else (-uy, ux)  # normal points to the upper tier
    return {"x": rnd(green_c.x, 3), "y": rnd(green_c.y, 3), "nx": rnd(nx, 5), "ny": rnd(ny, 5),
            "w": float(spec.get("width_m", 4.0)), "h": float(spec["drop_m"])}


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    tiers_cfg = {int(t["hole"]): t for t in cfg.get("green_tiers", [])}
    bdir = build_dir(name)
    base = np.load(bdir / "height_base.npy").astype(np.float64)
    holes = json.load(open(bdir / "holes.json"))
    g = gpd.read_file(bdir / "course_local.geojson")
    greens = g[g.kind == "green"]
    hole_by_no = {h["number"]: h for h in holes}
    # with several layouts (s06 writes them all into holes.json) a green's key is
    # 1000 * (layout index + 1) + hole number, so seeds stay unique per green
    lay_ids = list(dict.fromkeys(h["layout"] for h in holes if "layout" in h))
    pin_for = {h["green_osm"]: ((1000 * (lay_ids.index(h["layout"]) + 1) + h["number"]) if "layout" in h else h["number"], h["pin"])
               for h in holes}
    label = {h["green_osm"]: f"{h['layout'].split('_')[-1]} {h['number']}" for h in holes if "layout" in h}
    t0 = Terrain(base, [])
    notes = []
    models, report = [], ["# Green shaping checks", "", "| green | hole | fitted tilt % | used tilt % | bumps | max slope % | max slope within 3 m of pin % |", "|---|---|---|---|---|---|---|"]
    for k, (_, row) in enumerate(greens.iterrows()):
        poly = row.geometry
        if poly.geom_type == "MultiPolygon":
            poly = max(poly.geoms, key=lambda p: p.area)
        poly = poly.simplify(0.15)
        c = poly.centroid
        minx, miny, maxx, maxy = poly.bounds
        pts = [(x, y) for x in np.arange(minx, maxx, 0.5) for y in np.arange(miny, maxy, 0.5) if poly.contains(Point(x, y))]
        P = np.array(pts)
        Z = np.array([t0.base_z(x, y) for x, y in pts])
        A = np.c_[np.ones(len(P)), P[:, 0] - c.x, P[:, 1] - c.y]
        coef, *_ = np.linalg.lstsq(A, Z, rcond=None)
        z0, gx, gy = coef
        tilt = math.hypot(gx, gy)
        used = min(MAX_TILT, max(0.01, tilt))
        if tilt > 1e-9:
            gx, gy = gx / tilt * used, gy / tilt * used
        hole_no, pin = pin_for.get(row.osm, (None, None))
        seed = 7919 * (hole_no or (100 + k)) + 13
        rng = np.random.default_rng(seed)
        bumps = []
        inner = poly.buffer(-2.0)
        nb = 1 + int(rng.random() < 0.6)
        tiers = [tier_for(tiers_cfg[hole_no], hole_by_no[hole_no], c, cfg["default_tee"])] if hole_no in tiers_cfg else []
        if tiers:
            nb = 0  # the tier is this green's feature; no random undulations on top of it
        tries = 0
        while len(bumps) < nb and tries < 200 and not inner.is_empty:
            tries += 1
            bx = rng.uniform(minx, maxx)
            by = rng.uniform(miny, maxy)
            if not inner.contains(Point(bx, by)):
                continue
            if pin is not None and math.hypot(bx - pin[0], by - pin[1]) < 7.5:
                continue
            if any(math.hypot(bx - b["x"], by - b["y"]) < 6 for b in bumps):
                continue
            s = float(rng.uniform(3.5, 6.0))
            a = float(rng.uniform(0.55, 0.9)) * MAX_BUMP_SLOPE / 0.6065 * s * (1 if rng.random() < 0.5 else -1)
            bumps.append({"x": rnd(bx), "y": rnd(by), "a": rnd(a, 4), "s": rnd(s, 2)})
        d = {
            "id": row.osm, "hole": hole_no,
            "poly": [[rnd(x), rnd(y)] for x, y in poly.exterior.coords],
            "cx": rnd(c.x, 3), "cy": rnd(c.y, 3), "z0": rnd(z0, 4), "gx": rnd(gx, 5), "gy": rnd(gy, 5),
            "bumps": bumps, "blend": BLEND,
        }
        if tiers:
            d["tiers"] = tiers
        if pin is not None:
            gm = GreenModel(d)
            zp = gm.model(pin[0], pin[1])
            f = min(used, 0.015)
            fx, fy = (gx / used * f, gy / used * f) if used > 0 else (0.0, 0.0)
            # on a tiered green the flat zone blends out within 1 m, so it doesn't level the step
            r1 = PIN_R0 + 1.0 if tiers else PIN_R1
            d["pinFlat"] = {"px": pin[0], "py": pin[1], "r0": PIN_R0, "r1": r1, "zp": rnd(zp, 4), "fx": rnd(fx, 5), "fy": rnd(fy, 5)}
        gm = GreenModel(d)
        # checks
        def slope_at(x, y, e=0.25):
            return math.hypot(gm.shaped(x + e, y) - gm.shaped(x - e, y), gm.shaped(x, y + e) - gm.shaped(x, y - e)) / (2 * e)
        s_all = max(slope_at(x, y) for x, y in pts)
        s_pin = max((slope_at(x, y) for x, y in pts if pin is not None and math.hypot(x - pin[0], y - pin[1]) <= 3.0), default=0)
        d["check"] = {"max_slope_pct": rnd(s_all * 100, 2), "max_pin_slope_pct": rnd(s_pin * 100, 2), "fitted_tilt_pct": rnd(tilt * 100, 2)}
        models.append(d)
        report.append(f"| {row.osm} | {label.get(row.osm, hole_no) or 'practice'} | {tilt * 100:.1f} | {used * 100:.1f} | {len(bumps)} | {s_all * 100:.1f} | {s_pin * 100:.1f} |")
        if tiers:
            tr = tiers[0]
            hi = gm.shaped(c.x + 4 * tr["nx"], c.y + 4 * tr["ny"]) - gm.shaped(c.x - 4 * tr["nx"], c.y - 4 * tr["ny"])
            notes.append(f"- Hole {hole_no}: two-tiered green ({tiers_cfg[hole_no].get('note', 'config green_tiers')}): "
                         f"step {tr['h']:.2f} m over {tr['w']:.1f} m along the line of play, upper tier on the "
                         f"{'right' if tiers_cfg[hole_no].get('low_side', 'left') == 'left' else 'left'}; measured {hi:.2f} m between points 4 m either side. "
                         f"The max slope above is the step itself, by design.")
    write_json(bdir / "greens.json", models)
    if notes:
        report += [""] + notes
    (bdir / "greens_report.md").write_text("\n".join(report) + "\n")
    print("\n".join(report))


if __name__ == "__main__":
    main()

"""Steps 8-9 (scorecard + yardage validation): build hole records for the
playable tee set(s), assign each tee set's tee polygon, measure every hole
the way courses do, and write the validation report.

Measurement (CLAUDE.md 5.5): from the centre of the tee polygon, through the
golf=hole line's bend points that lie ahead of the tee, to the green centre.
Horizontal metres -> yards. <=3% pass, 3-8% flag, >8% fail.

Playability step 2 (5.6): when a hole is flagged, the virtual tee may move
anywhere inside the real tee polygon; the move is logged in
adjustments.json and both real and adjusted yardages are reported.

Tee shots clear the trees (pipeline/tee_shots.py, every course): a virtual
tee from which a perfect drive at the middle of the fairway would clip a tree
near the tee moves to the nearest clear spot in the same box whose yardage
status (pass / flag / fail) is no worse; s06b takes out the trees still in the
way where no spot in the box is clear. Holes listed in "keep_tee_trees" are
left as they are.
"""
from __future__ import annotations

import csv
import json
import warnings

import geopandas as gpd
import numpy as np
from shapely.geometry import LineString, Point

from common import YD, build_dir, course_dir, course_name_from_argv, keeps_tee_trees, layout_dir, layout_holes, layouts, load_config, read_card, rnd, write_json

warnings.filterwarnings("ignore")


def path_from(tee: Point, line: LineString, green_c: Point):
    s0 = line.project(tee)
    bends = []
    coords = list(line.coords)
    for c in coords[1:-1]:
        if line.project(Point(c)) > s0 + 1.0:
            bends.append(c)
    pts = [(tee.x, tee.y)] + bends + [(green_c.x, green_c.y)]
    return LineString(pts).length, pts


def status(diff_pct: float) -> str:
    a = abs(diff_pct)
    return "pass" if a <= 3 else ("flag" if a <= 8 else "FAIL")


def best_point_in(poly, line, green_c, target_m, inset=0.75):
    """Grid-search the tee polygon (inset by `inset` m) for the point whose
    measured length is closest to target_m."""
    inner = poly.buffer(-inset)
    if inner.is_empty:
        inner = poly
    minx, miny, maxx, maxy = inner.bounds
    best = None
    for x in np.arange(minx, maxx + 0.01, 0.5):
        for y in np.arange(miny, maxy + 0.01, 0.5):
            p = Point(x, y)
            if not inner.contains(p):
                continue
            m, _ = path_from(p, line, green_c)
            err = abs(m - target_m)
            if best is None or err < best[0]:
                best = (err, p, m)
    return best


def end_point_in(poly, line, green_c, back=True, inset=0.75):
    """The point of the tee polygon (inset) farthest from (back) or nearest to
    (front) the green, measured along the hole."""
    inner = poly.buffer(-inset)
    if inner.is_empty:
        inner = poly
    minx, miny, maxx, maxy = inner.bounds
    best = None
    for x in np.arange(minx, maxx + 0.01, 0.5):
        for y in np.arange(miny, maxy + 0.01, 0.5):
            p = Point(x, y)
            if not inner.contains(p):
                continue
            m, _ = path_from(p, line, green_c)
            key = m if back else -m
            if best is None or key > best[0]:
                best = (key, p, m)
    return best[1], best[2]


RANK = {"pass": 0, "flag": 1, "FAIL": 2}


def clear_point_in(poly, line, green_c, target_m, current, cur_rank, is_clear, inset=0.75):
    """The clear point of the tee polygon (inset) nearest to `current` whose yardage
    status is no worse than `cur_rank`; None if there is none."""
    inner = poly.buffer(-inset)
    if inner.is_empty:
        inner = poly
    minx, miny, maxx, maxy = inner.bounds
    best = None
    for x in np.arange(minx, maxx + 0.01, 0.5):
        for y in np.arange(miny, maxy + 0.01, 0.5):
            p = Point(x, y)
            if not inner.contains(p):
                continue
            m, cl = path_from(p, line, green_c)
            if RANK[status((m - target_m) / target_m * 100)] > cur_rank:
                continue
            d = p.distance(current)
            if best is not None and d >= best[0]:
                continue
            if is_clear(p, cl):
                best = (d, p, m)
    return best


def tee_shot_checker(name, cfg, g):
    """is_clear(tee, centerline, pin) -> bool: no tree in the way of the tee shot."""
    from tee_shots import TreeIndex, target_point
    bdir = build_dir(name)
    trees = json.loads((bdir / "trees_all.json").read_text())
    idx = TreeIndex(trees, np.load(bdir / "height_base.npy"), cfg.get("tee_shot_margin_m", 0.0))
    fairways = list(g[g.kind == "fairway"].geometry)

    def is_clear(p, cl, pin):
        return not idx.blocking(p, target_point(p, cl, pin, fairways))
    return is_clear


def build_layout(name, cfg, lay, g):
    """Hole records, report lines, adjustments and open items for one layout."""
    card = read_card(name, lay)
    tee_clear = tee_shot_checker(name, cfg, g)
    tee_sets = [t["name"] for t in lay["tee_sets"] if t.get("playable")]
    holes = layout_holes(g, lay)
    refs = holes.ref.tolist()
    if refs != sorted(card):  # the scorecard sets the hole count (9 or 18)
        raise SystemExit(f"[s06] {lay['id']}: OSM hole lines {refs} do not match the scorecard holes {sorted(card)}; fix edited/course.geojson")
    greens = g[g.kind == "green"]
    tees = g[g.kind == "tee"]
    pins = g[g.kind == "pin"]

    records, rows, adjustments, open_items = [], [], [], []
    hole_list = [h for _, h in holes.iterrows()]
    geo = {}
    for h in hole_list:
        n = int(h.ref)
        L = h.geometry
        start, end = Point(L.coords[0]), Point(L.coords[-1])
        gi = greens.distance(end).idxmin()
        gpoly_ = greens.loc[gi].geometry
        # a green whose centroid lies off it (one hole's part of a double green wrapped round a
        # pond, Langdon Farms 9) is measured to a point on it; no other course has such a green
        geo[n] = (L, start, gi, gpoly_.centroid if gpoly_.contains(gpoly_.centroid) else gpoly_.representative_point())

    # Tee assignment per tee set: one tee polygon per hole, solved jointly so a
    # box that clearly belongs to one hole is not reused for its neighbour.
    # A tee polygon tagged hole=<n> and tee_set=<name> in edited/course.geojson
    # is that hole's tee for that set (the developer's call), whatever its distance.
    from scipy.optimize import linear_sum_assignment
    tee_idx = list(tees.index)
    assign = {}
    forced = {}
    for ti in tee_idx:
        tg = tees.loc[ti].tags
        if tg.get("hole") and tg.get("tee_set") and (not lay["shared"] or tg.get("layout") == lay["id"]):
            forced[(int(tg["hole"]), tg["tee_set"])] = ti
    for ts in tee_sets:
        cost = np.full((len(hole_list), len(tee_idx)), 1e6)
        taken = {ti for (n_, ts_), ti in forced.items() if ts_ == ts}
        for a, h in enumerate(hole_list):
            n = int(h.ref)
            if (n, ts) in forced:
                assign[(n, ts)] = forced[(n, ts)]
                continue
            L, start, gi, gc = geo[n]
            target = float(card[n][ts.lower()]) * YD
            for b, ti in enumerate(tee_idx):
                if ti in taken:
                    continue
                c = tees.loc[ti].geometry.centroid
                s = L.project(c)
                if not ((L.distance(c) < 25 and s < 0.45 * L.length) or c.distance(start) < 40):
                    continue
                m, _ = path_from(c, L, gc)
                d = abs(m - target) / target * 100
                if d > 8:
                    continue
                cost[a, b] = d + 0.05 * L.distance(c)
        ri, ci = linear_sum_assignment(cost)
        for a, b in zip(ri, ci):
            if cost[a, b] < 1e5:
                assign[(int(hole_list[a].ref), ts)] = tee_idx[b]

    for h in hole_list:
        n = int(h.ref)
        L, start, gi, gc = geo[n]
        green = greens.loc[gi]
        pin = pins.loc[pins.distance(green.geometry).idxmin()].geometry
        par = int(card[n]["par"])
        osm_par = h.tags.get("par")
        if osm_par and int(osm_par) != par:
            open_items.append(f"Hole {n}: OSM par {osm_par} differs from scorecard par {par}; using scorecard.")
        if not osm_par:
            open_items.append(f"Hole {n}: OSM hole line has no par tag; using scorecard par {par}.")
        if "handicap" in h.tags and int(h.tags["handicap"]) != int(card[n]["handicap"]):
            if lay["shared"]:
                open_items.append(f"Hole {n}: OSM handicap {h.tags['handicap']} differs from the scorecard stroke index {card[n]['handicap']}; using the scorecard.")
            else:
                open_items.append(f"Hole {n}: OSM handicap {h.tags['handicap']} differs from the GolfPass stroke index {card[n]['handicap']} (see spec 11.4 item 1); using GolfPass.")
        tee_records = {}
        for ts in tee_sets:
            target = float(card[n][ts.lower()]) * YD
            note = None
            ti = assign.get((n, ts))
            if ti is not None:
                tpoly = tees.loc[ti].geometry
                tee_pt = tpoly.centroid
                tee_osm = tees.loc[ti].osm
                m, _ = path_from(tee_pt, L, gc)
            else:
                tpoly, tee_osm = None, None
                tee_pt = start
                m, _ = path_from(tee_pt, L, gc)
                note = "no mapped tee polygon matches this tee set; virtual tee at the start of the OSM hole line"
                open_items.append(f"Hole {n} ({ts}): no mapped tee box within 8% of the card; the tee is the start point of the OSM hole line ({m / YD:.0f} yd). The {ts} tee box is not in OSM - trace it to confirm.")
            real_yd = m / YD
            card_yd = float(card[n][ts.lower()])
            diff = (real_yd - card_yd) / card_yd * 100
            adj_pt, adj_m = tee_pt, m
            pos = tees.loc[ti].tags.get("tee_pos") if ti is not None else None
            if pos in ("back", "front") and tpoly is not None:
                # the developer's placement inside the box (tag tee_pos=back|front)
                p_, m_ = end_point_in(tpoly, L, gc, back=(pos == "back"))
                adj_pt, adj_m = p_, m_
                adjustments.append({
                    "hole": n, "tee_set": ts, "step": 2, "type": "tee_position",
                    "from": [rnd(tee_pt.x), rnd(tee_pt.y)], "to": [rnd(adj_pt.x), rnd(adj_pt.y)],
                    "real_yd": rnd(real_yd, 1), "adjusted_yd": rnd(adj_m / YD, 1), "card_yd": card_yd,
                    "reason": f"developer: tee at the {pos} of the tee box {tee_osm} (tag tee_pos={pos})",
                })
            elif status(diff) != "pass" and tpoly is not None:
                best = best_point_in(tpoly, L, gc, target, inset=float(cfg.get("tee_inset_m", 0.75)))  # keep the golfer on the box
                if best and abs(best[2] - target) < abs(m - target) - 0.5:
                    adj_pt, adj_m = best[1], best[2]
                    adjustments.append({
                        "hole": n, "tee_set": ts, "step": 2, "type": "tee_position",
                        "from": [rnd(tee_pt.x), rnd(tee_pt.y)], "to": [rnd(adj_pt.x), rnd(adj_pt.y)],
                        "real_yd": rnd(real_yd, 1), "adjusted_yd": rnd(adj_m / YD, 1), "card_yd": card_yd,
                        "reason": f"measured {real_yd:.0f} yd from the tee-box centre vs {card_yd:.0f} on the card ({diff:+.1f}%); moved the virtual tee within the real tee polygon {tee_osm}",
                    })
            if tpoly is not None and pos not in ("back", "front") and not keeps_tee_trees(cfg, lay, n):
                _, cl = path_from(adj_pt, L, gc)
                if not tee_clear(adj_pt, cl, pin):
                    cur = RANK[status((adj_m - target) / target * 100)]
                    best = clear_point_in(tpoly, L, gc, target, adj_pt, cur, lambda p, c: tee_clear(p, c, pin))
                    if best is not None:
                        adjustments.append({
                            "hole": n, "tee_set": ts, "step": 2, "type": "tee_position",
                            "from": [rnd(adj_pt.x), rnd(adj_pt.y)], "to": [rnd(best[1].x), rnd(best[1].y)],
                            "real_yd": rnd(real_yd, 1), "adjusted_yd": rnd(best[2] / YD, 1), "card_yd": card_yd,
                            "reason": f"tee shot: a perfect drive at the middle of the fairway clipped a tree near the tee; "
                                      f"moved {best[0]:.1f} m within the real tee polygon {tee_osm} to the nearest clear spot",
                        })
                        adj_pt, adj_m = best[1], best[2]
            adj_yd = adj_m / YD
            adiff = (adj_yd - card_yd) / card_yd * 100
            _, cl = path_from(adj_pt, L, gc)
            if status(adiff) == "FAIL":
                open_items.append(f"Hole {n} ({ts}): measured {adj_yd:.0f} yd vs card {card_yd:.0f} ({adiff:+.1f}%) - FAIL, needs a decision.")
            elif status(adiff) == "flag":
                open_items.append(f"Hole {n} ({ts}): measured {adj_yd:.0f} yd vs card {card_yd:.0f} ({adiff:+.1f}%) even with the virtual tee at the best spot in its box; accepted for play.")
            if (n, ts) in forced:
                who = tees.loc[assign[(n, ts)]].tags.get("assigned_by", "the developer")
                open_items.append(f"Hole {n} ({ts}): tee box {tee_osm} assigned by {who} (tagged hole={n}, tee_set={ts} in edited/course.geojson).")
            elif tee_osm and start.distance(tee_pt) > 50:
                open_items.append(
                    f"Hole {n}: the OSM hole line starts {start.distance(tee_pt):.0f} m from the {ts} tee box ({tee_osm}), "
                    f"and only that box matches the card; the line was probably drawn from another tee. Measured from the {ts} box through the line's bend points.")
            tee_records[ts] = {
                "x": rnd(adj_pt.x), "y": rnd(adj_pt.y),
                "box_center": [rnd(tee_pt.x), rnd(tee_pt.y)],
                "tee_osm": tee_osm,
                "real_yd": rnd(real_yd, 1), "adjusted_yd": rnd(adj_yd, 1), "card_yd": card_yd,
                "centerline": [[rnd(x), rnd(y)] for x, y in cl],
                "note": note,
            }
            rows.append((n, par, ts, card_yd, real_yd, adj_yd, diff, adiff))
        spec = {int(t["hole"]): t for t in cfg.get("green_tiers", [])}.get(n)
        if spec and spec.get("pin") == "upper_tier" and not lay["shared"]:
            # config green_tiers pin=upper_tier: the pin goes to the middle of the upper tier
            from s07_greens import PIN_R0, tier_for, upper_tier_pin
            gpoly = green.geometry if green.geometry.geom_type == "Polygon" else max(green.geometry.geoms, key=lambda q: q.area)
            gpoly = gpoly.simplify(0.15)
            tier = tier_for(spec, {"tees": {cfg["default_tee"]: {"centerline": tee_records[cfg["default_tee"]]["centerline"]}}},
                            gpoly.centroid, cfg["default_tee"], gpoly)
            p_new = upper_tier_pin(tier, gpoly, tier["w"] / 2 + PIN_R0 + 0.5)
            if p_new is not None:
                open_items.append(f"Hole {n}: two-tiered green; the pin is moved from the OSM pin ({pin.x:.1f}, {pin.y:.1f}), "
                                  f"which is on or near the step, to the middle of the upper tier ({p_new.x:.1f}, {p_new.y:.1f}) (config green_tiers pin=upper_tier).")
                pin = p_new
        records.append({
            "number": n, "par": par, "handicap": int(card[n]["handicap"]),
            "hole_line_osm": h.osm,
            "hole_line": [[rnd(x), rnd(y)] for x, y in L.coords],
            "green_osm": green.osm,
            "green_center": [rnd(gc.x), rnd(gc.y)],
            "pin": [rnd(pin.x, 3), rnd(pin.y, 3)],
            "tees": tee_records,
        })

    return records, rows, adjustments, open_items


def table_lines(cfg, lay, rows, open_items, title):
    total_card = sum(r[3] for r in rows)
    total_real = sum(r[4] for r in rows)
    total_adj = sum(r[5] for r in rows)
    lines = [
        title, "",
        f"Generated by pipeline/s06_holes.py. Scorecard source: {lay['scorecard_source']}.", "",
        "Measured from the centre of the assigned tee polygon, through the golf=hole line's bend points ahead of the tee, to the green centre (horizontal distance).", "",
        "| hole | par | tee set | card yd | measured yd | diff yd | diff % | status | adjusted yd | adj. diff % | adj. status |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for n, par, ts, cy, ry, ay, d, ad in rows:
        lines.append(f"| {n} | {par} | {ts} | {cy:.0f} | {ry:.1f} | {ry - cy:+.1f} | {d:+.1f}% | {status(d)} | {ay:.1f} | {ad:+.1f}% | {status(ad)} |")
    lines.append(f"| **total** | {sum(r[1] for r in rows)} | | **{total_card:.0f}** | **{total_real:.0f}** | {total_real - total_card:+.0f} | {(total_real - total_card) / total_card * 100:+.1f}% | | **{total_adj:.0f}** | {(total_adj - total_card) / total_card * 100:+.1f}% | |")
    lines += ["", "## Open items" if not lay["shared"] else "### Open items", ""]
    lines += [f"{i + 1}. {s}" for i, s in enumerate(open_items)] or ["None."]
    return lines


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    cdir = course_dir(name)
    g = gpd.read_file(build_dir(name) / "course_local.geojson")
    lays = layouts(cfg)
    if not lays[0]["shared"]:
        lay = lays[0]
        records, rows, adjustments, open_items = build_layout(name, cfg, lay, g)
        lines = table_lines(cfg, lay, rows, open_items, f"# Validation report - {cfg['name']}")
        write_json(build_dir(name) / "holes.json", records, indent=1)
        write_json(cdir / "adjustments.json", adjustments, indent=1)
        (build_dir(name) / "validation_table.md").write_text("\n".join(lines) + "\n")
        print("\n".join(lines))
        return
    # several layouts: one holes.json per layout plus the combined list that the
    # world-wide steps use (green pins in s07, mowing stripes in s09)
    all_records, all_adj, all_lines = [], {}, [f"# Validation report - {cfg['name']}", ""]
    for lay in lays:
        records, rows, adjustments, open_items = build_layout(name, cfg, lay, g)
        lines = table_lines(cfg, lay, rows, open_items, f"## {lay['name']}")
        write_json(layout_dir(name, lay) / "holes.json", records, indent=1)
        (layout_dir(name, lay) / "validation_table.md").write_text("\n".join(lines) + "\n")
        all_adj[lay["id"]] = adjustments
        all_lines += lines + [""]
        for r in records:
            all_records.append({**r, "layout": lay["id"], "stripe_tee": lay["default_tee"]})
    write_json(build_dir(name) / "holes.json", all_records, indent=1)
    write_json(cdir / "adjustments.json", all_adj, indent=1)
    (build_dir(name) / "validation_table.md").write_text("\n".join(all_lines))
    print("\n".join(all_lines))


if __name__ == "__main__":
    main()

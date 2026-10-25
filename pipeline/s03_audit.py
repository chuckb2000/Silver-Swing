"""Step 3: per-hole coverage audit of the OSM layout.

Writes build/audit.md: for every hole, whether it has a hole line, tee
polygon(s), fairway, green (with pin) and nearby hazards, plus a list of
missing or suspect features, and the checks that earlier courses taught
(lesson_checks: docs/COURSE_LESSONS.md, docs/archive/COURSE_LESSONS_full.md).
"""
from __future__ import annotations

import geopandas as gpd
from shapely.geometry import Point

from common import build_dir, course_name_from_argv, layout_holes, layouts, load_config, read_card


def audit_layout(g, holes, n_holes, used_greens):
    """Rows and issues for one layout's holes (adds the greens it uses to used_greens)."""
    greens, tees, fairways = g[g.kind == "green"], g[g.kind == "tee"], g[g.kind == "fairway"]
    bunkers = g[g.kind == "bunker"]
    water = g[g.kind.isin(["lateral_water_hazard", "water_hazard"])]
    pins = g[g.kind == "pin"]
    rows, issues = [], []
    refs = sorted(holes.ref.tolist())
    if refs != list(range(1, n_holes + 1)):
        issues.append(f"hole refs are {refs}, expected 1-{n_holes} (scorecard.csv)")
    for _, h in holes.iterrows():
        L = h.geometry
        start, end = Point(L.coords[0]), Point(L.coords[-1])
        gd = greens.distance(end)
        green_ok = gd.min() < 2.0
        gi = gd.idxmin()
        used_greens.add(gi)
        pin_ok = bool((pins.within(greens.loc[gi].geometry.buffer(0.5))).any())
        tee_at_start = bool((tees.distance(start) < 3.0).any())
        tees_near = int(((tees.distance(L) < 25) & (tees.distance(start) < 90)).sum())
        fw = bool((fairways.intersects(L)).any())
        nb = int((bunkers.distance(L) < 40).sum())
        nw = int((water.distance(L) < 40).sum())
        par = h.tags.get("par", "?")
        rows.append(f"| {h.ref} | {par} | yes | {'yes' if tee_at_start else 'NO'} ({tees_near} near) | "
                    f"{'yes' if fw else '-'} | {'yes' if green_ok else 'NO'} | {'yes' if pin_ok else 'NO'} | {nb} | {nw} |")
        if not green_ok:
            issues.append(f"hole {h.ref}: hole line ends {gd.min():.1f} m from the nearest green")
        if not tee_at_start:
            issues.append(f"hole {h.ref}: no tee polygon at the start of the hole line (nearest {tees.distance(start).min():.1f} m)")
        if not pin_ok:
            issues.append(f"hole {h.ref}: no golf=pin inside its green")
        if "par" not in h.tags:
            issues.append(f"hole {h.ref}: hole line has no par tag")
        if "handicap" in h.tags:
            issues.append(f"hole {h.ref}: hole line carries handicap={h.tags['handicap']} (compare with scorecard)")
    return rows, issues


def lesson_checks(g, cfg) -> list[str]:
    """Things that went wrong on earlier courses and can be seen in the merged layout.
    Each line says what to look at and the usual fix; none of them stops the build."""
    from shapely.ops import unary_union
    from common import game_boundary, joins_parts, play_boundary
    out = []
    kinds = g.kind
    holes = g[kinds == "hole"]
    lines = unary_union(list(holes.geometry)) if len(holes) else None
    bnd_feats = g[kinds == "boundary"]
    # several leisure=golf_course features: without layouts or join_boundary_parts only the first is the OB line
    if len(bnd_feats) > 1 and not cfg.get("layouts") and not joins_parts(cfg):
        out.append(f"{len(bnd_feats)} leisure=golf_course features; only {bnd_feats.osm.iloc[0]} is the OB line. "
                   "Drop the others in edits.json, or set join_boundary_parts if all are in play: "
                   + ", ".join(f"{r.osm} ({r.geometry.area / 1e4:.1f} ha, {int(holes.intersects(r.geometry).sum())} hole lines)" for r in bnd_feats.itertuples()))
    try:
        bnd = play_boundary(g, cfg)
        gbnd = game_boundary(g, cfg)   # the OB line the game uses (parts joined with join_boundary_parts)
    except Exception:  # noqa: BLE001 - no boundary at all is reported by the table above
        bnd = gbnd = None
    if bnd is not None and not bnd.is_empty:
        if bnd.geom_type == "MultiPolygon" and not joins_parts(cfg) and not cfg.get("join_boundary"):
            out.append("the boundary is in " + str(len(bnd.geoms)) + " parts and the game keeps only the largest: "
                       + ", ".join(f"{p.area / 1e4:.1f} ha" for p in bnd.geoms) + " (join_boundary_parts?)")
        for p in (bnd.geoms if bnd.geom_type == "MultiPolygon" else [bnd]):
            for ring in p.interiors:
                from shapely.geometry import Polygon as _P
                hole_ = _P(ring)
                if hole_.area > 20:
                    c = hole_.centroid
                    out.append(f"the boundary has a hole of {hole_.area:.0f} m2 at ({c.x:.0f}, {c.y:.0f}): it is out of bounds (a pond cut out?)")
        for kind in ("green", "tee"):
            for r in g[kinds == kind].itertuples():
                outside = r.geometry.difference(gbnd).area
                if outside > 1.0 and r.geometry.area - outside > 1.0:   # straddles the line (wholly outside: a neighbour's)
                    c = r.geometry.centroid
                    out.append(f"{kind} {r.osm} at ({c.x:.0f}, {c.y:.0f}): {outside:.0f} m2 of it is outside the boundary, so out of bounds")
        for r in holes.itertuples():
            inside = r.geometry.intersection(gbnd).length / max(r.geometry.length, 1e-9)
            if inside < 0.98:
                out.append(f"hole line {r.osm} (ref {r.tags.get('ref', '-')}): {100 * (1 - inside):.0f} % outside the boundary"
                           + (" (a neighbouring course's line?)" if inside < 0.5 else ""))
    W, H = cfg["world"]["width"], cfg["world"]["height"]
    from shapely.geometry import box as _box
    world = _box(0, 0, W, H)
    for r in g[kinds.isin(["green", "tee", "hole"])].itertuples():
        if r.geometry.intersects(world) and not world.contains(r.geometry):
            out.append(f"{r.kind} {r.osm} crosses the edge of the world box (s09 failed on a green outside it): drop it or grow the world")
    if max(W, H) > 2048 and not cfg["world"].get("over_limit_approved"):
        out.append(f"the world is {W} x {H} m, over the 2,048 m limit (COURSE_BUILD 10: stop and ask)")
    # golf=* values s01 doesn't read
    other = g[kinds == "golf_other"]
    if len(other):
        vals = {}
        for r in other.itertuples():
            vals.setdefault(r.tags.get("golf", "?"), []).append(r.osm)
        for v, ids in sorted(vals.items()):
            hint = {"path": "cart path: retag golf=cartpath in edits.json", "clubhouse": "a building: add building=yes"}.get(v, "not read by the pipeline")
            out.append(f"golf={v}: {len(ids)} feature(s) ({', '.join(ids[:4])}{' ...' if len(ids) > 4 else ''}) -> {hint}")
    # a polygon's tag against its size
    for r in g[kinds == "tee"].itertuples():
        if r.geometry.area > 2500:
            out.append(f"tee {r.osm}: {r.geometry.area:.0f} m2 (a fairway tagged as a tee?)")
    starts = [__import__("shapely.geometry", fromlist=["Point"]).Point(L.coords[0]) for L in holes.geometry]
    for r in g[kinds == "fairway"].itertuples():
        if str(r.osm).startswith("approach_"):   # made by s02b
            continue
        if r.geometry.area < 150 and any(r.geometry.distance(s_) < 10 for s_ in starts):
            out.append(f"fairway {r.osm}: {r.geometry.area:.0f} m2 near a hole line's start (a tee tagged as fairway?)")
    for r in g[kinds == "cartpath"].itertuples():
        gm = r.geometry
        if gm.geom_type in ("Polygon", "MultiPolygon") and gm.area > 1500:
            out.append(f"cart path {r.osm} is an area of {gm.area:.0f} m2 (a closed way read as an area?)")
    if lines is not None:
        for r in g[kinds == "fairway"].itertuples():
            if r.geometry.distance(lines) > 30 and (gbnd is None or r.geometry.intersects(gbnd)):
                c = r.geometry.centroid
                out.append(f"fairway {r.osm} at ({c.x:.0f}, {c.y:.0f}) is more than 30 m from every hole line (a range or practice area mapped as fairway?)")
    # water that would play as rough, and penalty areas outside the course
    red = set(cfg.get("red_water_osm") or [])
    hazards = g[kinds.isin(["water_hazard", "lateral_water_hazard"])]
    hz = unary_union(list(hazards.geometry)) if len(hazards) else None
    if bnd is not None and not bnd.is_empty:
        for r in g[kinds.isin(["water", "pool"])].itertuples():
            gm = r.geometry
            if gm.geom_type not in ("Polygon", "MultiPolygon") or gm.area < 20 or r.osm in red:
                continue
            share = gm.intersection(bnd).area / gm.area
            if share > 0.5 and (hz is None or gm.difference(hz).area > 0.5 * gm.area):
                c = gm.centroid
                out.append(f"{r.kind} {r.osm} at ({c.x:.0f}, {c.y:.0f}), {gm.area:.0f} m2, is inside the boundary but not a penalty area: "
                           "it plays as rough (tag it golf=lateral_water_hazard in edits.json, or list it in red_water_osm)")
        for r in hazards.itertuples():
            if r.osm in red or r.geometry.area < 1:
                continue
            if r.geometry.intersection(bnd).area / r.geometry.area < 0.5:
                out.append(f"penalty area {r.osm} lies mostly outside the boundary (a neighbour's? redraw as natural=water)")
        corridor = lines.buffer(30) if lines is not None else None
        for r in g[kinds == "waterway"].itertuples():
            if corridor is None or not r.geometry.intersects(corridor):
                continue
            near = r.geometry.intersection(corridor).intersection(bnd)
            if hz is not None:
                near = near.difference(hz.buffer(2.0))
            if near.length >= 10:
                out.append(f"waterway {r.osm} ({r.tags.get('waterway', '?')}): {near.length:.0f} m of it within 30 m of a hole line "
                           "isn't in a penalty area (pipeline/propose_channels.py makes one; or say it's dry)")
    # double greens and lines starting on a green
    greens = g[kinds == "green"]
    if len(greens) and len(holes):
        ends = {}
        for r in holes.itertuples():
            end = __import__("shapely.geometry", fromlist=["Point"]).Point(r.geometry.coords[-1])
            gi = greens.distance(end).idxmin()
            ends.setdefault(gi, []).append(r.tags.get("ref", r.osm))
            start = __import__("shapely.geometry", fromlist=["Point"]).Point(r.geometry.coords[0])
            if greens.distance(start).min() < 10:
                out.append(f"hole line {r.osm} (ref {r.tags.get('ref', '-')}) starts within 10 m of a green (the previous green?)")
        for gi, refs in ends.items():
            if len(refs) > 1:
                out.append(f"green {greens.loc[gi].osm} ends {len(refs)} hole lines ({', '.join(map(str, refs))}): a double green, "
                           "split it so each hole has its own green and pin")
    return out


HEAD = ["| hole | par (OSM) | hole line | tee at line start | fairway | green | pin | bunkers <40 m | water <40 m |",
        "|---|---|---|---|---|---|---|---|---|"]


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    g = gpd.read_file(build_dir(name) / "course_local.geojson")
    greens, tees, fairways = g[g.kind == "green"], g[g.kind == "tee"], g[g.kind == "fairway"]
    bunkers = g[g.kind == "bunker"]
    water = g[g.kind.isin(["lateral_water_hazard", "water_hazard"])]
    pins = g[g.kind == "pin"]
    used_greens = set()
    md = ["# OSM coverage audit", ""]
    issues = []
    lays = layouts(cfg)
    for lay in lays:
        holes = layout_holes(g, lay)
        n_holes = len(read_card(name, lay))
        rows, iss = audit_layout(g, holes, n_holes, used_greens)
        if lay["shared"]:
            md += [f"## {lay['name']}", "", *HEAD, *rows, ""]
            issues += [f"{lay['short'] or lay['id']}: {s}" for s in iss]
        else:
            md += [*HEAD, *rows]
            issues += iss
    if lays[0]["shared"]:
        assigned = set()
        for lay in lays:
            assigned |= set(layout_holes(g, lay).index)
        for i, h in g[(g.kind == "hole") & ~g.index.isin(assigned)].iterrows():
            issues.append(f"hole line {h.osm} (ref {h.tags.get('ref', '-')}) belongs to no layout (not inside any layout boundary) -> not played")
    extra = [i for i in greens.index if i not in used_greens]
    for i in extra:
        c = greens.loc[i].geometry.centroid
        issues.append(f"green {greens.loc[i].osm} at ({c.x:.0f}, {c.y:.0f}) is not the end of any hole line (practice green?) -> treated as a wrong green")
    md += ["", "## Missing or suspect features", ""]
    md += [f"- {s}" for s in issues] or ["- none"]
    lessons = lesson_checks(g, cfg)
    md += ["", "## Checks from earlier courses", ""]
    md += [f"- {s}" for s in lessons] or ["- none"]
    md += ["", f"Totals: {len(tees)} tees, {len(greens)} greens, {len(fairways)} fairways, {len(bunkers)} bunkers, "
           f"{len(water)} water hazards, {len(pins)} pins, {int((g.kind == 'cartpath').sum())} cart paths, "
           f"{int((g.kind == 'tree').sum())} OSM tree points."]
    out = build_dir(name) / "audit.md"
    out.write_text("\n".join(md) + "\n")
    print("\n".join(md))


if __name__ == "__main__":
    main()

"""Step 3: per-hole coverage audit of the OSM layout.

Writes build/audit.md: for every hole, whether it has a hole line, tee
polygon(s), fairway, green (with pin) and nearby hazards, plus a list of
missing or suspect features.
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
    md += ["", f"Totals: {len(tees)} tees, {len(greens)} greens, {len(fairways)} fairways, {len(bunkers)} bunkers, "
           f"{len(water)} water hazards, {len(pins)} pins, {int((g.kind == 'cartpath').sum())} cart paths, "
           f"{int((g.kind == 'tree').sum())} OSM tree points."]
    out = build_dir(name) / "audit.md"
    out.write_text("\n".join(md) + "\n")
    print("\n".join(md))


if __name__ == "__main__":
    main()

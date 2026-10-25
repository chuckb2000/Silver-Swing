"""Intake checks for Wildwood (COURSE_LESSONS.md): hole lines against every card
column, every tee box measured against the card, boundary coverage and parts,
out of bounds near play, water inside the boundary, fairways away from holes.
Reads build/course_local.geojson (s02). Writes build/intake_checks.md.
Run: python3 data/wildwood/intake_checks.py
"""
import csv
import json
from pathlib import Path

from shapely.geometry import LineString, Point, shape
from shapely.ops import unary_union

D = Path(__file__).resolve().parent
YD = 0.9144
feats = json.load(open(D / "build/course_local.geojson"))["features"]
card = {int(r["hole"]): r for r in csv.DictReader(open(D / "scorecard.csv"))}
SETS = ["black", "white", "orange"]

by = {}
for f in feats:
    by.setdefault(f["properties"]["kind"], []).append(
        (f["properties"]["osm"], shape(f["geometry"]), f["properties"]["tags"]))
bnd = by["boundary"][0][1]
holes = {int(t["ref"]): (o, g, t) for o, g, t in by["hole"]}
out = []
w = out.append

w("# Wildwood intake checks\n")
w(f"Boundary: {by['boundary'][0][0]}, {bnd.geom_type}, interior rings "
  f"{len(getattr(bnd, 'interiors', []))}, area {bnd.area/1e4:.1f} ha, bbox "
  f"{bnd.bounds[2]-bnd.bounds[0]:.0f} x {bnd.bounds[3]-bnd.bounds[1]:.0f} m\n")

# 1. hole lines vs card
w("## Hole lines against the card (OSM line length, yd)\n")
w("| hole | OSM par | card par | OSM hcp | card hcp | line yd | black | white | orange | closest |")
w("|---|---|---|---|---|---|---|---|---|---|")
tot = 0
for n in sorted(holes):
    o, g, t = holes[n]
    L = g.length / YD
    tot += L
    c = card[n]
    diffs = {s: (L - int(c[s])) / int(c[s]) * 100 for s in SETS}
    best = min(diffs, key=lambda s: abs(diffs[s]))
    w(f"| {n} | {t.get('par')} | {c['par']} | {t.get('handicap','-')} | {c['handicap']} | {L:.0f} | "
      + " | ".join(f"{c[s]} ({diffs[s]:+.1f}%)" for s in SETS) + f" | {best} |")
w(f"\nSum of lines: {tot:.0f} yd; card Black {sum(int(card[n]['black']) for n in card)}, "
  f"White {sum(int(card[n]['white']) for n in card)}, Orange {sum(int(card[n]['orange']) for n in card)}\n")

# 2. every tee box within 160 m of a line start, measured like s06 (straight to the next bend)
def path_from(p, line):
    cs = list(line.coords)
    # first vertex after the projection of p
    d = line.project(p)
    acc = 0
    for i in range(1, len(cs)):
        acc += Point(cs[i - 1]).distance(Point(cs[i]))
        if acc > d + 1e-6:
            rest = LineString(cs[i:]).length if len(cs[i:]) > 1 else 0
            return p.distance(Point(cs[i])) + rest
    return p.distance(Point(cs[-1]))

w("## Tee boxes near each line start (centroid yd; range inside the box)\n")
w("| hole | tee | area m2 | from line start m | off line m | centroid yd | box range yd | black | white | orange | matches (<=3 %) |")
w("|---|---|---|---|---|---|---|---|---|---|---|")
tees = by["tee"]
for n in sorted(holes):
    o, g, t = holes[n]
    start = Point(g.coords[0])
    c = card[n]
    for to, tg, tt in tees:
        dist = tg.centroid.distance(start)
        if dist > 160:
            continue
        # skip boxes nearer another hole's line start
        near_other = min(Point(holes[m][1].coords[0]).distance(tg.centroid) for m in holes if m != n)
        if near_other < dist and dist > 25:
            continue
        yd = path_from(tg.centroid, g) / YD
        pts = [Point(x) for x in tg.exterior.coords]
        rng = [path_from(p, g) / YD for p in pts]
        m = [s for s in SETS if min(rng) * 0.97 <= int(c[s]) <= max(rng) * 1.03]
        w(f"| {n} | {to} | {tg.area:.0f} | {dist:.0f} | {g.distance(tg.centroid):.0f} | {yd:.0f} | "
          f"{min(rng):.0f}-{max(rng):.0f} | {c['black']} | {c['white']} | {c['orange']} | {', '.join(m) or '-'} |")

# 3. boundary coverage
w("\n## Play features outside the boundary\n")
bad = 0
for k in ["tee", "green", "fairway", "bunker", "water_hazard", "pin"]:
    for o, g, t in by.get(k, []):
        outside = g.difference(bnd).area if g.area else (0 if bnd.contains(g) else 1)
        if (g.area and outside > 1) or (not g.area and outside):
            bad += 1
            w(f"- {k} {o}: {outside:.0f} m2 outside" if g.area else f"- {k} {o}: outside")
for n, (o, g, t) in holes.items():
    if not bnd.contains(g):
        bad += 1
        w(f"- hole {n} line {o}: {g.difference(bnd).length:.0f} m outside")
if not bad:
    w("- none")

# 4. OB near play
w("\n## Boundary within 25 m of a fairway, green, tee or hole line\n")
ring = bnd.exterior
w("| feature | min distance to boundary m |")
w("|---|---|")
for k in ["fairway", "green", "tee"]:
    for o, g, t in by.get(k, []):
        dd = ring.distance(g)
        if dd < 25:
            hn = min(holes, key=lambda n: holes[n][1].distance(g))
            w(f"| {k} {o} (hole {hn}) | {dd:.1f} |")
for n, (o, g, t) in sorted(holes.items()):
    for i, p in enumerate(g.coords):
        dd = ring.distance(Point(p))
        if dd < 25:
            w(f"| hole {n} line vertex {i} | {dd:.1f} |")

# 5. water
w("\n## Water inside or touching the boundary\n")
for k in ["water_hazard", "water", "pool", "waterway"]:
    for o, g, t in by.get(k, []):
        if g.intersects(bnd.buffer(20)):
            hn = min(holes, key=lambda n: holes[n][1].distance(g))
            crossing = [n for n in holes if holes[n][1].intersects(g)]
            w(f"- {k} {o} {dict((a, b) for a, b in t.items() if a not in ('type',))}: "
              f"{'area %.0f m2' % g.area if g.area else 'length %.0f m' % g.length}, nearest hole {hn} "
              f"({holes[hn][1].distance(g):.0f} m){', crosses hole line ' + str(crossing) if crossing else ''}")

# 6. fairways/greens/tees far from every hole line; tag vs size
w("\n## Features farther than 15 m from every hole line\n")
alllines = unary_union([h[1] for h in holes.values()])
for k in ["fairway", "green", "tee", "bunker"]:
    for o, g, t in by.get(k, []):
        dd = alllines.distance(g)
        if dd > 15:
            w(f"- {k} {o}: {dd:.0f} m from nearest line, {g.area:.0f} m2")
w("\n## Largest tee polygons\n")
for o, g, t in sorted(by["tee"], key=lambda x: -x[1].area)[:5]:
    w(f"- {o}: {g.area:.0f} m2")
w("\n## Greens per hole end (double greens)\n")
for n, (o, g, t) in sorted(holes.items()):
    end = Point(g.coords[-1])
    gs = [(go, gg.distance(end)) for go, gg, _ in by["green"] if gg.distance(end) < 10]
    if len(gs) != 1:
        w(f"- hole {n}: greens within 10 m of the line end: {gs}")
for i, (o1, g1, _) in enumerate(by["green"]):
    for o2, g2, _ in by["green"][i + 1:]:
        if g1.distance(g2) < 3:
            w(f"- greens {o1} and {o2} touch ({g1.distance(g2):.1f} m)")
ends = {}
for n, (o, g, t) in holes.items():
    gid = min(by["green"], key=lambda x: x[1].distance(Point(g.coords[-1])))[0]
    ends.setdefault(gid, []).append(n)
for gid, ns in ends.items():
    if len(ns) > 1:
        w(f"- green {gid} ends holes {ns}")
w("\n## Buildings inside the boundary\n")
for o, g, t in by.get("building", []):
    if bnd.intersects(g):
        w(f"- {o} {t.get('building')} {t.get('name','')}: {g.area:.0f} m2")
(D / "build/intake_checks.md").write_text("\n".join(out) + "\n")
print("\n".join(out))

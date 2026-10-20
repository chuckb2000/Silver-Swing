"""Shared constants and helpers for the course pipeline.

Every script in this folder is one step of section 5.3 of CLAUDE.md and can be
re-run on its own; `make course NAME=<course>` runs them all in order.
"""
from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
YD = 0.9144  # metres per yard
FT = 0.3048  # metres per foot (DOGAMI rasters are in feet)
PX_PER_M = 2  # world art scale: 2 px = 1 m (CLAUDE.md section 3)

# Surface IDs. One map drives both physics and rendering (CLAUDE.md 5.7).
# IDs >= 10 are all out of bounds for physics; the sub-type only changes
# how the ground looks and bounces.
SURF = {
    "ob": 0,          # generic off-course ground (lawn)
    "rough": 1,
    "fairway": 2,
    "fringe": 3,
    "green": 4,
    "tee": 5,
    "bunker": 6,
    "water": 7,       # penalty area (all four ponds are red/lateral)
    "cartpath": 8,
    "woods": 9,       # under dense canopy inside the course
    "ob_road": 10,
    "ob_water": 11,
    "ob_woods": 12,
    "ob_building": 13,
    "building": 14,   # immovable obstruction inside the boundary
    "range": 15,      # driving range, treated as out of bounds
    "ob_sand": 16,    # beach / dune / cliff sand outside the boundary
}

# Gorse thickets inside the course (Bandon Dunes): a penal lie in the game
# (game/src/systems/rules/lie.ts). Kept out of SURF so courses without gorse
# export exactly the ids they always had; surf_ids() adds it where it is used.
GORSE_SURF = 17


def uses_gorse_ground(cfg: dict) -> bool:
    """course_config.json "gorse": {"ground": "gorse"}: the ground under the thickets is the gorse surface."""
    return isinstance(cfg.get("gorse"), dict) and cfg["gorse"].get("ground") == "gorse"


def surf_ids(cfg: dict) -> dict:
    """The surface ids a course's map can hold (SURF, plus gorse where the course has it)."""
    return {**SURF, "gorse": GORSE_SURF} if uses_gorse_ground(cfg) else dict(SURF)
SURF_NAME = {v: k for k, v in SURF.items()}


def course_dir(name: str) -> Path:
    return ROOT / "data" / name


def load_config(name: str) -> dict:
    with open(course_dir(name) / "course_config.json") as f:
        return json.load(f)


def out_dir(name: str) -> Path:
    p = ROOT / "game" / "public" / "courses" / name
    p.mkdir(parents=True, exist_ok=True)
    return p


def build_dir(name: str) -> Path:
    p = course_dir(name) / "build"
    p.mkdir(parents=True, exist_ok=True)
    return p


def course_name_from_argv() -> str:
    if len(sys.argv) > 1:
        return sys.argv[1]
    return os.environ.get("NAME", "oswego_lake")


def write_json(path: Path, obj, indent=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=indent, separators=(",", ":") if indent is None else None)


class World:
    """Local metric frame: origin at the SW corner of the world extent (UTM)."""

    def __init__(self, cfg: dict):
        w = cfg["world"]
        self.x0 = float(w["x0"])
        self.y0 = float(w["y0"])
        self.width = float(w["width"])
        self.height = float(w["height"])
        self.epsg = int(cfg["epsg"])

    @property
    def px_w(self) -> int:
        return int(self.width * PX_PER_M)

    @property
    def px_h(self) -> int:
        return int(self.height * PX_PER_M)

    def to_local(self, x, y):
        return x - self.x0, y - self.y0

    def local_to_px(self, x, y):
        """Local metres -> art pixel coordinates (row 0 at the north edge)."""
        return x * PX_PER_M, (self.height - y) * PX_PER_M


def rnd(v, n=2):
    return float(round(v, n))


def angle_deg(dx, dy):
    return math.degrees(math.atan2(dy, dx))


# --- layouts: several playable courses sharing one world ---------------------
#
# A data folder normally builds one course. East Potomac has three (Blue 18,
# White 9, Red 9) on one island, so its course_config.json lists `layouts`.
# The physical world (terrain, surface map, trees, greens, art) is built once
# in data/<id>/build/ and exported to game/public/courses/<id>/; every layout
# gets its own holes, putting views, minimaps and course.json in
# data/<id>/build/layouts/<layout id>/ and game/public/courses/<layout id>/.
# Without `layouts` the single layout is the course itself and every path is
# what it always was (Oswego Lake and Highland Links rebuild unchanged).

def layouts(cfg: dict) -> list[dict]:
    if not cfg.get("layouts"):
        return [{
            "id": cfg["id"], "name": cfg["name"], "short": None, "boundary_osm": None,
            "scorecard": "scorecard.csv", "tee_sets": cfg["tee_sets"], "default_tee": cfg["default_tee"],
            "scorecard_source": cfg.get("scorecard_source", ""), "shared": False,
        }]
    out = []
    for L in cfg["layouts"]:
        d = {"short": None, "boundary_osm": None, "scorecard": f"scorecard_{L['id']}.csv",
             "scorecard_source": cfg.get("scorecard_source", "")}
        d.update(L)
        d["shared"] = True
        out.append(d)
    return out


def keeps_tee_trees(cfg: dict, layout: dict, hole: int) -> bool:
    """A hole listed in course_config.json "keep_tee_trees" ("<hole>", or "<layout
    short name> <hole>" with layouts) keeps the trees in front of its tee: a
    deliberate tree-lined dogleg (Oswego Lake 10). Every other tee shot is cleared
    (s06 / s06b, pipeline/tee_shots.py)."""
    want = {str(x).strip().lower() for x in cfg.get("keep_tee_trees", [])}
    key = f"{hole}" if not layout["shared"] else f"{(layout.get('short') or layout['id']).lower()} {hole}"
    return key in want


def layout_dir(name: str, layout: dict) -> Path:
    """Build folder of one layout (the course's build/ folder for a single-layout course)."""
    if not layout["shared"]:
        return build_dir(name)
    p = build_dir(name) / "layouts" / layout["id"]
    p.mkdir(parents=True, exist_ok=True)
    return p


def read_card(name: str, layout: dict) -> dict:
    import csv
    with open(course_dir(name) / layout["scorecard"]) as f:
        return {int(r["hole"]): r for r in csv.DictReader(f)}


def layout_holes(g, layout: dict):
    """The golf=hole lines of one layout, with an int `ref` column, sorted by ref.

    A layout with `boundary_osm` keeps the hole lines that lie inside that
    leisure=golf_course polygon (5 m tolerance); a hole line tagged
    layout=<layout id> in edited/course.geojson is assigned explicitly.
    """
    holes = g[g.kind == "hole"].copy()
    if layout.get("boundary_osm"):
        b = g[g.osm == layout["boundary_osm"]]
        if b.empty:
            raise SystemExit(f"layout {layout['id']}: boundary {layout['boundary_osm']} not in the course data")
        poly = b.geometry.iloc[0].buffer(5.0)

        def mine(r):
            tag = r.tags.get("layout")
            return tag == layout["id"] if tag else bool(poly.contains(r.geometry))
        holes = holes[holes.apply(mine, axis=1)]
    holes["ref"] = holes.tags.apply(lambda t: int(t.get("ref", 0)))
    return holes.sort_values("ref")


def joins_parts(cfg: dict) -> bool:
    """course_config.json "join_boundary_parts": the course boundary is mapped in
    several parts (Eastmoreland: two, either side of SE Bybee Blvd) that are all
    in play. Without it the game's OB line is the largest part only."""
    return bool(cfg.get("join_boundary_parts"))


def game_boundary(g, cfg: dict):
    """The single polygon course.json carries as the OB line (the game's Polygon).

    Normally the largest part of play_boundary(). With "join_boundary_parts"
    ({"max_gap_m": m}) the parts are joined instead: between each part and the
    rest, the convex hull of the stretches of their outlines within max_gap_m of
    each other is added (the strip of road between them). The strip stays out of
    bounds on the surface map (s08 paints only the parts as the course), and the
    game calls a ball OB on an OB surface as well as outside this polygon.
    """
    from shapely.ops import unary_union
    b = play_boundary(g, cfg)
    if b.geom_type != "MultiPolygon":
        return b
    if not joins_parts(cfg):
        return max(b.geoms, key=lambda p: p.area)
    gap = float(cfg["join_boundary_parts"].get("max_gap_m", 16.0))
    parts = sorted(b.geoms, key=lambda p: -p.area)
    joined = parts[0]
    for p in parts[1:]:
        a0 = joined.intersection(p.buffer(gap))
        a1 = p.intersection(joined.buffer(gap))
        if a0.is_empty or a1.is_empty:
            raise SystemExit(f"[join_boundary_parts] a boundary part is more than {gap} m from the rest")
        joined = unary_union([joined, p, unary_union([a0, a1]).convex_hull])
    if joined.geom_type != "Polygon":
        raise SystemExit(f"[join_boundary_parts] the joined boundary is a {joined.geom_type}, not one polygon")
    return joined


def boundary_rings(g, cfg: dict):
    """Outlines the OB stakes are drawn along: every part with join_boundary_parts,
    else the largest part's outline (as before)."""
    b = play_boundary(g, cfg)
    if b.geom_type == "MultiPolygon":
        if joins_parts(cfg):
            return [p for p in b.geoms]
        return [max(b.geoms, key=lambda p: p.area)]
    return [b]


def play_boundary(g, cfg: dict):
    """The out-of-bounds line: the course boundary, or with layouts the union of
    every leisure=golf_course polygon in the data (one property, one OB line)."""
    b = g[g.kind == "boundary"]
    if not cfg.get("layouts"):
        if len(b) > 1 and joins_parts(cfg):
            # join_boundary_parts with the parts mapped as separate features (Langdon Farms:
            # two leisure=golf_course ways either side of OR 551): all of them, as one MultiPolygon
            from shapely.ops import unary_union
            return unary_union(list(b.geometry))
        return b.geometry.iloc[0]
    from shapely.ops import unary_union
    u = unary_union(list(b.geometry))
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    return u


# --- rounded fairway corners (developer, 2026-10-19: "jagged corners should be
# removed from the fairway, these should be rounded, even if the OSM was jagged")
FAIRWAY_SMOOTH_M = 4.0  # m: how far along the outline the smoothing reaches (Gaussian sigma)


def _smooth_ring(coords, sigma: float, step: float = 0.5):
    """A closed ring resampled every `step` m and smoothed along its length
    (Gaussian, `sigma` m): kinks and corners become curves, straight runs stay
    straight, and a narrow part keeps its width (each side moves along itself)."""
    import numpy as np
    from scipy.ndimage import gaussian_filter1d
    pts = np.asarray(coords, float)[:, :2]
    if len(pts) > 1 and np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    if len(pts) < 3:
        return [tuple(p) for p in pts]
    closed = np.vstack([pts, pts[:1]])
    seg = np.hypot(*np.diff(closed, axis=0).T)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    total = cum[-1]
    if total < 4 * sigma:
        return [tuple(p) for p in closed]
    n = max(8, int(round(total / step)))
    s = np.linspace(0.0, total, n, endpoint=False)
    x = np.interp(s, cum, closed[:, 0])
    y = np.interp(s, cum, closed[:, 1])
    sp = sigma / (total / n)
    xs = gaussian_filter1d(x, sp, mode="wrap")
    ys = gaussian_filter1d(y, sp, mode="wrap")
    ring = list(zip(xs.tolist(), ys.tolist()))
    ring.append(ring[0])
    return ring


def round_corners(geom, sigma: float = FAIRWAY_SMOOTH_M):
    """The polygon (or multipolygon) with a smooth, rounded outline (holes too);
    the original where smoothing would break it or change its area by more
    than 10 %."""
    from shapely.geometry import MultiPolygon, Polygon
    if geom is None or geom.is_empty:
        return geom
    if geom.geom_type == "MultiPolygon":
        parts = []
        for p in geom.geoms:
            q = round_corners(p, sigma)
            parts.extend(list(q.geoms) if q.geom_type == "MultiPolygon" else [q])
        return MultiPolygon([p for p in parts if not p.is_empty])
    if geom.geom_type != "Polygon":
        return geom
    try:
        poly = Polygon(_smooth_ring(geom.exterior.coords, sigma), [_smooth_ring(h.coords, sigma) for h in geom.interiors])
        if not poly.is_valid:
            poly = poly.buffer(0)
        poly = poly.simplify(0.05, preserve_topology=True)
    except Exception:
        return geom
    if poly.is_empty or poly.geom_type not in ("Polygon", "MultiPolygon") or abs(poly.area - geom.area) > 0.10 * geom.area:
        return geom
    return poly

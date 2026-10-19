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


def play_boundary(g, cfg: dict):
    """The out-of-bounds line: the course boundary, or with layouts the union of
    every leisure=golf_course polygon in the data (one property, one OB line)."""
    b = g[g.kind == "boundary"]
    if not cfg.get("layouts"):
        return b.geometry.iloc[0]
    from shapely.ops import unary_union
    u = unary_union(list(b.geometry))
    if u.geom_type == "MultiPolygon":
        u = max(u.geoms, key=lambda p: p.area)
    return u

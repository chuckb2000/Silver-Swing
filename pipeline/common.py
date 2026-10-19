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

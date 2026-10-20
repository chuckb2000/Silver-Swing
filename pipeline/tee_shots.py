"""Tee shots that clear the trees (every course; course_config.json "keep_tee_trees" lists exceptions).

Used by s06 (where to put the virtual tee inside its box) and s06b (which
trees to take out where no spot in the box is clear).

A tee shot is a perfect driver aimed at the middle of the fairway where a
full drive lands (or at the pin on a hole a drive reaches). Its height
follows the game's flight arc (game/src/systems/physics/sim.ts: rises to the
apex at 55 % of the carry, measured from the launch point); the driver is the
lowest-rising club, and a 110 % (overswing) carry rises lower still, so this is
the lowest tee shot a player can hit. A tree is in the way when that ball
would pass through its crown (from 40 % of its height to its top, crown radius
plus a 1 m margin around the line) or hit its trunk within the first REACH m.
The game test (tests/unit/east_potomac.test.ts) checks the result with the
game's own physics.
"""
from __future__ import annotations

import math

import numpy as np
from shapely.geometry import LineString, Point

DRIVER_CARRY = 224.0 * 1.08   # m: driver at 110 % (CLAUDE.md 7.1, 6.2)
DRIVER_APEX = 28.0            # m above the launch point
REACH = 60.0                  # m from the tee: "the trees around the tee box"
MARGIN = 1.0                  # m beside the line
CANOPY_START = 0.4            # the crown starts at 40 % of the tree height (sim.ts)
TRUNK_R = 0.4
CARRY_FOR_AIM = 224.0         # where the game's default line meets the centre line (Round.lineAim)


def ball_height(s: float) -> float:
    u = s / DRIVER_CARRY
    if u <= 0.55:
        return DRIVER_APEX * (1 - ((0.55 - u) / 0.55) ** 2)
    return DRIVER_APEX * (1 - ((u - 0.55) / 0.45) ** 2)


def line_point(tee: Point, centerline: list, pin: Point) -> Point:
    """Where the game's line aim points (Round.lineAim): the centre-line point a
    full drive away, or the pin when a drive reaches the green."""
    if CARRY_FOR_AIM >= 0.92 * tee.distance(pin):
        return pin
    for i in range(len(centerline) - 1):
        (ax, ay), (bx, by) = centerline[i], centerline[i + 1]
        for t in np.linspace(0, 1, 101):
            px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            if math.hypot(px - tee.x, py - tee.y) >= CARRY_FOR_AIM:
                return Point(px, py)
    return Point(centerline[-1])


def target_point(tee: Point, centerline: list, pin: Point, fairways) -> Point:
    """Middle of the fairway where a full drive meets the centre line (Round.lineAim),
    or the pin when a drive reaches the green."""
    d = tee.distance(pin)
    if CARRY_FOR_AIM >= 0.92 * d:
        return pin
    line = LineString(centerline)
    p = None
    for i in range(len(centerline) - 1):
        (ax, ay), (bx, by) = centerline[i], centerline[i + 1]
        for t in np.linspace(0, 1, 101):
            px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            if math.hypot(px - tee.x, py - tee.y) >= CARRY_FOR_AIM:
                p = Point(px, py)
                break
        if p is not None:
            break
    if p is None:
        p = Point(line.coords[-1])
    # the fairway's cross-section through p, square to the shot
    ang = math.atan2(p.y - tee.y, p.x - tee.x)
    nx, ny = -math.sin(ang), math.cos(ang)
    cut = LineString([(p.x - nx * 45, p.y - ny * 45), (p.x + nx * 45, p.y + ny * 45)])
    best = None
    for f in fairways:
        inter = cut.intersection(f)
        for seg in getattr(inter, "geoms", [inter]):
            if seg.is_empty or seg.geom_type != "LineString":
                continue
            dist = seg.distance(p)
            if best is None or dist < best[0]:
                best = (dist, seg)
    if best is None or best[0] > 10:
        return p
    return best[1].interpolate(0.5, normalized=True)


class TreeIndex:
    def __init__(self, trees: list, zgrid: np.ndarray, z_margin: float = 0.0):
        # z_margin (course_config "tee_shot_margin_m", default 0): extra clearance in metres
        # above and below each crown, so a ball the game's launch height puts a few
        # centimetres higher or lower than this model still misses (Stone Creek 15)
        self.zm = float(z_margin)
        self.t = trees
        self.xy = np.array([[t["x"], t["y"]] for t in trees], float) if trees else np.zeros((0, 2))
        self.z = zgrid
        H, W = zgrid.shape
        self.base = np.array([zgrid[min(H - 1, max(0, int(t["y"]))), min(W - 1, max(0, int(t["x"])))] for t in trees], float)

    def ground(self, p: Point) -> float:
        H, W = self.z.shape
        return float(self.z[min(H - 1, max(0, int(p.y))), min(W - 1, max(0, int(p.x)))])

    def blocking(self, tee: Point, target: Point) -> list[int]:
        """Indices of trees a perfect, lowest tee shot from `tee` toward `target` would hit."""
        if not len(self.t):
            return []
        ang = math.atan2(target.y - tee.y, target.x - tee.x)
        ux, uy = math.cos(ang), math.sin(ang)
        dx, dy = self.xy[:, 0] - tee.x, self.xy[:, 1] - tee.y
        along = dx * ux + dy * uy
        lat = np.abs(-dx * uy + dy * ux)
        z0 = self.ground(tee)
        out = []
        for k in np.nonzero((along > -8) & (along < REACH + 8) & (lat < 12))[0]:
            t = self.t[k]
            h = t["h"]
            # trunk on the line
            if lat[k] < TRUNK_R + MARGIN and 0 < along[k] <= REACH:
                if z0 + ball_height(along[k]) - self.base[k] < h + self.zm:
                    out.append(int(k))
                    continue
            R = t["r"] + MARGIN
            if lat[k] >= R:
                continue
            half = math.sqrt(R * R - lat[k] ** 2)
            s0, s1 = max(0.0, along[k] - half), min(REACH, along[k] + half)
            if s1 <= s0:
                continue
            # ball height above the tree's base while inside the crown cylinder (rising)
            lo = z0 + ball_height(s0) - self.base[k]
            hi = z0 + ball_height(s1) - self.base[k]
            if hi > CANOPY_START * h - self.zm and lo < h + self.zm:
                out.append(int(k))
        return out

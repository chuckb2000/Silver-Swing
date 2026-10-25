"""Propose the sea as one water feature from OSM's coastline (course-chat tool, not a make step).

    python3 pipeline/propose_sea.py <id> [--name "Long Island Sound"] [--id sea]
        -> data/<id>/proposed/sea.geojson (WGS84) and proposed/sea.png

OSM maps open water only as natural=coastline ways (land on the left, sea on the right of each
way's direction). This cuts the world + 300 m box by every coastline way in raw/overpass.geojson,
keeps the faces on the sea side, fills offshore rocks mapped as closed coastline ways (a ball on
a rock is in the sea too), and writes one natural=water feature (`--id`, default `sea`). Add it
in edits.json ("add" from proposed/sea.geojson) and list its id in `red_water_osm`, so s08 paints
it as a red penalty area inside and outside the boundary (Cypress Point, developer 2026-10-24: the
sea is a penalty area in all circumstances). Generalised from data/cypress_point/make_sea.py.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pyproj
from shapely.geometry import Polygon, box, mapping, shape
from shapely.ops import polygonize, transform, unary_union

ROOT = Path(__file__).resolve().parent.parent
M = 300


def opt(args, key, default):
    return args[args.index(key) + 1] if key in args else default


def main(name: str, args: list[str]):
    cdir = ROOT / "data" / name
    cfg = json.load(open(cdir / "course_config.json"))
    sid = opt(args, "--id", "sea")
    label = opt(args, "--name", "the sea")
    w = cfg["world"]
    to_utm = pyproj.Transformer.from_crs(4326, cfg["epsg"], always_xy=True).transform
    to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
    area = box(w["x0"] - M, w["y0"] - M, w["x0"] + w["width"] + M, w["y0"] + w["height"] + M)
    lines = []
    for f in json.load(open(cdir / "raw" / "overpass.geojson"))["features"]:
        if (f.get("properties") or {}).get("natural") != "coastline" or not f.get("geometry"):
            continue
        g = transform(to_utm, shape(f["geometry"]))
        if g.geom_type in ("Polygon", "MultiPolygon"):
            g = unary_union([p.exterior for p in getattr(g, "geoms", [g])])
        for part in getattr(g, "geoms", [g]):
            if part.geom_type == "LineString" and part.intersects(area):
                lines.append(part)
    if not lines:
        sys.exit(f"[propose_sea] {name}: no natural=coastline ways in the world box (add coastline to the Overpass query)")
    # cut at a box a little inside the clip (the export was clipped in WGS84, so line ends sit just
    # outside the UTM box) so every coastline way crosses the box edge
    inner = area.buffer(-20, join_style=2)
    cut = [ln.intersection(inner) for ln in lines]
    cut = [p for ln in cut for p in getattr(ln, "geoms", [ln]) if p.geom_type == "LineString" and p.length > 0]
    faces = list(polygonize(unary_union(cut + [inner.exterior])))

    def sea_side(face) -> bool:
        p = face.representative_point()
        ln = min(cut, key=lambda c: c.distance(p))
        t = ln.project(p)
        a, b = ln.interpolate(max(0, t - 0.5)), ln.interpolate(min(ln.length, t + 0.5))
        q = ln.interpolate(t)
        return (b.x - a.x) * (p.y - q.y) - (b.y - a.y) * (p.x - q.x) < 0   # right of travel

    sea = unary_union([f for f in faces if sea_side(f)])
    if sea.is_empty:
        sys.exit(f"[propose_sea] {name}: no face on the sea side of the coastline")
    sea = unary_union([Polygon(p.exterior) for p in getattr(sea, "geoms", [sea])])
    parts = len(sea.geoms) if sea.geom_type == "MultiPolygon" else 1
    print(f"[propose_sea] {name}: {len(lines)} coastline ways, {len(faces)} faces, sea {sea.area / 1e4:.1f} ha in {parts} part(s)")
    out = {"type": "FeatureCollection", "features": [{
        "type": "Feature", "id": sid,
        "properties": {"osm": sid, "kind": "water",
                       "tags": {"natural": "water", "water": "sea", "name": label, "penalty": "red",
                                "source": "OSM natural=coastline, sea side (pipeline/propose_sea.py)"}},
        "geometry": mapping(transform(to_wgs, sea))}]}
    (cdir / "proposed").mkdir(exist_ok=True)
    (cdir / "proposed" / "sea.geojson").write_text(json.dumps(out) + "\n")

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 10 * w["height"] / w["width"]), dpi=100)
    for poly in getattr(sea, "geoms", [sea]):
        xs, ys = poly.exterior.xy
        ax.fill(np.array(xs) - w["x0"], np.array(ys) - w["y0"], color="#3d8fc0", alpha=0.6, lw=0)
    for f in json.load(open(cdir / "raw" / "overpass.geojson"))["features"]:
        p = f.get("properties") or {}
        if p.get("leisure") == "golf_course" or p.get("golf") in ("green", "fairway", "tee"):
            g = transform(to_utm, shape(f["geometry"]))
            for q in getattr(g, "geoms", [g]):
                if q.geom_type == "Polygon":
                    xs, ys = q.exterior.xy
                    ax.plot(np.array(xs) - w["x0"], np.array(ys) - w["y0"],
                            color="orange" if p.get("leisure") else "#2f7a2f", lw=1.0 if p.get("leisure") else 0.5)
    ax.set_xlim(0, w["width"]); ax.set_ylim(0, w["height"]); ax.set_aspect("equal"); ax.grid(alpha=0.3)
    ax.set_title(f"{name}: proposed sea (blue) over the boundary (orange)")
    plt.tight_layout()
    plt.savefig(cdir / "proposed" / "sea.png")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])

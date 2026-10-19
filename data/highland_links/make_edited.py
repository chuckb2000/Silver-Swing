"""Build edited/course.geojson for Highland Links: raw/osm.geojson plus the
developer's decisions of 2026-10-18 (COURSE_BUILD.md 6.2). Re-run after
refreshing the OSM extract:

    python3 data/highland_links/make_edited.py && make course NAME=highland_links

Every edit is listed in EDITS / PINS below with its reason; nothing else is
changed. The output contains every feature (s02 reads edited/ instead of raw/).
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))

import geopandas as gpd  # noqa: E402
from pyproj import Transformer  # noqa: E402
from shapely.geometry import LineString, Point, shape  # noqa: E402

DEV = "developer 2026-10-18"

# osm id -> tags to set (kind follows the golf tag)
EDITS = {
    # pars from the club's card (OSM has 4 for both)
    "w709063005": {"par": "5", "note": f"par 5 on the club card ({DEV}: card wins)"},
    "w709063009": {"par": "5", "note": f"par 5 on the club card ({DEV}: card wins)"},
    # Blue tees chosen by the developer on the tee map (proposed/tee_map.png: T4, T12, T27, T19, T1)
    "w709063013": {"hole": "1", "tee_set": "Blue", "note": f"T4, hole 1 Blue tee ({DEV})"},
    "w1023655408": {"hole": "2", "tee_set": "Blue", "note": f"T12, hole 2 Blue tee, just south of the hole 1 green ({DEV})"},
    "w709143119": {"hole": "3", "tee_set": "Blue", "note": f"T27, hole 3 Blue tee ({DEV})"},
    "w720574022": {"hole": "4", "tee_set": "Blue", "note": f"T19, hole 4 Blue tee ({DEV})"},
    "w1023658086": {"hole": "9", "tee_set": "Blue", "tee_pos": "back", "note": f"T1, hole 9 Blue tee, play from the back of the box ({DEV})"},
    # hole 9: OSM tags the 1,261 m2 oval as the green and the 254 m2 patch inside it as fairway; it is the other way round
    "w719115834": {"golf": "fairway", "note": f"collar/approach around the hole 9 green; OSM had golf=green ({DEV})"},
    "w719115835": {"golf": "green", "note": f"the hole 9 green; OSM had golf=fairway ({DEV})"},
}

# hole -> local metres (x, y) on the world grid of course_config.json, or "centroid"
PIN_NOTE = f"towards the centre of the green ({DEV})"
PINS = {n: "centroid" for n in range(1, 9)}
# Hole 9: two-tiered green (left/north lower, right/south higher, ~3 ft; config green_tiers). The pin sits on the
# upper tier, 5.6 m right of the tier line and 3.7 m inside the edge, so its 3 m flat zone stays clear of the step.
PINS[9] = (290.92, 525.06)
PIN_NOTES = {9: f"centre of the upper (right) tier of the two-tiered green; the green centre is on the step ({DEV}: pin towards the centre, tiers)"}


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    raw = json.load(open(HERE / "raw" / "osm.geojson"))
    feats, seen = [], set()
    for f in raw["features"]:
        p = f["properties"]
        tags = p["tags"] if isinstance(p["tags"], dict) else json.loads(p["tags"])
        if p["osm"] in EDITS:
            tags = {**tags, **EDITS[p["osm"]]}
            seen.add(p["osm"])
            if "golf" in EDITS[p["osm"]]:
                p["kind"] = tags["golf"]
        p["tags"] = tags
        feats.append(f)
    missing = set(EDITS) - seen
    if missing:
        raise SystemExit(f"edits refer to features not in raw/osm.geojson: {sorted(missing)}")

    # pins
    g = gpd.GeoDataFrame.from_features(feats, crs=4326).to_crs(cfg["epsg"])
    to_wgs = Transformer.from_crs(cfg["epsg"], 4326, always_xy=True)
    x0, y0 = cfg["world"]["x0"], cfg["world"]["y0"]
    greens = g[g["kind"] == "green"]
    for _, h in g[g["kind"] == "hole"].iterrows():
        n = int(h["tags"]["ref"])
        end = Point(h.geometry.coords[-1])
        gi = greens.distance(end).idxmin()
        green = greens.loc[gi]
        if PINS[n] == "centroid":
            c = green.geometry.centroid
            ux, uy = c.x, c.y
            note = f"{PIN_NOTE}: centroid of {green['osm']}"
        else:
            ux, uy = x0 + PINS[n][0], y0 + PINS[n][1]
            note = PIN_NOTES[n]
        if not green.geometry.contains(Point(ux, uy)):
            raise SystemExit(f"pin for hole {n} is not on its green {green['osm']}")
        lon, lat = to_wgs.transform(ux, uy)
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
                      "properties": {"osm": f"pin_{n}", "kind": "pin", "tags": {"golf": "pin", "ref": str(n), "note": note}}})

    out = {"type": "FeatureCollection", "name": "highland_links_edited", "features": feats}
    (HERE / "edited").mkdir(exist_ok=True)
    (HERE / "edited" / "course.geojson").write_text(json.dumps(out) + "\n")
    validate(out, cfg)


def validate(fc, cfg):
    """COURSE_BUILD.md 6.2: closed valid polygons, every feature tagged, hole refs complete, a pin on every green."""
    import csv
    n_card = len(list(csv.DictReader(open(HERE / "scorecard.csv"))))
    problems = []
    for f in fc["features"]:
        p, geom = f["properties"], shape(f["geometry"])
        if not p.get("kind") or not p.get("tags"):
            problems.append(f"{p.get('osm')}: untagged")
        if geom.geom_type in ("Polygon", "MultiPolygon") and not geom.is_valid:
            problems.append(f"{p['osm']}: invalid polygon")
    g = gpd.GeoDataFrame.from_features(fc["features"], crs=4326).to_crs(cfg["epsg"])
    refs = sorted(int(t["ref"]) for t, k in zip(g["tags"], g["kind"]) if k == "hole")
    if refs != list(range(1, n_card + 1)):
        problems.append(f"hole refs {refs}, card has {n_card}")
    pins = g[g["kind"] == "pin"]
    for _, gr in g[g["kind"] == "green"].iterrows():
        if not pins.within(gr.geometry).any():
            problems.append(f"green {gr['osm']} has no pin")
    print(f"edited/course.geojson: {len(fc['features'])} features, holes {refs}, {len(pins)} pins; "
          + ("valid" if not problems else "PROBLEMS: " + "; ".join(problems)))
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

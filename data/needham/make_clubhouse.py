"""Needham Golf Club: the clubhouse is mapped golf=clubhouse only (s01 reads it as
golf_other), so it would not be drawn. This writes proposed/clubhouse.geojson, a
building copy of it, from raw/osm.geojson (s01's output). edits.json adds it. Run:
    python3 data/needham/make_clubhouse.py
then `make course NAME=needham`.

(Until 2026-10-31 this was make_second_nine.py, which also copied the hole lines as
holes 10-18 for the card's 18; the course is now built as its nine, Highland Links
style: docs/courses/needham.md.)
"""
import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    ch = g[g.osm == "w214634834"].copy()
    ch["kind"] = "building"
    ch["osm"] = "w214634834_building"
    ch["tags"] = ch["tags"].apply(lambda t: json.dumps({**t, "building": "yes"}))
    (HERE / "proposed").mkdir(exist_ok=True)
    p = HERE / "proposed" / "clubhouse.geojson"
    if p.exists():
        p.unlink()
    ch.to_file(p, driver="GeoJSON")
    print(f"wrote {p}")


if __name__ == "__main__":
    main()

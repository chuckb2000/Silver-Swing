"""One-off helper (not a `make course` step): turn the developer's
openstreetmap.org export (`map.2.osm`, OSM XML, GitHub release
`data-washington-dc`) into the Overpass Turbo GeoJSON format s01 reads.

    npx osmtogeojson@3.0.0-beta.5 map.2.osm > raw.geojson
    python3 data/rock_creek/osm_to_geojson.py raw.geojson

osmtogeojson is the converter Overpass Turbo uses; its CLI keeps the OSM
metadata (timestamp, version, changeset, user, uid) as properties and the id
as `id`. This drops the metadata and writes the id as `@id`, as an Overpass
Turbo export does, so the file reads like every other course's
`raw/overpass.geojson`.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

META = {"timestamp", "version", "changeset", "user", "uid"}


def main():
    src = json.loads(Path(sys.argv[1]).read_text())
    out = []
    for f in src["features"]:
        p = {k: v for k, v in f["properties"].items() if k not in META and k != "id"}
        fid = f.get("id") or f["properties"].get("id")
        out.append({"type": "Feature", "properties": {"@id": fid, **p},
                    "geometry": f["geometry"], "id": fid})
    dst = Path(__file__).resolve().parent / "raw" / "overpass.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection",
                               "generator": "osmtogeojson 3.0.0-beta.5 (openstreetmap.org export)",
                               "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
                               "features": out}, ensure_ascii=False))
    print(f"{dst}: {len(out)} features")


if __name__ == "__main__":
    main()

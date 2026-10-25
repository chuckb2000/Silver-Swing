"""One-off helper (not a `make course` step): cut the developer's OSM export
(`export.5.geojson`, 17 MB, GitHub release `stanford-data`) down to the
features that touch the download box (world + 150 m), and write it as
`raw/overpass.geojson`, the file s01 reads.

    python3 data/stanford/clip_osm.py <path to export.5.geojson>

The export is in the Overpass Turbo format already (`@id` and `@relations`
properties, no user metadata), so features are copied unchanged; only those
that miss the box (the rest of the Bay Area, counties and routes reaching
far beyond it) are left out. Features that cross the box edge are kept whole.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import box, shape

# south 37.41319, west -122.19574, north 37.43450, east -122.17477 (DATA_REQUEST.md)
BOX = box(-122.19574, 37.41319, -122.17477, 37.43450)


def main():
    src = json.loads(Path(sys.argv[1]).read_text())
    out = [f for f in src["features"] if f.get("geometry") and shape(f["geometry"]).intersects(BOX)]
    dst = Path(__file__).resolve().parent / "raw" / "overpass.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection",
                               "generator": src.get("generator", "overpass-turbo"),
                               "copyright": src.get("copyright", "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."),
                               "timestamp": src.get("timestamp"),
                               "features": out}, ensure_ascii=False))
    print(f"{dst}: {len(out)} of {len(src['features'])} features")


if __name__ == "__main__":
    main()

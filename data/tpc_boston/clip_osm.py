"""One-off helper (not a `make course` step): cut the developer's OSM export
(`export.1.geojson`, 53 MB, GitHub release `data-tpc-boston`) down to the
features that touch the download box (world + 150 m), and write it as
`raw/overpass.geojson`, the file s01 reads.

    python3 data/tpc_boston/clip_osm.py <path to export.1.geojson>

The export is in the Overpass Turbo format already (`@id` and `@relations`
properties, no user metadata), so features are copied unchanged; only those
that miss the box (railway routes to Virginia, the rest of Norton and
Mansfield) are left out. Features that cross the box edge are kept whole.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import box, shape

# south 41.9667, west -71.2370, north 41.9907, east -71.2109 (DATA_REQUEST.md)
BOX = box(-71.2370, 41.9667, -71.2109, 41.9907)


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

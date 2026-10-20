"""One-off helper (not a `make course` step): turn the developer's Overpass
Turbo export (`export.3.geojson`, GitHub release `bandon-trails-data`,
exported 2026-10-20 15:29 UTC) into `raw/overpass.geojson`.

    python3 data/bandon_trails/strip_osm_meta.py export.3.geojson

The export was made with metadata on, so every feature carries @timestamp,
@version, @changeset, @user and @uid. s01 reads every property as an OSM tag
(COURSE_LESSONS.md 12), so this drops them and keeps @id and @relations, as in
every other course's `raw/overpass.geojson`. Nothing else changes.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

META = {"@timestamp", "@version", "@changeset", "@user", "@uid"}


def main():
    src = json.loads(Path(sys.argv[1]).read_text())
    for f in src["features"]:
        f["properties"] = {k: v for k, v in f["properties"].items() if k not in META}
    dst = Path(__file__).resolve().parent / "raw" / "overpass.geojson"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(src, ensure_ascii=False))
    print(f"{dst}: {len(src['features'])} features")


if __name__ == "__main__":
    main()

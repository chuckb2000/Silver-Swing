"""`make fetch` helper (release.json "run"): put the developer's DEM export into
raw/ under the name the course config reads.

    python3 data/tpc_boston/place_dem.py <path to exportImage.10.tiff>

The asset is the USGS 3DEP elevation service's float32 GeoTIFF of the world
+ 100 m (EPSG:26919, 1 m; DATA_REQUEST.md). It is copied unchanged. The name
starts with `USGS_1M_` so the repository's .gitignore keeps it out of git; the
release holds it.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

DEST = Path(__file__).resolve().parent / "raw" / "USGS_1M_3DEP_service_tpc_boston.tif"


def main():
    DEST.parent.mkdir(exist_ok=True)
    shutil.copyfile(sys.argv[1], DEST)
    print(f"{DEST.name}: copied from {Path(sys.argv[1]).name}")


if __name__ == "__main__":
    main()

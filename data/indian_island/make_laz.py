"""raw/laz/*_c1.laz from the release's Indian.Island.lidar.zip: class 1 points
inside the world + 60 m (DATA_REQUEST.md). Run by pipeline/fetch_raw.py:
    python3 data/indian_island/make_laz.py <path to Indian.Island.lidar.zip>
"""
import sys
import zipfile
from pathlib import Path

import laspy

X0, Y0, X1, Y1 = 698201, 4532103, 700113, 4533247   # world + 60 m, EPSG:32618 (NAD83(2011) UTM 18N differs by ~1 m)
OUT = Path(__file__).resolve().parent / "raw" / "laz"


def main(zip_path: str):
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        for name in sorted(n for n in z.namelist() if n.endswith(".las")):
            with z.open(name) as f:
                las = laspy.read(f)
            m = (las.classification == 1) & (las.x >= X0) & (las.x <= X1) & (las.y >= Y0) & (las.y <= Y1)
            out = laspy.LasData(las.header)
            out.points = las.points[m]
            dest = OUT / Path(name).name.replace(".las", "_c1.laz")
            out.write(str(dest))
            print(f"[make_laz] {dest.name}: {int(m.sum())} points")


if __name__ == "__main__":
    main(sys.argv[1])

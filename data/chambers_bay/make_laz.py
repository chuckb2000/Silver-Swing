"""Clip the NOAA lidar job for Chambers Bay to the world box (+100 m).

    python3 data/chambers_bay/make_laz.py <wa2020_pierce_J1472993.zip>

Run by `make fetch NAME=chambers_bay` (release.json). The job (NOAA Data Access
Viewer dataset 9343, 2020 Lidar: Pierce County, WA) is one 1.7 GB LAZ, 311 M
points over ~22 km2, in NAD83(2011) / Washington South (EPSG:6598, metres) with
NAVD88 heights in US survey feet (course_config laz.units "ft"). This keeps the
points inside the world extent + 100 m (all classes, unchanged) and writes
data/chambers_bay/raw/laz/chambers_bay_2020_clip.laz.
"""
from __future__ import annotations

import sys
import tempfile
import zipfile
from pathlib import Path

import laspy
import numpy as np
from pyproj import Transformer

HERE = Path(__file__).resolve().parent
MEMBER = "wa2020_pierce_J1472993tR0_C0.laz"
OUT = HERE / "raw" / "laz" / "chambers_bay_2020_clip.laz"
WORLD = (531519, 5227314, 531519 + 1280, 5227314 + 1792)  # course_config world, EPSG:32610
MARGIN = 100.0


def box_in_lidar_crs():
    t = Transformer.from_crs(32610, 6598, always_xy=True)
    x0, y0, x1, y1 = WORLD
    xs, ys = [], []
    for k in range(41):  # densified edges
        f = k / 40
        for x, y in ((x0 - MARGIN + f * (x1 - x0 + 2 * MARGIN), y0 - MARGIN), (x0 - MARGIN + f * (x1 - x0 + 2 * MARGIN), y1 + MARGIN),
                     (x0 - MARGIN, y0 - MARGIN + f * (y1 - y0 + 2 * MARGIN)), (x1 + MARGIN, y0 - MARGIN + f * (y1 - y0 + 2 * MARGIN))):
            a, b = t.transform(x, y)
            xs.append(a)
            ys.append(b)
    return min(xs), min(ys), max(xs), max(ys)


def main():
    src = Path(sys.argv[1])
    bx0, by0, bx1, by1 = box_in_lidar_crs()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        with zipfile.ZipFile(src) as z:
            z.extract(MEMBER, td)
        with laspy.open(Path(td) / MEMBER) as r:
            hdr = laspy.LasHeader(point_format=r.header.point_format, version=r.header.version)
            hdr.scales, hdr.offsets = r.header.scales, r.header.offsets
            for v in r.header.vlrs:
                hdr.vlrs.append(v)
            n = 0
            with laspy.open(OUT, mode="w", header=hdr, do_compress=True) as w:
                for c in r.chunk_iterator(5_000_000):
                    x, y = np.asarray(c.x), np.asarray(c.y)
                    keep = (x >= bx0) & (x <= bx1) & (y >= by0) & (y <= by1)
                    if keep.any():
                        w.write_points(c[keep])
                        n += int(keep.sum())
    print(f"[make_laz] {MEMBER} -> {OUT.relative_to(HERE.parent.parent)}: {n:,} points in the world + {MARGIN:g} m")


if __name__ == "__main__":
    main()

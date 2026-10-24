"""Clip the NOAA lidar job for Stanford to the world box (+100 m).

    python3 data/stanford/make_laz.py <ca2020_santa_clara_J1476069.zip>

Run by `make fetch NAME=stanford` (release.json). The job (NOAA Data Access
Viewer dataset 9329, 2020 Lidar: Santa Clara County, CA, flown April 2020;
classes 3-5 ordered, DATA_REQUEST.md) is two LAZ tiles, 107 M points over
~12 km2, in NAD83(2011) / California zone 3 (US survey feet) with NAVD88
heights in metres (NOAA ignored the requested UTM projection, as at Triggs;
s00 reprojects the horizontal from the file's CRS, so course_config laz.units
stays "m"). This keeps the points inside the world extent + 100 m, unchanged,
and writes data/stanford/raw/laz/stanford_2020_clip.laz.
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
MEMBERS = ["ca2020_santa_clara_J1476069tR0_C0.laz", "ca2020_santa_clara_J1476069tR0_C1.laz"]
OUT = HERE / "raw" / "laz" / "stanford_2020_clip.laz"
WORLD = (571321, 4141180, 571321 + 1536, 4141180 + 2048)  # course_config world, EPSG:32610
MARGIN = 100.0


def box_in_lidar_crs(crs):
    t = Transformer.from_crs(32610, crs, always_xy=True)
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
    OUT.parent.mkdir(parents=True, exist_ok=True)
    total = 0
    with tempfile.TemporaryDirectory() as td:
        with zipfile.ZipFile(src) as z:
            for m in MEMBERS:
                z.extract(m, td)
        with laspy.open(Path(td) / MEMBERS[0]) as r0:
            hdr = laspy.LasHeader(point_format=r0.header.point_format, version=r0.header.version)
            hdr.scales, hdr.offsets = r0.header.scales, r0.header.offsets
            for v in r0.header.vlrs:
                hdr.vlrs.append(v)
            crs = r0.header.parse_crs()
        bx0, by0, bx1, by1 = box_in_lidar_crs(crs.horizontal_crs if hasattr(crs, "horizontal_crs") else crs.sub_crs_list[0])
        with laspy.open(OUT, mode="w", header=hdr, do_compress=True) as w:
            for m in MEMBERS:
                n = 0
                with laspy.open(Path(td) / m) as r:
                    same = r.header.scales.tolist() == hdr.scales.tolist() and r.header.offsets.tolist() == hdr.offsets.tolist()
                    for c in r.chunk_iterator(5_000_000):
                        x, y = np.asarray(c.x), np.asarray(c.y)
                        keep = (x >= bx0) & (x <= bx1) & (y >= by0) & (y <= by1)
                        if keep.any():
                            pts = c[keep]
                            if not same:  # the second tile has its own offsets: re-quantise on the first's
                                out = laspy.ScaleAwarePointRecord.zeros(len(pts), header=hdr)
                                for d in pts.point_format.dimension_names:
                                    if d not in ("X", "Y", "Z"):
                                        out[d] = pts[d]
                                out.x, out.y, out.z = np.asarray(pts.x), np.asarray(pts.y), np.asarray(pts.z)
                                pts = out
                            w.write_points(pts)
                            n += int(keep.sum())
                print(f"[make_laz] {m}: {n:,} points in the world + {MARGIN:g} m")
                total += n
    print(f"[make_laz] -> {OUT.relative_to(HERE.parent.parent)}: {total:,} points")


if __name__ == "__main__":
    main()

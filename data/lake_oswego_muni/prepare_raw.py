"""Turn the developer's downloads (GitHub release muni-data) into this course's raw/
inputs. Run by `make fetch NAME=lake_oswego_muni` through release.json, or by hand:

    python3 data/lake_oswego_muni/prepare_raw.py clip <dogami.tif> <raw/out.tif>
    python3 data/lake_oswego_muni/prepare_raw.py ortho      # after the four quarters are in raw/osip_src/

clip:  a DOGAMI exportImage (EPSG:32610, 1 m, feet, 2000 x 2000 over x 523184-525184 /
       y 5026322-5028322) cut to the world + 100 m on whole metres, no resampling.
ortho: the four OSIP 2024 quarters (JPEG, 3281 x 3281 px, 1 ft; JPEGs carry no
       georeferencing, so each one is placed by the bbox of its request, as at Langdon
       Farms) mosaicked and resampled bilinearly to 0.32 m on the world extent, written as
       a JPEG-compressed GeoTIFF (raw/osip2024_032m.tif), R, G, B.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject
from rasterio.windows import from_bounds as window_from_bounds

HERE = Path(__file__).resolve().parent
CFG = json.load(open(HERE / "course_config.json"))
EPSG = f"EPSG:{CFG['epsg']}"
PAD = 100
RES = 0.32

# release asset -> request bbox (EPSG:32610), DATA_REQUEST.md steps 3-6 (second box)
QUARTERS = {
    "muni.25.jpg": (523184, 5027322, 524184, 5028322),   # north-west
    "muni.26.jpg": (524184, 5027322, 525184, 5028322),   # north-east
    "muni.27.jpg": (523184, 5026322, 524184, 5027322),   # south-west
    "muni.28.jpg": (524184, 5026322, 525184, 5027322),   # south-east
}


def clip(src_path, dst_path):
    w = CFG["world"]
    x0, y0 = w["x0"] - PAD, w["y0"] - PAD
    x1, y1 = w["x0"] + w["width"] + PAD, w["y0"] + w["height"] + PAD
    dst = HERE / dst_path
    dst.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(src_path) as src:
        assert src.crs.to_epsg() == CFG["epsg"] and src.res == (1.0, 1.0), (src.crs, src.res)
        win = window_from_bounds(x0, y0, x1, y1, src.transform).round_offsets().round_lengths()
        a = src.read(1, window=win)
        prof = src.profile | dict(width=a.shape[1], height=a.shape[0], transform=src.window_transform(win),
                                  compress="deflate", predictor=3, tiled=True, blockxsize=256, blockysize=256)
        with rasterio.open(dst, "w", **prof) as d:
            d.write(a, 1)
    print(f"[clip] {dst} {a.shape[1]}x{a.shape[0]} m, {dst.stat().st_size / 1e6:.1f} MB")


def ortho():
    w = CFG["world"]
    W, H = int(round(w["width"] / RES)), int(round(w["height"] / RES))
    dst_tr = from_origin(w["x0"], w["y0"] + w["height"], RES, RES)
    # the quarters share edges and pixel size: paste them into one picture, then resample once
    xs = sorted({b[0] for b in QUARTERS.values()} | {b[2] for b in QUARTERS.values()})
    ys = sorted({b[1] for b in QUARTERS.values()} | {b[3] for b in QUARTERS.values()})
    ims = {n: np.asarray(Image.open(HERE / "raw" / "osip_src" / n).convert("RGB")) for n in QUARTERS}
    q = next(iter(ims.values())).shape[0]
    assert all(i.shape[:2] == (q, q) for i in ims.values())
    mos = np.zeros((q * (len(ys) - 1), q * (len(xs) - 1), 3), np.uint8)
    for n, (bx0, by0, bx1, by1) in QUARTERS.items():
        c, r = xs.index(bx0) * q, (len(ys) - 1 - ys.index(by1)) * q
        mos[r:r + q, c:c + q] = ims[n]
    tr = from_bounds(xs[0], ys[0], xs[-1], ys[-1], mos.shape[1], mos.shape[0])
    out = np.zeros((3, H, W), np.uint8)
    for b in range(3):
        reproject(np.ascontiguousarray(mos[:, :, b]), out[b], src_transform=tr, src_crs=EPSG,
                  dst_transform=dst_tr, dst_crs=EPSG, resampling=Resampling.bilinear)
    prof = dict(driver="GTiff", width=W, height=H, count=3, dtype="uint8", crs=EPSG, transform=dst_tr,
                compress="JPEG", jpeg_quality=90, photometric="YCBCR", tiled=True, blockxsize=512, blockysize=512)
    dst = HERE / "raw" / "osip2024_032m.tif"
    with rasterio.open(dst, "w", **prof) as d:
        d.write(out)
    print(f"[ortho] {dst} {W}x{H} at {RES} m, {dst.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    if sys.argv[1] == "clip":
        clip(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "ortho":
        ortho()
    else:
        sys.exit(__doc__)

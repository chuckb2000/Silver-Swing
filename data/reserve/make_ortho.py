"""The Reserve's photo: the four OSIP 2024 quarters (0.5 m JPEG exportImage, fetched by the
GitHub Actions workflow into the release data-reserve) mosaicked by their request boxes and
clipped to the world + 100 m (pipeline/intake.py ortho) into raw/osip2024_05m.tif.

    python3 data/reserve/make_ortho.py <the north-east quarter's file>   (release.json; the other
                                                                          three are in raw/osip_src/)
"""
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
QUARTERS = {  # request boxes, EPSG:32610 (fetch.json)
    "osip2024_sw.jpg": "504900 5035300 506400 5036800",
    "osip2024_se.jpg": "506400 5035300 507900 5036800",
    "osip2024_nw.jpg": "504900 5036800 506400 5038300",
    "osip2024_ne.jpg": "506400 5036800 507900 5038300",
}

src = HERE / "raw" / "osip_src"
src.mkdir(parents=True, exist_ok=True)
if len(sys.argv) > 1 and Path(sys.argv[1]).resolve() != (src / "osip2024_ne.jpg").resolve():
    shutil.copy(sys.argv[1], src / "osip2024_ne.jpg")
args = []
for name, box in QUARTERS.items():
    args += [str(src / name)] + box.split()
subprocess.run([sys.executable, str(HERE.parent.parent / "pipeline" / "intake.py"), "ortho", "reserve", *args,
                "--out", "raw/osip2024_05m.tif"], check=True)

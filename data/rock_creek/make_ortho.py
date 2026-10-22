"""Rock Creek: georeference the DC 2023 orthophoto export (course chat tool, not a
`make course` step; the build doesn't read the photo).

    python3 data/rock_creek/make_ortho.py     -> build/ortho_2023.tif

raw/rc_ortho_2023.jpg is the DC GIS Ortho2023 MapServer export of the world box
(x 322501-323781, y 4314530-4315554 in EPSG:32618, 4096 x 3277 px; the
service returned the extent 322501..323781 x 4314529.96875..4315554.03125,
0.3125 m per pixel; DATA_REQUEST.md has the link). A JPEG has no
georeferencing, so the transform comes from that extent (as at Langdon Farms).
The tracing tools (pipeline/propose_trace.py, desk_export.py) read the GeoTIFF.
"""
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin

HERE = Path(__file__).resolve().parent
X0, TOP, RES = 322501.0, 4315554.03125, 0.3125

a = np.asarray(Image.open(HERE / "raw" / "rc_ortho_2023.jpg").convert("RGB"))
out = HERE / "build" / "ortho_2023.tif"
out.parent.mkdir(exist_ok=True)
with rasterio.open(out, "w", driver="GTiff", width=a.shape[1], height=a.shape[0], count=3, dtype="uint8",
                   crs="EPSG:32618", transform=from_origin(X0, TOP, RES, RES), compress="deflate") as w:
    w.write(np.transpose(a, (2, 0, 1)))
print(f"{out}: {a.shape[1]} x {a.shape[0]} px at {RES} m")

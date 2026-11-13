"""Download links for a scouted course (docs/scouting/GUIDE.md).

Given the course's id, state and a WGS84 box (or a centre and a half-size in
metres), print the box in UTM and the standard one-click links the developer
opens in a browser: OSM (Overpass Turbo query), bare-earth elevation, canopy
(Oregon only; elsewhere a NOAA Data Access Viewer recipe), and an orthophoto.
Also writes docs/scouting/<id>/box.json.

    python3 docs/scouting/tools/make_links.py <id> <state> --box S W N E
    python3 docs/scouting/tools/make_links.py <id> <state> --centre LAT LON --half 1500
    python3 docs/scouting/tools/make_links.py <id> <state> --centre LAT LON --half-x 1800 --half-y 1200

The sandbox can't reach any of these services, so nothing here is checked:
the course chat checks every file on arrival (COURSE_BUILD.md 5.5).
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from pyproj import Transformer

HERE = Path(__file__).resolve().parent.parent

OVERPASS = """[out:json][timeout:180][bbox:{s:.5f},{w:.5f},{n:.5f},{e:.5f}];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  way["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr["amenity"="parking"];
);
out geom;"""


def utm_epsg(lon: float, lat: float) -> int:
    zone = int(math.floor((lon + 180) / 6) + 1)
    return (32600 if lat >= 0 else 32700) + zone


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("state", help="two-letter state, e.g. OR, CA, NY")
    ap.add_argument("--box", nargs=4, type=float, metavar=("S", "W", "N", "E"))
    ap.add_argument("--centre", nargs=2, type=float, metavar=("LAT", "LON"))
    ap.add_argument("--half", type=float, help="half-size in metres (square box)")
    ap.add_argument("--half-x", type=float)
    ap.add_argument("--half-y", type=float)
    a = ap.parse_args()

    if a.box:
        s, w, n, e = a.box
        lat0, lon0 = (s + n) / 2, (w + e) / 2
    else:
        lat0, lon0 = a.centre
    epsg = utm_epsg(lon0, lat0)
    fwd = Transformer.from_crs(4326, epsg, always_xy=True)
    inv = Transformer.from_crs(epsg, 4326, always_xy=True)
    if a.box:
        xs, ys = zip(*(fwd.transform(lo, la) for la in (s, n) for lo in (w, e)))
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    else:
        cx, cy = fwd.transform(lon0, lat0)
        hx = a.half_x or a.half
        hy = a.half_y or a.half
        x0, x1, y0, y1 = cx - hx, cx + hx, cy - hy, cy + hy
    # whole metres, outward
    x0, y0, x1, y1 = math.floor(x0), math.floor(y0), math.ceil(x1), math.ceil(y1)
    W, H = x1 - x0, y1 - y0
    lons, lats = zip(*(inv.transform(x, y) for x in (x0, x1) for y in (y0, y1)))
    s, w, n, e = min(lats), min(lons), max(lats), max(lons)
    bb = f"{x0},{y0},{x1},{y1}"
    st = a.state.upper()

    def parts(res: float, cap: int = 4000) -> list[tuple[str, int, int]]:
        """The box cut into pieces of at most cap x cap pixels at res m/px (bbox, width, height)."""
        nx, ny = math.ceil(W / res / cap), math.ceil(H / res / cap)
        out = []
        for j in range(ny):
            for i in range(nx):
                a0, a1 = x0 + W * i // nx, x0 + W * (i + 1) // nx
                b0, b1 = y0 + H * j // ny, y0 + H * (j + 1) // ny
                out.append((f"{a0},{b0},{a1},{b1}", math.ceil((a1 - a0) / res), math.ceil((b1 - b0) / res)))
        return out

    dparts = parts(1.0)
    # imagery: native 0.5 m (Oregon) / 0.6 m (NAIP), coarsened up to 1 m so the box is one piece where it can be
    ires = round(min(1.0, max(0.5 if st == "OR" else 0.6, max(W, H) / 3990)), 3)
    iparts = parts(ires)
    many = len(dparts) > 1 or len(iparts) > 1

    out: list[str] = []
    p = out.append
    p(f"## Box ({a.id})\n")
    p(f"- WGS84: south {s:.5f}, west {w:.5f}, north {n:.5f}, east {e:.5f}")
    p(f"- EPSG:{epsg} (WGS 84 / UTM zone {epsg % 100}N): x {x0}-{x1}, y {y0}-{y1} ({W} x {H} m)")
    p("")
    p("### OSM (Overpass Turbo)\n")
    p("Open https://overpass-turbo.eu, replace the text on the left with this, click Run,")
    p(f"then Export -> GeoJSON -> download. Save as `{a.id}_overpass.geojson`.\n")
    p("```")
    p(OVERPASS.format(s=s, w=w, n=n, e=e))
    p("```\n")
    if many:
        p(f"The box is cut into {len(dparts)} elevation piece(s) and {len(iparts)} image piece(s) "
          "(each at most 4000 px a side); download every link.\n")

    def links(title: str, url: str, ps: list[tuple[str, int, int]], extra: str) -> None:
        p(f"### {title}\n")
        p("```")
        for b, w_, h_ in ps:
            p(f"{url}?bbox={b}&bboxSR={epsg}&imageSR={epsg}&size={w_},{h_}{extra}")
        p("```\n")

    dem_extra = "&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image"
    if st == "OR":
        links("Bare earth (DOGAMI lidar DTM, 1 m)",
              "https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage",
              dparts, dem_extra)
        links("Canopy height (DOGAMI lidar CHM, 1 m)",
              "https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage",
              dparts, dem_extra)
        links(f"Orthophoto (Oregon Statewide Imagery Program 2024, {ires} m, JPEG)",
              "https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage",
              iparts, "&format=jpg&f=image")
    else:
        links("Bare earth (USGS 3DEP, best available, 1 m)",
              "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage",
              dparts, "&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image")
        p("If a link shows an error page, change the last part to `f=json` and open the `href` it returns.\n")
        # the 3DEP 1 m tiles (10 km, named by their north-west corner)
        tiles = [f"x{xi}y{yi}" for xi in range(x0 // 10000, (x1 - 1) // 10000 + 1)
                 for yi in range(math.ceil((y0 + 1) / 10000), math.ceil(y1 / 10000) + 1)]
        p(f"3DEP 1 m tile ids covering the box (zone {epsg % 100}): {', '.join(tiles)} "
          f"(`USGS_1M_{epsg % 100}_<tile>_<project>.tif` under "
          "https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/).\n")
        links(f"Orthophoto (USDA NAIP via the USGS National Map, {ires} m, JPEG)",
              "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage",
              iparts, "&format=jpg&f=image")
        p("If these fail, use USDA's own NAIP service: in each link replace "
          "`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer` with "
          "`https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer` "
          "and `format=jpg` with `format=tiff`.\n")
    text = "\n".join(out)
    print(text)
    d = HERE / a.id
    d.mkdir(parents=True, exist_ok=True)
    (d / "box.json").write_text(json.dumps({
        "id": a.id, "state": st, "epsg": epsg,
        "wgs84": {"south": round(s, 6), "west": round(w, 6), "north": round(n, 6), "east": round(e, 6)},
        "utm": {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "w": W, "h": H},
        "note": "download box = estimated course extent + margin; the course chat sets the world from the OSM boundary",
    }, indent=1) + "\n")
    (d / "links_generated.md").write_text(text + "\n")


if __name__ == "__main__":
    main()

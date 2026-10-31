"""Tetherow: write proposed/retag.geojson and edits.json from raw/osm.geojson.

Run from the repository root: python3 data/tetherow/make_edits.py
Every edit carries its reason. Course chat, 2026-10-31.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.ops import unary_union

C = Path(__file__).resolve().parent
EPSG = 32610
g = gpd.read_file(C / "raw" / "osm.geojson")
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
gu = g.to_crs(EPSG)
boundary = gu[gu.kind == "boundary"].geometry.iloc[0]

edits = {"add": [], "tags": [], "drop": []}
retag = []  # features copied into proposed/retag.geojson


def inside_share(geom):
    if geom.area > 0:
        return geom.intersection(boundary).area / geom.area
    if geom.length > 0:
        return geom.intersection(boundary).length / geom.length
    return float(boundary.contains(geom))


# 1. Broken Top Club's golf features north and east of the boundary (its course polygon is not
#    in OSM, so its holes, tees, greens and range read as Tetherow's). All lie wholly outside
#    the Tetherow boundary. Its ponds stay as scenery (natural=water, drawn as off-course water).
golf_kinds = {"hole", "tee", "green", "fairway", "bunker", "pin", "cartpath", "rough", "golf_other",
              "driving_range", "water_hazard", "lateral_water_hazard"}
for i, r in gu[gu.kind.isin(golf_kinds)].iterrows():
    if inside_share(r.geometry) > 0.0:
        continue
    if r.kind in ("water_hazard", "lateral_water_hazard") and r.geometry.area > 0:
        f = g.loc[i]
        retag.append({"osm": "water_" + f.osm, "kind": "water", "tags": {"natural": "water"}, "geometry": f.geometry})
        edits["add"].append({"from": "proposed/retag.geojson", "ids": ["water_" + f.osm], "tags": {},
                             "reason": "a pond of the neighbouring Broken Top Club, wholly outside the boundary, mapped as a golf penalty area: kept as off-course water (s03: neighbours' penalty areas)"})
    edits["drop"].append({"osm": r.osm, "reason": f"Broken Top Club's {r.kind} (or a stream line of its pond), wholly outside the Tetherow boundary; that club has no course polygon in OSM, so its features would read as Tetherow's"})

# 2. The OSM footways tagged golf=path inside the boundary: cart and walking paths (free relief).
for i, r in g[g.tags.apply(lambda t: t.get("golf") == "path")].iterrows():
    retag.append({"osm": "cp_" + r.osm, "kind": "cartpath", "tags": {**r.tags, "golf": "cartpath"}, "geometry": r.geometry})
    edits["add"].append({"from": "proposed/retag.geojson", "ids": ["cp_" + r.osm], "tags": {},
                         "reason": "golf=path (a footway) inside the boundary: a cart path, free relief (s03)"})
    edits["drop"].append({"osm": r.osm, "reason": "replaced by its cart-path copy cp_" + r.osm})

# 3. The driving range. OSM maps its target greens, its tee strip and its turf as greens and
#    fairways but no golf=driving_range, so the range would play as a fairway full of wrong
#    greens. Its edge: the hull of the mapped range features (practice fairway r17260236, tee
#    strip w754727421, the nine target greens and the north target fairway w930491745), grown
#    4 m. OSIP 2024: one mown practice ground between holes 1 and 18, hit south to north.
range_ids = ["r17260236", "w754727421", "w930491745", "w754718212", "w754718213", "w754718214",
             "w754718215", "w754718216", "w754718217", "w754718218", "w754718220", "w754718221"]
rng = unary_union(list(gu[gu.osm.isin(range_ids)].geometry)).convex_hull.buffer(4.0)
rng_wgs = gpd.GeoSeries([rng], crs=EPSG).to_crs(4326).iloc[0]
retag.append({"osm": "range_tetherow", "kind": "driving_range", "tags": {"golf": "driving_range", "source": "hull of OSM range features"}, "geometry": rng_wgs})
edits["add"].append({"from": "proposed/retag.geojson", "ids": ["range_tetherow"], "tags": {},
                     "reason": "Tetherow's range: OSM maps its target greens, tee strip and turf but no range outline; the hull of those features + 4 m (COURSE_LESSONS 2, range). Out of bounds (standing default)"})
for oid in range_ids:
    edits["drop"].append({"osm": oid, "reason": "a target green, tee strip or turf of the driving range (now one range polygon, range_tetherow)"})

# 3b. Tee pads mapped as golf=fairway: small mown pads (27-113 m2) on the hole lines of 3, 4, 5
#     and 6, three of them at the line starts of 4, 5 and 6 (the back tees: the lines measure
#     485, 440 and 431 yd against Kidd 481, 429 and 424). OSIP 2024: separate mown pads in the
#     native grass, like the mapped tees around them.
for oid, hole in [("w676296570", 4), ("w676305936", 6), ("w676305918", 5), ("w676305919", 5), ("w676305921", 5),
                  ("w676305922", 5), ("w676305929", 6), ("w676305930", 6), ("w676305931", 6), ("w754338806", 3)]:
    f = g[g.osm == oid].iloc[0]
    retag.append({"osm": "tee_" + oid, "kind": "tee", "tags": {"golf": "tee", "landuse": "grass"}, "geometry": f.geometry})
    edits["add"].append({"from": "proposed/retag.geojson", "ids": ["tee_" + oid], "tags": {},
                         "reason": f"a tee pad on hole {hole}'s line mapped as golf=fairway ({round(gu.loc[f.name].geometry.area)} m2; OSIP 2024 shows a separate mown pad in the native grass): copied as a tee (COURSE_LESSONS 2; s03)"})
    edits["drop"].append({"osm": oid, "reason": "replaced by its tee copy tee_" + oid})

# 4. Hole 9 is the card's par 5 (532 yd from Kidd); OSM tags it par 4.
edits["tags"].append({"osm": "w780645565", "set": {"par": "5"},
                      "reason": "the card (Stymie, 18Birdies, GolfPass, OpenGolfAPI) makes 9 a par 5 of 532 yd (Kidd); the OSM line measures 524 yd; OSM's par=4 is a tagging error"})

# 5. Water inside the boundary: red (standing default).
for oid in ["w676305928", "w895748322"]:
    edits["tags"].append({"osm": oid, "set": {"penalty": "red"}, "reason": "all water red (standing default, COURSE_BUILD.md 4.1)"})

# 6. The large irregular sandy areas OSM maps as golf=bunker (519-2,463 m2, every one over
#    450 m2; the bunkers proper are 16-420 m2): pumice waste areas with bunchgrass and shrubs
#    growing through them (OSIP 2024), the "waste areas" the club put in for native areas
#    (golfcoursearchitecture.net, Tetherow improvements). Waste sand, a general area
#    (config waste_sand; CLAUDE.md waste sand).
for i, r in gu[(gu.kind == "bunker")].iterrows():
    if r.geometry.area > 450 and inside_share(r.geometry) > 0.5:
        edits["tags"].append({"osm": r.osm, "set": {"sand": "waste"},
                              "reason": f"pumice waste area ({round(r.geometry.area)} m2, irregular, grass and shrubs through it in the OSIP 2024 photo), not a bunker: waste sand"})

# 7. The stream OSM maps from the hole 6 pond north-east past the hole 4 tees (two
#    golf=lateral_water_hazard lines, 68 and 55 m, and a 101 m2 pool between them): the
#    OSIP 2024 photo shows a dry, shrubby channel with no water, and a line has no width
#    to play as a penalty area. Dropped; listed as an open item.
for oid in ["w1091654143", "w1091654145", "w1091654144"]:
    edits["drop"].append({"osm": oid, "reason": "mapped stream / pool by the hole 4 tees: dry, shrub-filled channel in the OSIP 2024 photo; a line has no width to play as a penalty area (open item)"})

(C / "proposed").mkdir(exist_ok=True)
gpd.GeoDataFrame(retag, geometry="geometry", crs=4326).assign(tags=lambda d: d.tags.apply(json.dumps)).to_file(
    C / "proposed" / "retag.geojson", driver="GeoJSON")
json.dump(edits, open(C / "edits.json", "w"), indent=1)
print(f"edits: {len(edits['add'])} add, {len(edits['tags'])} tags, {len(edits['drop'])} drop")

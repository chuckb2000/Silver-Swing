# The Muni (Lake Oswego Public Golf Course)

Course id: `lake_oswego_muni` (data folder `data/lake_oswego_muni/`), branch `course/lake_oswego_muni`.

## Build summary

Built 2026-10-22 by a course chat following docs/COURSE_BUILD.md. A nine-hole
executive course (par 30) that opened in April 2025 and is not in OpenStreetMap:
OSM gave only the city's golf property and the old range, so every hole was
traced. The course chat traced the greens from the OSIP 2024 photo (summer 2024,
the new greens grown in) and placed provisional tees from the 2021 site plan; the
developer corrected the greens and drew the fairways, bunkers, tee boxes, each
Black tee and the range in the tracing desk, then marked 8 trees to delete in a
tree tracer page. DOGAMI lidar (OLC Metro 3DEP 2019) for the ground and the
canopy, with trees gone by 2024 dropped against the photo. Black tees, `pnw`
theme. Every hole within 3 % of the card except hole 8 (-3.3 %, flag); total
1,601 yd against 1,599. No pipeline change. Unit tests: 748 pass; the one failure
is the daily-rotation check that every course is in `dailyRoster.ts` (design chat,
after the merge).

## Facts

-   **Location:** 17525 SW Stafford Road, Lake Oswego, Clackamas County, Oregon,
    beside the Lake Oswego Recreation and Aquatics Center and Lakeridge High
    School; city-owned. `state` OR. Course id `lake_oswego_muni`. The developer
    calls it "The Muni"; listings use "Lake Oswego Public Golf Course".
-   **Design:** Dan Hixson (opened 26 April 2025), a new nine on part of the
    city's 18-hole par-3 course of the 1960s (1964 per Golf Course Architecture,
    1967 per oregoncourses.com). About 160 trees removed and about 130 planted
    (The Fried Egg, 2025-04-28). The 4th is a semi-Redan.
-   **UTM zone:** 10 N (EPSG:32610). World 768 x 768 m (x0 524034, y0 5026969).
    Theme `pnw`. Wind 1-7 mph.
-   **Data** (GitHub release `muni-data`; `make fetch NAME=lake_oswego_muni`):
    Overpass export (`export.geojson`); DOGAMI DTM (`more.data.tiff`) and canopy
    height model (`exportImage.12.tiff`), 1 m, feet, clipped by `prepare_raw.py`;
    OSIP 2024 orthophoto, four JPEG quarters (`muni.25-28.jpg`) placed by their
    request boxes and mosaicked by `prepare_raw.py`. Hole identity from the 2021
    site plan (`LOGC_SITE.PLAN_5-19-21.pdf`) and the city's course map (screenshot);
    both look only. Six Google Earth screenshots (2025-26) were looked at, not
    traced. The first set of rasters (a box 2 km east) missed the course and is
    unused.
-   **Water:** the stream between hole 2's tee and green, a red penalty area made
    from the lidar channel (developer's request). OSM maps the stream only north of
    the course. No other water.
-   **Out of bounds:** OSM's outline of the city's property cut along the north
    side of the aquatics center (`make_boundary.py`, approved): the clubhouse,
    the aquatics center and its yard are out. The driving range, inside the line,
    is out of bounds.
-   **Trees:** 2,172 from the lidar canopy model, 255 inside the course; conifer or
    broadleaf from crown shape (65 conifers on the course). Removed: 356 not
    standing on the 2024 photo (`trees_need_ortho`), 8 marked by the developer
    (`drop_trees`), 4 on tee shots (s06b: holes 2, 8, 9), 42 on greens, tees and
    fairways.

## Scorecard

GolfPass, retrieved 2026-10-22, unverified (the city publishes no card;
developer: use it). Ratings from oregoncourses.com, unverified.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 30 |
| HCP | 11 | 3 | 7 | 13 | 1 | 15 | 5 | 9 | 17 | |
| Black | 248 | 166 | 127 | 128 | 309 | 108 | 143 | 270 | 100 | 1599 |
| Built | 247 | 166 | 127 | 132 | 313 | 110 | 147 | 261 | 99 | 1601 |
| White | 228 | 127 | 113 | 111 | 293 | 96 | 131 | 254 | 93 | 1446 |

Black 29.0 / 86, White 28.5 / 85 (men's). The 2021 site plan's card (1,610 yd)
predates the build.

## Default tee

Black, the only set built: the card has no Blue and Black is the longer set
(COURSE_BUILD.md 4.1). White is listed, not playable.

## The developer's calls

-   2026-10-22: standing defaults (4.1) used without asking.
-   2026-10-22: the GolfPass card ("no scorecard appears to be publicly available").
-   2026-10-22: every hole's shapes and Black tees, and the range, in the tracing
    desk; the stream on hole 2 from the lidar; the out-of-bounds proposal ("looks
    good"); 8 trees removed in the tree tracer.
-   2026-10-22: the logo is the design chat's sailboat (`design/logos-muni-redtail`).
-   2026-10-22: every open item left as built ("let's leave it all as is"): the GolfPass card, hole 8 at -3.3 %, the stream red, crown-shape tree types, the 2019 ground, the three steeper small greens, the practice green unmapped, card hole 4.

## New pipeline keys or theme

None. Existing keys used: `trees_need_ortho`, `trees_off_fairways_m`,
`drop_trees`, `ortho`. Course scripts: `prepare_raw.py` (clips and the photo
mosaic, run by `make fetch`), `make_boundary.py`, `make_creek_line.py`,
`tree_desk/` (the tree tracer page and its data). `make regress` not needed (no
change in `pipeline/`).

## Open items

All accepted as built by the developer (2026-10-22). `data/lake_oswego_muni/report_notes.md` (also in validation_report.md): scorecard
unverified; hole 8 -3.3 %; the stream's colour; tree types from crown shape (the
photo suggests mostly Douglas firs); the 2019 ground predates the rebuild; steep
spots on three small greens; the practice green unmapped; the card hole.

## Lessons

-   **Find the course on a map before writing the data request.** The first box
    was centred on a guessed position 2 km east of the course; the developer
    downloaded a full set that missed. A school or landmark beside the course with
    published coordinates (Wikipedia) placed the second box.
-   **Two identical uploads hide a missing file.** Hash every release asset on
    arrival: `exportImage.12` and `.13` were the same canopy model, and the DTM had
    not been downloaded.
-   **A grow-in photo shows greens but not fairways.** On the 2024 photo the greens
    traced cleanly (or as ovals where tree shadow covered half of them), while
    fairway and rough had the same colour; proposing no fairways and letting the
    developer draw them was faster than tuning a colour rule.
-   **Lidar from before a rebuild has the old course's tee pads.** Skip
    `propose_tees.py`; place provisional tees at the card distance in the site
    plan's direction and let the developer mark the real ones.
-   **A tree tracer settles tree questions in one pass.** The developer asked to
    pick the trees to delete himself; a page with every lidar crown over the photo
    (and the game's ground art), click to mark, saving to the artifact database,
    turned into `drop_trees` entries at the exact tree points
    (`data/lake_oswego_muni/tree_desk/`). It could serve other courses.
-   **A shadow can keep a gone tree.** `trees_need_ortho` checks for dark pixels in
    the crown, and a neighbour's long shadow is dark too, so some lidar crowns over
    open grass on the photo survived the check. Show the result to the developer
    over the photo (the tree tracer) rather than trusting the filter.

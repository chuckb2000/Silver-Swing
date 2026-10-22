# Rock Creek Park Golf

Course id: `rock_creek` (data folder `data/rock_creek/`), branch `course/rock_creek`.

## Build summary

Built 2026-10-22 by a course chat. Fourteen holes, par 50, from the White tees,
as on the printed card: the front nine and the "back five" (old 10, 11, 15, 17
and 18, played as 10-14 since 12, 13, 14 and 16 closed in 2015). OSM had the
greens, most tees and fairways but only 9 unnumbered hole lines; the routing
came from the 1927 Flynn plan, the NCPC 2023 plans and the DC 2023 orthophoto,
and was confirmed by the GolfDC course map the developer supplied. Elevation
and trees from the DC-wide lidar DEM and normalized surface model (release
`data-washington-dc`, as East Potomac and Langston). New theme `piedmont`
(upland hardwoods in mid-autumn) and a new logo (the Joaquin Miller Cabin).
Eleven holes within 3 % of the card, three flagged (1 -6.8 %, 3 -3.3 %,
4 -4.8 %), none over 8 %; 3,744 yd built against 3,786. No pipeline change.
789 unit tests and 11 Playwright tests pass; two unit tests wait on the design
chat (requests below). A scratch copy of Franklin's course checks (tee on a
box, pin on its green, yardage, water, centre-line and tee-shot tree checks,
default aim, robot round, wind, putting views, determinism) passes 12 of 12
for this course; robot rounds over five seeds score 49-54 (par 50), one
penalty (seed 11, the stream in front of 13).

## Facts

-   **Location:** 6100 16th Street NW, Washington DC, inside Rock Creek Park
    (National Park Service), between Military Road (south), 16th Street
    (east), Sherrill Drive (north) and Rock Creek and Beach Drive (west).
    `state` DC. Course id `rock_creek`. Operated by National Links Trust.
-   **Design:** William S. Flynn: nine holes dedicated by President Harding in
    1923, eighteen in 1926. After Military Road was widened (1957-58) William
    F. Gordon rerouted holes 3-8. Back nine closed in part since 2015 (holes
    12, 13, 14, 16). A Hanse-designed renovation (nine regulation holes, a
    nine-hole par-3 course, range) began in 2024; not built here. Sources: NPS
    "Links to the past", NCPC 2023/2024 submissions, cultural-landscapes.org,
    Wikipedia, Golf Course Industry.
-   **UTM zone:** 18N (EPSG:32618). World 1,280 x 1,024 m. Theme `piedmont`.
    Wind 2-10 mph (DC default).
-   **Data:** OSM: the developer's openstreetmap.org export `map.2.osm`
    (release `data-washington-dc`; that release's `export.geojson` is the
    Bandon par-3 courses, not used), converted by `osm_to_geojson.py`. DEM and
    canopy: DC.TIF.2 / DC.TIF.1 clipped to the world + 100 m
    (`raw/dc_*_clip.tif`, committed; `release.json` re-cuts them). Photo: DC
    GIS Orthophoto 2023 (flown 6 and 10 May 2023, 0.31 m export,
    `release.json` puts it in `raw/`; `make_ortho.py` georeferences it from
    the export box). Plans and the GolfDC map in `data/rock_creek/reference/`.
-   **Water:** three stream channels as red penalty areas (in front of 13,
    left of 14, and one in the closed north-west). No ponds. Out of bounds:
    the OSM boundary; Rock Creek lies outside it.
-   **Trees:** 8,546 from the lidar surface model (2,004 inside the
    boundary). Narrow crowns (76 %) drawn as tulip poplars, broad crowns as
    oak, maple and beech. Removed: 6 crowns on fairways or a tee pad
    (`trees_off_fairways_m` 2) and 3 in front of the 6th tee (s06b).

## Scorecard

Printed course card, photo from the developer (2026-10-22), in
`data/rock_creek/reference/scorecard.png`.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 3 | 3 | 4 | 3 | 4 | 4 | 32 | 4 | 3 | 4 | 3 | 4 | 18 | 50 |
| HCP | 10 | 8 | 14 | 12 | 5 | 2 | 9 | 13 | 7 | | 3 | 11 | 1 | 4 | 8 | | |
| White | 302 | 285 | 160 | 173 | 202 | 360 | 202 | 270 | 330 | 2284 | 400 | 160 | 400 | 200 | 342 | 1502 | 3786 |
| Built | 282 | 278 | 155 | 165 | 204 | 351 | 199 | 272 | 338 | 2244 | 393 | 158 | 406 | 194 | 351 | 1502 | 3746 |

(Built = s06's adjusted yardage per hole; the report's total of 3,744 is the
sum before rounding.) No rating or slope published (stored 0: "not rated").
Red (3,523; the card prints 3,623) and Yellow (2,940) are in `scorecard.csv`,
not built. Stroke index 8 appears twice (2 and 14).

## Default tee

White, the only set built (4.1: no Blue on the card; White is the longest).

## The developer's calls

-   2026-10-22: build the card's 14 holes; the `piedmont` theme in
    mid-autumn; the Joaquin Miller Cabin logo; the GolfDC course map as the
    routing; tee boxes of holes 2, 5 and 14 marked on the photo
    (`reference/developer_tee_marks.jpg`).
-   Standing defaults (4.1), not asked: White tees, all water red, OSM
    boundary as OB, trees from lidar with fairway and tee-shot clearing,
    wind 2-10, card holes 5, 1, 13 and 4 (course chat's pick).

## New pipeline keys or theme

No pipeline change and no new config key; `make regress` not needed for
`pipeline/`. New theme `piedmont`: `assets-src/palettes/piedmont.json`
(pnw keys plus F0-F2 as leaf litter for `woods` / `ob_woods` through `lut`,
minimap colours) and `assets-src/trees_piedmont.py` (tulip poplar for the
narrow class: green with a gold patch, gold, green; broadleaf: oak with a
russet patch, red or orange maple, beech with a bronze patch), built with
`build_assets.py --theme piedmont` (`sprites/trees_piedmont*`). New logo
`assets-src/course_logos/rock_creek.py`.

## Open items

Numbered, with recommendations, in `data/rock_creek/validation_report.md`
("Other open items", from `report_notes.md`). In short: accept the three
flags (1, 3, 4); keep the closed holes as rough; keep the three streams red;
accept the greens' clamped tilts on this hilly site.

Requests to the design chat (shared files a course chat doesn't edit):
1. `game/tests/unit/courses.test.ts` line 37 still requires 9 or 18 holes
   (`expect([9, 18]).toContain(info.holes)`); since `design/hole-counts` a
   course of any size is allowed. Smallest change: drop that line or check
   `info.holes >= 1`.
2. Add `rock_creek` to `game/src/data/dailyRoster.ts` after the merge
   (`player.test.ts` "the real rotation" fails until then, as for every new
   course). The daily plays nine holes; for a 14-hole course that is the
   design chat's call (front nine is the natural pick).

## Lessons

-   **Check that every release file is what its name says.** The
    `data-washington-dc` release's `export.geojson` held the Bandon par-3
    courses; `map.2.osm` was Rock Creek. Look at the bounds and the course
    names before converting.
-   **A partly closed course: build the card, not the OSM.** OSM mapped 9 of
    the 18 hole lines (5 of them on the back nine, 2 of those closed) with no
    numbers. The 1927 plan fitted to the OSM greens (a 7-point affine, 15-75 m
    residuals) put every hole on the right green; the club's course map then
    confirmed it. Ask the developer for the club's map early.
-   **Lidar pads place tees on a hilly parkland course.** `propose_tees.py
    --wide` found pads within 8 % for holes 4, 6, 9/11 and 12 next to where
    the plans put the tees; the developer marked the three it couldn't.
    Yellow dots on a photo crop, read back by colour, took one message.
-   **Run the game's tee-shot checks before trusting a line.** Hole 14's
    first tee point sat under a 32 m crown and s06b dropped eight trees;
    a canopy profile along each candidate line found the open corridor.
    Hole 6's default drive rolled off a cross-slope into the woods: a bend
    8 m to the high side fixed it.
-   **The crown-shape split doesn't fit a hardwood forest.** Tall tulip
    poplars read as conifers (76 %); draw that class as the region's tall
    hardwood rather than retyping every tree.

# Pacific Dunes

Course id: `pacific_dunes` (data folder `data/pacific_dunes/`), branch `course/pacific_dunes`.

## Build summary

Built by a course chat on 2026-10-21, together with Old Macdonald and Sheep
Ranch: the three courses sit side by side on the bluff north of Bandon Dunes
and share one set of downloads (GitHub release `pacific-dunes-data`). OSM maps
all 18 holes with tees, greens, pins, fairways and bunkers. Elevation and
canopy are DOGAMI's DTM and CHM (the OLC South Coast lidar, flown in 2008), and
the OSIP 2024 orthophoto gives the gorse and drops lidar trees that are gone.
The course is built from the Green tees in the `bandon_dunes` theme (shore
pine, yellow-flowering gorse, fescue, beach), with a grey whale's tail as its
logo. Every hole is within 3 % of the card (6,130 yd against 6,142) after six
tee boxes behind the OSM line starts were assigned and four tees moved inside
their boxes. The 13 course tests (`data/pacific_dunes/tests/pacific_dunes.test.ts`)
pass when copied into `game/tests/unit/`; with the three courses' tests, 673
of 674 unit tests pass on `main` at 24e20f2 (the one failure is
`player.test.ts` "every course is in the daily rotation", which waits for the
design chat), and all 8 Playwright tests pass. Robot rounds over five seeds
scored 72-75 with no hole over par + 4. Every hole was looked at in the game
(tee, overview, a 9 m putt, an approach).

## Facts

-   **Location:** Bandon Dunes Golf Resort, Bandon, Coos County, Oregon, on
    the bluff above the Pacific north of Bandon Dunes. `state` OR. Course id
    `pacific_dunes`.
-   **Design:** Tom Doak (Renaissance Golf Design), opened 2001.
-   **UTM zone:** 10 N (EPSG:32610). World 1,280 x 1,792 m (origin 386242,
    4783092): the box of the 18 holes (807 x 1,552 m) plus 120-236 m of
    scenery. Theme `bandon_dunes`. Wind 8-16 mph (as the developer set for
    Bandon Dunes).
-   **Data** (GitHub release `pacific-dunes-data`, shared with Old Macdonald
    and Sheep Ranch; `make fetch NAME=pacific_dunes`):
    -   OSM: the developer's Overpass Turbo export of all three courses
        (`export.5.geojson`), cut to the world + 300 m by `make_osm.py` into
        `raw/overpass.geojson` (committed).
    -   DOGAMI lidar DTM and CHM, one export each for the three courses
        (1 m, EPSG:32610, feet; `_ags_5895…tif`, `_ags_3c33…tif`). Here both
        mosaics hold only the OLC South Coast project (DOGAMI's "2009"; the
        USGS reports give the flights as June-October 2008).
    -   OSIP 2024 orthophoto, two 0.5 m JPEG tiles for the three courses,
        stacked and cut per course by `make_ortho.py`. The north tile's
        original JPEG is not in the release yet (open item).
    -   The club scorecard (`Pacific-Dunes-Scorecard_2020-scaled.jpg`) and
        the resort's map (`PD_AerialMap.jpg`, look only).
-   **Water:** no penalty area in this world; all water red (standing
    default). Out of bounds is the resort polygon (w362513477), so the
    Bandon Dunes and Old Macdonald ground inside it is in play and their
    greens are wrong greens. The beach and ocean, the Practice Center and
    the driving range are out of bounds. The card's no-play zones (4, 11, 13)
    are not modelled.
-   **Trees:**
    -   2,626 lidar trees (1,862 inside the boundary), all drawn as shore
        pine (`tree_type`).
    -   129 lidar trees missing from the 2024 photo were dropped
        (`trees_need_ortho`).
    -   13,677 gorse bushes over 15.9 ha of scrub from the photo (`gorse`),
        on the gorse surface (17) inside the boundary.
    -   No tree was removed for a tee shot.

## Scorecard

Club scorecard (`Pacific-Dunes-Scorecard_2020-scaled.jpg`, release
`pacific-dunes-data`, read 2026-10-21). Every row adds up to its printed
totals; the yardages, pars and stroke index agree with GolfPass.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 4 | 3 | 4 | 4 | 4 | 4 | 36 | 3 | 3 | 5 | 4 | 3 | 5 | 4 | 3 | 5 | 35 | 71 |
| HCP | 9 | 11 | 7 | 3 | 17 | 13 | 1 | 5 | 15 | | 14 | 18 | 6 | 2 | 16 | 10 | 12 | 8 | 4 | | |
| Green | 304 | 335 | 476 | 449 | 181 | 288 | 436 | 369 | 379 | 3217 | 163 | 131 | 507 | 390 | 128 | 504 | 338 | 189 | 575 | 2925 | 6142 |
| Built | 303 | 332 | 481 | 459 | 176 | 279 | 433 | 360 | 376 | 3199 | 168 | 128 | 507 | 380 | 131 | 508 | 334 | 191 | 583 | 2930 | 6129 |

Men's ratings and slopes: Black 6,633 yd 73.2/143, Green 70.8/135, Gold
5,775 yd 68.9/131, Orange 5,088 yd 65.8/126, Royal Blue 3,920 yd 61.5/113.
The women's figures are in `course_config.json`. Black, Gold, Orange and
Royal Blue are in `scorecard.csv` but not built.

## Default tee

Green (COURSE_BUILD.md 4.1: the card has no Blue; Green is the set closest
to 6,300 yd). The developer kept Green on 2026-10-21.

## The developer's calls

-   2026-10-21: the standing defaults; Green tees kept; the logo (a grey
    whale's tail, the course chat's suggestion); one shared release for the
    three courses.
-   Inherited from Bandon Dunes (2026-10-20): wind 8-16 mph, the
    `bandon_dunes` theme with penal gorse.

## New pipeline keys or theme

None. The course uses keys and the theme Bandon Dunes added (`gorse`,
`tree_type`, `trees_need_ortho`, `cliff_sand_slope_pct`, `beach_max_m`,
theme `bandon_dunes`). `pipeline/` is untouched, so `make regress` was not
needed.

Files outside the four course folders (all new, per course, the developer
agreed 2026-10-21): `assets-src/course_logos/pacific_dunes.py`,
`game/public/sprites/logos/pacific_dunes.png`,
`game/public/sprites/cards/pacific_dunes.png`,
`game/public/sprites/title/pacific_dunes.png`.

## Requests to the design chat

1.  Add Pacific Dunes to the daily rotation (`dailyRoster.ts`) and move
    `data/pacific_dunes/tests/pacific_dunes.test.ts` into `game/tests/unit/`.
2.  `assets-src/course_cards.py` draws trees.json `c: 3` bushes from the
    flowering-shrub sheet, not the theme's own (`course.json` `shrubs`), so
    the cards of the `bandon_dunes` courses (Bandon Dunes' too) show pink
    shrubs where the game draws yellow gorse. Smallest change: load
    `sprites/<course.json shrubs>.png/json` when it is set.

## Open items

Details are in `data/pacific_dunes/validation_report.md`.

1.  **Tee boxes picked by the course chat on 4, 8, 12, 15, 16 and 17:**
    mapped boxes behind the OSM line starts (which are forward tees), each
    within 2.3 % of the Green card and checked on the photo. Recommend
    keeping them.
2.  **Gorse extent and look** (13,677 bushes): from a photo classifier, as at
    Bandon Dunes. Recommend playing a few holes, then saying whether it is
    too dense.
3.  **Course card hole 13:** the green on the bluff with the beach below.
    The course chat's pick; the developer can change it.
4.  **The north photo tile's JPEG** goes in the release (the build used the
    copy sent in the chat); then `release.json`'s last entry gets its name
    and hash.

## Lessons

The three courses were built together; the lessons common to them are here,
the course-specific ones in `old_macdonald.md` and `sheep_ranch.md`.

-   **Neighbouring courses can share one set of downloads, and one release.**
    `release.json` names a single release tag, so each course's file can name
    the same one: DTM and CHM as one export each for all three (copied as
    downloaded, so the hashes are stable), the photo as two tiles that every
    course stacks and cuts to its own world. No pipeline change.
-   **DOGAMI `exportImage` with `f=image` failed (HTTP 500) for a 2,200 x
    4,200 export; `f=json` worked** (the JSON page links the finished .tif).
    WebFetch can call the service: `.../ImageServer/identify?geometry=x,y&
    geometryType=esriGeometryPoint&returnCatalogItems=true&f=json` (x, y in
    the service's Oregon Lambert feet) lists every project at a point with
    its value there, which settles the lidar's vintage before asking for
    anything. At Bandon the 2020 South Coast item covers the area on paper
    but holds no data.
-   **Lidar older than the course.** The 2008 flight predates Old Macdonald
    (2010) and Sheep Ranch (2020). Greens are shaped by script and tees
    levelled anyway; `trees_need_ortho` drops the trees that are gone.
-   **Measure the OSM line starts against every column of the card before
    placing tees.** Old Macdonald's and Sheep Ranch's lines start on the back
    tees (totals within 3 % of Black); placing "Green" tees ahead on mown
    grass from the photo was wrong, and the developer saw it at once ("the
    tees are at the end of the red line"). Ask what the line starts are when
    a course's lines all run long against the default set.
-   **OSM's line starts are not always the tees.** Pacific Dunes' lines start
    at forward boxes; the mapped back boxes 54-76 m off the line (outside
    s06's 25 m search) match the card. Measure every box within 260 m.
-   **A double green mapped as one polygon with a pin for each hole** gets
    the same pin for both holes in s06 (nearest pin to the green) and putting
    views centred on the whole green, outside which one pin falls. Cut it
    along the perpendicular bisector of the two pins (`split_double_greens.py`,
    as at Langdon Farms).
-   **`make_edits.py` world test: test in the course EPSG.** A lon/lat
    bounding box of the world is larger than the world and kept a green
    just outside it, and s09 crashed on it (negative raster size).
-   **Course helpers are copied into each course folder** (`make_osm.py`,
    `make_ortho.py`, `make_edits.py`): a course chat writes no shared file,
    and each course stays rebuildable on its own.

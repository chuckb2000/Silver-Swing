# The Reserve Vineyards & Golf Club (North and South)

## Build summary

Built 2026-11-12/13 by a course chat on `course/reserve`: data folder `reserve`, one world,
two layouts `reserve_north` and `reserve_south`, grouped as one place like Pumpkin Ridge.
Green tees (the longest) built and the default on both. North 6,742 yd built against the
card's 6,840; South 6,990 against 7,172. All 36 holes pass or flag except North 13 and
South 12: short, accepted by the developer. New theme `reserve`, a club logo and one per
course. Pinned (`data/reserve/pipeline_pin.json`). A `--fresh` rebuild changes no committed
file.

## Facts

-   **Location:** 4805 SW 229th Ave, Aloha, Washington County, Oregon. The club's site
    also gives 4805 SE Century Blvd, Hillsboro. The courses lie on the Tualatin Valley floor
    south of TV Highway, with Meriwether National Golf Course to the west and farmland and
    houses around. Elevation 41-68 m.
-   **Design:** South by John Fought (1997), North by Bob Cupp (1998) (Wikipedia; the
    club's site). The North is links-style, with native grass, ponds, a creek and a triple
    green for 1, 8 and 17. The South is parkland, with firs and oaks, white-sand bunkers and
    a double green for 11 and 17.
-   **UTM zone:** 10N (EPSG:32610). World 1,792 x 2,048 m from (505192, 5035906). Theme
    `reserve`.
-   **Data** (fetched by the GitHub Actions workflow; release `data-reserve`):
    -   OSM Overpass export (`raw/overpass.geojson`). One `leisure=golf_course` polygon
        covers both courses (w136348508). It maps every green and tee box, but only one hole
        line: North 1.
    -   USGS 3DEP 1 m DEM, OR_PortlandMetro_B24 (tile x50y504). Clipped and kept in git
        (`raw/usgs_b24_dem_1m.tif`).
    -   DOGAMI canopy height model, OLC Metro 2014, in two halves joined by `make_chm.py`.
        Trees are kept only where the 2024 photo still shows canopy.
    -   OSIP 2024 photo, 0.5 m, in four quarters (`make_ortho.py`).
    -   The 2024 3DEP point cloud was not used. rockyweb.usgs.gov sent it at about 1 MB a
        minute, and the USGS S3 bucket has no copy (`DATA_REQUEST.md`).
-   **Routing** (`routing_spec.json`, `make_routing.py`; developer confirmed 2026-11-13):
    each hole runs from its back-most mapped tee box to its green, with bends on five
    doglegs (N2, N7, N13, N17, S17). OSM's North 1 line is kept. Every hole line carries
    `layout`.
-   **Shared greens**, cut in two by a line (as at Langdon Farms):
    -   N8 plays to the NE lobe and N17 to the W lobe of the boomerang green at the pond's
        tip. North 1's green, mapped on its own beside it, completes the triple green.
    -   S17 plays to the N half and S11 to the S half of the double green.
    -   S3 plays to the E end and S5 to the W end of one long green.
-   **South 16's tees:** not in OSM, and not North 18's boxes (developer). The four raised
    pads in the strip south of South 15's green, from the DEM (`make_s16_tees.py`), match
    the card's Green/Black/Tan/Red within 2 %.
-   **Water:** every penalty area is red (standing default):
    -   OSM's eight `golf=water_hazard` areas, set red with `penalty=red`.
    -   Ettinger Reservoir and four basins on the North creek (`red_water_osm`).
    -   The North creek's channel from the DEM (`propose_channels.py`, 7 stream lines).

    The wet meadow along that creek and a marsh east of the South are not penalty areas:
    they play as rough on their own ground (`flatten_wetlands: false`). The driving range
    is out of bounds, and so is everything outside the polygon. The range target greens and
    Meriwether's lines and polygon are dropped.
-   **Trees:** 2,068 on the course (10,511 in the world): 3,550 conifer and 6,961
    deciduous, typed by crown shape. Another 1,281 trees from the 2014 canopy model were
    dropped because the 2024 photo shows no canopy there. Two were removed for tee shots:
    a 13 m tree 17 m in front of North 8's tee, and a 33 m tree 65 m along North 13's
    drive.
-   **Native grass:** about 25.6 ha, read from the photo (`make_fescue.py`, Pumpkin Ridge's
    rule). It is drawn in straw tones and plays as rough.

## Scorecard

The club's own cards (reservegolf.com/north-course and /south-course), read 2026-11-12;
every row adds up to the printed totals. Men's handicaps. GolfPass agrees on every Green
yardage. Its South Combo row differs on holes 9, 13, 14 and 15; that row isn't built.

| North | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | Tot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 3 | 4 | 5 | 72 |
| Hcp | 7 | 9 | 15 | 5 | 17 | 1 | 11 | 3 | 13 | 12 | 18 | 6 | 8 | 16 | 2 | 14 | 10 | 4 | |
| Green | 515 | 457 | 166 | 327 | 198 | 600 | 307 | 635 | 425 | 377 | 144 | 567 | 335 | 185 | 436 | 206 | 459 | 501 | 6840 |
| Built | 510 | 447 | 165 | 328 | 199 | 590 | 303 | 628 | 425 | 374 | 148 | 561 | 307 | 184 | 417 | 204 | 453 | 500 | 6742 |

| South | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | Tot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 5 | 4 | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 5 | 4 | 4 | 5 | 72 |
| Hcp | 11 | 17 | 3 | 9 | 15 | 1 | 13 | 7 | 5 | 6 | 16 | 14 | 12 | 18 | 2 | 8 | 10 | 4 | |
| Green | 381 | 205 | 559 | 377 | 337 | 605 | 235 | 487 | 413 | 479 | 208 | 340 | 418 | 176 | 567 | 334 | 473 | 578 | 7172 |
| Built | 370 | 200 | 544 | 368 | 319 | 594 | 235 | 481 | 409 | 474 | 203 | 290 | 399 | 176 | 563 | 331 | 468 | 567 | 6990 |

Ratings/slopes (the club): North Green 73.2/140, Black 71.4/129, Combo 69.6/129, Tan
68.5/121; South Green 74.6/144, Black 72.9/137, Combo 70.6/133, Tan 69.7/128. Only Green is
built (`tee_sets` in course_config.json carries the rest).

## Default tee

Green on both (standing default 4.1: the longest set).

## The developer's calls

-   2026-11-12: made the repo public so the fetch workflow can run. Its first run failed on
    a GitHub billing limit.
-   2026-11-13: the routing and all three shared greens are right as proposed. Holes over
    8 % short are fine (N13, S12). South 16 does not play from North 18's boxes; its tees
    are in the circled strip south of South 15's green.
-   "This course has a lot of double greens": handled as at Langdon Farms. The data shows
    three shared greens covering seven holes, with North 1's green completing the triple.

## New pipeline keys or theme

-   Theme `reserve` (`assets-src/palettes/reserve.json`, `assets-src/trees_reserve.py`):
    high summer in Tualatin Valley wine country, as the July 2024 photo shows it.
    -   Turf in warm green; native grass in blonde straw (F0-F2); white sand.
    -   Green-teal ponds; dry gold fields round the course; claret roofs.
    -   Douglas fir, plus Oregon white oak (dark olive, a sun-faded patch), bigleaf maple
        and Oregon ash by deciduous variant.
-   Logos (original drawings):
    -   `reserve`, the place card: vine rows up a hill to a lone white oak, with a pin.
    -   `reserve_north`: a red-winged blackbird on a cattail.
    -   `reserve_south`: an Oregon white oak acorn on lobed leaves.

    Cards: North 3 (over the island pond), rotating 17, 8, 18; South 17 (the double green,
    creek left), rotating 7, 3, 14 (`assets-src/cards/reserve_*.json`).
-   No new pipeline keys. Course scripts: `make_routing.py`, `make_s16_tees.py`,
    `make_fescue.py`, `make_ortho.py`, `make_chm.py`.

## Requests to the design chat

1.  Add `reserve_north` and `reserve_south` to the daily rotation (`make land`).
2.  The seam on split shared greens (Old Macdonald request 2) shows here on three greens.
    The robot took 5 putts on North 17 and 6 on South 17, putting across the cut.
3.  `build.py` skipped s05 after the `chm` key was added (only s00 reran), so the trees
    stayed on the OSM fallback until `ARGS=--fresh`. s05's reading of `build/chm_1m.tif`
    seems not to be tracked.
4.  `smoke.spec.ts` "course data is exact when the browser adds noise" fails on this
    branch's base with the Reserve courses removed too. It loads Aberdeen (the first
    course): obInside 68,428.

## Open items

Details are in `data/reserve/validation_report.md`.

1.  **North 13** 307 vs 335 (−8.5 %) and **South 12** 290 vs 340 (−14.8 %): no box is
    mapped behind the back tees. The developer accepted them (2026-11-13).
2.  **Flags (3–8 % short):** N15 417/436, S5 319/337, S13 399/418. Accepted.
3.  **Trees:** the canopy model is from 2014. Young trees planted since are missing (the
    photo filter only removes trees). The 2024 point cloud can replace it in one rebuild
    when it can be fetched.
4.  **Removed for tee shots:** a 33 m tree 65 m along North 13's drive (s06b). Recommend
    keeping it removed. Say if the dogleg should play round it.

## Lessons

-   **Ask what the lidar buys before waiting:** the 2024 point cloud came at 1 MB a minute
    from rockyweb, and S3 has no copy. A canopy model from the state service (in halves
    under about 5 MP) plus the photo filter took ten minutes.
-   **No hole lines, every tee mapped:** the card sets the routing. Each hole's boxes sit on
    one line to its green at the card's Green/Black/Tan/Red. The boxes' long sides point at
    the green, which settles shared boxes. The routing and the shared greens were right first time; only South 16's tees were wrong (it shared North 18's boxes in the proposal).
-   **Tees in shade:** the bare-earth DEM shows tee pads that the photo hides. Look for
    raised, flat rectangles where the developer points.
-   **An extra zero in a URL costs a run:** copy file names from the listing, don't
    rebuild them.

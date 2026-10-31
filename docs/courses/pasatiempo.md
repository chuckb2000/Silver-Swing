# Pasatiempo Golf Club

Course id: `pasatiempo` (data folder `data/pasatiempo/`), branch `course/pasatiempo`.

## Build summary

Built by two course chats on 2026-10-30/31 while the developer was away (his rule
for this build: make the call, log it, keep going). OSM maps the whole course: 18
hole lines whose pars match the card, every green and pin, the fairways and 91
bunkers, and most tee boxes. Elevation is the USGS 3DEP 1 m DEM (Santa Cruz County
2020); trees come from the 2020 USGS lidar (12 tiles, class 1 only), checked against
the May 2022 NAIP. Two tee sets are built, Gold (default, the longest) and White.
Every hole is within 3 % of the card after tee moves inside the mapped boxes, except
15 Gold (+3.3 %, accepted): Gold 6,445 yd against 6,495, White 6,104 against 6,093.
New theme `pasatiempo`; the logo is a footbridge over a barranca. Every hole was
looked at in the game (White tees: each tee shot, the overview and the first putt).
Test counts on the branch are in the pull request.

## Facts

-   **Location:** 20 Clubhouse Road, Santa Cruz, Santa Cruz County, California, in
    the hills about 4 km above Monterey Bay. `state` CA. Course id `pasatiempo`.
-   **Design:** Alister MacKenzie, opened 8 September 1929 for Marion Hollins
    (bunkers shaped by Robert Hunter and Paddy Cole). Restored by Tom Doak and Jim
    Urbina 1996-2007; every green and bunker rebuilt by Jim Urbina 2023-24
    (scouting notes, `docs/scouting/pasatiempo/` on `origin/scouting/new-courses`;
    unverified). The front nine falls toward the bay and climbs back; the back nine
    crosses the barrancas.
-   **UTM zone:** 10 N (EPSG:32610). World 1,536 x 2,304 m, origin (585737,
    4094438): the OSM boundary (relation 13921737, 1,051 x 2,056 m) plus 120 m of
    scenery. Over the 2,048 m guideline (open item 2). Theme `pasatiempo` (new).
    Wind 2-10 mph.
-   **Data** (GitHub release `data-pasatiempo`, all fetched by the GitHub Actions
    workflow; `make fetch NAME=pasatiempo`):
    -   OSM: the standard Overpass export (`raw/overpass.geojson`, committed), plus a
        power-line and bridge export (looked at, not built from).
    -   Elevation: USGS 3DEP 1 m DEM, project CA_SantaCruzCounty_2020_A20, tile
        x58y410, clipped by `intake.py raster`.
    -   Lidar: USGS LPC CA_SantaCruzCounty_2020_A20, 12 tiles of 2,500 ft from
        rockyweb, flown 2-14 April 2020, NAD83(2011) California zone 3 US ft, LAS
        1.4 with the CRS in an EVLR; class 1 (unclassified) holds the vegetation and
        the buildings. Each tile is clipped to the world + 100 m by `intake.py laz`
        into `raw/laz/pasatiempo_<tile>.laz` (`--keep-evlrs`); one `release.json` entry per tile.
    -   Photo: USDA NAIP, 19 May 2022, 0.6 m, from the USGS National Map service,
        placed by `intake.py ortho` (`raw/naip2022.tif`, committed). A newer NAIP
        from the USDA service failed to download (connection reset).
    -   Card: the club's printed Gentlemen's Card (`pasatiempo_scorecard_1.jpg`,
        `_4.jpg`) and its scorecard page.
-   **Water:** two red penalty areas along the barrancas, from the channel the DEM
    shows along the OSM streams: Pasatiempo Creek (13 left, between 14/15 and 16,
    short right of the 16th green) and the stream in front of the 10th tee and the
    18th green. `flatten=no`. Out of bounds is the OSM boundary and the practice
    range east of hole 1. Roads inside the boundary are cart paths.
-   **Trees:** 22,773 from the 2020 lidar (1,258 inside the boundary); 1,517 crowns
    the 2022 photo doesn't show dropped (`trees_need_ortho`), 618 tops on mapped
    buildings, 9 in bunkers and pools; power lines taken out first (`remove_wires`).
    None more than 2 m inside a fairway (`trees_off_fairways_m`), and every tee shot
    at the middle of the fairway clears the trees. Types from crown shape only; the theme draws them as Monterey
    pine, redwood, eucalyptus, coast live oak and Monterey cypress.

## Scorecard

The club's printed Gentlemen's Card (Golf ScoreCards Inc., printed 4/2026; images from
pasatiempo.com fetched by the workflow 2026-10-31). Every row adds up to its printed
totals; par and handicap are the men's rows. "Built" is the yardage the game plays.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 4 | 3 | 5 | 4 | 3 | 5 | 35 | 4 | 4 | 4 | 5 | 4 | 3 | 4 | 4 | 3 | 35 | 70 |
| HCP | 4 | 8 | 2 | 16 | 6 | 12 | 10 | 14 | 18 | | 5 | 1 | 15 | 13 | 7 | 17 | 3 | 9 | 11 | | |
| Gold | 458 | 430 | 222 | 378 | 190 | 567 | 347 | 176 | 492 | 3260 | 437 | 390 | 371 | 532 | 426 | 142 | 392 | 372 | 173 | 3235 | 6495 |
| Built Gold | 458 | 420 | 216 | 369 | 191 | 565 | 338 | 177 | 490 | 3224 | 437 | 380 | 374 | 532 | 424 | 147 | 387 | 363 | 177 | 3221 | 6445 |
| White | 440 | 403 | 200 | 360 | 172 | 510 | 335 | 158 | 471 | 3049 | 437 | 377 | 371 | 484 | 382 | 120 | 367 | 361 | 145 | 3044 | 6093 |
| Built White | 442 | 410 | 195 | 351 | 176 | 522 | 325 | 156 | 483 | 3060 | 437 | 373 | 374 | 496 | 375 | 117 | 370 | 355 | 147 | 3044 | 6104 |

Ratings/slopes (men's): Gold 72.7/143, Gold/White 71.5/139, White 70.7/138,
White/Green 69.5/135, Green 68.5/133. Gold/White, White/Green and Green, and Stymie's
Team Match, Green/Hollins and Hollins rows (not on the gentlemen's card, unverified),
are in `scorecard.csv`, not built. The card's handicaps differ from Stymie/GolfPass on
6/7 and 12/13 (swapped); the card is used.

## Default tee

Gold, the longest set (main, developer 2026-10-31: `courses.test.ts` requires it).
The overnight rule had White (the second set, as there is no Blue); White is built
and playable.

## The developer's calls

-   2026-10-30 (overnight rules): build the back set and the next one forward, both
    playable; make stop-and-ask calls and log them; full permission for a new theme
    and an original logo; GitHub Actions first for data.
-   2026-10-31: the default tee is the longest set (all courses).

### Developer's calls pending

Calls the course chats made under the overnight rule; the developer has not seen
them. Numbers refer to "Other open items" in `data/pasatiempo/validation_report.md`,
where each has its facts, options and a recommendation.

1.  Default tee Gold instead of the hand-off's White (item 1).
2.  World 2,304 m tall, over the 2,048 m guideline (item 2).
3.  Hole 18: the long teeing ground cut at 152 yd; White plays its front piece
    (147 yd against 145), Gold its back (item 4). Before: White +22 %.
4.  Hole 14 White tee from a polygon OSM tags as a bunker (item 5).
5.  3 Gold, 4 Gold and 15 White fail on the box centre and pass after a tee move
    along their long boxes (item 6).
6.  The barrancas on 10/18 and 13-16 red (the card makes 18 yellow) (item 9); the
    11th's barranca not drawn (no data) (item 10).
7.  The mown strip east of hole 1 is the practice range, out of bounds (item 11).
8.  The photo check against the 2022 NAIP (item 13), trees up to 76 m (item 14).
9.  Card hole 16, rotating with 15, 18 and 3; theme and logo (item 19).

## New pipeline keys or theme

-   No new config key.
-   No change to `pipeline/intake.py`: main's `intake.py laz --keep-evlrs` (merged 2026-10-31) carries the
    tiles' CRS, which they keep in an EVLR; every `release.json` lidar entry uses it.
-   `pipeline/propose_tees.py`: skips a tee mapped as a point when drawing (2 lines;
    Pasatiempo 12).
-   New theme `pasatiempo`: `assets-src/palettes/pasatiempo.json` and
    `assets-src/trees_pasatiempo.py` (Monterey pine, redwood, eucalyptus; coast live
    oak, Monterey cypress). Logo `assets-src/course_logos/pasatiempo.py`.
-   Course scripts in `data/pasatiempo/`: `clip_channels.py`, `make_tee14.py`,
    `make_tee18_split.py`, `make_range.py` (helpers for `proposed/`, not make steps).

## Open items

Numbered in `data/pasatiempo/validation_report.md` ("Open items" from the pipeline,
then "Other open items"), each with a recommendation. The ones that need the
developer are listed above under "Developer's calls pending".

## Lessons

-   **USGS LAS 1.4 tiles can keep their CRS in an EVLR.** Clip them with
    `intake.py laz ... --keep-evlrs`, or `make intake` reports "no CRS" for every clip.
-   **rockyweb lidar is slow** (about 18 minutes a 110-170 MB tile on the runner);
    twelve tiles took about three hours. Start the lidar first and build without it.
-   **Vite's dev server stops serving a course's terrain after a rebuild** (the PNGs
    come back as index.html, and the game shows the missing-texture square). Restart
    `npx vite` after every `make course` before an in-game look.
-   **A long teeing ground shared by two sets**: cut it at the distance between the
    two cards (Cypress Point's method) rather than accepting a fail.
-   **Class-1-only lidar with a photo**: `trees_need_ortho` removed most roofs of
    unmapped houses as well as trees cut since the flight.
-   **The USDA APFO NAIP service resets connections from GitHub runners**; the USGS
    National Map NAIP service works but serves only 2022 here.

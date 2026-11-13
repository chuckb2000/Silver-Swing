# Columbia Edgewater Country Club

Course id: `columbia_edgewater` (data folder `data/columbia_edgewater/`), branch `course/columbia_edgewater`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green and pin, 32 fairway pieces, 60 tee boxes, 51 bunkers and six penalty areas
(the slough-fed ponds and channels), plus the club's par-3 Mason course and the
neighbouring Riverside Golf and Country Club. OSM numbers the nines the other way round
from the card; the card's numbering is used (open item 1). Elevation and trees come from
DOGAMI's bare-earth and canopy-height mosaics (OLC Metro 3DEP 2019 lidar), the photo
checks from OSIP 2024, all fetched by the GitHub Actions workflow. Tee set built: Black
(the longest), the default. New theme `columbia_edgewater`; the logo is a Columbia River
sternwheeler. After the virtual tees moved within their boxes, 17 holes are within 3 % of
the card and hole 6 is -7.9 % (flag, a long strip of a box); 6,675 yd built against 6,823.

## Facts

-   **Location:** 2220 NE Marine Drive, Portland, Multnomah County, Oregon, on the old
    Columbia River bottomland between Marine Drive (the river) and the Columbia Slough,
    next to Riverside Golf and Country Club and west of Portland International Airport.
    `state` OR. Course id `columbia_edgewater`.
-   **Design:** A. Vernon Macan (1925); later work by Bob Cupp (GolfPass, Stymie). Host of
    the LPGA's Portland Classic for many years.
-   **UTM zone:** 10 N (EPSG:32610). World 1,280 x 1,536 m, origin (526941, 5048402).
    Theme `columbia_edgewater` (new). Wind 1-7 mph (inland Pacific Northwest).
-   **Data** (release `data-columbia_edgewater`; `make fetch NAME=columbia_edgewater`;
    fetched by the GitHub Actions workflow 2026-11-13):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: DOGAMI DIGITAL_TERRAIN_MODEL_MOSAIC at 1 m, feet (newest project
        OLC_METRO_3DEP_2019);
    -   canopy: DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC, same flight;
    -   photo: OSIP 2024 at 0.5 m (checks only);
    -   scorecard: stymie.golf, with golflink.com's Black row (third-party, below).
-   **Water:** six OSM lateral penalty areas (the slough-fed ponds and channels on 4, 9,
    17 and elsewhere), all red. A 144 m2 swimming pool inside the boundary plays as rough
    (it is the club's pool, not a hazard). Out of bounds: the OSM boundary; Riverside's
    boundary, hole lines and golf features are dropped (`edits.json`); the range is out
    of bounds. The par-3 Mason course's greens are wrong greens (relief required).
-   **Trees:** 4,962 from the DOGAMI canopy model (1,601 inside the course); 11 dropped on
    playing surfaces; s06b dropped one 31 m tree 29 m in front of the 8th Black tee. Types
    from crown shape only: 1,155 conifer, 3,807 deciduous.

## Scorecard

Third-party, unverified: stymie.golf's card (par, men's handicap and yardage per hole for
every tee set, ratings), read 2026-11-13; golflink.com's Black row agrees hole for hole.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 5 | 3 | 4 | 4 | 3 | 4 | 4 | 36 | 4 | 3 | 4 | 4 | 5 | 4 | 4 | 3 | 4 | 35 | 71 |
| HCP | 9 | 13 | 5 | 17 | 11 | 1 | 15 | 3 | 7 |  | 6 | 16 | 10 | 2 | 14 | 12 | 4 | 18 | 8 |  |  |
| Black | 514 | 347 | 594 | 181 | 361 | 400 | 204 | 420 | 394 | 3415 | 378 | 186 | 424 | 440 | 520 | 403 | 460 | 141 | 456 | 3408 | 6823 |
| Built | 501 | 345 | 579 | 176 | 358 | 368 | 204 | 424 | 384 | 3339 | 369 | 181 | 420 | 429 | 507 | 399 | 448 | 138 | 445 | 3336 | 6675 |

Ratings (Stymie, men): Black 6,823 yd 73.4/134, Black/Blue 6,578 72.5/133, Blue 6,380
71.2/132, Blue/White 6,190 70.2/127, White 5,985 69.0/125, White/Red 5,660 67.9/123, Red
5,365 66.4/120. Only Black is built; the others are in `scorecard.csv`.

## Default tee

Black: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM boundary,
    range OB, fairway trees removed, wind 1-7 mph), listed in the intake message.

Course chat's calls (listed for the developer):

-   The nines renumbered to the card (OSM 1-9 are the card's 10-18 and the other way
    round; the lengths match hole for hole, `edits.json`).
-   Riverside's boundary, hole lines and golf features dropped; two `golf=path` ways
    copied as cart paths.
-   Card hole: the par-3 17th over the pond; rotation 17, 4, 9, 2.

## New pipeline keys or theme

-   No new config key; no pipeline change.
-   New theme `columbia_edgewater`: `assets-src/palettes/columbia_edgewater.json` (cool
    sage-teal turf, warm tan sand, murky green-slate slough water) and
    `assets-src/trees_columbia_edgewater.py` (the pnw shapes recoloured: blue-green Douglas
    fir; silvery black cottonwood, fresh Oregon ash and olive white oak). Sheets
    `game/public/sprites/trees_columbia_edgewater*`.

## Open items

1.  **Which nine is the front?** OSM's hole numbers (and its handicap tags) run the other
    way round from every card found; the cards are third-party. Recommend the card's
    numbering (built) unless the club's printed card says otherwise.
2.  **Hole 6 -7.9 % (flag):** a long strip of a tee box whose deepest point is short of
    the card. Recommend accepting.
3.  **Third-party card.** Recommend a photo of the printed card when convenient.
4.  **The Mason par-3 course** inside the boundary plays as part of the big course (its
    greens are wrong greens). It could be a second layout later if wanted (no hole lines
    in OSM).

## Lessons

-   **Check the card against the OSM lengths, not just the hole count:** here the pars
    and lengths matched only after swapping the nines.
-   **A neighbouring club inside the download box** brings its own boundary, holes,
    greens and ponds: drop them all in `edits.json`, not just the boundary.

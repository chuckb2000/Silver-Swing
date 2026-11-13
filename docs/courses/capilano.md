# Capilano Golf and Country Club

Course id: `capilano` (data folder `data/capilano/`), branch `course/capilano`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green and pin, 23 fairways, 52 tee boxes, 79 bunkers and three ponds. The 13th
hole line ran on past its green to a stray pin; a copy ends it on the green (it then
matches the card). Elevation and trees come from Natural Resources Canada's HRDEM (DTM
and DSM, 1 m) through the NRCan datacube WCS, fetched by the GitHub Actions workflow; no
open orthophoto was found for West Vancouver. Tee set built: Gold (the longest), the
default. The course is 1.9 km north to south, so the world is held to 2,048 m with 68 m of
scenery at each end. New theme `capilano`; the logo is the Lions, the twin peaks above
West Vancouver. After the virtual tees moved within their boxes, 16 holes are within 3 %
of the card and holes 4 (-5.7 %) and 15 (-3.4 %) are flags; 6,603 yd built against 6,723.

## Facts

-   **Location:** 420 Southborough Drive, West Vancouver (British Properties), British
    Columbia, Canada, on the lower slope of Hollyburn Mountain above the Lions Gate, cut
    through coastal rainforest, with the Capilano River canyon along its east side.
    `state` BC. Course id `capilano`.
-   **Design:** Stanley Thompson, opened 1937 (some sources 1938), for the Guinness
    family's British Pacific Properties (planetgolf.com, 1golf.eu).
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 2,048 m, origin (490396, 5465362).
    Theme `capilano` (new). Wind 1-7 mph (sheltered forest slope).
-   **Data** (release `data-capilano`; `make fetch NAME=capilano`; fetched by the GitHub
    Actions workflow 2026-11-13):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: NRCan HRDEM DTM 1 m (WCS coverage `dtm`), CGVD2013 m; lidar projects
        BC-Vancouver_Island_Sunshine_Coast_2018 and BC-Lower_Mainland_2016;
    -   canopy: the same projects' DSM (coverage `dsm`), canopy = DSM - DTM;
    -   scorecard: GolfPass (third-party, below).
-   **Water:** three OSM ponds, all red. Hadden Creek (OSM `layer=-1`, imported from
    NRCan's hydro network, probably culverted) passes within 30 m of hole lines and is not
    a penalty area (open item 3). Out of bounds: the OSM boundary; the range is out of
    bounds.
-   **Trees:** 8,296 from the HRDEM surface model (1,575 inside the course), median 21.5 m;
    6 dropped on playing surfaces; s06b found no tee shot to clear. Types from crown shape
    only: 3,325 conifer, 4,971 deciduous. The tallest crowns (65-71 m) stand on the rim of
    the Capilano canyon at the world's east edge, outside the boundary (`checks.json`
    allows 72 m).

## Scorecard

Third-party, unverified: GolfPass (course 26797), par, men's handicap and Gold/Blue/White
yardages per hole, read 2026-11-13; each row adds up to the page's totals.
allsquaregolf.com gives the same card in metres (hole 1 shorter).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 3 | 5 | 4 | 4 | 4 | 3 | 36 | 4 | 3 | 4 | 4 | 3 | 4 | 3 | 4 | 5 | 34 | 70 |
| HCP | 4 | 10 | 16 | 14 | 18 | 6 | 2 | 12 | 8 |  | 3 | 15 | 7 | 1 | 17 | 9 | 13 | 5 | 11 |  |  |
| Gold | 460 | 425 | 481 | 161 | 521 | 422 | 440 | 375 | 175 | 3460 | 436 | 166 | 370 | 400 | 153 | 427 | 247 | 490 | 574 | 3263 | 6723 |
| Built | 448 | 424 | 484 | 152 | 518 | 418 | 429 | 367 | 176 | 3416 | 425 | 163 | 361 | 390 | 150 | 412 | 244 | 485 | 558 | 3188 | 6604 |

Ratings (GolfPass, men): Gold 73.0/133 (printed against 6,706 yd), Blue 6,448 yd
71.7/131, White 6,187 70.6/125. Only Gold is built; Blue and White are in
`scorecard.csv`.

## Default tee

Gold: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM boundary,
    range OB, fairway trees removed), listed in the intake message.

Course chat's calls (listed for the developer):

-   The world held to 2,048 m north-south (68 m of scenery beyond each end) rather than
    asking to go over the limit.
-   The 13th hole line copied to end on its green (`proposed/hole13.geojson`); the stray
    pin 58 m beyond it dropped.
-   Wind 1-7 mph, not the coastal 2-10 proposed in the intake: the course is sheltered in
    forest on the mountain slope.
-   `checks.json`: the 14th's default aim is skipped (OSM's woods begin a few metres behind
    the green; a perfect tee shot at the pin rolls into them).
-   Card hole: the par-3 11th; rotation 11, 8, 4, 16.

## New pipeline keys or theme

-   No new config key; no pipeline change.
-   New theme `capilano`: `assets-src/palettes/capilano.json` (dark rainforest greens,
    near-white bunker sand, cold slate water; a design, no photo to sample) and
    `assets-src/trees_capilano.py` (the pnw shapes recoloured: near-black Douglas fir and
    warmer western red cedar by variant; bigleaf maple, red alder and vine maple). Sheets
    `game/public/sprites/trees_capilano*`.

## Open items

1.  **No orthophoto.** Nothing open was found for West Vancouver, so the layout could not
    be checked against a photo. Recommend leaving it unless something looks wrong in play.
2.  **The 14th green and OSM's woods.** A perfect tee shot at the pin rolls into woods a
    few metres behind the green. Recommend playtesting it; if it is too harsh, a photo would
    let the wood's edge be checked.
3.  **Hadden Creek** is not a penalty area (it looks culverted in OSM). Recommend leaving it.
4.  **Third-party card.** Recommend a photo of the printed card when convenient.

## Lessons

-   **NRCan's WCS returns a grid of 1.0008 m pixels** for a 1 m request over these boxes;
    the pipeline reprojects it without trouble.
-   **A long, narrow course** can stay inside 2,048 m by trimming the scenery at its ends
    instead of asking to go over the limit.

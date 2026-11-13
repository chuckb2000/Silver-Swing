# Chicago Golf Club

Course id: `chicago_golf` (data folder `data/chicago_golf/`), branch `course/chicago_golf`.

## Build summary

Built 2026-11-13 from OSM (all 18 holes, greens, fairways, bunkers; 34 tees) with
three Black tees the developer traced on the tracing desk (3, 5, 8). Elevation is
the USGS 3DEP 1 m DEM. Trees come from the 3DEP lidar (IL_MidNorth_D22): 6,978
trees in the world, 610 on the course. The rough is drawn from the USDA NAIP 2023
photo (0.3 m): native fescue between the holes and a mown band beside the
fairways. The walking paths are read from the same photo. Both were approved by
the developer. Black tees only. New theme `chicago_golf`. Every hole is within 3 %
of the card: 6,929 yd against 6,950. See "Tests" for what ran.

## Facts

-   **Location:** 25W253 Warrenville Road, Wheaton, DuPage County, Illinois; flat
    prairie inside a suburban block. `state` IL. Course id `chicago_golf`.
-   **Design:** Charles Blair Macdonald (1895); rebuilt by Seth Raynor (1923).
-   **UTM zone:** 16 N (EPSG:32616). World 1,280 x 1,536 m. Theme `chicago_golf`.
    Wind 1-9 mph.
-   **Data:**
    -   OSM (Overpass, 2026-11-13; `raw/overpass.geojson` in git).
    -   USGS 3DEP 1 m DEM, tile x40y464 (IL_MidNorth_D22), clipped by `intake.py
        raster`.
    -   USGS 3DEP lidar IL_MidNorth_D22, 2,000 ft tiles in Illinois East (US feet),
        clipped per tile by `intake.py laz --keep-evlrs`.
    -   USDA NAIP 2023 (tiles m_4108815_ne and m_4108816_nw, August 2023; public
        domain), joined and warped to 0.5 m by `make_ortho.py`.
    -   All of these are in the GitHub release `data-chicago_golf`
        (`release.json`).
-   **Water:** one pond, the one the 9th and 10th play across. OSM tags it
    golf=water_hazard (yellow); a tag edit makes it red (standing default). Out of
    bounds is the OSM course boundary. The practice ground is out of bounds
    (`driving_range_is_ob`).
-   **Trees:** 6,978 from the lidar (classes 3-5, heights in US feet converted),
    610 inside the course. Types are found from crown shape only. Six were dropped
    on bunkers and the pond.

## Scorecard

The club's printed card (photo posted by golfbycoop on Instagram, 2025-08-25,
supplied by the developer 2026-11-13). Ratings are from the USGA Course Rating and
Slope Database (developer's screenshot, 2026-11-13).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 5 | 4 | 4 | 3 | 4 | 4 | 35 | 3 | 4 | 4 | 3 | 4 | 4 | 5 | 4 | 4 | 35 | 70 |
| HCP | 5 | 3 | 17 | 1 | 13 | 9 | 15 | 7 | 11 | | 16 | 6 | 4 | 18 | 14 | 10 | 2 | 12 | 8 | | |
| Black | 450 | 481 | 256 | 536 | 394 | 395 | 207 | 443 | 438 | 3600 | 139 | 410 | 462 | 180 | 351 | 393 | 525 | 465 | 425 | 3350 | 6950 |
| Built | 449 | 483 | 257 | 551 | 393 | 385 | 206 | 443 | 449 | 3616 | 136 | 401 | 467 | 175 | 341 | 384 | 514 | 466 | 430 | 3314 | 6929 |

Ratings (men): Black 74.4/141, White 72.5/137, Red 68.4/127. White (6,571) and Red
(5,664) are on the card but were not built. Third-party sites give holes 11 and 12
handicaps 4 and 6; the card's 6 and 4 are used.

## Default tee

Black: the back tees (standing default, 4.1).

## The developer's calls

All 2026-11-13.

-   Logo: the interurban station (option b).
-   Card from the club's printed card (photo) and the USGA database.
-   "Route around the block with the workflow": the lidar and the photo were
    fetched on side branches.
-   Black tee boxes for holes 3, 5 and 8 traced on the tracing desk over the
    photo (`data/chicago_golf/desk/`).
-   The fescue areas and walking paths from the photo approved ("paths and fescue
    looks great").

Course chat's calls (listed for the developer):

-   The standing defaults: Black only, every penalty area red, OB = the OSM
    boundary, the practice ground OB, fairway trees removed.
-   OSM's pin on the 7th (19 m from the green's centre) dropped; the hole uses the
    green centre so the close-up putting view covers it.

## New pipeline keys or theme

-   No new keys. Uses `ortho` and `fescue_areas`, as at Gearhart and Sandpines.
-   New theme `chicago_golf`: `assets-src/palettes/chicago_golf.json` (from
    marovitz). The fescue is olive-tawny (F0-F2), the mown band is G3-G5 (lut
    `rough_band`) and the gravel paths are K2-K4. Trees use marovitz's sheets
    (`trees_marovitz`).
-   Course scripts:
    -   `make_ortho.py`: the NAIP photo.
    -   `make_fescue.py`: the fescue, by colour.
    -   `make_paths.py`: the paths, with a ridge filter.
    -   `make_tees.py`: unmapped tees; a finder whose proposals were not used.

## Open items

1.  **Lidar tiles still missing:** see "Tests" for the state at hand-off.
2.  **Paths** are read from the photo: some faint ones are missing, and the desk
    can add them. Recommend leaving them as they are.
3.  **Conifer vs deciduous** is from crown shape only (no leaf-off photo).

## Lessons

-   **3DEP lidar in parallel:** four runs side by side got USGS's 429 (too many
    requests) and time-outs. Two runs at most, or one run with every tile.
-   **USGS IL lidar keeps its CRS in an EVLR:** `intake.py laz` without
    `--keep-evlrs` wrote clips with no CRS, and s00 found no trees. Heights are US
    feet (`laz.units` "ft").
-   **NAIP through Planetary Computer:** the STAC search (a `url` item) lists the
    tiles; the blob URLs download directly. The tiles are 2 GB, so pull them
    straight into `raw/naip/`.
-   **Paths from a photo:** fixed brightness thresholds caught mottled bare
    patches. A ridge filter (`skimage.filters.sato`) plus spur pruning finds the
    thin paths.

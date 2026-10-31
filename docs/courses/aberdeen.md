# The Course at Aberdeen

Course id: `aberdeen` (data folder `data/aberdeen/`), branch `course/aberdeen`.

## Build summary

Built overnight 2026-10-30/31 by a course chat without the developer (the developer's overnight
rules: make the calls, log them). Indiana is a new state for the game. OSM maps the whole course
(18 hole lines, 94 tee boxes, every green with a pin, fairways, bunkers, ponds); everything came
through the GitHub Actions fetch workflow: the Overpass export, the USGS 3DEP 1 m DEM and lidar of the
2017 Indiana statewide project, and a NAIP photo. Tee sets Black and Gold, default Gold; a new theme
`aberdeen` and an original logo (a sandhill crane over a cattail marsh). Black 6,755 yd built vs 6,917
card (-2.3 %), Gold 6,452 vs 6,573 (-1.8 %). One fail accepted (7 Black, -12 %, no back box mapped);
flags on 4 Black, 6 Gold, 7 Gold, 14 Black. `course_play.test.ts -t aberdeen`: 11 passed.

## Facts

-   **Location:** 245 Tower Road, Valparaiso, Porter County, Indiana: the public course inside the
    Aberdeen residential community on the south-west side of town, on the Valparaiso Moraine; woods
    and wetlands (Salt Creek's valley) to the north-east. `state` IN. Course id `aberdeen`.
-   **Design:** Dr. Michael Hurdzan, 1997 (golfataberdeen.com/course); GolfPass and golfn credit Jack
    Kidwell (Kidwell & Hurdzan). "Tree-lined fairways, preserved wetlands and rolling countryside"
    (the club).
-   **UTM zone:** 16 N (EPSG:32616). World 2,048 x 1,792 m (origin 489452, 4587000). Theme `aberdeen`.
    Wind 2-10 mph.
-   **Data:** OSM (Overpass export by the fetch workflow 2026-10-31, `raw/overpass.geojson` in git);
    USGS 3DEP 1 m DEM, IN_Indiana_Statewide_LiDAR_2017_B17 tiles x48y459 and x49y459 (release
    `data-aberdeen`; clipped by `data/aberdeen/clip_dem.py` to `raw/usgs_dem_2017_1m_clip.tif`, in git);
    3DEP lidar of the same project, 4 tiles flown 12-19 April 2018, leaf-off, class 1 only (release,
    clipped by `intake.py laz` through `release.json`); USDA NAIP via the USGS NAIP ImageServer
    (release, `raw/naip_06m.tif`; used for checks only).
-   **Water:** 13 ponds (golf=water_hazard) and 5 stream channels proposed from the DEM, all red.
    Out of bounds: the OSM boundary (a 6.8 ha hole in it at local (525, 985) is OB) and the range.
-   **Trees:** 30,232 lidar crowns in the world (4,912 inside the course), all drawn deciduous
    (`tree_type`); 4,250 roof crowns dropped (`roof_last_share`), 954 power-line crowns dropped
    (`not_trees_areas`), 12 cleared from tee shots by s06b (seven on 13 Gold, two on 1 Black, two on 7,
    one on 12 Black).

## Scorecard

GolfingRecord (golfingrecord.com, retrieved 2026-10-31), unverified third-party; the club's site has no
card. Conflicts in `course_config.json` `scorecard_source` and `validation_report.md` item C.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 4 | 5 | 3 | 4 | 3 | 5 | 36 | 5 | 3 | 4 | 4 | 4 | 5 | 4 | 3 | 4 | 36 | 72 |
| HCP | 8 | 18 | 2 | 10 | 12 | 16 | 6 | 14 | 4 |  | 17 | 3 | 5 | 11 | 7 | 13 | 1 | 15 | 9 |  |  |
| Black | 413 | 371 | 436 | 410 | 540 | 174 | 387 | 201 | 539 | 3471 | 514 | 195 | 418 | 306 | 437 | 543 | 435 | 186 | 412 | 3446 | 6917 |
| Built Black | 407 | 368 | 434 | 387 | 530 | 172 | 340 | 197 | 533 | 3368 | 511 | 180 | 423 | 305 | 406 | 537 | 435 | 184 | 406 | 3387 | 6755 |
| Gold | 390 | 348 | 415 | 392 | 518 | 157 | 365 | 187 | 518 | 3290 | 500 | 172 | 386 | 288 | 423 | 528 | 423 | 165 | 398 | 3283 | 6573 |
| Built Gold | 385 | 344 | 415 | 387 | 507 | 145 | 341 | 180 | 512 | 3216 | 497 | 180 | 383 | 279 | 406 | 524 | 417 | 162 | 388 | 3236 | 6452 |
Ratings: Black 73.0/134, Gold 71.4/131 (built); Green 69.5/127 (6,151) and White 64.4/105 (4,949) on
the card, not built. GolfPass and 18Birdies also list Blue (5,670) and combination tees.

## Default tee

Gold: the developer's overnight rule (back tees plus the set in front when the card has no Blue).

## The developer's calls

None yet. Calls made by the course chat and pending the developer (details and options in
`data/aberdeen/validation_report.md`, "Calls made overnight"):

1.  Hole 7 Black -12 % accepted (`checks.json`), no back box in OSM or the DEM.
2.  Gold boxes tagged on holes 5, 6 and 18.
3.  GolfingRecord's card; Blue treated as not a real set; Black and Gold built, Gold default.
4.  Every tree deciduous; the transmission line's crowns removed; roofs removed.
5.  Five streams as red penalty areas from the DEM; all ponds red.
6.  Wind 2-10 mph; new theme `aberdeen`; crane logo; card greens 16, 13, 11, 7.

## New pipeline keys or theme

No pipeline change. New theme `aberdeen` (`assets-src/palettes/aberdeen.json`,
`assets-src/trees_aberdeen.py`, `game/public/sprites/trees_aberdeen*`). Keys used, all existing:
`tree_type`, `roof_last_share`, `not_trees_areas`, `trees_off_fairways_m`.

## Open items

1.  Hole 7 Black tee (screenshot or accept). 2. A photo of the club's card (Black 12, Gold 6 and 18,
whether Blue exists). 3. Confirm the streams on 13/15/17/18 hold water. 4. Confirm the calls above.

## Lessons

-   USGS rockyweb returns HTTP 429 when a run pulls many LAZ tiles; push the request again (or add
    `force`) and the missing tile comes on the next run.
-   Indiana statewide lidar is class 1 only: roofs and a transmission line read as trees. The
    multi-conductor line wasn't caught by `remove_wires` (it removed real canopy instead); a
    `not_trees_areas` strip along the right-of-way works.
-   Leaf-off last-return shares can be unimodal over hardwoods: check the histogram before trusting
    the Otsu split; `tree_type` is the fallback.
-   For in-game looks without the UI: `courses.choose(id)`, set `settings.tees[id]`, skip the name
    dialog (HTML "skip"), `teeOff()`, then `round.startHole(i)` + `startHoleIntro(false)` per hole.
    Playwright's own browser path may not match the installed one: pass `executablePath`.

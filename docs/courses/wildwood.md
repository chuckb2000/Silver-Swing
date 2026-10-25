# Wildwood Golf Course

Course id: `wildwood` (data folder `data/wildwood/`), branch `course/wildwood`.

## Build summary

Built 2026-10-24 from a complete OSM layout: 18 hole lines, 18 greens, 18 pins, 33 tee boxes,
23 fairways, 5 bunkers and 3 ponds, all inside one boundary polygon. The DOGAMI DTM and canopy
model and the OSIP 2024 orthophoto were supplied by the developer (release `wildwood-data`).
Black tees: the card has no Blue. Theme `pnw`.

The developer marked the Black tees on 6, 9, 14 and 18 in the tracing desk. Creek channels came
from the lidar and are red penalty areas (approved). Lidar trees the 2024 photo no longer shows
were dropped. Fourteen holes are within 2.5% of the card; 6, 9, 14 and 18 are short, accepted
by the developer. Built total: 5,708 yd against the card's 5,853 (−2.5%).

No pipeline change. Tests on the branch:
- `game/tests/unit/wildwood.test.ts` passes, 12 of 12.
- The full unit suite has 861 passed and 1 failed: the daily-roster check, which needs the
  design chat.
- `npm run build`, including the type check, passes.

## Facts

-   **Location:** 21881 NW St Helens Rd (US 30), Portland, Multnomah County, Oregon. The course
    lies in a creek valley on the east slope of the Tualatin Mountains, between Forest Park's
    northern woods and the Multnomah Channel. `state` OR. Course id `wildwood`.
-   **Design:** Bill O'Meara (GolfPass). The O'Meara family bought the site of a nine-hole
    course that had closed in 1971 and been overgrown since. Bill O'Meara logged the land to pay
    for the build, and the family sold firewood while the first nine was built; it opened in
    1991 (The Bag Bandit, "Firewood for Groceries"). OGA lists 1990 as the year established.
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 1,280 m, origin (508913, 5057647). Theme
    `pnw`. Wind 1–7 mph.
-   **Data:**
    -   OSM: the developer's Overpass Turbo export, 2026-10-24, in git as `raw/overpass.geojson`.
    -   DOGAMI lidar bare-earth DTM and canopy height model: exportImage at 1 m in EPSG:32610,
        values in feet.
    -   OSIP 2024 orthophoto: 0.5 m JPEG, georeferenced from its request bbox by
        `make_ortho.py`.
    -   The originals are in the GitHub release `wildwood-data` (`release.json`; `make fetch
        NAME=wildwood`).
-   **Water:** all red.
    -   Three OSM ponds: left of 10, in front of 13 and right of 12, and left of 2 and 3.
    -   The creek strip between the 2nd green and the 5th tee.
    -   Creek channels from the lidar: down 15 and 13, across 11 and 2, along 5 and 7, across 9,
        in front of the 6th green, and left of 4.
    -   The swimming pool behind the house by the 16th tee.
    -   Out of bounds is the OSM boundary as mapped.
-   **Trees:** 9,060 from the canopy model, 776 of them inside the course. Conifer or deciduous
    is decided by crown shape. Removed:
    -   923 crowns the 2024 photo no longer shows (`trees_need_ortho`).
    -   The US 30 utility line (`remove_wires`).
    -   30 tops on playing surfaces.
    -   2 trees on the 16th tee shots (s06b).
    -   2 single trees by the course chat: the 2nd and 7th tee shots (`drop_trees`).

## Scorecard

Source: the club's scorecard image (`Wildwood-Scorecard-for-Website.webp`, uploaded by the
developer 2026-10-24). Every row adds up to its printed totals, and the handicaps run 1–18.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 5 | 4 | 3 | 5 | 3 | 4 | 36 | 4 | 4 | 3 | 4 | 3 | 5 | 5 | 4 | 4 | 36 | 72 |
| HCP | 1 | 7 | 13 | 5 | 11 | 9 | 15 | 3 | 17 | | 14 | 4 | 12 | 2 | 10 | 16 | 8 | 18 | 6 | | |
| Black | 541 | 304 | 173 | 525 | 262 | 131 | 467 | 153 | 311 | 2867 | 315 | 302 | 175 | 351 | 183 | 479 | 498 | 323 | 360 | 2986 | 5853 |
| Built | 532 | 303 | 169 | 512 | 267 | 125 | 459 | 149 | 295 | 2811 | 307 | 303 | 172 | 344 | 156 | 471 | 490 | 325 | 329 | 2897 | 5708 |

Ratings and slopes (men's / ladies'):
- Black 69.1/127, 74.5/134
- White (5,591 yd) 67.9/124, 73.3/133
- Orange (4,991 yd) 64.5/113, 69.6/125

White and Orange are in `scorecard.csv` but not built.

## Default tee

Black. This is the 4.1 default: there is no Blue on the card, and Black is the set closest to
6,300 yd.

## The developer's calls (2026-10-24)

-   Keep out of bounds as the OSM boundary, as mapped, with the house lot inside it.
-   The logo: a double-bit axe sunk in a fir stump, without the fir of the first draft
    (`assets-src/course_logos/wildwood.py`).
-   The creek channels from the lidar as red penalty areas ("creeks look good").
-   The swimming pool as a red penalty area ("that would be funny").
-   Black tees marked in the tracing desk on 6, 9, 14 and 18, and their differences from the
    card accepted ("don't worry about the discrepancies on those holes").
-   Course card: the 12th green by the pond, with the 14th, 6th and 13th in rotation. This was
    the course chat's pick; the developer can change it.

## New pipeline keys or theme

None. The course uses existing keys only:
- `red_water_osm`
- `remove_wires`
- `trees_need_ortho`
- `trees_off_fairways_m`
- `drop_trees`

No pipeline file was changed, so `make regress` was not needed (COURSE_BUILD.md 3.4).

## Open items

Details are in `data/wildwood/validation_report.md`.

1.  **Driving range:** not in OSM and not saved in the desk, so it plays as rough and in
    bounds. Recommendation: save the range outline in the desk's "R" page, which makes it out
    of bounds.
2.  **Downhill par 3s (3, 6, 12):** the auto club is too long. This needs a game change
    (`data/wildwood/design_request.md`). Recommendation: the design chat makes `autoClub()`
    pick by landing point on the terrain.
3.  **Daily rotation:** add `wildwood` to `DAILY_ROSTER` after the merge, from the next day.
    `player.test.ts` fails until then.
4.  **Tree types:** decided by crown shape only. Recommendation: accept.

## Lessons

-   **A long teeing ground that s06 skips by centroid.** On 3, 6 and 9 the OSM line started on a
    long box that reached the Black card at its back. s06 assigns boxes by centroid, so it
    placed the tee on the bare line start, off any box. Check every line start against its box
    and tag the box `hole` and `tee_set` (Gearhart's lesson again).
-   **The game's default aim finds trees that s06b passes.** On 2 and 7 the game's tee-shot
    tests hit a crown that the pipeline's check had cleared. On 7 the crown hangs over the OSM
    line, which the default aim follows. Run the course test after every s05 change, including
    a water change, since the creek edits moved the 7th's drive.
-   **Lidar older than the photo.** `trees_need_ortho` took out a whole row of trees down the
    9th fairway that the 2024 photo no longer shows. Overlay the crowns on the photo before
    deciding which trees to remove.
-   **Downhill par 3s.** On a valley course, check every par 3's height difference. Over about
    10 m, a perfect shot with the game's auto club flies the green.
-   **A pool inside the boundary paints as rough.** `red_water_osm` makes it a penalty area with
    no pipeline change.
-   **Tracing desk saves:** each page needs its own save. Read the collection back before
    rebuilding and list what's missing.
-   **Playwright in this sandbox:** the installed `@playwright/test` (1.56) looked for
    `chromium_headless_shell-1194`, but the image has build 1243. Linking the 1243 headless
    shell under the expected path worked without a download. Run the in-game look in chunks of
    three holes (about 8 minutes each), because a foreground command stops at 10 minutes.

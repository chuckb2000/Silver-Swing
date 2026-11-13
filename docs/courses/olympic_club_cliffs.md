# The Olympic Club (Cliffs)

Course id: `olympic_club_cliffs` (data folder `data/olympic_club_cliffs/`), branch
`course/olympic_club` (with the Lake, `docs/courses/olympic_club.md`).

## Build summary

Built by a course chat on 2026-11-13 (the developer: "the Olympic Club also has a little par
3 course on the west side of Skyline Blvd... that would be fun to add"). Nine par 3s by Jay
Morrish and Tom Weiskopf (1994): holes 1-8 on the bluffs west of Skyline Boulevard, the 9th
back east of the road to the clubhouse. OSM maps every hole; the club's OSM boundary
(relation 3573537) has two parts 36 m apart across Skyline, joined with
`join_boundary_parts` (the road stays out of bounds). Same world, inputs and theme as the
Lake (release `data-olympic_club`). Tee set built: Blue (the longest). Logo: a par-3 green on
a bluff above the Pacific. 1,323 yd built against 1,432; hole 8 is the open item.

## Facts

-   **Location:** the Pacific bluffs west of Skyline Boulevard, San Francisco. `state` CA.
-   **UTM zone:** 10 N; world 1,792 x 1,792 m, origin (543733, 4172760) (the Lake's).
-   **OB:** the club's whole OSM boundary, both parts (Lake and Ocean ground is club property
    and in bounds; their hole lines are dropped).
-   **Trees:** the same lidar as the Lake (4,151 trees in the world).

## Scorecard

Third-party, unverified: GolfPass (course 4014), read 2026-11-13; Blue rating 28.4/107 is half
GolfPass's 18-hole 56.8/107. Stymie prints an older card (Blue 1,369).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Par | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 27 |
| HCP | 2 | 6 | 8 | 9 | 4 | 1 | 5 | 3 | 7 |  |
| Blue | 183 | 167 | 135 | 114 | 167 | 166 | 175 | 171 | 154 | 1432 |
| Built | 182 | 163 | 135 | 111 | 167 | 170 | 171 | 78 | 146 | 1323 |

## Default tee

Blue: the longest set. White isn't built: OSM's lines for 1-3 start on the Blue boxes and
the White boxes there aren't identified.

## Course chat's calls (listed for the developer)

-   OSM's lines for 4-9 start on the forward boxes. The Blue boxes assigned in `edits.json`:
    4 w677765431, 5 w677770777, 6 w705218527, 7 w705214047 (each within 4 % of the card
    measured from it), 9 w863361130 (the back-most on its line; -5 %).
-   OSM tags the 4th par 4; the Cliffs is nine par 3s.
-   The 5th and 7th share a double green; OSM's two pins on it are dropped, so both holes
    use the green's centre (the close-up putting view is centred on the green and missed the
    5th's pin).
-   The 8th's small green (237 m2) gets a gentler plane and no random bumps, so it keeps
    three hole locations.
-   Card: the double green (rotating 5, 3, 1, 9).

## Open items

1.  **Hole 8** plays 78 yd from the start of OSM's line (White) against the card's 171: the
    only box at the right distance is the 6th's Blue box (w705218527), 29 m off the 8th's line.
    Options: (a) share that box with the 8th (recommended if the two holes do share a tee);
    (b) leave it short; (c) trace the 8th's Blue box from a photo.
2.  The double green: a design-chat change could centre a double green's putting views on
    each hole's own pin, so OSM's two pins could stay.
3.  Third-party card; no photo checked.

## Build history

-   2026-11-13: first build (course chat).

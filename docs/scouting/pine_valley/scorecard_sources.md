# Pine Valley — scorecard sources (read 2026-10-24)

Pine Valley is private and publishes no card. No official card, no USGA
championship media guide and no BlueGolf or GolfPass listing for this course
was found (GolfPass's "Pine Valley" pages are other courses, in Arkansas and
Wisconsin). `scorecard.csv` is **third-party and unverified**: it is Stymie's
listing, the only per-hole source with two full tee sets.

## Used: Stymie (per hole, two sets)

https://stymie.golf/golf-courses/new-jersey/unknown-county/unknown-city/pine-valley-golf-club-nj

| Tee | Yards | Par | Rating / slope (men) | Out | In |
|---|---|---|---|---|---|
| Back | 7,057 | 70 | 75.6 / 155 | 3,538 | 3,519 |
| Regular | 6,532 | 70 | 72.8 / 153 | 3,276 | 3,256 |

Totals check: every row of `scorecard.csv` adds up to Stymie's printed out,
in and total for both sets (35 + 35 = 70; 3,538 + 3,519 = 7,057; 3,276 +
3,256 = 6,532). Stroke index: 1–18 each once, odd on the front nine, even on
the back.

Women's ratings: none found anywhere.

Corroboration: a 2015 Golf Club Atlas thread (Mike Policano) gives the par
3s from the 2015 regular tees as 3rd 181, 5th 219, 10th 142, 14th 187, the
same as Stymie's Regular column.

## Default tee (standing defaults)

No Blue set. Regular (6,532 yd) is the set closest to 6,300 yd: **Regular,
6,532 yd, 72.8 / 153 (Stymie)**. Wikipedia gives the regular tees as 6,557 yd,
73.6 / 153 (no per-hole numbers): a conflict, recorded below.

## Other sources (not used for `scorecard.csv`)

| Source | What it gives | Conflict |
|---|---|---|
| OpenGolfAPI (from OSM, `courses.opengolfapi.org/courses/NJ/pine-valley-golf-club-championship`) | one per-hole row adding to 7,181, with the same pars and stroke index; header "Back 7,057, 75.6/155" | the row differs from Stymie Back on 6 (438 v 394), 12 (358 v 337), 14 (210 v 220), 17 (414 v 345). It is almost certainly the OSM `golf=hole` `dist` tags, so the course chat will see it in the export. A newer championship set, or mapper error? |
| Wikipedia (Pine Valley Golf Club) | Championship 7,201 yd, 76.6 / 155; Regular 6,557 yd, 73.6 / 153; par 70 | both totals differ from Stymie; no per-hole numbers |
| GOLF.com Top 100 page | 7,197 yd, par 70; 11th 390 yd | total only |
| GolfCourseGurus | "Black" 7,057, 75.6 / 155; Regular 6,532, 72.8 / 153; 5th 238, 7th 636, 10th 161, 13th 486, 15th 615 | agrees with Stymie (same underlying data, probably) |
| Today's Golfer | 7,047 yd, par 70 | total only |
| Guinness World Records (largest bunker) | 7th hole 585 yd; Hell's Half Acre starts 280 yd from the tee and runs 150 yd | older yardage |
| Golf Club Atlas course profile (`golfclubatlas.com/?p=3003`) | about 6,700 from the back markers: 425, 365, 180, 445, 230, 390, 580, 320, 425, 145, 390, 345, 450, 185, 590, 435, 340, 430 (6,670) | an older card |
| Golf Club Atlas forum, ~2004 (topic 6167) | tips "6699 on the card": 427, 367, 181, 444, 232, 388, 578, 319, 427 / 158, 392, 344, 448, 184, 591, 447, 338, 434 | an older card |
| GolfNow (Short Course) | White par 31, 2,006 yd; Red par 31, 1,216 yd; built 1992; no ratings | the 10-hole Short Course, not the main course; no per-hole numbers |

The course has clearly been lengthened over time (6,699 → 7,057 → 7,181 /
7,197 / 7,201). The four totals over 7,000 are not averaged; Stymie's two sets
are the only ones with every hole.

## What's missing, and where to get it

- An official card (members' printed card). A photo of it would settle the
  tee names, the current championship set and the women's ratings.
- The USGA's 2034 Curtis Cup materials will print hole yardages, but not
  until about 2033.
- The Crump Cup (September) is the one day the public may attend the final
  round; its pairing sheet or a spectator guide may carry the card.

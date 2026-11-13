# Portland Golf Club — scorecard sources (read 2026-10-24)

No official card is online: the club's website (portlandgolfclub.com/golf,
/hole-by-hole) gives hole names, pars and descriptions, no yardages, and no
card image or PDF. Four third-party versions and two USGA set-ups were found.
`scorecard.csv` is GolfPass's card, transcribed as shown (columns renamed to
lowercase with `_` for the combination tees). Nothing was averaged.

## Used: GolfPass, course 11361

https://www.golfpass.com/courses/11361-portland-golf-club/scorecard-and-layout
(5900 SW Scholls Ferry Rd, Portland OR 97225; read 2026-10-24).

- Par 4-4-4-3-5-4-4-3-4 (35), 5-4-3-4-4-5-4-3-5 (37) = 72; one par row.
- Stroke index, men: 13 1 7 17 11 3 5 15 9 / 12 4 16 2 14 8 10 18 6 (in
  `scorecard.csv`); women: 13 3 11 15 5 1 7 17 9 / 4 12 18 14 8 2 10 16 6. Both
  use 1-18 once each. opengolfapi.org prints the same men's index.
- Tee rows (all add up to the printed Out / In / Total):

| Tee (csv column) | Out | In | Total |
|---|---|---|---|
| Hudson (`hudson`) | 3255 | 3746 | 7001 |
| Hudson/Black (`hudson_black`) | 3160 | 3553 | 6713 |
| Hudson/Blue (`hudson_blue`) | 3075 | 3428 | 6503 |
| **Blue (`blue`)** — default | 2989 | 3328 | **6317** |
| Blue/White (`blue_white`) | 2901 | 3133 | 6034 |
| White (`white`) | 2783 | 2993 | 5776 |
| White/Green (`white_green`) | 2691 | 2823 | 5514 |
| Green (`green`) | 2442 | 2602 | 5044 |
| Green/Gold (`green_gold`) | 2287 | 2464 | 4751 |

- Quirk: White/Green hole 2 is 406, longer than White's 361 (Stymie's
  women's White tee on 2 is 406); transcribed as shown.
- Ratings (GolfPass tee table; its yardages don't match the rows above, so
  the table may be older than the rows):

| Tee | Par | Yards (table) | Rating | Slope |
|---|---|---|---|---|
| Black (M) | 72 | 6703 | 73.0 | 143 |
| Blue (M) | 72 | 6323 | 71.4 | 141 |
| White (M) | 72 | 5958 | 69.3 | 134 |
| White (W) | 72 | 5958 | 75.1 | 138 |
| Gold (W) | 73 | 5858 | 74.5 | 137 |
| Green (W) | 73 | 5196 | 70.5 | 128 |

  1golf.eu (https://www.1golf.eu/en/club/portland-golf-club) prints the same
  table (Gold (W) 5,868). Women's par 73 from Gold and Green means one hole is
  a par 5 for women; which one is not shown.
- Why this version: it has the Hudson tees at 7,001 yd, as the club's site
  says ("stretch the course to more than 7,000 yards"), and Gold forward tees
  differing from Green on 9 holes, matching the 2022 renovation's "new
  forward tees on 10 holes" (Golf Course Architecture, TurfNet).

**Default tee (standing defaults): Blue, 6,317 yd; rating 71.4 / slope 141
(unverified; printed against 6,323 yd).**

## Conflicts (not used)

### Hole 10's par
The club's /golf page lists hole 10 "Beaver" as "Par 4" (and so par 71).
Every card above and below, and the USGA fact sheets of 2015 and 2026, give
par 5. Recommendation: par 5.

### Stymie
https://stymie.golf/golf-courses/oregon/washington-county/beaverton/portland-golf-club
(read 2026-10-24). Same pars. Every row adds up:

| Tee | Out | In | Total | Rating / slope |
|---|---|---|---|---|
| Hudson | 3212 | 3732 | 6944 | 74.1 / 145 |
| Hudson/Black | 3145 | 3592 | 6737 | 73.0 / 144 |
| Black | 3131 | 3572 | 6703 | 72.8 / 144 |
| Hudson/Blue | 3066 | 3437 | 6503 | 71.7 / 141 |
| Blue | 2981 | 3372 | 6353 | 71.1 / 141 (M); 77.2 / 140 (W) |
| Blue/White | 2922 | 3195 | 6117 | 69.9 / 138 (M); 75.7 / 138 (W) |
| White (W) | 2858 | 3044 | 5902 | 74.4 / 136 |
| White (M) | 2790 | 3044 | 5834 | 68.5 / 130 |
| White/Green | 2691 | 2892 | 5583 | 66.8 / 127 (M); 72.6 / 131 (W) |
| Green | 2469 | 2647 | 5116 | 64.7 / 123 (M); 70.1 / 124 (W) |

Blue per hole: 398 427 325 124 504 324 343 182 354 / 491 355 181 370 384 535
362 162 532. Stroke index: 13 3 7 15 1 11 5 17 9 / 4 16 18 8 12 2 10 14 6
(differs from GolfPass's men's index on 12 holes).

### GolfLink
https://www.golflink.com/golf-courses/or/portland/portland-golf-club (read
2026-10-24). An older Black/Blue/White/Red card, no stroke index. Rows add up
to Black 6,683 (Stymie's Black except 17: 171 vs 191), Blue 6,349, White 5,955,
Red 5,845. Ratings Black 73.0/143, Blue 71.4/141, White 69.3/134, White (L)
75.1/138, Red 68.8/132, Red (L) 74.5/137.

### opengolfapi.org
https://courses.opengolfapi.org/courses/OR/portland-golf-club: one yardage
column identical to GolfPass's Hudson/Black row (6,713; headline 6,703),
Black 73/143, GolfPass's men's stroke index.

### USGA championship set-ups (per hole, not tee sets)
- 2015 U.S. Women's Amateur fact sheet
  (https://www.usga.org/content/usga/home-page/championships/2015/2015-u-s--women-s-amateur-fact-sheet.html):
  391 418 327 123 489 345 348 181 356 / 505 368 180 377 384 535 371 140 522 =
  2,978 + 3,382 = 6,360, par 35-37-72, rating 78.0 / slope 146 (women).
- 2026 U.S. Senior Women's Amateur fact sheet
  (https://mediacenter.usga.org/download/2026+Senior+Women%27s+Amateur+Fact+Sheet.pdf):
  348 354 306 124 489 297 346 167 355 / 482 355 162 331 338 495 333 130 452 =
  2,786 + 3,078 = 5,864, par 35-37-72.

### Wikipedia
https://en.wikipedia.org/wiki/Portland_Golf_Club: 6,703 yd, 72.8 / 144 (the
Black figures), par 72.

### Not this club
GolfPass 18408 is Portland Golf Club, Victoria, Australia, and GolfPass 4415
is Portland Golf Course, Connecticut; mscorecard cid 1326887426777457 is the
Australian club. Ignore them.

## Missing
- The club's printed card (version, ratings, which hole is a women's par 5,
  and hole 10's par). Where: a member's photo of the printed card, or the
  Oregon Golf Association / GHIN course rating lookup for the current
  ratings.

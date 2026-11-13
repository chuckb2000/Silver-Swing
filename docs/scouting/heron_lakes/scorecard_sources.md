# Heron Lakes — scorecard sources (2026-10-24)

Files: `scorecard_great_blue.csv` (copied as `scorecard.csv`: Great Blue is
built first) and `scorecard_greenback.csv`, both
`hole,par,handicap,<tees longest to shortest>`. Combo tees are columns
(`white_blue_black`, `yellow_white_blue`); every combo hole was checked to
come from one of its parent tees. `handicap` is the men's stroke index (the
only index on the source); women's indexes are below.

**Status:** third-party, complete per hole for every tee set on both courses,
with men's and women's ratings for the main sets. **The club's own card was
not read**: the official site (https://portlandparksgolf.com/heron-lakes-course-info/,
named by portland.gov) was never returned by a search, so the sandbox could
not open it. Great Blue has three conflicting cards online (below); the CSV
uses the one that matches the Greenback card's tee colours and carries
ratings. DATA_REQUEST.md item 5 asks the developer for the printed cards.

## Great Blue — used: stymie.golf (GHIN-style tee list)

https://stymie.golf/golf-courses/oregon/multnomah-county/portland/heron-lakes-great-blue
(read 2026-10-24; no date on the page; the second stymie page,
`.../multnomah-county-county/portland/heron-lakes-great-blue-portland`, is
identical).

| Tee | Out | In | Total | Men's rating / slope | Women's rating / slope |
|---|---|---|---|---|---|
| Gold | 3535 | 3481 | 7016 | 74.2 / 146 (gender not stated) | — |
| Black | 3309 | 3303 | 6612 | 72.5 / 142 (gender not stated) | — |
| **Blue** (default) | 3113 | 3131 | **6244** | **70.5 / 135** | 76.2 / 144 |
| White/Blue/Black | 3111 | 3130 | 6241 | 70.6 / 135 (gender not stated) | — |
| White | 2870 | 2987 | 5857 | 68.7 / 127 | 74.3 / 140 |
| Yellow/White/Blue | 2880 | 2924 | 5804 | 68.1 / 132 (gender not stated) | — |
| Yellow | 2599 | 2659 | 5258 | 65.8 / 121 | 70.9 / 131 |

Par 36-36-72 for every tee. Totals check: every row's front, back and total
sum exactly to the printed figures. Stroke index (one row, = GolfPass men's):
7 1 15 11 9 17 13 3 5 | 14 16 4 10 18 12 2 8 6.
Women's index (GolfPass "HCP (W)", also greenskeeper's women's row):
9 3 13 17 1 15 11 5 7 | 12 16 2 8 14 18 6 4 10.

### Great Blue — conflicts (not used; not averaged)

1. **GolfPass per-hole card** with other tee names:
   https://www.golfpass.com/courses/68-heron-lakes-golf-club-great-blue-course/scorecard-and-layout
   (read 2026-10-24): Green 7007, Burgundy 6510, Burgundy/Blue 6214, Blue
   5959, Grey 5262, White 4030 (each row sums to its printed total), no
   ratings. Per hole it differs from stymie by up to 20-45 yd, mostly on
   holes **8, 16 and 17** (Green 447 / 400 / 508 against Gold 466 / 380 /
   523), as if tees moved there; Grey ≈ Yellow (5262 vs 5258) and Green ≈
   Gold (7007 vs 7016). Same pars; same men's index. It could be a newer
   re-tee'd card or a separate measurement: only the club's card settles it.
   OpenGolfAPI shows its Grey row (5262) under the old tee table.
2. **Older card** (greenskeeper.org,
   https://greenskeeper.org/oregon/portland_vancouver/heron_lakes_golf_club/scorecard.cfm,
   no date): Black 6902 (73.2/140), Blue 6491 (71.3/137), White 6030
   (69.8/123), Red-Ladies 5258 (70.7/127); rows below. Its men's index
   differs (9 5 17 15 1 13 11 3 7 | 12 18 2 10 14 16 8 4 6). Its Red row is
   hole for hole stymie's Yellow, and stymie's Black and Blue reuse many of
   its holes: the stymie card looks like a later re-tee of this one. The
   GolfPass, GolfNow and OpenGolfAPI "tee tables" carry the same four sets
   with other ratings (Black 74.0/139, Blue 71.9/137, White 69.9/131,
   White (W) 75.9/142, Red 71.3/131): older ratings still.
3. Other totals quoted: RTJ II's portfolio "6,916 yards"; GolfNow's quick
   facts 6,916, 73.6/132. No per-hole source for them.

Older card rows (greenskeeper):
- Black 413 515 324 168 566 205 396 466 428 | 412 182 526 446 352 187 380 523 413 = 6902
- Blue 381 501 307 150 520 179 380 428 402 | 388 173 506 443 321 176 356 496 384 = 6491
- White 351 461 286 126 503 161 343 413 366 | 367 166 467 408 300 149 325 474 364 = 6030
- Red 314 435 260 111 432 103 297 361 286 | 346 139 400 342 274 122 259 439 338 = 5258

GolfPass rows: Green 409 568 336 166 564 200 399 447 428 | 412 207 551 443 377
182 400 508 410; Burgundy 377 505 309 150 522 177 383 405 402 | 389 184 510 435
349 171 375 485 382; Burgundy/Blue 377 464 309 126 522 139 383 368 402 | 369
184 466 435 305 171 344 485 365; Blue 347 464 288 126 478 139 347 368 365 | 369
172 466 400 305 150 344 466 365; Grey 310 437 260 113 432 102 300 341 286 | 348
141 406 341 271 120 279 433 342; White 201 334 189 89 354 94 226 255 237 | 269
130 348 251 194 111 192 322 234.

## Greenback — used: stymie.golf, confirmed by GolfPass

https://stymie.golf/golf-courses/oregon/multnomah-county/portland/heron-lakes-greenback
and https://www.golfpass.com/courses/15630-heron-lakes-golf-club-greenback-course/scorecard-and-layout
(both read 2026-10-24): **the per-hole yardages of Black, Blue, White,
Yellow and Orange, the pars and the men's index agree exactly**; stymie adds
the two combos and the ratings.

| Tee | Out | In | Total | Men's rating / slope | Women's rating / slope |
|---|---|---|---|---|---|
| Black | 3375 | 3263 | 6638 | 72.0 / 132 (gender not stated) | — |
| White/Blue/Black | 3146 | 3050 | 6196 | 69.9 / 126 (gender not stated) | — |
| **Blue** (default) | 3123 | 3018 | **6141** | **69.6 / 127** | 75.6 / 136 |
| White | 2924 | 2826 | 5750 | 67.7 / 124 | 73.4 / 131 |
| Yellow/White/Blue | 2900 | 2767 | 5667 | 67.9 / 123 | 72.6 / 132 |
| Yellow | 2686 | 2583 | 5269 | 65.1 / 115 | 70.2 / 127 |
| Orange | 2053 | 1960 | 4013 | 60.4 / 106 | 62.5 / 108 |

Par 36-36-72 (front 5 4 3 4 5 4 3 4 4, back 5 4 4 5 3 4 3 4 4). Totals check:
every row sums exactly to the printed totals. Men's index: 1 11 15 5 3 7 17
9 13 | 4 10 8 2 18 14 16 12 6. Women's (GolfPass): 5 11 9 15 1 7 17 13 3 | 6
14 12 2 18 8 10 16 4.

Conflicts: the GolfPass/KemperSports tee table (Blue 6615 72.0/128, White
5952 68.6/123, White (W) 74.2/132, Red 5240 69.8/123) and RTJ II's "6,608
yards" are an older card with no per-hole source; not used.

## Default tee (standing defaults: Blue)

- Great Blue: **Blue, 6,244 yd, men's 70.5 / 135** (women's 76.2 / 144).
- Greenback: **Blue, 6,141 yd, men's 69.6 / 127** (women's 75.6 / 136).

## Still wanted

The club's printed cards (or the scorecard page on
https://portlandparksgolf.com/heron-lakes-course-info/) to settle which Great
Blue card is current (stymie's Gold/Black/Blue/White/Yellow or GolfPass's
Green/Burgundy/Blue/Grey/White), and the stated gender of the Gold, Black and
combo ratings. If the club's card is the GolfPass one, rewrite
`scorecard_great_blue.csv` from it and note that it has no ratings.

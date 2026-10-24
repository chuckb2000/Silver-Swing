# Sahalee Country Club — scorecard sources (read 2026-10-24)

Three nines (South, North, East), any two played as an 18. The championship
course is **South + North** (South front, North back: 1998 PGA, 2010 U.S. Senior
Open, 2016 and 2024 Women's PGA). Every source below gives the same three nines.

## `scorecard.csv`

Holes numbered 1-27 in nine order: **South 1-9, North 10-18, East 19-27**, so
holes 1-18 are the championship course (COURSE_BUILD.md 3.5a: a club card that
numbers each nine 1-9 is written 1-27 in nine order). Tee columns `black`
(the club's "Championship"), `blue`, `white`, `gold`, `green` (the club's
overview page calls this set **Silver**; same totals).

`handicap` = the club's **men's handicap within the nine (1-9)**, as printed on
the club's nine cards. The 18-hole stroke indexes per pair are below.

Source: the club's own course-tour pages (one card per nine), checked against
the club's overview page (totals per pair) and GolfPass (per-hole, per pair).

| Nine | Page |
|---|---|
| South | https://www.sahalee.com/Golf/South_Course_Tour |
| North | https://www.sahalee.com/Golf/North_Course_Tour |
| East | https://www.sahalee.com/Golf/East_Course_Tour |
| Totals per pair | https://www.sahalee.com/Golf/Overview |

### Totals check (every row added up)

| Tee | South | North | East | S/N | N/E | E/S | Club overview S/N, N/E, E/S |
|---|---|---|---|---|---|---|---|
| Black | 3,501 | 3,502 | 3,464 | 7,003 | 6,966 | 6,965 | 7,003, 6,966, 6,965 |
| Blue | 3,377 | 3,377 | 3,392 | **6,754** | 6,769 | 6,769 | 6,754, 6,769, 6,769 |
| White | 3,159 | 3,162 | 3,163 | 6,321 | 6,325 | 6,322 | 6,321, 6,325, 6,322 |
| Gold | 2,840 | 2,902 | 2,860 | 5,742 | 5,762 | 5,700 | 5,742, 5,762, 5,700 |
| Green (Silver) | 2,706 | 2,705 | 2,707 | 5,411 | 5,412 | 5,413 | 5,411, 5,412, 5,413 |

Par 36 on each nine, 72 for any pair. Every CSV row adds up to the club's
printed nine totals (OUT) and to its pair totals.

### Three typos on the club's nine cards (corrected in the CSV)

The club's per-hole figures disagree with the club's own printed nine totals in
three cells. In each case GolfPass has the figure that makes the club's totals
add up, and the CSV uses it:

| Hole | Club page | Club's printed total needs | GolfPass | CSV |
|---|---|---|---|---|
| North 3 (CSV 12), Blue | 428 (nine adds to 3,376) | 429 (OUT 3,377; pairs 6,754 / 6,769) | 429 | 429 |
| North 9 (CSV 18), Gold | 417 (nine adds to 2,869) | 450 (OUT 2,902; pairs 5,742 / 5,762) | 450 | 450 |
| East 5 (CSV 23), Gold | 338 (shorter than Green 430; nine adds to 2,754) | 444 (OUT 2,860; pairs 5,762 / 5,700) | 444 | 444 |

(The page text was read through a summariser twice and gave the same numbers
both times; a photo of the printed card would settle them.)

One cell where GolfPass is the odd one out: North 4 (CSV 13) Green: club 130,
GolfPass 118. The club's 130 adds up to its OUT 2,705 and its Silver pair
totals; GolfPass's row adds to 2,693. The CSV uses the club's 130.

## Default tee (standing defaults: Blue)

**Blue**: championship course (South + North, CSV holes 1-18) **6,754 yd,
73.4 / 138** (men). North/East and East/South Blue: 6,769 yd each.

## Ratings and slopes (one set for every pair of nines)

Club course-tour pages (the same on all three):

| Tee | Men rating / slope | Women rating / slope |
|---|---|---|
| Black | 74.6 / 139 | — |
| Blue | 73.4 / 138 | — |
| White | 71.0 / 135 | 77.2 / 136 |
| Gold | 68.6 / 125 | 73.8 / 131 |
| Green | 67.2 / 121 | 71.8 / 128 |

The women's three are printed under different columns on different nine pages
(the East page puts 77.2/136 under Green); the order above (longest tee,
highest rating) matches GolfPass, which lists Black (W) 80.4/147 and Blue (W)
79.2/140 too (and calls Green "Red").

Other ratings seen (not used):

- Club "Course Facts" page (an older card, Green still named Green): men Black
  74.6/138, Blue 73.2/136, White 71.4/133, Gold 69.0/129, Green 66.6/125;
  women White 76.6/140, Gold 74.0/132, Green 72.0/127.
- Stymie (South/North only, tee names "Black NB" ... "Family NB", probably the
  GHIN listing; see the conflict below): men Black 74.0/129, Blue 72.6/127,
  Blue/White 71.0/124, White 71.3/120, White/Gold 69.1/124, Gold 68.5/118,
  Silver 66.1/115, Family 62.3/99; women White 76.1/132, White/Gold 75.0/127,
  Gold 73.6/125, Silver 71.5/119, Family 64.3/103.
- Offcourse (all three pairs, older Black/Blue/White/Red card): men 74.8/144,
  73.8/143, 71.6/139, 69.0/132; women White 78.2/148, Red 74.4/139.
- Wikipedia: S/N Black 74.2 or 74.6/139, Blue 73.4/138, White 71.0/135.
- 1golf.eu: Black 74/138, "White" 73.7/135 (at Blue's length), Red (W) 73.6/129.
- AllSquare (East as a nine): Black 37.3/139, Blue 36.7/138, White 35.5/135,
  Gold 34.3/125, Silver (W) 35.9/128 (half the club's 18-hole figures).

## 18-hole stroke indexes per pair (men)

The club prints only the 1-9 index within each nine. Offcourse prints the
18-hole indexes per pair; their order within each nine is the same as the
club's 1-9 order on all three nines:

| Pair | Front nine (1-9) | Back nine (10-18) |
|---|---|---|
| South / North | South 9, 1, 7, 11, 17, 5, 13, 3, 15 | North 10, 2, 4, 18, 12, 8, 14, 16, 6 |
| North / East | North 9, 1, 3, 17, 11, 7, 13, 15, 5 | East 2, 6, 14, 16, 4, 12, 10, 18, 8 |
| East / South | East 1, 5, 13, 15, 3, 11, 9, 17, 7 | South 10, 2, 8, 12, 18, 6, 14, 4, 16 |

(GolfPass prints the North/East row on its South/North page too, and the
South/North back row on its North/East page: copied rows, not used.)

Women's 1-9 indexes (club): South 4, 2, 5, 6, 8, 1, 7, 3, 9; North 5, 1, 2,
9, 6, 3, 7, 8, 4; East 1, 5, 7, 8, 2, 3, 6, 9, 4.

## Conflicts and other cards

1. **Stymie's South/North card differs from the club's** (and may be newer):
   https://stymie.golf/golf-courses/washington/king-county/sammamish/sahalee-country-club
   (front = South, back = North, men's 18-hole index 9, 1, 7, 11, 17, 5, 13, 3, 15 /
   10, 2, 4, 18, 12, 8, 14, 16, 6, the same as Offcourse's):

   | Tee | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | Black NB | 405 | 510 | 415 | 390 | 193 | 512 | 418 | 440 | 213 | 3,496 | 402 | 541 | 460 | 175 | 381 | 417 | 375 | 218 | 532 | 3,501 | 6,997 |
   | Blue NB | 396 | 502 | 406 | 381 | 176 | 508 | 404 | 422 | 180 | 3,375 | 392 | 528 | 429 | 162 | 375 | 397 | 372 | 173 | 529 | 3,357 | 6,732 |
   | White NB | 374 | 480 | 386 | 357 | 165 | 483 | 379 | 393 | 146 | 3,163 | 374 | 503 | 407 | 140 | 360 | 377 | 347 | 145 | 512 | 3,165 | 6,328 |
   | Gold NB | 347 | 460 | 346 | 329 | 157 | 453 | 337 | 339 | 116 | 2,884 | 345 | 469 | 375 | 128 | 344 | 354 | 332 | 111 | 474 | 2,932 | 5,816 |

   (also Blue/White, White/Gold, Silver and Family rows; every row adds up.)
   Its slopes are about ten lower than the club's (Blue 127 vs 138), which
   would fit a re-rating after the 2022-23 renovation (wider fairways, fewer
   trees); no date is given. Blue differs from the club's by up to 10 yd a hole
   (North 2: 528 vs 538; North 4: 162 vs 169), 22 yd in all. Not used; the
   club's own card is. Recommendation: a photo of the current printed card (or
   the GHIN app's tee sheet) settles which is current.
2. **Offcourse** (https://offcourse.co/courses/scorecard/sahalee-country-club):
   all three pairs, Black/Blue/White/Red. Black and Blue per hole equal the
   club's; White North 5 is 364 (club 354; Offcourse S/N White 6,331, club
   6,321); its Red is an older forward set (S/N 5,712). Older card.
3. **GolfPass** (South/North, North/East, East/South pages): per hole equal to
   the CSV except North 4 Green (118); its tee tables list Gold and "Red"
   totals that don't match its own rows (S/N Gold 5,709 vs rows 5,742).
4. **The Sand Trap** blog (2016, Blue per nine): South and North Blue as the
   club's; East Blue equal to the club's (3,392).
5. **OpenGolfAPI** (built from OSM): Black per hole for each pair, equal to the
   club's.
6. **Wikipedia**: E/S Black 6,952 (club 6,965); otherwise the club's totals.
7. **Tournament cards** (not the members' card): 1998 PGA, par 70, 6,906 yd
   (South 6 and North 9 as par 4s, 480 and 475); 2016 Women's PGA par 71,
   6,624 yd (North 9 a 421-yd par 4); 2024 Women's PGA par 72, 6,731 yd (North
   9 a 517-yd par 5: "Sahalee's new closer").

## What's missing

Nothing for the build. A photo of the printed card would confirm the three
corrected cells and say whether Stymie's re-measured card is current.

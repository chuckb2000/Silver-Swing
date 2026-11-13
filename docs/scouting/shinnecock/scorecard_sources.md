# Shinnecock Hills — scorecard sources (read 2026-10-24)

No official card is online (private club). `scorecard.csv` is source A only;
nothing is averaged.

## A. GolfPass card (used for `scorecard.csv`)

https://www.golfpass.com/travel-advisor/courses/14993-shinnecock-hills-golf-club/scorecard-and-layout

| Tee | Out | In | Total | Tee table: yards, rating / slope |
|---|---|---|---|---|
| Red | 3,505 | 3,435 | 6,940 | 6,940, 74.4 / 140 |
| Green | 3,163 | 3,267 | 6,430 | **6,530**, 72.3 / 134 |
| Blue | 3,079 | 3,062 | 6,141 | 6,141, 70.3 / 129 |
| White | 2,730 | 2,666 | 5,396 | 5,396, 72.5 / 131 |

- Every row adds up to its printed Out, In and Total (checked).
- Par 4 3 4 4 5 4 3 4 4 (35) / 4 3 4 4 4 4 5 3 4 (35) = 70.
- Men's stroke index 15 17 5 7 11 1 13 9 3 / 2 16 8 12 4 6 10 18 14 (used);
  women's 7 17 3 13 9 1 15 11 5 / 4 16 2 10 6 14 8 18 12.
- **Green hole 5 is printed 400 yd** on a par 5, and the Green total (6,430)
  is 100 short of the tee table (6,530). Probably a typo for 500; left as
  printed in `scorecard.csv`. Green is not the default tee.
- The ratings are not marked men/women on the page; White's 72.5 / 131
  matches Stymie's *women's* White.
- GolfNow (https://www.golfnow.co.uk/courses/1034553-shinnecock-hills-golf-club-details)
  and OpenGolfAPI (https://courses.opengolfapi.org/courses/ny/shinnecock-hills-golf-course)
  give the same tee totals (Green 6,530); OpenGolfAPI's per-hole Red row and
  stroke index are identical to A.

## B. Stymie card (a different version; conflicts with A)

https://stymie.golf/golf-courses/new-york/suffolk-county/southampton/shinnecock-hills-golf-club

| Tee | Out | In | Total | Men | Women |
|---|---|---|---|---|---|
| Red | 3,497 | 3,435 | 6,932 | 74.4 / 140 | — |
| Green | 3,254 | 3,252 | 6,506 | 72.3 / 134 | — |
| Blue | 3,060 | 3,062 | 6,122 | 70.3 / 129 | 76.3 / 140 |
| White | 2,728 (M) / 2,736 (W) | 2,666 | 5,394 / 5,402 | 67.1 / 125 | 72.5 / 131 |

All rows add up. Same pars. Stroke index differs from A on holes 3 and 4
(B: 7 and 5; A: 5 and 7).

Blue, A vs B, hole by hole (back nine identical):

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out |
|---|---|---|---|---|---|---|---|---|---|---|
| A (GolfPass) | 387 | 187 | 410 | 367 | 488 | 375 | 166 | 320 | 379 | 3,079 |
| B (Stymie) | 380 | 188 | 410 | 365 | 486 | 375 | 164 | 320 | 372 | 3,060 |

A is used because three listings (GolfPass, GolfNow, OpenGolfAPI) carry its
totals; which card is current is not known.

## Championship yardages (for checking the back tees)

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026 US Open (USGA fact sheet) | 394 | 252 | 501 | 476 | 592 | 495 | 187 | 440 | 482 | 3,819 | 415 | 157 | 469 | 371 | 520 | 409 | 614 | 176 | 490 | 3,621 | 7,440 |
| 2018 US Open (Wikipedia) | 399 | 252 | 500 | 475 | 589 | 491 | 189 | 439 | 485 | 3,819 | 415 | 159 | 469 | 374 | 519 | 409 | 616 | 175 | 485 | 3,621 | 7,440 |

Both add up to 3,819 / 3,621 / 7,440 but differ on 14 holes (they are
setup yardages, not fixed tees). Wikipedia's Shinnecock article labels the
2018 list as the 2026 card. Fact sheet:
https://filecache.mediaroom.com/mr5mr_usga2/191781/download/126th%20U.S.%20Open%20Championship%20Fact%20Sheet.pdf
(also https://golftoday.co.uk/us-open-championship-2026-fact-sheet/). Earlier
US Opens: 2004 6,996; 1995 6,944; 1986 6,912 (all par 70).

Hole names (Wikipedia): 1 Westward Ho, 2 Plateau, 3 Peconic, 4 Pump House,
5 Montauk, 6 Pond, 7 Redan, 8 Lowlands, 9 Ben Nevis, 10 Eastward Ho,
11 Hill Head, 12 Tuckahoe, 13 Road Side, 14 Thom's Elbow, 15 Sebonac,
16 Shinnecock, 17 Eden, 18 Home.

## Other totals

- Wikipedia (https://en.wikipedia.org/wiki/Shinnecock_Hills_Golf_Club): Red
  6,940; 74.7 / 145; "W: 76.9 / 145" and "W: 72.8 / 135" without tee names.
- ForeTee (https://foretee.com/courses/new-york/southampton/usa/shinnecock-hills-golf-course/9373/):
  6,996 (the 2004 US Open length), 74.5 / 140, par 70. GolfNow's "quick
  facts" repeat 6,996 / 74.5 / 140.
- Top100golfcourses: 7,437 yd, par 70.

## Default tee (standing defaults)

**Blue: 6,141 yd, 70.3 / 129** (source A). Source B's Blue is 6,122 with
the same rating.

## Missing

- The printed card, to settle A vs B (Blue front nine, stroke index 3/4,
  Green hole 5). A phone photo of a member's card is the best route.

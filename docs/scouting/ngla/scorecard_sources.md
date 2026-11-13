# National Golf Links of America — scorecard sources (read 2026-10-24)

No official card is online (private club). Every per-hole figure below is
third-party. `scorecard.csv` is source A only; nothing is averaged.

## A. GolfPass card (used for `scorecard.csv`)

https://www.golfpass.com/courses/14992-national-golf-links-of-america/

| Tee | Out | In | Total | Men | Women |
|---|---|---|---|---|---|
| Red | 3,318 | 3,617 | 6,935 | 73.9 / 140 | — |
| Green | 3,153 | 3,352 | 6,505 | 71.6 / 134 | 77.5 / 145 |
| White | 2,787 | 2,984 | 5,771 | 68.0 / 122 | 73.2 / 137 |

- Every row adds up to its printed Out, In and Total (checked).
- Par 4 4 4 3 4 3 5 4 5 (36) / 4 4 4 3 4 4 4 4 5 (36) = 72.
- **Handicap row is misaligned on the page:** it prints 18 values in the
  slots for holes 1-9, Out and 10-17, leaving hole 18 blank. Read in order,
  the values give holes 10-18 = 4, 10, 2, 18, 12, 6, 14, 16, 8, which is a
  full 1-18 set (odd on the front, even on the back) and is exactly
  OpenGolfAPI's stroke index (below). `scorecard.csv` uses that reading.

## B. GolfPass / GolfNow tee table (a different card, no per-hole data)

Same GolfPass page ("Tees" table) and
https://www.golfnow.com/courses/1034410-national-golf-links-of-america-details:

| Tee | Par | Yards | Rating / slope |
|---|---|---|---|
| Black | 73 | 6,873 | 74.3 / 141 |
| White | 73 | 6,425 | 72.7 / 137 |
| Green | 73 | 5,817 | 69.9 / 131 |
| Green (W) | 73 | 5,817 | 73.3 / 135 |

This looks like a newer card: the tee names are re-used with other totals
(Green is 6,505 on card A, 5,817 here; White 5,771 vs 6,425), the back tee is
Black, and par is 73. No per-hole yards for it were found. **Conflict:** par 72
(card A, Wikipedia, Walker Cup) vs 73 (these tables, ForeTee, Today's Golfer).

## Other sources (totals and partial data)

| Source | What it says |
|---|---|
| OpenGolfAPI https://courses.opengolfapi.org/courses/NY/national-golf-links-of-america | tees Black 6,873 74.3/141 (M), White 6,425, Green 5,817; one unlabeled per-hole row = card A's Green row (6,505), same pars and stroke index |
| Wikipedia https://en.wikipedia.org/wiki/National_Golf_Links_of_America | par 72, 6,873 yd from the back, 73.6 / 137 |
| Walker Cup https://walkercup.co.uk/2013-national-golf-links-of-america/ | 2013 match: 6,995 yd, par 72 (no per-hole list) |
| Fox News review https://www.foxnews.com/sports/golf-course-review-national-golf-links-of-america.print | older card: 7,079 yd (3,399 / 3,680), par 72, 75.2 / 145; 7th once 456, now 505 yd |
| Kimi Golf https://www.kimigolf.com/America/New-York/NGLA/NGLA-(en).htm | per-hole yards for 14 holes = card A's Red row; lists 7 as par 4 (card A: par 5); 6,935, rating 74.3 |
| golfadelphia https://golfadelphia.com/2019/02/28/national-golf-links-of-america/ | "6,505 yards, 130 slope from the Greens (Regular Tees)"; hole names and yards = card A's Green row |
| ForeTee https://foretee.com/courses/new-york/southampton/usa/national-golf-links-of-america/9125 | back tees 6,873, par 73, 74.3 / 141 |
| Today's Golfer (top 100) | par 73, 6,873 |

The 2013 Walker Cup added back tees on 3, 7 and 16 (Golf Club Atlas forum,
https://www.golfclubatlas.com/forum/index.php/topic,55402.0.html; seen on
March 2012 imagery). The 2024 lidar and current photos show them; they may
be the Black tees.

## Hole names (golfadelphia; Wikipedia for 2, 3, 4, 7, 8, 13, 14)

1 Valley, 2 Sahara, 3 Alps, 4 Redan, 5 Hog's Back, 6 Short, 7 St. Andrews,
8 Bottle, 9 Long, 10 Shinnecock, 11 Plateau, 12 Sebonac, 13 Eden, 14 Cape,
15 Narrows, 16 Punchbowl, 17 Peconic, 18 Home.

## Default tee (standing defaults)

No Blue tee. The per-hole set closest to 6,300 yd is **Green, 6,505 yd,
71.6 / 134 (men)** from card A. If the newer card (B) is the one in use, its
White (6,425, 72.7 / 137) would be closer; it has no per-hole yards online.

## Missing

- The club's current printed card (per-hole yards for Black / White / Green,
  par 72 or 73, stroke index). Best route: a photo of a member's card.

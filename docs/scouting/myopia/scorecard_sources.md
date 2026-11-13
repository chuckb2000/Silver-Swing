# Myopia Hunt Club — scorecard sources (read 2026-10-24)

No official card is online (private club; no public website card found). Two
third-party listings give the same current card hole by hole; ratings differ
between them because one pairs them with an older total.

## Sources

| # | Source | What it gives | Totals check |
|---|---|---|---|
| 1 | Stymie, https://stymie.golf/golf-courses/massachusetts/essex-county-county/hamilton/myopia-hunt-club (same data at `.../essex-county/hamilton/myopia-hunt-club`) | Red, White, Yellow per hole; par; men's stroke index; ratings/slopes per tee and gender | every row adds to its printed Out/In/Total |
| 2 | GolfPass, https://www.golfpass.com/courses/14971-myopia-hunt-club/scorecard-and-layout | Red, White, Yellow, Green per hole; par; men's and women's stroke index; a tee table with **older totals** (Red 6,539, White 6,108) and their ratings | rows add to printed totals; tee-table totals don't match the rows |
| 3 | golfcoursegurus (Billy Satterfield), https://www.golfcoursegurus.com/reviews/myopia-hunt-club/ | totals and ratings only: Red 6,555 72.7/138, White 6,190 71.1/134, Yellow (ladies) 5,495 72.4/137, par 72 (73 ladies) | totals only |
| 4 | Jon Cavalier tour (Geeked on Golf, 2016-05-30), https://geekedongolf.com/2016/05/30/myopia-hunt-club-tour-by-jon-cavalier/ and GolfClubAtlas thread https://www.golfclubatlas.com/forum/index.php/topic,59738.0.html | hole names, pars, one yardage per hole (tee unnamed; the tips) | adds to 6,553 (hole 9 = 136) |
| 5 | OpenGolfAPI, https://courses.opengolfapi.org/courses/MA/myopia-hunt-club | Red row only, labelled 6,539 but adding to 6,555; 73.2/135 | as source 2 |
| 6 | GolfNow, https://www.golfnow.com/courses/1031171-myopia-hunt-club-details | tee table only (= source 2's tee table) | — |
| 7 | Wikipedia, https://en.wikipedia.org/wiki/Myopia_Hunt_Club | par 72, 6,539 yd, 72.7/138 | — |
| 8 | Golf Digest, https://www.golfdigest.com/courses/ma/myopia-hunt-club ; GOLF https://golf.com/courses/myopia-hunt-club-golf-top-100-courses/ ; NEPGA https://nepga.com/news/hunting-for-the-100th/ | 6,555 yd, slope 138, par 72 (NEPGA: 6,555, par 72, for the 100th section championship; year not printed, 2020 by the series numbering since the 102nd was 2022) | — |

`scorecard.csv` = Red and White from sources 1 and 2 (identical), Yellow from
source 1 (men's row), Green from source 2 (its only source). Stroke index =
men's (sources 1 and 2 agree).

## The card (men's par 72)

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Name | First | Lookout | Brae | Miles River | Lone Tree | Brook | Myopia | Prairie | Pond | | Alps | Road | Valley | Hill | Ridge | Long | Paddock | West | Home | | |
| Par | 4 | 5 | 3 | 4 | 4 | 4 | 4 | 5 | 3 | 36 | 4 | 4 | 4 | 4 | 4 | 5 | 3 | 4 | 4 | 36 | 72 |
| HCP (men) | 16 | 14 | 8 | 4 | 2 | 12 | 6 | 10 | 18 | | 3 | 15 | 1 | 5 | 11 | 13 | 17 | 9 | 7 | | |
| HCP (women, src 2) | 16 | 12 | 6 | 8 | 2 | 14 | 10 | 4 | 18 | | 15 | 7 | 1 | 5 | 11 | 3 | 17 | 13 | 9 | | |
| Red | 276 | 488 | 252 | 385 | 417 | 255 | 401 | 473 | 138 | 3,085 | 404 | 349 | 451 | 358 | 393 | 529 | 192 | 394 | 400 | 3,470 | 6,555 |
| White | 263 | 460 | 242 | 364 | 387 | 246 | 395 | 466 | 132 | 2,955 | 363 | 321 | 444 | 326 | 351 | 492 | 181 | 388 | 369 | 3,235 | 6,190 |
| Yellow (src 1, men) | 225 | 433 | 204 | 318 | 370 | 216 | 342 | 439 | 128 | 2,675 | 281 | 308 | 447 | 283 | 313 | 428 | 150 | 317 | 293 | 2,820 | 5,495 |
| Green (src 2) | 220 | 370 | 123 | 207 | 300 | 216 | 272 | 354 | 62 | 2,124 | 281 | 223 | 317 | 210 | 245 | 372 | 120 | 312 | 215 | 2,295 | 4,419 |

Hole names from source 4. Every row was added up here and matches its printed
Out/In/Total. Men's indexes are all even on the front nine and all odd on the
back (unusual but a complete 1-18 set in both sources).

## Ratings and slopes

| Tee | Yards | Men | Women | Source |
|---|---|---|---|---|
| Red | 6,555 | 72.7 / 138 (gender not labelled on Stymie; golfcoursegurus, Wikipedia; Golf Digest slope 138) | — | 1, 3, 7, 8 |
| White | 6,190 | 71.1 / 134 | 77.4 / 142 | 1, 3 |
| Yellow | 5,495 (men) / 5,485 (women: hole 16 = 140) | 67.1 / 123 | 72.4 / 137 | 1, 3 |
| Club 9 (combo) | 5,850 men / 5,485 women | 68.8 / 128 | 74.2 / 139 | 1 (per-hole rows garbled, not usable) |
| Green | 4,419 | — | — | 2 (no rating) |
| *older card* Red | 6,539 | 73.2 / 135 | — | 2, 5, 6 |
| *older card* White | 6,108 | 71.0 / 131 | — | 2, 6 |
| *older card* Gold (W) | 5,525 | — | 72.8 / 128 (par 73) | 2, 6 |

Used: source 1's figures (they go with the yardages on the current card).

**Default tee (standing defaults):** no Blue; the set closest to 6,300 yd is
**White, 6,190 yd, 71.1 / 134** (Red is 6,555, 255 yd away).

## Conflicts (not averaged)

1. **Yellow hole 12:** 447 (source 1; its totals 2,820 / 5,495 agree with
   golfcoursegurus' 5,495) vs 443 (source 2, totals 2,816 / 5,491). CSV uses 447.
2. **Yellow hole 16:** 150 men's vs 140 women's (source 1). CSV uses 150.
3. **Red hole 9:** 138 (sources 1, 2, 5) vs 136 (source 4, a 2016 tour;
   total 6,553). CSV uses 138.
4. **Totals 6,555 vs 6,539, 6,190 vs 6,108:** the 6,539 / 6,108 figures (and
   73.2/135, 71.0/131) are an older card (Links Magazine: "6,539 yards", par 4s
   up to 446, hole 2 at 487). Not used.
5. **Ratings:** Red 72.7/138 vs 73.2/135; White 71.1/134 vs 71.0/131 (see above).
6. Stymie's FAQ calls White par 73; its card and every other source say 72.

## Missing

- An official printed card (stroke index, ratings, whether a Blue/combo set
  exists now). A photo of the club's card settles everything above.
- USGA NCRDB (ncrdb.usga.org) couldn't be reached from the sandbox; the
  developer can look up "Myopia Hunt Club" there for the official ratings.
- A historic card (1987, John Updike's) is in the East Carolina University
  library (https://digital.lib.ecu.edu/32482); it predates the 1995-2005
  lengthening and isn't used.

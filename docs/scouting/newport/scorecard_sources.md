# Newport Country Club — scorecard sources (2026-10-24)

## A. GolfPass (course 12085), read 2026-10-24

https://www.golfpass.com/courses/12085-newport-country-club/scorecard-and-layout
(280 Harrison Ave, Newport RI 02840; the same data at
golfpass.com/travel-advisor/...; GolfPass 12904 is Newport CC in Newport,
**Vermont**, and 3539 is not this club either: don't mix them up.)

Seven sets per hole, par 36-36-72, men's and women's stroke index. Every row
adds up to its printed total. This is what `scorecard.csv` holds.

| Set | Out | In | Total (card) | Total (tee table) | Rating / slope M | Rating / slope W |
|---|---|---|---|---|---|---|
| Black | 3,628 | 3,481 | 7,109 | 7,083 (par 70) | 75.5 / 135 | 76.8 / 137 |
| Black/Red | 3,473 | 3,288 | 6,761 | 6,756 | 73.6 / 131 | |
| Red | 3,363 | 3,214 | 6,577 | 6,571 | 72.5 / 128 | 78.9 / 139 |
| Red/White | 3,267 | 3,040 | 6,307 | 6,312 | 71.2 / 124 | |
| White | 3,182 | 3,022 | 6,204 | 6,188 | 70.7 / 122 | 76.8 / 135 |
| White/Blue | 3,047 | 2,877 | 5,924 | 5,862 | 69.9 / 118 | |
| Blue | 2,750 | 2,756 | 5,506 | 5,506 | 67.4 / 118 | 73.1 / 127 |

Conflicts inside the page: the tee table's lengths differ from the per-hole
rows for every set but Blue (above), and it gives Black as par 70 while the
per-hole par row is 72 (holes 1 and 12 are par 5 on the card; the club plays
them as par 4s from the back for championships, see C). The White/Blue row is
odd: on holes 3, 5, 11 and 15 it is longer than White (312 v 306, 411 v 410,
289 v 281, 403 v 395), which a combo set can't be; those four numbers equal
Wikipedia's White (B), so the combo row was probably built from an older
White.

## B. Wikipedia, "Newport Country Club", read 2026-10-24

https://en.wikipedia.org/wiki/Newport_Country_Club — a per-hole table with
hole names, four sets and three stroke-index columns; no date or source for
the table (the rating table under it cites the USGA Course Rating database,
retrieved 2018-05-09). Its rows add up to its printed totals.

| Hole | Name | Par | Black | Red | White | Blue | Black hcp | Red/White hcp | Blue hcp |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The First | 4/5 | 459 | 480 | 442 | 427 | 1 | 15 | 11 |
| 2 | The Cop | 4 | 410 | 366 | 352 | 341 | 15 | 11 | 9 |
| 3 | Ocean | 4 | 347 | 328 | 312 | 228 | 17 | 17 | 15 |
| 4 | Graves Point | 3 | 242 | 220 | 209 | 181 | 7 | 5 | 7 |
| 5 | Polo Shed | 4 | 451 | 422 | 411 | 347 | 5 | 1 | 1 |
| 6 | Lookout | 4 | 440 | 383 | 359 | 287 | 11 | 9 | 13 |
| 7 | Long Meadow | 5 | 598 | 553 | 512 | 454 | 9 | 7 | 5 |
| 8 | Willows | 3 | 192 | 177 | 164 | 155 | 13 | 13 | 17 |
| 9 | Orchard | 4 | 470 | 422 | 406 | 381 | 3 | 3 | 3 |
| Out | | 35/36 | 3,609 | 3,351 | 3,167 | 2,801 | | | |
| 10 | Quarry | 5 | 574 | 528 | 517 | 477 | 16 | 14 | 14 |
| 11 | Harbour | 4 | 321 | 298 | 289 | 245 | 18 | 18 | 18 |
| 12 | Valley | 4/5 | 463 | 477 | 436 | 396 | 2 | 16 | 10 |
| 13 | Club | 3 | 188 | 151 | 137 | 123 | 14 | 12 | 16 |
| 14 | Plateau | 3 | 209 | 189 | 172 | 159 | 10 | 6 | 12 |
| 15 | Brenton Reef | 4 | 473 | 411 | 403 | 391 | 4 | 2 | 2 |
| 16 | Island | 4 | 362 | 352 | 321 | 311 | 12 | 8 | 6 |
| 17 | Pond | 4 | 466 | 441 | 387 | 380 | 6 | 4 | 4 |
| 18 | Home | 4 | 420 | 379 | 365 | 318 | 8 | 10 | 8 |
| Total | | 70/72 | 7,085 | 6,577 | 6,194 | 5,601 | | | |

Ratings / slopes (USGA database, retrieved 2018-05-09): men's Black 75.4/135,
Red 72.4/127, White 70.6/121, Blue 67.3/117; women's White 76.7/134, Blue
73.0/126. The infobox says 7,075 yd, par 70 (uncited; the table says 7,085).

## A against B (never averaged)

Same pars and the same totals for Red (6,577), but most single holes differ
by a few yards, and the sets differ on several holes by much more:
Blue 7 418 (A) v 454 (B), Blue 3 222 v 228, Blue 9 370 v 381, Blue 11 241 v
245; White 2 366 v 352, White 14 178 v 172. Stroke indexes: A's men's index
matches none of B's columns; A's women's index equals B's Blue column. Neither
source is dated, so which is current is unknown (see "Open on the card").

## C. USGA U.S. Senior Open fact sheets (championship tees, par 70)

- 2024: https://championships.usga.org/ussenioropen/2024/articles/2024-us-senior-open-fast-facts.html
  (7,024 yd, par 70, rating 76.1 / slope 139)
- 2020 (cancelled; the same card for the planned event):
  https://digital-plt.usga.org/content/usga/home-page/championships/2020/2020-u-s--senior-open-fast-facts.html
  (7,070 yd, par 70; "subject to change"; the page swaps its OUT and IN labels)
- The USGA article https://championships.usga.org/ussenioropen/2024/articles/2024-us-senior-open-historic-newport-cc-rhode-island.html
  also says 7,070, par 70.

**The championship reversed the nines** (golftoday.co.uk and si.com, 2024;
the USGA article: "the ninth green is No. 18 for the championship"). Below in
the club's numbering (championship number in brackets). Both rows add up to
their totals (3,461 + 3,609 = 7,070; 3,434 + 3,590 = 7,024).

| Club hole | 1 (10) | 2 (11) | 3 (12) | 4 (13) | 5 (14) | 6 (15) | 7 (16) | 8 (17) | 9 (18) | 10 (1) | 11 (2) | 12 (3) | 13 (4) | 14 (5) | 15 (6) | 16 (7) | 17 (8) | 18 (9) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 4 | 4 | 5 | 3 | 4 | 5 | 4 | 4 | 3 | 3 | 4 | 4 | 4 | 4 |
| 2020 | 474 | 412 | 348 | 241 | 449 | 438 | 595 | 186 | 466 | 568 | 321 | 472 | 184 | 203 | 471 | 357 | 466 | 419 |
| 2024 | 455 | 412 | 348 | 241 | 449 | 438 | 595 | 186 | 466 | 568 | 321 | 472 | 184 | 203 | 444 | 357 | 466 | 419 |

Par 70 = the card's par 72 with holes 1 and 12 played as par 4s. Not in
`scorecard.csv` (no other set, no stroke index); kept here as a check on the
Black column and on the hole numbering.

## D. Totals only (not used)

- GolfNow 1036251 (https://www.golfnow.com/courses/1036251-newport-country-club-details):
  the same tee table as GolfPass (A), plus "Quick facts" par 70, 6,735 yd,
  72.7/129.
- 1golf.eu (https://www.1golf.eu/en/club/newport-country-club-2/): Black 6,735
  par 70 72.7/129, White 6,482 par 72 71.3/130, Red (women) 5,574 72.6/122:
  older figures.
- Golf Digest course page: 6,981 yd, slope 132.
- A The Golf Club 2019 recreation lists par 70, 74.9/134 (golfsimulatorforum.com).
- courses.opengolfapi.org (RI): a nine-hole par-32 list of 95-353 yd holes
  credited to OSM: not Newport's card; ignored.

## Not found

- The club's own card (a private club; no club page came up in searches) and
  the USGA Course Rating database page (ncrdb.usga.org pages don't come up in
  search, so the sandbox can't open them). BlueGolf, Stymie and 18Birdies have
  no page for this club in search results.
- A date for either per-hole source (A or B).

## What `scorecard.csv` holds

Source A (GolfPass) as printed: `hole,par,handicap,handicap_w` then
`black, black_red, red, red_white, white, white_blue, blue` (combo sets with
`_`). Par 72 (36-36). `handicap` is the men's index, `handicap_w` the women's.
Every column adds up to the card's printed totals (7,109 / 6,761 / 6,577 /
6,307 / 6,204 / 5,924 / 5,506). The `white_blue` column has the four
impossible holes noted under A: don't build it.

## Default tee

- **By the letter of the standing defaults (4.1): Blue**, 5,506 yd, par 72,
  men's 67.4 / 118, women's 73.1 / 127 (A). But Blue is Newport's **forward**
  set, about 700 yd shorter than any other single set.
- **Recommended: White**, 6,204 yd (A's per-hole row; A's tee table says
  6,188, B says 6,194), par 72, men's 70.7 / 122, women's 76.8 / 135 (A) —
  the single set closest to 6,300 yd, as the developer chose for TPC Boston
  (Blue forward there too). Red/White (6,307) is closer but is a combo set.
- Pars: the card's 72. If the developer prefers the championship par 70
  (holes 1 and 12 as par 4s), only `par` changes.

## Open on the card

1. Which per-hole card is current, A or B (they differ by up to 36 yd on a
   hole for the same set, e.g. Blue 7: 418 v 454)? A photo of the printed card
   from the club (or a member) settles it; save as `newport_scorecard.jpg`.
   Until then A is used: it is the only one with every set, both indexes and
   ratings, and its Blue total matches its tee table (and both A and B give Red
   6,577).
2. Ratings differ slightly between A (Black 75.5/135, White 70.7/122) and the
   2018 USGA figures in B (75.4/135, 70.6/121): A is probably newer (undated)
   and is used.

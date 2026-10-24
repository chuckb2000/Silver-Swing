# Eastward Ho! — scorecard sources (read 2026-10-24)

No official card is online (private club). Two different cards circulate:
**card B** (current, after Kyle Franz's 2024 restoration: new back tees on 15
and 18) and **card A** (before it, 6,437 yd from the tips, the card of 2022).
`scorecard.csv` is card B.

## Sources

| # | Source | What it gives | Totals check |
|---|---|---|---|
| 1 | GolfPass, https://www.golfpass.com/courses/7075-eastward-ho-club/ (also the travel-advisor page) | **card B**: 7 tee sets per hole, men's par 71, men's and women's stroke index, ratings/slopes per tee and gender | every yardage row adds to its printed Out/In/Total. The stroke-index rows are shifted one cell on the back nine (hole 10's value sits in the Out column, hole 18 is blank); read with hole 10 = 16 they give a full 1-18 set, matching source 2 |
| 2 | OpenGolfAPI, https://courses.opengolfapi.org/courses/MA/fb083eb9-1317-473f-8047-1b3618e1de04 | card B, Championship row only, with the unshifted men's index (10 = 16 ... 18 = 6) | adds to 6,728 |
| 3 | GolfNow, https://www.golfnow.co.uk/courses/1031073-eastward-ho-country-club-details | card B tee table (same ratings as 1); quick facts 6,215 yd 70.3/130 (matches no tee) | — |
| 4 | Stymie, https://stymie.golf/golf-courses/massachusetts/barnstable-county/chatham/eastward-ho-country-club | **card A**: Black, Blue, Gold, White, Combo, Green per hole with ratings; its par and index rows are the women's (par 73: 6 and 18 par 5) | every row adds to its printed total |
| 5 | NEPGA, https://nepga.com/news/friedman-clinches-102nd-nepga-section-championship-title-in-playoff-fashion/ | 102nd Section Championship, centennial year (2022), par 71, **6,437 yd** (= card A Black) | — |
| 6 | golfcoursegurus, https://www.golfcoursegurus.com/reviews/eastward-ho!/ | card A totals: Black 6,437 72.2/143, Blue **6,157** 70.6/141, Gold **5,809** 69.3/133, White 5,378 67.1/122, Green (ladies) **4,352** 66.9/119; par 71 (73 ladies); hole yardages 3 = 326, 4 = 182, 6 = 455, 11 = 485, 15 = 153, 18 = 460 | totals only |
| 7 | Jon Cavalier tour (2017), https://geekedongolf.com/2017/08/03/eastward-ho-tour-by-jon-cavalier/ and https://www.golfclubatlas.com/forum/index.php/topic,59919.0.html | an older back-tee card: par 71, **6,372** yd, 71.7/135 | adds to 6,372 |
| 8 | GOLF, https://golf.com/courses/eastward-ho/ | par 71, 6,437 | — |
| 9 | Golf Digest, https://www.golfdigest.com/courses/ma/eastward-ho | 6,711 yd, slope 124; "the 18th can be set up as a par 4 or par 5, for a par 71 or 72"; a 2026 reviewer: 6,437 from the tips in 2022, before the restoration | — |
| 10 | GCSANE newsletter June 2007, https://listings.lib.msu.edu/newsl/2007jun.pdf | par 71, 6,325 from the back tees (2007) | — |
| 11 | where2golf, https://where2golf.com/usa-new-england/eastward-ho-country-club | Back 6,351 / Club 5,894 / Front 4,730 (par 72), 72.2 / 69.7 / 67.1 (unlabelled) | — |

## Card B (current; `scorecard.csv`; men's par 71)

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 4 | 35 | 3 | 5 | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 36 | 71 |
| HCP men | 7 | 9 | 11 | 17 | 3 | 1 | 15 | 13 | 5 | | 16 | 2 | 8 | 12 | 14 | 18 | 4 | 10 | 6 | | |
| HCP women | 5 | 9 | 13 | 15 | 1 | 3 | 17 | 11 | 7 | | 16 | 2 | 14 | 12 | 8 | 18 | 6 | 4 | 10 | | |
| Championship | 387 | 350 | 348 | 182 | 525 | 510 | 181 | 364 | 396 | 3,243 | 201 | 507 | 349 | 354 | 371 | 187 | 433 | 537 | 546 | 3,485 | 6,728 |
| Black | 387 | 350 | 326 | 182 | 525 | 455 | 181 | 364 | 396 | 3,166 | 201 | 507 | 349 | 354 | 371 | 187 | 407 | 537 | 530 | 3,443 | 6,609 |
| **Blue** | 380 | 334 | 310 | 165 | 492 | 415 | 168 | 325 | 381 | 2,970 | 190 | 485 | 337 | 331 | 369 | 145 | 380 | 516 | 504 | 3,257 | **6,227** |
| Gold | 370 | 300 | 261 | 162 | 475 | 405 | 155 | 318 | 364 | 2,810 | 174 | 455 | 323 | 322 | 325 | 132 | 362 | 510 | 462 | 3,065 | 5,875 |
| White | 343 | 295 | 251 | 149 | 464 | 386 | 140 | 305 | 355 | 2,688 | 150 | 410 | 256 | 264 | 314 | 107 | 304 | 451 | 448 | 2,704 | 5,392 |
| White/Green | 264 | 221 | 201 | 149 | 349 | 386 | 140 | 305 | 355 | 2,370 | 125 | 410 | 256 | 264 | 314 | 107 | 304 | 451 | 396 | 2,627 | 4,997 |
| Green | 264 | 221 | 201 | 91 | 349 | 261 | 62 | 289 | 300 | 2,038 | 125 | 345 | 224 | 262 | 258 | 78 | 281 | 391 | 325 | 2,289 | 4,327 |

Women's pars (73) aren't printed per hole on GolfPass; card A's par row (women's)
makes 6 and 18 par 5.

Ratings / slopes (source 1; source 3 agrees):

| Tee | Yards | Men (par 71) | Women (par 73) |
|---|---|---|---|
| Championship | 6,728 | 73.3 / 149 | — |
| Black | 6,609 | 73.0 / 142 | 80.0 / 145 |
| **Blue** | 6,227 | **70.8 / 137** | 77.5 / 137 |
| Gold | 5,875 | 69.5 / 133 | 74.7 / 133 |
| White | 5,392 | 66.9 / 118 | 71.7 / 131 |
| White/Green | 4,997 | 64.5 / 113 | 69.7 / 125 |
| Green | 4,327 | 62.1 / 103 | 66.3 / 117 |

**Default tee (standing defaults): Blue, 6,227 yd, 70.8 / 137.**

## Card A (before the 2024 restoration; Stymie)

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par (women's row) | 4 | 4 | 4 | 3 | 5 | 5 | 3 | 4 | 4 | 36 | 3 | 5 | 4 | 4 | 4 | 3 | 4 | 5 | 5 | 37 | 73 |
| HCP (as printed) | 5 | 9 | 13 | 15 | 1 | 3 | 17 | 11 | 7 | | 16 | 2 | 12 | 14 | 8 | 18 | 6 | 4 | 10 | | |
| Black | 380 | 350 | 326 | 182 | 525 | 455 | 181 | 348 | 396 | 3,143 | 208 | 485 | 333 | 336 | 371 | 153 | 411 | 537 | 460 | 3,294 | 6,437 |
| Blue | 373 | 345 | 305 | 165 | 499 | 410 | 168 | 338 | 381 | 2,984 | 195 | 485 | 320 | 326 | 365 | 145 | 380 | 520 | 448 | 3,184 | 6,168 |
| Gold | 363 | 334 | 289 | 155 | 475 | 399 | 155 | 318 | 364 | 2,852 | 184 | 448 | 313 | 322 | 316 | 137 | 362 | 505 | 404 | 2,991 | 5,843 |
| White | 357 | 295 | 256 | 149 | 464 | 386 | 140 | 305 | 355 | 2,707 | 179 | 405 | 236 | 264 | 308 | 128 | 304 | 451 | 396 | 2,671 | 5,378 |
| Combo | 271 | 221 | 197 | 149 | 349 | 386 | 140 | 305 | 355 | 2,373 | 135 | 405 | 236 | 264 | 308 | 128 | 304 | 391 | 396 | 2,567 | 4,940 |
| Green (W; men's 16 = 281, total 4,408) | 271 | 221 | 197 | 147 | 349 | 276 | 62 | 303 | 300 | 2,126 | 135 | 340 | 234 | 262 | 258 | 78 | 300 | 391 | 303 | 2,301 | 4,427 |

Ratings men / women: Black 72.2/143 / 78.7/143; Blue 70.6/141 / 77.3/141; Gold
69.3/133 / 75.4/137; White 67.1/122 / 71.9/128; Combo 65.1/114 / 69.7/123;
Green 62.8/111 / 66.9/119. Men's par on this card is 71 (sources 5, 6, 8).

The 2017 tour card (source 7, 6,372): card A Black except 6 = 421 and 16 = 380.

## Conflicts (not averaged)

1. **Which card:** B is the current card (it has the restoration's new back
   tees: 15 Championship/Black 187 = the old 153 + "a new tee adds 30 yards";
   18 546/530 = "a new back tee", Links Magazine). A is the 2022 card. Both add
   up. Blue differs on 1 (+7), 2 (-11), 3 (+5), 5 (-7), 6 (+5), 8 (-13),
   10 (-5), 12 (+17), 13 (+5), 14 (+4), 17 (-4) and **18 (+56: 504 vs 448)**.
2. **Hole 18 par:** card B prints par 4 (504 from Blue, 546 from the tips);
   Golf Digest and Links say the new tee lets it play as a par 4 or 5.
3. **Totals:** Golf Digest lists 6,711 (17 yd short of 6,728); golfcoursegurus
   lists Blue 6,157, Gold 5,809, Green 4,352 against card A's 6,168, 5,843,
   4,427/4,408 (another revision of card A).
4. **Stroke index:** card B men's (1, 2) vs card A's printed row (the women's;
   12 and 13 are 12/14 there and 14/12 in card B's women's row).
5. **Ratings:** Blue 70.8/137 (B) vs 70.6/141 (A); the GolfNow "quick facts"
   6,215 / 70.3/130 matches neither.

## Missing

- An official card photo would settle card B's par on 18 and its index rows.
- USGA NCRDB (ncrdb.usga.org, "Eastward Ho") couldn't be reached from the
  sandbox; the developer can check the current ratings there.

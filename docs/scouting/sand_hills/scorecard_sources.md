# Sand Hills Golf Club — scorecard sources (read 2026-10-24)

Private club; no card on the web from the club itself. One per-hole source
was found (GolfPass); a review site confirms five holes and the tee totals.
The scouting's web-search budget ran out before BlueGolf, the USGA Course
Rating database (ncrdb.usga.org) and the Nebraska Golf Association could be
searched: a course chat with search can still try them.

## `scorecard.csv`

From GolfPass's per-hole card:
https://www.golfpass.com/courses/14980-sand-hills-golf-club/scorecard-and-layout

GolfPass labels its three per-hole rows Black, White and Red; its tee table
(and the review below) names the club's tees **Diamond, Square and Circle**
with totals that match those rows, so the CSV columns are `diamond` (= Black),
`square` (= White), `circle` (= Red). `handicap` = GolfPass's men's handicap
(a complete 1-18); no women's indexes were given.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 4 | 35 | 4 | 4 | 4 | 3 | 5 | 4 | 5 | 3 | 4 | 36 | 71 |
| HCP (men) | 14 | 10 | 2 | 8 | 16 | 4 | 18 | 6 | 12 | | 13 | 9 | 1 | 7 | 15 | 3 | 17 | 5 | 11 | | |
| Diamond | 549 | 458 | 216 | 485 | 412 | 198 | 283 | 367 | 402 | 3,370 | 472 | 408 | 417 | 216 | 508 | 453 | 612 | 150 | 467 | 3,703 | 7,073 |
| Square | 521 | 368 | 216 | 409 | 387 | 198 | 283 | 326 | 371 | 3,079 | 426 | 348 | 354 | 185 | 475 | 422 | 563 | 150 | 432 | 3,355 | 6,434 |
| Circle | 454 | 284 | 111 | 307 | 280 | 96 | 231 | 236 | 229 | 2,228 | 351 | 296 | 303 | 146 | 401 | 311 | 533 | 101 | 382 | 2,824 | 5,052 |

Every row adds up to GolfPass's printed Out, In and Total. Pars add to 35 +
36 = 71.

## Totals check against the tee table

| Tee | Per-hole sum | Tee-table total (GolfPass; same on golfcoursegurus) | Difference |
|---|---|---|---|
| Diamond | 7,073 | 7,089 | −16 |
| Square | 6,434 | 6,432 | +2 |
| Circle | 5,052 | 5,040 | +12 |

**Hole 15 (Diamond):** GolfPass 453; golfcoursegurus' hole note says the 15th
is a **469**-yd par 4. 7,073 − 453 + 469 = **7,089**, exactly the Diamond total
both sites print. So the per-hole card is probably an older or mistyped
version on 15. The CSV keeps GolfPass's 453 (one per-hole source, not mixed);
recommendation: use 469 if Diamond is ever built (it isn't by default).

Square (2 yd) and Circle (12 yd) differences can't be placed on a hole from
these sources; they don't affect the build beyond noise.

## Ratings and slopes (GolfPass tee table)

| Tee | Yards | Men rating / slope | Women rating / slope |
|---|---|---|---|
| Diamond | 7,089 | 73.0 / 130 | — |
| Square | 6,432 | 70.0 / 127 | — |
| Circle | 5,040 | 69.0 / 117 | 71.3 / 128 |

(Circle's men's 69.0 at 5,040 yd looks high for its length; it is as printed.)

## Default tee (standing defaults)

No Blue; the set closest to 6,300 yd is **Square: 6,432 (tee table) / 6,434
(per-hole sum), 70.0 / 127**.

## Other per-hole mentions (golfcoursegurus review)

https://www.golfcoursegurus.com/reviews/sand-hills-golf-club/ : 1st 549 par 5,
4th 485 par 4, 7th 283 par 4, 15th 469 par 4, 17th 150 par 3; tees Diamond
7,089, Square 6,432, Circle 5,040, all par 71. Agrees with GolfPass's Diamond
row on 1, 4, 7 and 17.

## Not this course

- Stymie's "Sand Hills Golf Club" page
  (https://stymie.golf/golf-courses/nebraska/hooker-county/mullen/sand-hills-golf-club)
  names Coore & Crenshaw, 1995 and the address "Hwy 97 Mile Marker 55, Mullen",
  but its scorecard is a different, nine-hole par-35 card (tees IV ... I,
  3,205 yd from the back) that matches none of Sand Hills' holes. Its address
  and map coordinates were used for the box (with a check, DATA_REQUEST step 0);
  its card was not.
- GolfPass 12685 "Sand Hills Golf & Country Club", 27907 "Sand Hills Golf
  Resort" and "Lake of the Sandhills" are other courses.

## What's missing

- The club's own card (a photo of the printed card is the fix; the club is
  private and members-only).
- Women's stroke indexes; ratings for Diamond and Square (women).
- Whether GolfPass's per-hole card is current (hole 15 says it may not be).

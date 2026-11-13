# Fishers Island Club — scorecard sources (read 2026-10-24)

No official card is online (private club). Only two per-hole lists exist,
from different sources and probably different years; neither names its tee
for certain. `scorecard.csv` keeps them as separate columns; nothing is
averaged. **This is the weakest card of the three courses: a photo of the
printed card is the top request.**

## A. OpenGolfAPI (par, stroke index and the `blue` column)

https://courses.opengolfapi.org/courses/ny/fishers-island-golf-country-club
("Fishers Island Golf Country Club")

- Tee list: **Blue 6,544, 71.8 / 143 (men)**; White 6,138; Gold 5,411
  (listed twice); Red/Gold 5,306; Green 4,015 (listed twice). Only Blue has a
  rating.
- One per-hole yardage row, **not labelled**: Out 3,207, In 3,296, total
  6,503 (adds up). It is used as `blue` because Blue is the only rated tee on
  the page and the nearest total, but it is **41 yd short of the Blue total
  (6,544)**: unverified.
- Par 4 3 4 4 3 5 4 5 4 (36) / 4 3 4 4 4 5 3 4 5 (36) = 72: holes 8 and 18
  are par 5s.
- Stroke index 8 14 10 2 6 12 4 18 16 / 3 13 11 5 1 9 17 7 15 (a full 1-18
  set, even on the front, odd on the back).

## B. The Fried Egg (the `back` column)

https://www.thefriedegg.com/courses/fishers-island-club

- Names, pars and yards for all 18; adds to **6,636**, the total the page
  states. Tee not named (the longest yardages found: taken as the back tees).
- Par 70: holes 8 and 18 are par 4s. The Fried Egg's longer article
  (https://thefriedegg.com/fishers-island-club/) says the 8th was "converted
  to a par 4 in the early 2000s" and prints 18 as par 5 in a header but par 4
  in the text.
- On holes 7 and 17 this list is 2 yd *shorter* than list A, so A and B are
  not two tees of one card.

| Hole | Name | Par (B) | Yards (B) |
|---|---|---|---|
| 1 | Raynor's Start | 4 | 396 |
| 2 | Redan | 3 | 184 |
| 3 | Plateau | 4 | 335 |
| 4 | Punch Bowl | 4 | 412 |
| 5 | Biarritz | 3 | 229 |
| 6 | Olinda | 5 | 555 |
| 7 | Latimer | 4 | 363 |
| 8 | Road Hole | 4 | 465 |
| 9 | Double Plateau | 4 | 364 |
| 10 | Knoll | 4 | 401 |
| 11 | Eden | 3 | 164 |
| 12 | Winthrop | 4 | 389 |
| 13 | Waterloo | 4 | 400 |
| 14 | Cape | 4 | 425 |
| 15 | Long | 5 | 541 |
| 16 | Short | 3 | 146 |
| 17 | Coast Guard | 4 | 415 |
| 18 | Home | 4 | 452 |

## Other totals

| Source | What it says |
|---|---|
| Wikipedia https://en.wikipedia.org/wiki/Fishers_Island_Club | par 72, 6,616 yd, rating 72.0 (no slope) |
| Links Magazine https://linksmagazine.com/?p=19145 | 6,616 yd; 8 a par 5; 18 a par 5 of 452 yd (Raynor's was a 433-yd par 4; members wanted a birdie chance to finish) |
| Today's Golfer (world top 100, 21-30) | par 72, 6,566 yd |
| Top100golfcourses https://www.top100golfcourses.com/golf-course/fishers-island | 9th 365 yd; 18th over 450, "a par 5 in stroke play" |

**Par conflict:** 72 on the cards and most listings (8 and 18 par 5) vs 70
in the Fried Egg (the architects' par). `scorecard.csv` uses 72 (card A,
with its stroke index); the course chat should follow the printed card if
one arrives.

## Default tee (standing defaults)

**Blue: 6,544 yd, 71.8 / 143** (OpenGolfAPI tee list); the per-hole row
used for it adds to 6,503.

## Missing

- The printed card: per-hole yards for every tee (Blue above all), pars
  (70 or 72), stroke index, women's ratings, and the slope for the back tees.

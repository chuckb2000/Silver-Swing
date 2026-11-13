# Baltimore Country Club (East Course) — scorecard sources (read 2026-10-24)

**Status: third-party per-hole card (GolfPass), tee names inferred for all
rows but Black; no official club card online.** `scorecard.csv` is the GolfPass
per-hole card. The club's printed card (a photo) would settle the tee names.

## 1. GolfPass (read 2026-10-24) — the per-hole source

https://www.golfpass.com/travel-advisor/courses/14965-baltimore-country-club-east-course/scorecard-and-layout

The per-hole yardage rows are labelled I, I/II, II, II/III, III, III/IV, IV,
IV/V, V (not tee names). Every row adds up to its printed out/in/total
(checked):

| Row | Out | In | Total | Column in scorecard.csv | Rated total (tee table) | Diff |
|---|---|---|---|---|---|---|
| I | 3571 | 3610 | 7181 | `black` | Black 7181 | 0.0 % |
| I/II | 3412 | 3456 | 6868 | `black_blue` | none | — |
| II | 3316 | 3304 | 6620 | `blue` | Blue 6664 | −0.7 % |
| II/III | 3214 | 3209 | 6423 | `blue_white` | Blue/White 6410 | +0.2 % |
| III | 3120 | 3136 | 6256 | `white` | White 6201 | +0.9 % |
| III/IV | 2955 | 3028 | 5983 | `gold` | Gold 5948 | +0.6 % |
| IV | 2883 | 2934 | 5817 | `red` | Red 5725 | +1.6 % |
| IV/V | 2682 | 2638 | 5320 | `red_green` | Red/Green 5260 | +1.1 % |
| V | 2651 | 2523 | 5174 | `green` | none | — |

**Tee names are inferred** (only row I = Black matches a rated total). The
mapping takes the rows in order and pairs each with the rated total it is
closest to; every pair is within 1.6 %. Two points are shaky: Gold pairs with
the III/IV combination row (Gold may be a combination set on the club's card),
and the alternative IV = Gold, V = Red fails (V is 9.6 % short of Red). The
rows and the tee table seem to be different editions of the card (tees moved
or re-rated). Never average them; the course chat validates against the
per-hole rows and records the rated totals beside them.

Par (men): 4 4 4 3 4 5 4 4 3 = 35 / 4 4 4 3 5 4 4 3 4 = 35 → **70**.
Men's stroke index: 5 1 11 17 7 3 9 13 15 / 12 2 10 18 4 6 8 16 14 (odd out,
even in; a permutation of 1-18, checked).
Women's stroke index: 7 3 11 15 5 1 9 13 17 / 4 8 6 18 2 10 12 16 14.
**Women's par is 75** in the tee table, but the page has no women's par row,
so which holes play longer for women is not known (open item).

Ratings and slopes (same page):

| Tee | Gender | Par | Yards | Rating | Slope |
|---|---|---|---|---|---|
| Black | M | 70 | 7181 | 75.1 | 141 |
| Blue | M | 70 | 6664 | 72.9 | 136 |
| Blue/White | M | 70 | 6410 | 71.5 | 131 |
| White | M | 70 | 6201 | 70.6 | 129 |
| White | W | 75 | 6201 | 76.9 | 149 |
| Gold | M | 70 | 5948 | 68.8 | 128 |
| Gold | W | 75 | 5948 | 75.5 | 146 |
| Red | M | 70 | 5725 | 68.0 | 126 |
| Red | W | 75 | 5725 | 74.3 | 143 |
| Red/Green | W | 75 | 5260 | 71.5 | 130 |

No rating for Black/Blue or Green.

## 2. OpenGolfAPI (read 2026-10-24) — not independent

https://courses.opengolfapi.org/courses/MD/baltimore-country-club — the same
Black row, par, men's SI and tee totals as GolfPass (same upstream data).

## 3. USGA, 2026 U.S. Senior Amateur (read 2026-10-24) — championship set-up

https://championships.usga.org/ussenioramateur/2026/articles/fast-facts-2026-us-senior-amateur.html
(per hole, "subject to change"); course/slope 72.9/137 from
https://www.amateurgolf.com/golf-tournament-news/2026-us-senior-amateur-at-baltimore-cc-preview-how-to-watch-the-field-course-and-full-coverage-hub-1d819e

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 4 | 3 | 35 | 4 | 4 | 4 | 3 | 5 | 4 | 4 | 3 | 4 | 35 | 70 |
| Yards | 415 | 422 | 371 | 140 | 395 | 580 | 377 | 359 | 175 | 3234 | 385 | 410 | 396 | 159 | 570 | 420 | 440 | 168 | 382 | 3330 | 6564 |

Totals check: 3,234 + 3,330 = 6,564 (matches). Same pars as GolfPass. This is
a mix of tees chosen per hole for the championship, not a tee set, so it is
not a column in `scorecard.csv`; it is the most recent per-hole yardage
published (August 2026) and a cross-check for the measured layout: every
hole lies between the `white` and `black` columns except hole 5 (395, just
under `white` 397; `black` is 504) — i.e. the set-up mixed back and middle
tees, as championships do.

## 4. Other totals seen (no per-hole data)

| Source | Yards | Note |
|---|---|---|
| Wikipedia | 7,181, par 70 | = Black |
| Golf Digest (golfdigest.com/story/baltimore-country-club-east) | 7,002, slope 141 | a different edition |
| where2golf (www.where2golf.com/course.aspx?id=45188) | Back 6,844 / 74.5; Club 5,892 / 68.8; Front 5,941 par 75 / 75.3 | older card (pre-2015 restoration?) |
| club site bcc1898.com/golf | par 70 | no card |

## Not found

- The club's own card (no PDF or image on bcc1898.com; the club is private).
- BlueGolf, Stymie, USGA NCRDB and MSGA pages: no search returned them, so
  they couldn't be opened.
- golfingrecord.com has East and West cards but is off-limits.

## Default tee (standing defaults)

**Blue**: per-hole 6,620 yd (row II), rated 6,664 yd, 72.9 / 136 (men).

## West Course

Not done: GolfPass's West page (id 7017) redirects to an address the sandbox
can't open, and the only other per-hole source found is golfingrecord.com.
Known: par 72, about 6,795-6,800 yd (Wikipedia, where2golf). No
`scorecard_west.csv`.

## Conflicts

1. Per-hole rows vs rated tee totals (above): Blue 6,620 vs 6,664; White
   6,256 vs 6,201; Red 5,817 vs 5,725; etc. Recorded, not averaged.
2. Women's par 75 vs the single par-70 row: per-hole women's pars unknown.
3. Total length across sources: 7,181 (GolfPass, Wikipedia), 7,002 (Golf
   Digest), 6,844 (where2golf).

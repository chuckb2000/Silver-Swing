# Strawberry Farms — scorecard sources (read 2026-10-24)

No official card was found online. The club's website (sf-golf.com, named by
Greenskeeper and KTLA) never came up in search, so it could not be opened. Three
third-party per-hole sources were read, and they disagree. `scorecard.csv` is
**GolfPass**, the highest-ranked per-hole source in the guide's order. Every one
of its rows adds up to its printed totals. The other two sources are kept below
for the course chat. No values were averaged or mixed.

## Sources

| # | Source | URL | What it gives |
|---|---|---|---|
| A | GolfPass "Scorecard and layout" | https://www.golfpass.com/courses/15312-strawberry-farms-golf-club/scorecard-and-layout | all 18 holes for Black, Blue, White, Gold, Red; men's and women's stroke index; tee table with ratings (older) |
| B | Greenskeeper.org scorecard | https://www.greenskeeper.org/southern_california/orange_county/Strawberry_Farms_Golf_Club/scorecard.cfm | all 18 holes; men's and women's par and stroke index; same older ratings as A; has typos (below) |
| C | Stymie (GHIN-style data) | https://stymie.golf/golf-courses/california/orange-county/irvine/strawberry-farms-golf-club | all 18 holes for every tee, a **different** (newer?) measurement: Black 6,723, Blue 6,302 |
| D | SCGA course page (the regional rating authority) | https://www.scga.org/courses/details/strawberry-farms-golf-club | **current ratings**, men's and women's; front nine per hole only (the back nine didn't load as text) |
| E | 18Birdies | https://18birdies.com/golf-courses/club/8acaf050-86ac-11e4-8c28-020000005b00/strawberry-farms-golf-club | Black per hole = A; ratings = C's |
| F | OpenGolfAPI (OSM-based) | https://courses.opengolfapi.org/courses/CA/strawberry-farms-golf-club | Black per hole = A; Black 72.7/136 |
| G | GolfNow | https://www.golfnow.com/courses/1050929-strawberry-farms-details | tee table = A's |

Par 71 (36/35) and the men's stroke index are the same in A, B, C and F:
13, 5, 9, 1, 3, 11, 17, 15, 7 / 12, 14, 2, 6, 8, 18, 10, 16, 4.
Women's stroke index (A, B): 9, 13, 15, 1, 5, 7, 17, 11, 3 / 12, 14, 6, 8, 10, 18, 2, 16, 4.
Women's par is 72 (B: hole 12 is a par 6 for women).

## Totals check (my sums against each source's own printed totals)

| Tee | A out/in/total (sum) | A printed | C sum | C printed | D front 9 (sum = printed) | D total | D back 9 implied |
|---|---|---|---|---|---|---|---|
| Black | 3,499 / 3,201 / 6,700 | 6,700 | 6,723 | 6,723 | 3,477 | 6,680 | 3,203 |
| Blue | 3,252 / 3,024 / 6,276 | 6,276 | 6,302 | 6,302 | 3,256 | 6,271 | 3,015 |
| White | 3,028 / 2,808 / 5,836 | 5,836 (tee table: **5,805**) | 5,855 | 5,855 | 3,038 | 5,841 | 2,803 |
| Gold | 2,708 / 2,535 / 5,243 | 5,243 | 5,248 | 5,248 | 2,715 | 5,218 | 2,503 |
| Red | 2,462 / 2,370 / 4,832 | 4,832 | 4,654 | 4,654 | 2,389 | 4,648 | 2,259 |

## Conflicts

1. **Three measurements.** A (with B, E, F, G) is the long-standing card:
   6,700 / 6,276 / 5,805 / 5,243 / 4,832. C is another full measurement,
   6,723 / 6,302 / 5,855 / 5,248 / 4,654. D gives the current SCGA totals,
   6,680 / 6,271 / 5,841 / 5,218 / 4,648. D's Black front nine matches C hole for
   hole. D's back-nine totals (implied) are closer to A's (Black 3,203 vs A
   3,201, C 3,246).
2. **Blue (the default tee), hole by hole, A vs C:** every hole is within 4 %
   except **hole 18: A 385, C 418 (+8.6 %)** (Black: A 403, C 435). Hole 3: A 179,
   C 172, D 173 (−3.9 %). The course chat should measure 18 and say which card
   the tee fits.
3. **White total:** A's own hole 1 is 364, which sums to 5,836, but its tee table
   says 5,805. B has hole 1 = 333, which sums to 5,805. Most likely one card
   printing had 333.
4. **B's typos:** Black hole 7 is 117 (A, E and F have 177, and only 177 adds up to
   6,700). Blue holes 6/7/8 are 499/152/292 (A has 497/151/295; both add up to
   3,252). B's "White - Ladies" hole 7 is 113 and its total is printed as 4,832.
5. **Red hole 4:** A and B have 354, but C has 295 and D has 293. That's 60 yd
   apart, and D's Red front nine is 73 yd shorter than A's, nearly all of it on
   this hole. It's probably an old typo or an old tee, and it doesn't matter for
   the Blue build.
6. **Ratings:** three generations, listed below. D is the SCGA's current
   rating and the one to use.

## Ratings and slopes

| Tee | Yards (D) | Men D (SCGA, current) | Women D | Men A/B/G (printed card, older) | Women A/B/G | C/E (GHIN-derived, in between) |
|---|---|---|---|---|---|---|
| Black | 6,680 | 73.0 / 134 (par 71) | 79.3 / 142 (par 72) | 72.7 / 136 | — | 72.9 / 133; women 77.5 / 138 (E) |
| **Blue** | 6,271 | **71.0 / 129** | 77.1 / 136 | 70.7 / 131 | — | 70.9 / 128; women 76.8 / 136 |
| White | 5,841 | 69.0 / 124 | 74.7 / 131 | 68.5 / 126 | 74.1 / 128 | 68.7 / 123; women 74.1 / 128 |
| Gold | 5,218 | 66.1 / 116 | 71.5 / 123 | 65.9 / 118 | 70.9 / 121 | 65.8 / 115; women 70.9 / 121 |
| Red | 4,648 | 63.5 / 109 | 68.3 / 116 | — | 68.7 / 114 | 63.1 / 108; women 68.7 / 114 |

## Default tee (standing defaults 4.1)

**Blue**: 6,276 yd on the card in `scorecard.csv` (6,271 SCGA), par 71. Rating
71.0 / 129 (SCGA men's, current). Black, White, Gold and Red go in the CSV but
are not built.

## What would settle it

The club's current printed card (a photo from the pro shop, or the card on
sf-golf.com if it's posted there), together with the course chat's measurement of
hole 18's Blue and Black tees.

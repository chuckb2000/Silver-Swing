# Pelican Hill — scorecard sources (2026-10-24)

Two courses, two cards. The CSVs follow GolfPass, the only per-hole source for
all 18 holes and every tee that could be read. SCGA (the regional rating
authority) gives the front nine per hole and the ratings, and its yardages are
slightly different (below). Nothing was averaged.

| File | Course | From |
|---|---|---|
| `scorecard_ocean_south.csv` | Ocean South (build first) | GolfPass 15463 |
| `scorecard.csv` | the same as `scorecard_ocean_south.csv` (if Ocean South is built without `layouts`) | GolfPass 15463 |
| `scorecard_ocean_north.csv` | Ocean North (second `layouts` course) | GolfPass 15464 |

## Sources read

| # | Source | URL | Read | Gave |
|---|---|---|---|---|
| 1 | GolfPass, Ocean South | https://www.golfpass.com/courses/15463-the-ocean-south-at-pelican-hill-golf-club/scorecard-and-layout | 2026-10-24 | par, men's handicap, yards per hole for Black, Blue, White, Red, Yellow; out/in/total; ratings/slopes men's and women's. Undated |
| 2 | GolfPass, Ocean North | https://www.golfpass.com/courses/15464-the-ocean-north-at-pelican-hill-golf-club/scorecard-and-layout | 2026-10-24 | the same for Ocean North, plus a women's handicap row (suspect, below). Undated |
| 3 | SCGA course page | https://www.scga.org/courses/details/pelican-hill-golf-club | 2026-10-24 | both courses: front nine per hole (par, yards, five tees), men's and women's rating/slope/par/total per tee. No handicaps |
| 4 | The resort, Ocean South page | https://www.pelicanhill.com/golf/ocean-south-course/ | 2026-10-24 | par 70, 6,580 yd; per-hole par and yards from the back (Black) tee: **identical to GolfPass Black on all 18 holes**. Links the official card `https://pelicanhill.com/images/SCORECARD_SouthCourse_June2022_Online.pdf` (not opened: no search returned it) |
| 5 | The resort, Ocean North page | https://www.pelicanhill.com/golf/ocean-north-course/ | 2026-10-24 | par 71, 6,945 yd; per-hole par and Black yards: **identical to GolfPass Black on all 18 holes**. Official card `https://pelicanhill.com/images/SCORECARD_NorthCourse_June2022_Online.pdf` (not opened) |
| 6 | ShotNavi | https://shotnavi.jp/world/840/31/gc_308.htm | 2026-10-24 | both courses per hole for three tees labelled Back / Reg / Ladies: identical to GolfPass Blue / White / Red on all 36 holes (possibly the same data supplier) |

## Totals check (GolfPass rows added up)

Every row adds up to GolfPass's printed out / in / total; pars 35+35 = 70
(South) and 36+35 = 71 (North); handicaps 1-18 once each on both courses (South:
odd on the front, even on the back).

### Ocean South (par 70)

| Tee | Out | In | Total | Men's rating / slope | Women's rating / slope |
|---|---|---|---|---|---|
| Black | 3,255 | 3,325 | 6,580 | 72.0 / 133 | — |
| **Blue** | 3,148 | 3,175 | **6,323** | **70.6 / 130** | — |
| White | 2,947 | 2,982 | 5,929 | 69.0 / 125 | 75.2 / 138 |
| Red | 2,723 | 2,670 | 5,393 | 66.6 / 118 | 72.4 / 132 |
| Yellow | 2,354 | 2,369 | 4,723 | 63.6 / 109 | 68.0 / 119 |

### Ocean North (par 71)

| Tee | Out | In | Total | Men's rating / slope | Women's rating / slope |
|---|---|---|---|---|---|
| Black | 3,606 | 3,339 | 6,945 | 73.5 / 137 | — |
| **Blue** | 3,399 | 3,164 | **6,563** | **71.6 / 132** | 78.5 / 145 (GolfPass only) |
| White | 3,273 | 2,997 | 6,270 | 70.1 / 128 | 76.6 / 142 |
| Red | 3,045 | 2,765 | 5,810 | 68.1 / 122 | 74.0 / 136 |
| Yellow | 2,552 | 2,399 | 4,951 | 64.1 / 111 | 69.3 / 124 |

Ratings and slopes agree between GolfPass and SCGA on every tee both list.

## Default tee (standing defaults: Blue)

- **Ocean South: Blue, 6,323 yd (GolfPass; SCGA 6,245), 70.6 / 130, par 70.**
- Ocean North: Blue, 6,563 yd (GolfPass; SCGA 6,510), 71.6 / 132, par 71.

## Conflicts (recorded, not resolved)

1. **Yardages, GolfPass vs SCGA.** SCGA's front nines and totals are a few yards
   different on most holes, shorter overall (Ocean South Blue 6,245 vs 6,323;
   Black 6,540 vs 6,580; White 5,870 vs 5,929; Red 5,364 vs 5,393; Yellow 4,652
   vs 4,723. Ocean North Blue 6,510 vs 6,563; Black 6,924 vs 6,945; White 6,182
   vs 6,270; Red 5,729 vs 5,810; Yellow 4,923 vs 4,951). The differences are
   0.3-1.5 % of a total, holes up to ~25 yd apart (Ocean South White 5: SCGA 329,
   GolfPass 308). The ratings are the same in both, so one of them is probably a
   re-measurement. **The resort's own hole pages (sources 4-5) give exactly
   GolfPass's Black yardages on both courses**, so GolfPass follows the resort's
   June 2022 cards; SCGA's figures are probably the rating survey's. SCGA has
   no back-nine figures anyway, so the CSVs use GolfPass. The
   yardage validation should pass either way (3 % tolerance); if a hole flags,
   check it against SCGA's figure before moving anything.
   - Ocean South SCGA front nine, Blue: 423, 340, 329, 140, 331, 393, 174, 547, 432 (out 3,109).
   - Ocean North SCGA front nine, Blue: 517, 176, 380, 393, 416, 143, 425, 523, 404 (out 3,377).
2. **Pars from the forward tees.** SCGA gives men's par 68 (Red) and 66
   (Yellow) on Ocean South, 70 (Red) and 68 (Yellow) on Ocean North, and women's
   par 74 / 71 / 70 (South White / Red / Yellow) and 73 / 72 / 70 (North). GolfPass
   prints par 70 / 71 for every tee. So some holes change par from the forward
   tees, and which ones isn't published. The CSVs carry the one par row (the
   back tees'), which is what the game uses.
3. **Ocean North women's handicaps (GolfPass)** are exactly Ocean South's men's
   handicaps (5, 11, 13, 17, 9, 3, 15, 7, 1 / 4, 12, 16, 18, 10, 8, 14, 6, 2):
   probably a data-entry copy. Not used. The CSVs carry men's handicaps only.
4. **Red and Yellow on Ocean South share holes 8, 11, 12, 14 and 15** (426, 300,
   113, 411, 287 in both) in GolfPass; SCGA has 427 for both on 8 as well, so it's
   likely real (one forward tee box on those holes).
5. **Women's ratings for Black and Blue:** SCGA lists none; GolfPass gives one
   for Ocean North Blue only.
6. **Ocean North Black slope:** Golf Digest's course page gives 135 for 6,945
   yd; GolfPass and SCGA give 137 (73.5). The CSVs carry no slopes; use 137.

## Still missing

- The resort's printed cards (June 2022 PDFs, URLs in sources 4-5; DATA_REQUEST
  item 5 asks the developer to save them). They would confirm the Blue, White,
  Red and Yellow yardages, the forward-tee pars and the women's handicaps.
- **The South course reopened "reimagined" in mid-2026** (Brian Curley's
  restoration: bunkers, tees, green surrounds; routing unchanged, sources.md).
  If the resort has issued a 2026 card, it supersedes the June 2022 one; the
  course chat should check pelicanhill.com for a newer card.

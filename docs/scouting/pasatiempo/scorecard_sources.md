# Pasatiempo — scorecard sources (read 2026-10-24)

## Which card `scorecard.csv` uses

`scorecard.csv` holds the per-hole rows from Stymie (source 2), which match
GolfPass (source 3) for every hole of Gold, Gold/White and White. The **Gold**,
**Gold/White**, **White**, **Green/Hollins** and **Hollins** totals match the
club's own printed totals (source 1). Par and stroke index are the men's rows,
which the club says are used by the Championship and Middle tees. The forward tees
have their own par and stroke index, which no text source gives (see "Missing").

The club's official card is online only as two images, which the sandbox couldn't
open. DATA_REQUEST.md item 5 asks the developer to save them. The course chat
should check every row against them before s06. If the images differ from the
csv, use the images and record what changed.

## Sources

1. **Club website (official)**:
   https://www.pasatiempo.com/golf/scorecard-and-local-rules (also
   `/index.php/golf/scorecard-and-local-rules`). In text: ratings, slopes and totals
   per tee, and the local rules. The hole-by-hole card is in two images only:
   `https://www.pasatiempo.com/images/uploads/20/scorecard_1__large.jpg` and
   `https://www.pasatiempo.com/images/uploads/20/scorecard_4__large.jpg` (not readable here).
   It says: "the par and handicap values for the Forward tees are different than
   those for the Championship and Middle tees."
2. **Stymie**:
   https://stymie.golf/golf-courses/california/santa-cruz-county/santa-cruz/pasatiempo-golf-course.
   Per-hole rows for every set, including Team Match Combo, with par, stroke index,
   ratings and slopes (men's and women's). The ratings look GHIN-derived, and they
   differ slightly from the club's.
3. **GolfPass**:
   https://www.golfpass.com/courses/15566-pasatiempo-golf-club/scorecard-and-layout.
   Per-hole Gold, Gold/White and White, identical to Stymie, plus a ratings table.
4. **OpenGolfAPI**: https://courses.opengolfapi.org/courses/CA/pasatiempo-golf-club.
   One unlabelled per-hole row: 458 430 220 376 188 565 346 177 491 | 437 390 371 532
   426 142 392 372 173. Its holes add to 3,251 + 3,235 = 6,486, but the page's own
   headline says 6,495. The front-nine numbers match the yardages in a hole-by-hole
   article from April 2024, after the front nine was restored (source 6). This may be
   the post-restoration card. See the conflicts below.
5. **Shotnavi** (Japanese course database): https://shotnavi.jp/world/840/31/gc_722.htm.
   An older card with Back 6,500, Regular 6,125 and Ladies 5,685. Each row adds up.
   It is superseded and not used.
6. **Chief Golf Nerd, April 2024** (https://golfcoursenerd.substack.com/p/pasatiempo-golf-club)
   and **June 2025** (https://golfcoursenerd.substack.com/p/pasatiempo-golf-club-new-back-nine):
   per-hole yardages in the text for holes 1-15. Holes 1-11 match source 4. Holes
   12-15 (371, 532, 426, 142) match every source.
7. **Wikipedia**: par 70, 6,500 yd, 72.4/143. It gives no per-hole data.

## Ratings and slopes

Official (club website, source 1). These are used.

| Tee | Yards | Men | Women |
|---|---|---|---|
| Gold | 6,495 | 72.7 / 143 | — |
| Gold/White combo | 6,222 | 71.5 / 139 | — |
| White | 6,093 | 70.7 / 138 | 75.8 / 142 |
| White/Green combo | 5,814 | 69.5 / 135 | — |
| Green | 5,577 (men) / 5,595 (women) | 68.5 / 133 | 73.3 / 135 |
| Green/Hollins combo | 4,846 | 65.1 / 123 | 69.4 / 122 |
| Hollins | 4,366 | 63.2 / 117 | 67.0 / 117 |

Stymie (source 2), for comparison:

| Tee | Yards | Men | Women |
|---|---|---|---|
| Gold | 6,495 | 72.5 / 141 | — |
| Gold/White | 6,222 | 71.3 / 135 | — |
| White | 6,093 | 70.8 / 134 | 75.8 / 142 |
| White/Green | 5,780 | 69.5 / 133 | 74.3 / 137 |
| Green | 5,595 | 68.5 / 132 | 73.3 / 135 |
| Team Match combo | 5,195 | 70.6 / 125 (gender not given) | |
| Green/Hollins | 4,846 | 64.7 / 122 | 69.0 / 122 |
| Hollins | 4,366 | 62.8 / 116 | 66.6 / 117 |

GolfPass gives Gold 72.5/141, Gold/White 71.3/135, White 70.8/134 (women's 75.8/142),
White/Green 5,780 69.5/133, Green 5,595 68.5/132 (women's 73.3/135, with a second
women's Green line at 5,577), Green/Hollins 4,772 65.1/123 (women's 69.4/122) and
Hollins 4,438 63.2/117 (women's 67.2/117). It shows women's par as 72.

## Totals check (every row added up, 2026-10-24)

| Set | Out | In | Total | Printed (Stymie) | Club total | Result |
|---|---|---|---|---|---|---|
| gold | 3,260 | 3,235 | 6,495 | 6,495 | 6,495 | OK |
| gold_white | 3,145 | 3,077 | 6,222 | 6,222 | 6,222 | OK |
| white | 3,049 | 3,044 | 6,093 | 6,093 | 6,093 | OK |
| white_green | 2,919 | 2,861 | 5,780 | 5,780 | **5,814** | rows agree with Stymie; the club's total is 34 yd more |
| green | 2,839 | 2,756 | 5,595 | 5,595 | **5,577** (men's line); 5,595 (women's line) | rows match the women's total |
| team_match | 2,732 | 2,463 | 5,195 | 5,195 | not listed | OK |
| green_hollins | 2,594 | 2,252 | 4,846 | 4,846 | 4,846 | OK |
| hollins | 2,283 | 2,083 | 4,366 | 4,366 | 4,366 | OK |

Par: 35 + 35 = 70. The stroke index runs 1-18 with no repeats.

## Default tee (standing defaults, COURSE_BUILD.md 4.1)

The card has no Blue set. The single set closest to 6,300 yd is **Gold, 6,495 yd,
72.7/143**: it is 195 yd from 6,300, and White (6,093) is 207 yd from it.
Gold/White combo (6,222) is closer still, at 78 yd. Earlier courses have never
picked a combo set (TPC Boston: "the single set closest to 6,300"), so Gold is
recommended. See README open question 1.

## Conflicts

- **Gold, holes 3-9:** sources 2 and 3, which match the club's 6,495 total, give 222,
  378, 190, 567, 347, 176 and 492. Sources 4 and 6 (April 2024) give 220, 376, 188,
  565, 346, 177 and 491, for a total of 6,486. Each hole differs by 1-2 yd. That is
  below 1 % and doesn't affect validation. The club's images decide.
- **Ratings:** the club's figures (Gold 72.7/143) and Stymie/GolfPass (72.5/141)
  differ. The club's are used.
- **White/Green and Green totals:** see the table above.
- **Hole 1 of the Green and White/Green rows:** 458, longer than White's 440 and
  equal to Gold's. This looks odd. A 2024 report says hole 1 is "Par 4 (or 5 from
  some tees)", so the forward tees may play it as a par 5 from the back box. Check it
  against the images.

## Missing

- The forward tees' own par and stroke index rows are in the images only. They are
  probably women's par 72: GolfPass lists the women's sets as par 72.
- No source gives a front/back split for the club's own totals. The course chat
  checks the images.

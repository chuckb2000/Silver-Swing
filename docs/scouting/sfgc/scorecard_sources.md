# San Francisco Golf Club — scorecard sources (read 2026-10-24)

## Which card `scorecard.csv` uses

SFGC is private. No official card was found online, and the club bans yardage
markers and rangefinders (GOLF, Golf Digest). Two third-party per-hole cards
exist. They agree on par, the men's stroke index and all but five yardages.

- The **yardages, par and men's stroke index** (`handicap`) are from **Stymie**
  (source 1). Its ratings add up with its own totals (Blue 6,808 = 73.6/133). Its
  14th, at 351, matches the Links Magazine yardage. Its tee names (Legacy) look
  newer than GolfPass's.
- **`handicap_w`** is the women's stroke index row from **GolfPass** (source 2). It
  is the only source with a separate women's row.

**Unverified:** a photo of the printed card, or of a yardage book, would settle it
(README question 1).

## Sources

1. **Stymie**: https://stymie.golf/golf-courses/california/san-francisco-county/san-francisco/san-francisco-golf-club
   (the same data at `.../san-francisco-county-county/san-francisco/san-francisco-golf-club-san-francisco`).
   Per-hole Blue, White, White/Red combo, Legacy (Red) and Green, with one stroke
   index row and ratings per tee, men's and women's. Its FAQ says White is par 73,
   but every row it prints is par 71, so treat the FAQ as an error.
2. **GolfPass**: https://www.golfpass.com/courses/14939-san-francisco-golf-club/scorecard-and-layout.
   Per-hole Blue, White, White/Red, Red and Green, with men's and women's stroke
   index rows, and a ratings table under other names and totals: Championship 6,828,
   Regular 6,411, Forward 5,981.
3. **OpenGolfAPI**: https://courses.opengolfapi.org/courses/CA/san-francisco-golf-club.
   The GolfPass Blue row (14th = 352, total 6,809) under a 6,828 / 74.1 / 136
   header. Not independent.
4. **Golf Digest**: https://www.golfdigest.com/courses/ca/san-francisco-golf-club
   gives 6,829 yd and slope 136. **GOLF**:
   https://golf.com/courses/san-francisco-golf-top-100-courses/ gives par 71 and
   6,828 yd, with "No. 7, par-3, 189 yards". **Links Magazine**:
   https://linksmagazine.com/san_francisco_golf_club-2/ gives par 71 and 6,828 yd,
   with 13th 134, 14th 351 and 15th 423. https://www.linksmagazine.com/classic-course-san-francisco-golf-club/
   gives 6,836 yd. **where2golf**: https://www.where2golf.com/california/san-francisco-golf-club.asp
   gives Back 6,828, Club 6,411 and Front 5,981, with ratings 74.1 and 71.8.
5. **GolfClubAtlas** (Mar 2006, https://www.golfclubatlas.com/forum/index.php/topic,22706.0.html):
   the par 3s in 1930 were the 4th 210, 7th 150, 11th 165 and 13th 120. Historical
   only.

## Ratings and slopes

Stymie (used):

| Tee | Yards | Men | Women |
|---|---|---|---|
| Blue | 6,808 | 73.6 / 133 | — |
| White | 6,376 | 71.3 / 130 | 77.9 / 141 |
| White/Red combo | 6,152 | 70.0 / 128 | 76.7 / 139 |
| Legacy (Red) | 6,012 | 69.5 / 127 | 75.9 / 137 (the row labelled "Legacy (Red)") |
| Green | 5,461 | 67.0 / 122 | 72.6 / 129 |

GolfPass ratings table (names and totals don't match its own rows): Championship
6,828 74.1/136; Regular 6,411 71.8/132 (women's 78.0/140); Forward 5,981 69.6/126
(women's 75.5/135). Golf Digest also gives slope 136. These look like an older
rating of the back, middle and forward tees.

## Totals check (every row added up, 2026-10-24)

| Set | Stymie out / in / total | Printed | GolfPass out / in / total | Printed |
|---|---|---|---|---|
| blue | 3,593 / 3,215 / 6,808 | 6,808 OK | 3,593 / 3,216 / 6,809 | 6,809 OK |
| white | 3,337 / 3,039 / 6,376 | 6,376 OK | 3,332 / 3,035 / 6,367 | 6,367 OK |
| white_red | 3,238 / 2,914 / 6,152 | 6,152 OK | 3,233 / 2,914 / 6,147 | 6,147 OK |
| legacy / red | 3,133 / 2,879 / 6,012 | 6,012 OK | 3,133 / 2,879 / 6,012 | 6,012 OK |
| green | 2,787 / 2,674 / 5,461 | 5,461 OK | 2,787 / 2,642 / 5,429 | 5,429 OK |

Par: 36 + 35 = 71. Both stroke index rows (men's and women's) run 1-18 with no
repeats.

## Conflicts (hole: Stymie / GolfPass)

- Blue 14: 351 / 352
- White 4: 212 / 207; White 12: 370 / 366
- White/Red 4: 212 / 207
- Green 17: 372 / 340
- The Blue rating: 73.6/133 at 6,808 (Stymie) vs 74.1/136 at 6,828 (GolfPass,
  Golf Digest, OpenGolfAPI, where2golf). Stymie is used because it matches its own
  per-hole total.

None of these changes Blue validation by more than 0.3 %.

## Default tee (standing defaults, COURSE_BUILD.md 4.1)

**Blue, 6,808 yd, 73.6/133.** The card has a Blue set, and here Blue is the back
tee. White (6,376, 71.3/130) is the set closest to 6,300 and a natural second set
(README question 2).

## Missing

- The club's own card (none online). Ask for a photo of the printed card or
  yardage book.
- Separate women's par: every source shows par 71 for every tee.

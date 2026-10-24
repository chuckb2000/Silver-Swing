# Yale Golf Course — scorecard sources (read 2026-10-24)

The course reopened on 28 April 2026 after the Hanse/Wagner restoration with a
new card: par 70, Championship 7,054, Long 6,361, Regular 5,767, Short 4,814.
Every older card online (6,825 / 6,749 / 6,409 ...) is from before the
restoration and is not used. No club-published card (PDF or image) was found:
the course's pages on yalebulldogs.com carry no scorecard, and the old
yalegolf.yale.edu site is a 2021 COVID notice.

## Used for `scorecard.csv`

| Source | What it gave |
|---|---|
| GolfPass scorecard, https://www.golfpass.com/courses/14944-yale-golf-course/scorecard-and-layout | the only per-hole card for all four sets (Championship, Long, Regular, Short), par per hole, one handicap row ("row A", below). Its tee/rating table is the old one (Long 6,409 71.3/133, Regular 5,984 69.3/130, Gold 5,144 70.3/121) and does not match its own card |
| 18Birdies, https://18birdies.com/golf-courses/club/92c37f20-86ac-11e4-8c28-020000005b00/the-course-at-yale | the four new totals, men's and women's ratings/slopes for each, par and Championship yardage per hole (identical to GolfPass), and a different handicap row ("row B", used) |
| GolfPass review (Tim Gavrich, 8 July 2026), https://www.golfpass.com/travel-advisor/articles/yale-golf-course-review | confirms Championship "just over 7,050" at 74.7/144, Long 6,361, Regular 5,767, Short 4,814; hole 10 now 461 yd, 17 now 488 (was 437), 18 611 |
| Bradley Klein, FirstCallGolf (8 June 2026), https://www.firstcallgolf.com/features/feature/2026-06-08/a-gothic-masterpiece-revived-yale-golf-course-reopens | par 70, tees 4,814 to 7,054; 18th 611 yd |

## Totals check (every row added up; matches the printed totals above)

| Set | Out | In | Total | Card total |
|---|---|---|---|---|
| Par | 34 | 36 | 70 | 70 |
| Championship | 3,338 | 3,716 | 7,054 | 7,054 |
| Long | 2,968 | 3,393 | 6,361 | 6,361 |
| Regular | 2,682 | 3,085 | 5,767 | 5,767 |
| Short | 2,282 | 2,532 | 4,814 | 4,814 |

Only GolfPass gives Long, Regular and Short per hole; their rows add up to the
totals 18Birdies and the GolfPass review print, so they are taken as given.
Hole 3 is short from the Long tee (303 yd vs 388 Championship): a forward tee
that plays the restored left fairway or cuts the corner (a top100golfcourses
review mentions forward tees there). Check it against the tee boxes.

## Ratings and slopes (18Birdies; the post-restoration rating)

| Tee | Yards | Men | Women |
|---|---|---|---|
| Championship | 7,054 | 74.7 / 144 | 81.4 / 152 |
| Long | 6,361 | 71.5 / 139 | 77.5 / 146 |
| Regular | 5,767 | 68.9 / 130 | 74.3 / 138 |
| Short | 4,814 | 64.5 / 110 | 68.5 / 122 |

The men's Championship figure (74.7/144) is also in the GolfPass review. The
others are from 18Birdies alone.

**Default tee (standing defaults: no Blue, so the set closest to 6,300):
Long, 6,361 yd, 71.5 / 139.**

## Conflicts

1. **Stroke index.** Back nine the same in both; front nine differs:

   | Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
   |---|---|---|---|---|---|---|---|---|---|
   | Row A (GolfPass) | 3 | 13 | 7 | 1 | 17 | 15 | 11 | 9 | 5 |
   | Row B (18Birdies, used) | 5 | 15 | 11 | 1 | 17 | 3 | 13 | 7 | 9 |

   Back nine (both): 2, 14, 8, 10, 12, 18, 16, 4, 6. Row A is also what
   OpenGolfAPI pairs with the old 6,409-yd card, so it is probably the old
   index; row B comes with the new ratings. A third, older index (Stymie, old
   card): 9, 11, 1, 3, 17, 13, 15, 7, 5 | 6, 10, 2, 8, 12, 18, 14, 16, 4.
   Recommendation: row B until a photo of the printed card says otherwise.
2. **Par of hole 3.** GOLF.com (11 March 2026) calls it "the par-5 3rd"; every
   card has it as a par 4 (388 yd from the back). Par 4 used.
3. **Women's pars:** none of the sources gives separate women's pars or
   handicaps.

## Older cards (not used; pre-restoration)

| Source | Card |
|---|---|
| Stymie, https://stymie.golf/golf-courses/connecticut/new-haven-county/new-haven/yale-golf-course | Championship 6,825 72.9/135 (W 79.6/146), Long 6,409 71.3/133 (W 77.1/140), Middle 5,984 69.3/130 (W 75.8/137), Short 5,144 65.4/114 (W 70.2/121), per hole |
| OpenGolfAPI, https://courses.opengolfapi.org/courses/CT/yale-golf-course | Long 6,409 per hole with row A (prints par 82 by mistake) |
| 1golf.eu, https://www.1golf.eu/en/club/the-course-at-yale | Black 6,749 72.9/132, Blue 6,440 71.6/130, Green 5,941 69.6/128, Gold 5,209 70.2/123 (totals only) |
| Yale golf history site (c. 2009), https://campuspress.yale.edu/yalegolf/course/introduction | Long 6,749 73.5/140, Regular 6,122 70.5/139, Short 5,468 66.9/128; 1926 card 6,533 / 6,099 / 5,577 |
| Wikipedia, Golf Digest, GolfNow | 6,825 72.9/135; 6,749 slope 135; 6,409 / 5,984 / 5,144 |
| golfclubatlas.com course profile | about 6,745 yd hole by hole (pre-restoration), no pars |

## Still wanted

A photo of the new printed card (the pro shop, 200 Conrad Drive) would settle
the stroke index and confirm the Long/Regular/Short rows.

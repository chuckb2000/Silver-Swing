# Pelican Hill — scorecard sources (2026-10-24): none read

**Missing:** both cards. The session's shared web-search budget ran out before
Pelican Hill was searched, and pages can only be opened from search results. So
no scorecard, rating or slope was read for either course. Nothing below is data.

## Files the course chat needs

| File | Course | Use |
|---|---|---|
| `scorecard_ocean_south.csv` | Ocean South (build first) | `hole,par,handicap,<tee1>,<tee2>,...`, from a per-hole source |
| `scorecard_ocean_north.csv` | Ocean North (later, second `layouts` course) | same |
| `scorecard.csv` | only if Ocean South is built without `layouts`: a copy of `scorecard_ocean_south.csv` | — |

## Where to look (in order)

1. The resort's own cards: pelicanhill.com, Golf, then each course's scorecard
   (PDF or image). DATA_REQUEST item 5 asks the developer to save them.
2. SCGA course pages (the regional rating authority, current men's and women's
   ratings for each tee, and the front nine per hole as text). The Strawberry
   Farms page was `https://www.scga.org/courses/details/strawberry-farms-golf-club`,
   so Pelican Hill's are probably under similar slugs. Find them by search.
3. GolfPass "scorecard-and-layout" pages for each course (per hole, all tees).
4. Stymie / 18Birdies / Greenskeeper (GHIN-style per-hole data). Use them to
   cross-check only, and record any conflicts.

## Checks to make when filled

- Add up every row against the printed out/in/total, and list mismatches.
- Note the tee the standing defaults pick: Blue if there is one, else the set
  closest to 6,300 yd, with its total and rating/slope (SCGA's, men's).
- Women's ratings per tee as well.
- Ratings for both courses changed with the 2007 Fazio redesign (if that date is
  right). Use post-redesign cards only.

## From memory (unverified; don't put these in any CSV)

Ocean South is remembered as a par 70 and Ocean North as a par 71. The yardages
aren't remembered reliably.

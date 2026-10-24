# Astoria Golf & Country Club — scorecard sources (2026-10-24)

`scorecard.csv` is from **Stymie** (A): per hole for all six tee sets, with
one par row and one stroke-index row. **GolfPass** (B) has the same yardages
per hole for four of the sets and gives the women's stroke index
(`handicap_w`). The club's own card was not found: its website
(https://www.astoriagolf.com/, named on amateurgolf.com) never came back from
a search, so the sandbox couldn't open it. Nothing was averaged.

## Sources

| # | Source | URL | Read | What it gave |
|---|---|---|---|---|
| A | Stymie | https://stymie.golf/golf-courses/oregon/clatsop-county/gearhart/astoria-golf-country-club | 2026-10-24 | par row; one stroke-index row; yards per hole for Tournament Black, Black, Silver, Silver/Gold, Gold, Green (men's and women's listed separately, same yards); ratings/slopes (table below). No data date (footer "© 2026") |
| B | GolfPass | https://www.golfpass.com/travel-advisor/courses/11400-astoria-golf-country-club | 2026-10-24 | yards per hole identical to A's Tournament Black, Silver, Silver/Gold and Gold (the page's columns are labelled "Black, Blue, Blue/Silver, Silver", which matches none of the club's names: a labelling slip); men's and women's stroke index; par row 72; a tee table from an older rating (below) |
| C | GolfNow | https://www.golfnow.com/courses/1035506-astoria-golf-country-club-details | 2026-10-24 | the same older tee table as B (par, yards, rating, slope per set); no holes |
| D | Open Golf API | https://courses.opengolfapi.org/courses/OR/astoria-golf-country-club | 2026-10-24 | the older card's Tournament tee per hole: 6,538 yd, par 71 (12 a par 4 of 454 yd; 15 273 yd), a different stroke index, 71.7/123 |
| E | 1golf.eu | https://www.1golf.eu/en/club/astoria-golf-country-club/ | 2026-10-24 | four garbled older rows (Black M par 72 6,462 71.3/123; Gold W 5,753 73.8/131; "Silver W" 5,753 70.6/126; Green W 5,495 72.1/124); not used |
| F | GolfClubAtlas forum (2006) | https://www.golfclubatlas.com/forum/index.php/topic,26002.0.html | 2026-10-24 | 2006 hole yardages that match today's back tees (4: 197, 5: 461, 9: 519, 10: 127, 17: 175, 2: 276) |

## The card (A; totals checked)

| Set (csv column) | Out | In | Total | A's printed total | Check |
|---|---|---|---|---|---|
| Tournament Black (`tournament`) | 3,349 | 3,201 | 6,550 | 6,550 | adds up |
| Black (`black`) | 3,349 | 3,130 | 6,479 | 6,479 | adds up (15 is 197 yd from Black, 268 from Tournament) |
| Silver (`silver`) | 3,173 | 3,148 | 6,321 | 6,321 | adds up |
| Silver/Gold (`silver_gold`) | 2,940 | 3,026 | 5,966 | 5,966 | adds up (Gold tees on 5, 8, 9, 11, 18) |
| Gold (`gold`) | 2,845 | 2,908 | 5,753 | 5,753 | adds up |
| Green (`green`) | 2,734 | 2,807 | 5,541 | 5,541 | adds up |
| Par | 36 | 36 | 72 | 72 | adds up |

Both stroke-index columns hold 1-18 once each (odd on the front, even on the
back).

## Ratings and slopes

**Current (A, matches the per-hole card):**

| Set | Yards | Men's rating / slope | Women's rating / slope |
|---|---|---|---|
| Tournament Black | 6,550 | 72.3 / 127 (gender not labelled) | — |
| Black | 6,479 | 71.9 / 127 (gender not labelled) | — |
| Silver | 6,321 | 71.2 / 127 | 77.3 / 134 |
| Silver/Gold | 5,966 | 69.7 / 122 (gender not labelled) | — |
| Gold | 5,753 | 68.7 / 121 | 73.9 / 128 |
| Green | 5,541 | 67.5 / 118 | 72.7 / 124 |

**Older (B and C; the yardages are the older card's):** Tournament 6,538
par 71 71.7/123; Black 6,462 par 70 71.5/123; Silver 6,331 par 72 70.7/121
(women's par 72 76.7/130); Combo 5,966 par 72 69.0/117; Gold 5,753 par 71
67.8/114 (women's par 72 73.6/124); Green 5,495 par 70 66.8/113 (women's
par 73 72.0/119).

The USGA Course Rating database (ncrdb.usga.org) never came back from a
search, so neither set is confirmed there.

## Default tee (standing defaults)

No Blue tee. The set closest to 6,300 yd is **Silver, 6,321 yd, par 72,
71.2 / 127** (men's, A).

## Conflicts and gaps

1. **Men's stroke index, holes 1, 5 and 7:** A has 9, 5, 7; B has 7, 9, 5.
   The rest agree. `handicap` uses A (the source of the yardages); the club's
   card settles it.
2. **Per-tee par:** A and B print one par row (72). The older table gives
   Tournament par 71, Black 70, Gold 71 and Green 70 for men (women's Gold 72,
   Green 73), so some holes change par by tee: on the Black card 15 is a
   197 yd hole (surely a par 3), and the older Tournament card has 12 as a
   par 4. The current pars per tee for Tournament, Black, Gold and Green are
   not known. `par` is the card's row, right for Silver (the default).
3. **Two cards:** the older card (D) differs on 12 (par 4, 454 yd, against
   par 5, 471 yd now) and 15 (273 against 268), and has a different stroke
   index throughout. The current card (A, B) is used.
4. **Totals in the older tee table** (6,538 / 6,462 / 6,331 / 5,495) don't
   match the current card (6,550 / 6,479 / 6,321 / 5,541): different cards,
   not an error in either.
5. **Missing:** the club's printed card (to confirm the stroke index and the
   pars per tee) and the rating date. The developer can save the card from
   https://www.astoriagolf.com/ or photograph a printed one (DATA_REQUEST.md
   item 5).

# Request to the design chat from the Wildwood course chat (2026-10-24)

## Auto club on steep downhill (and uphill) shots

**What:** on Wildwood's 3rd (par 3, Black 173 yd) the tee is 17.5 m above the green
(41.2 m vs 23.8 m). `Round.autoClub()` picks the club whose flat carry is nearest the
horizontal distance to the pin (155 m -> 6-iron, 155.4 m). Because the ball lands where its
flight meets the ground (CLAUDE.md 7.2), a perfect 6-iron carries well past the flat distance
and stops about 25 m past the pin, in the trees behind the green (`restSurface` woods). The
player gets a club that is one or more too long with no hint that it is.

**Why it matters:** the default club plus a perfect strike should reach the green on a par 3.
Wildwood is a valley course with several elevated tees, and other hilly courses
(Oregon Golf Club, Chambers Bay) can hit the same thing. `game/tests/unit/wildwood.test.ts`
lists hole 3 as a known exception ("the default aim keeps a perfect tee shot out of the trees")
until this changes.

**Smallest change I can see:** in `autoClub()`, compare each club's *landing distance on this
terrain* instead of its flat carry: fly the perfect-strike spec for the club toward the pin with
`simulateShot(terrain, null, spec, rng)` (no obstacles, calm) and take the club whose landing
point is nearest the pin. This uses the existing flight model, so it adds no separate plays-like
formula (7.2 stays true for the physics). The landing marker could use the same landing point.
If that costs too much per shot, an approximation (flat carry + k * height difference, k fitted
from the flight model) would also do.

**Check:** with the change, the auto-club perfect tee shot on Wildwood 3 should rest on the
green or fringe; the existing course tests (tee shots, robot rounds) for every course should
still pass. When it lands, the course chat (or the design chat) removes the hole-3 exception in
`wildwood.test.ts`.

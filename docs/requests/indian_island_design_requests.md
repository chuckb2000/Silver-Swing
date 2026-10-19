# Design-chat requests from the Indian Island build

Course chat, 2026-10-19. Indian Island plays without these; each item says what is needed, why and the smallest change.

## 1. E-5 drop for out-of-bounds ground inside the boundary (low priority)

**What:** with Model Local Rule E-5 switched on, a ball that comes to rest on out-of-bounds ground *inside* the course boundary should get its drop measured from where it crossed onto that ground. Today it is measured from where it stopped.

**Why:** Indian Island's Route 105 crosses the middle of the course and is out of bounds (developer, 2026-10-19). The surface map paints it `ob_road` (pipeline `ob_highways`), but the course boundary polygon contains it. `Round.resolve` finds the out-of-bounds lie through `isOB(s)`, then calls `lastInBounds(sim, boundary)`, which returns the last flight sample inside the *boundary polygon*. For a ball on the road that is the spot where it stopped, so the E-5 circle is centred on the road. Oswego Lake's driving range, also out of bounds inside its boundary, has the same issue. Stroke and distance (the default) is unaffected.

**Smallest change:** in `lastInBounds`, treat a sample as in bounds only when it is inside the boundary *and* `!isOB(terrain.surface(x, y))`. That means passing the terrain alongside the boundary. Add a rules test: a ball rolling onto an `ob_road` strip inside the boundary gets its E-5 centre on the near edge of the strip.

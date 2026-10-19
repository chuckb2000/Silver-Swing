# Tualatin Country Club: requests to the design chat

From the Tualatin course chat, 2026-10-19. The course plays without any game
change; the item below is optional.

## 1. Conifer crowns as cones in physics (optional)

**What:** in `game/src/systems/physics/sim.ts`, let a conifer's canopy narrow
with height (for example radius × (1 − (hz − 0.4h) / 0.6h) × 1.2, capped at the
crown radius) instead of a full-radius cylinder from 40 % of its height to the
top. Deciduous trees stay cylinders.

**Why:** Tualatin's fairways are lined with 30-50 m Douglas firs. The lidar
crown radius is the widest part of the tree, near the bottom of the crown; the
cylinder model gives the same width at 25 m up, where a real fir is half as
wide. A drive passing beside a fir at mid height counts as a canopy hit more
often than it would on the course. The developer has asked twice (East
Potomac, Tualatin) that trees not block normal lines.

**Smallest change:** one radius function used by the canopy check (and by
`hidesPoint` if it uses the radius), keyed on `tree.conifer`; the tree data
already carries the type.

**Not needed for Tualatin:** with the current model a drive down the centre
of every par 4 and par 5 is already clear (`tests/unit/tualatin.test.ts`).

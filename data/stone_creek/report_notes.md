## Course-specific notes (Stone Creek)

1. **Hole 6 (Blue) plays 144 yd against 149 on the card (-3.1 %, a flag).** The
   OSM line starts in a long 317 m2 box (w1214431374, 145-178 yd from the green,
   probably the Jacobsen box, 177 yd); s06 picks the small box w768386042 in front
   of it and moves the virtual tee to its back. Tagging the long box as the Blue tee
   (`edits.json`, `hole=6 tee_set=Blue`) was tried: the virtual tee then sits at its
   front edge, 150 yd (+0.9 %), 6 m from today's tee. Accepted for play by the developer
   (2026-10-19).
2. **Hole 16 (Blue) has no tee box of its own size in OSM.** The tee is the start of
   the OSM hole line (144 yd, card 144), which lies inside the large 595 m2 tee
   polygon w1214432983 at the back of the hole, so the tee stands on a tee box. The
   card prints 144 for both Jacobsen and Blue. Accepted by the developer (2026-10-19).
3. **Holes 2 and 15** measured 3.3 % and 4.3 % short from their box centres; s06
   moved each virtual tee within its own box (both pass). Hole 15's tee then moved
   1.1 m more within the box so the drive clears a 43 m fir 49 m out
   (`tee_shot_margin_m`, DECISIONS.md).
4. **Water:** the three ponds (W1 between 3 and 4, W2 in front of 6, W3 by 17/15/18)
   are red (developer). The reed-bed wetland north of 12/13 (OSM `natural=wetland`,
   mostly outside the boundary) is drawn and played as woods inside the boundary,
   not as a penalty area (accepted by the developer, 2026-10-19).
5. **Practice greens:** three greens are not on a hole (by the 14th tee, and two by
   the 1st/10th tees); they are wrong greens (relief required). The driving range
   (south-east of hole 9, not mapped in OSM) is rough and in play (developer).
6. **Tree types** are inferred from crown shape only (no leaf-off imagery); the
   DOGAMI canopy model gives heights up to 57 m (old-growth Douglas fir).
